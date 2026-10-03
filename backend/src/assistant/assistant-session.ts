import { Logger } from '@nestjs/common';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import type { WebSocket } from 'ws';
import { AssistantUserContext, buildSystemInstruction } from './assistant.prompt';
import { CLIENT_TOOLS, CLIENT_TOOL_NAMES, DATA_TOOLS, DATA_TOOL_NAMES } from './assistant.tools';
import { AssistantDataService } from './assistant-data.service';

export interface AssistantUser extends AssistantUserContext {
  id?: string;
}

export interface AssistantSessionOptions {
  ai: GoogleGenAI;
  models: string[];
  voice: string;
  maxDurationMs: number;
  data: AssistantDataService;
  resolveUser: (token?: string | null) => Promise<AssistantUser>;
  onEnd: () => void;
}

const CLIENT_TOOL_TIMEOUT_MS = 10_000;
const MAX_AUDIO_CHUNK = 64 * 1024; // base64 chars; a 40 ms 16 kHz chunk is ~1.7 KB
const MAX_RECONNECTS = 3;

/**
 * One browser connection ⇄ one Gemini Live session (re-opened transparently
 * with a resumption handle when Vertex asks us to go away).
 *
 * Browser → server: start | audio | audio_end | text | context | auth | tool_result | stop
 * Server → browser: ready | audio | interrupted | turn_complete | transcript | tool_call | tool_activity | resume_handle | error | ended
 */
export class AssistantSession {
  private readonly log = new Logger('Ria');
  private live?: Session;
  private user: AssistantUser = { loggedIn: false };
  private handle?: string;
  private path?: string;
  private reconnects = 0;
  private closed = false;
  private reconnecting = false;
  private startedAt = Date.now();
  private maxTimer?: NodeJS.Timeout;
  private pendingClientTools = new Map<string, { name: string; timer: NodeJS.Timeout }>();

  constructor(
    private readonly ws: WebSocket,
    private readonly opts: AssistantSessionOptions,
  ) {
    ws.on('message', (raw) => this.onBrowserMessage(raw.toString()));
    ws.on('close', () => this.close('browser closed'));
    ws.on('error', () => this.close('browser error'));
  }

  // ───────────────────────── browser side ─────────────────────────

  private send(msg: Record<string, unknown>) {
    if (this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private async onBrowserMessage(raw: string) {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'start':
        return this.start(msg);
      case 'audio':
        if (typeof msg.data === 'string' && msg.data.length <= MAX_AUDIO_CHUNK) {
          this.live?.sendRealtimeInput({ audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' } });
        }
        return;
      case 'audio_end':
        return this.live?.sendRealtimeInput({ audioStreamEnd: true });
      case 'text':
        if (typeof msg.text === 'string' && msg.text.trim()) {
          this.live?.sendRealtimeInput({ text: msg.text.slice(0, 2000) });
        }
        return;
      case 'context':
        if (typeof msg.path === 'string') this.path = msg.path.slice(0, 200);
        if (typeof msg.note === 'string') this.silentContext(msg.note.slice(0, 500));
        return;
      case 'auth':
        return this.updateAuth(msg.token);
      case 'tool_result':
        return this.onClientToolResult(msg);
      case 'stop':
        return this.close('user stopped');
    }
  }

  private async start(msg: any) {
    if (this.live) return;
    this.user = await this.opts.resolveUser(msg.token);
    this.path = typeof msg.path === 'string' ? msg.path.slice(0, 200) : undefined;
    this.handle = typeof msg.handle === 'string' ? msg.handle : undefined;
    const resumed = !!this.handle;

    try {
      await this.connectLive();
    } catch (e: any) {
      this.log.error(`Live connect failed: ${e?.message}`);
      this.send({ type: 'error', message: 'Ria is unavailable right now. Please try again in a minute.', fatal: true });
      return this.close('connect failed');
    }

    this.maxTimer = setTimeout(() => {
      this.send({ type: 'error', message: 'Session time limit reached.', fatal: true });
      this.close('max duration');
    }, this.opts.maxDurationMs);

    this.send({ type: 'ready', resumed, user: { loggedIn: this.user.loggedIn, name: this.user.name } });
    this.log.log(`session start user=${this.user.id ?? 'visitor'} resumed=${resumed} path=${this.path}`);

    if (resumed) {
      this.silentContext(`The page was reloaded; the user is now on ${this.path}. Continue where you left off.`);
    } else {
      this.greet();
    }
  }

  private greet() {
    this.live?.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: `[context] The user just tapped the Ria button on page ${this.path}. Greet them.` }] }],
      turnComplete: true,
    });
  }

  private async updateAuth(token?: string | null) {
    const before = this.user;
    this.user = await this.opts.resolveUser(token);
    if (before.id === this.user.id) return;
    this.silentContext(
      this.user.loggedIn
        ? `The user has now logged in as ${this.user.name} (account type ${this.user.roleCode}, status ${this.user.status}). Account tools are available.`
        : 'The user has logged out. Account tools are no longer available.',
    );
  }

  /** Append information to the conversation without triggering a reply. */
  private silentContext(note: string) {
    this.live?.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: `[context] ${note}` }] }],
      turnComplete: false,
    });
  }

  // ───────────────────────── Gemini side ─────────────────────────

  private async connectLive() {
    let lastError: unknown;
    for (const model of this.opts.models) {
      try {
        this.live = await this.openLive(model);
        return;
      } catch (e) {
        lastError = e;
        this.log.warn(`model ${model} failed: ${(e as Error)?.message}`);
      }
    }
    throw lastError;
  }

  private openLive(model: string): Promise<Session> {
    return new Promise<Session>((resolve, reject) => {
      let settled = false;
      let session: Session | undefined;
      let setupDone = false;
      const timeout = setTimeout(() => fail(new Error('setup timeout')), 15_000);
      const fail = (e: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try {
          session?.close();
        } catch {}
        reject(e);
      };
      // Ready once both the SDK has returned the session and Vertex has acknowledged setup.
      const tryResolve = () => {
        if (settled || !session || !setupDone) return;
        settled = true;
        clearTimeout(timeout);
        resolve(session);
      };

      this.opts.ai.live
        .connect({
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: buildSystemInstruction(this.user, this.path),
            tools: [{ functionDeclarations: [...CLIENT_TOOLS, ...DATA_TOOLS] }],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.opts.voice } } },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: this.handle ? { handle: this.handle } : {},
            contextWindowCompression: { slidingWindow: {} },
          },
          callbacks: {
            onmessage: (m) => {
              if (m.setupComplete) {
                setupDone = true;
                tryResolve();
              }
              // Ignore stray messages from a session we've already replaced.
              if (session && this.live && this.live !== session) return;
              this.onLiveMessage(m);
            },
            onerror: (e) => this.log.warn(`live error: ${(e as any)?.message ?? e}`),
            onclose: (e) => {
              if (!settled) return fail(new Error(`closed during setup: ${e?.code} ${e?.reason}`));
              if (this.live === session) this.onLiveClosed(e?.code, e?.reason);
            },
          },
        })
        .then((s) => {
          session = s;
          tryResolve();
        })
        .catch((e) => fail(e));
    });
  }

  private onLiveMessage(m: LiveServerMessage) {
    const sc = m.serverContent;
    if (sc) {
      for (const part of sc.modelTurn?.parts ?? []) {
        if (part.inlineData?.data) this.send({ type: 'audio', data: part.inlineData.data });
      }
      if (sc.inputTranscription?.text) this.send({ type: 'transcript', role: 'user', text: sc.inputTranscription.text });
      if (sc.outputTranscription?.text) this.send({ type: 'transcript', role: 'model', text: sc.outputTranscription.text });
      if (sc.interrupted) this.send({ type: 'interrupted' });
      if (sc.turnComplete) this.send({ type: 'turn_complete' });
    }

    if (m.toolCall?.functionCalls?.length) {
      for (const fc of m.toolCall.functionCalls) this.onToolCall(fc.id!, fc.name!, fc.args ?? {});
    }
    if (m.toolCallCancellation?.ids) {
      for (const id of m.toolCallCancellation.ids) this.clearPendingTool(id);
    }

    if (m.sessionResumptionUpdate?.resumable && m.sessionResumptionUpdate.newHandle) {
      this.handle = m.sessionResumptionUpdate.newHandle;
      this.send({ type: 'resume_handle', handle: this.handle });
    }

    if (m.goAway) {
      this.log.log(`goAway (timeLeft ${m.goAway.timeLeft}); reconnecting with handle`);
      void this.reconnect();
    }
  }

  private onLiveClosed(code?: number, reason?: string) {
    if (this.closed || this.reconnecting) return;
    this.log.warn(`live closed unexpectedly: ${code} ${reason}`);
    void this.reconnect();
  }

  private async reconnect() {
    if (this.closed || this.reconnecting) return;
    if (!this.handle || this.reconnects >= MAX_RECONNECTS) {
      this.send({ type: 'error', message: 'Connection to Ria was lost.', fatal: true });
      return this.close('live lost');
    }
    this.reconnecting = true;
    this.reconnects++;
    const old = this.live;
    this.live = undefined;
    try {
      old?.close();
    } catch {}
    try {
      await this.connectLive();
    } catch (e: any) {
      this.send({ type: 'error', message: 'Connection to Ria was lost.', fatal: true });
      this.reconnecting = false;
      return this.close('reconnect failed');
    }
    this.reconnecting = false;
  }

  // ───────────────────────── tools ─────────────────────────

  private async onToolCall(id: string, name: string, args: Record<string, unknown>) {
    if (CLIENT_TOOL_NAMES.has(name)) {
      const timer = setTimeout(() => {
        this.pendingClientTools.delete(id);
        this.respond(id, name, { error: 'The page did not respond in time.' });
      }, CLIENT_TOOL_TIMEOUT_MS);
      this.pendingClientTools.set(id, { name, timer });
      this.send({ type: 'tool_call', id, name, args });
      return;
    }

    if (DATA_TOOL_NAMES.has(name)) {
      if (!this.user.loggedIn || !this.user.id) {
        return this.respond(id, name, { error: 'The user is not logged in. Ask them to log in first.' });
      }
      this.send({ type: 'tool_activity', name });
      try {
        const result = await this.opts.data.run(name, this.user.id);
        return this.respond(id, name, { result });
      } catch (e: any) {
        this.log.error(`data tool ${name} failed: ${e?.message}`);
        return this.respond(id, name, { error: 'Could not load that information right now.' });
      }
    }

    this.respond(id, name, { error: `Unknown tool ${name}` });
  }

  private onClientToolResult(msg: any) {
    const pending = this.pendingClientTools.get(msg.id);
    if (!pending) return;
    this.clearPendingTool(msg.id);
    if (pending.name === 'navigate' && typeof msg.result?.path === 'string') this.path = msg.result.path;
    this.respond(msg.id, pending.name, msg.result && typeof msg.result === 'object' ? msg.result : { result: msg.result });
  }

  private clearPendingTool(id: string) {
    const p = this.pendingClientTools.get(id);
    if (p) clearTimeout(p.timer);
    this.pendingClientTools.delete(id);
  }

  private respond(id: string, name: string, response: Record<string, unknown>) {
    try {
      this.live?.sendToolResponse({ functionResponses: [{ id, name, response }] });
    } catch (e: any) {
      this.log.warn(`tool response failed: ${e?.message}`);
    }
  }

  // ───────────────────────── teardown ─────────────────────────

  close(reason: string) {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.maxTimer);
    for (const id of [...this.pendingClientTools.keys()]) this.clearPendingTool(id);
    try {
      this.live?.close();
    } catch {}
    this.send({ type: 'ended', reason });
    try {
      this.ws.close();
    } catch {}
    this.log.log(`session end user=${this.user.id ?? 'visitor'} after ${Math.round((Date.now() - this.startedAt) / 1000)}s (${reason})`);
    this.opts.onEnd();
  }
}
