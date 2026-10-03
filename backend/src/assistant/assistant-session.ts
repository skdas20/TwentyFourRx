import { Logger } from '@nestjs/common';
import { EndSensitivity, GoogleGenAI, LiveServerMessage, Modality, Session, StartSensitivity } from '@google/genai';
import type { WebSocket } from 'ws';
import { AssistantUserContext, buildSystemInstruction } from './assistant.prompt';
import {
  CLIENT_TOOL_NAMES,
  DATA_TOOL_NAMES,
  GUEST_ROUTES,
  PUBLIC_DATA_TOOL_NAMES,
  TOUR_TOOL,
  toolsFor,
} from './assistant.tools';
import { AssistantDataService } from './assistant-data.service';

export interface AssistantUser extends AssistantUserContext {
  id?: string;
}

export interface AssistantLimits {
  memberMs: number;
  guestMs: number;
  /** Spoken answers a guest gets (greeting included) before being asked to log in. */
  guestTurns: number;
}

export interface AssistantSessionOptions {
  ai: GoogleGenAI;
  models: string[];
  voice: string;
  limits: AssistantLimits;
  data: AssistantDataService;
  resolveUser: (token?: string | null) => Promise<AssistantUser>;
  /** Reserve / release one of the limited guest slots. */
  admitGuest: () => boolean;
  releaseGuest: () => void;
  onEnd: () => void;
}

const GUEST_LIMIT_NOTE =
  'The guest limit is reached. In one short sentence, tell them they can log in — or register if they are new — to continue with full help. Do not answer anything else.';

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
  private holdsGuestSlot = false;
  private guestTurns = 0;
  private spokeThisTurn = false;
  private wrappingUp = false;
  /** Server-driven tour: we highlight each step and prompt the model to explain it. */
  private tour?: { steps: { target: string; topic: string }[]; next: number };
  private modelBusy = false;
  private clientPlaying = false;
  private turnAudioMs = 0;
  private playbackFallback?: NodeJS.Timeout;

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
          this.interruptTour();
          this.live?.sendRealtimeInput({ text: msg.text.slice(0, 2000) });
        }
        return;
      case 'playback_idle':
        this.clientPlaying = false;
        return this.advanceTour();
      case 'context':
        if (typeof msg.path === 'string' && msg.path !== this.path) this.cancelTour();
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

    if (!this.user.loggedIn && !this.takeGuestSlot()) {
      this.send({ type: 'error', message: 'Ria is busy right now. Please log in to talk to Ria.', fatal: true, reason: 'guest_busy' });
      return this.close('guest capacity');
    }

    try {
      await this.connectLive();
    } catch (e: any) {
      this.log.error(`Live connect failed: ${e?.message}`);
      this.send({ type: 'error', message: 'Ria is unavailable right now. Please try again in a minute.', fatal: true });
      return this.close('connect failed');
    }

    this.armTimer();
    this.send({ type: 'ready', resumed, user: { loggedIn: this.user.loggedIn, name: this.user.name } });
    this.log.log(`session start user=${this.user.id ?? 'visitor'} resumed=${resumed} path=${this.path}`);

    if (resumed) {
      this.silentContext(`The page was reloaded; the user is now on ${this.path}. Continue where you left off.`);
    } else {
      this.greet();
    }
  }

  private greet() {
    this.prompt(`The user just tapped the Ria button on page ${this.path}. Greet them.`);
  }

  private takeGuestSlot(): boolean {
    if (this.holdsGuestSlot) return true;
    this.holdsGuestSlot = this.opts.admitGuest();
    return this.holdsGuestSlot;
  }

  private releaseGuestSlot() {
    if (!this.holdsGuestSlot) return;
    this.holdsGuestSlot = false;
    this.opts.releaseGuest();
  }

  /** Member sessions get the long limit; guests a short one that ends with a polite wrap-up. */
  private armTimer() {
    clearTimeout(this.maxTimer);
    if (this.user.loggedIn) {
      this.maxTimer = setTimeout(() => {
        this.send({ type: 'error', message: 'Session time limit reached.', fatal: true });
        this.close('max duration');
      }, this.opts.limits.memberMs);
    } else {
      this.maxTimer = setTimeout(() => this.wrapUpGuest(), this.opts.limits.guestMs);
    }
  }

  private wrapUpGuest() {
    if (this.wrappingUp || this.user.loggedIn || this.closed) return;
    this.wrappingUp = true;
    this.prompt(GUEST_LIMIT_NOTE);
    // Hard stop even if the model never answers.
    setTimeout(() => this.endGuest(), 15_000);
  }

  private endGuest() {
    this.close('guest_limit');
  }

  /**
   * Login/logout changes what Ria may do, and Live sessions can't swap their
   * tools or instructions — so start a fresh Live session in the new mode.
   */
  private async updateAuth(token?: string | null) {
    const before = this.user;
    const next = await this.opts.resolveUser(token);
    if (before.id === next.id || this.closed) return;
    this.user = next;

    if (next.loggedIn) {
      this.releaseGuestSlot();
    } else if (!this.takeGuestSlot()) {
      this.send({ type: 'error', message: 'You have been logged out.', fatal: true });
      return this.close('logged out, guest capacity');
    }
    this.guestTurns = 0;
    this.wrappingUp = false;
    this.cancelTour();
    this.modelBusy = false;

    this.reconnecting = true;
    for (const id of [...this.pendingClientTools.keys()]) this.clearPendingTool(id);
    const old = this.live;
    this.live = undefined;
    this.handle = undefined;
    try {
      old?.close();
    } catch {}
    try {
      await this.connectLive();
    } catch (e: any) {
      this.reconnecting = false;
      this.send({ type: 'error', message: 'Ria is unavailable right now. Please try again in a minute.', fatal: true });
      return this.close('mode switch failed');
    }
    this.reconnecting = false;
    this.armTimer();
    this.send({ type: 'mode', loggedIn: next.loggedIn, name: next.name });
    this.log.log(`session mode -> ${next.loggedIn ? `member ${next.id}` : 'guest'}`);
    this.prompt(
      next.loggedIn
        ? `The user just logged in as ${next.name} and is on page ${this.path}. Welcome them by name in one short sentence and ask what they'd like help with.`
        : 'The user just logged out. In one short sentence, say goodbye and that they can log in again anytime.',
    );
  }

  /** Give the model an app instruction that it should respond to now. */
  private prompt(note: string) {
    this.live?.sendClientContent({ turns: [{ role: 'user', parts: [{ text: `[context] ${note}` }] }], turnComplete: true });
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
            tools: [{ functionDeclarations: toolsFor(this.user.loggedIn) }],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.opts.voice } } },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: this.handle ? { handle: this.handle } : {},
            contextWindowCompression: { slidingWindow: {} },
            // Busy offices: don't treat background chatter as the user speaking.
            realtimeInputConfig: {
              automaticActivityDetection: {
                startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
                endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
                prefixPaddingMs: 200,
                silenceDurationMs: 700,
              },
            },
            proactivity: { proactiveAudio: true },
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
        if (part.inlineData?.data) {
          this.spokeThisTurn = true;
          this.modelBusy = true;
          this.clientPlaying = true;
          // 24 kHz 16-bit mono: bytes / 48 per ms.
          this.turnAudioMs += (part.inlineData.data.length * 0.75) / 48;
          this.send({ type: 'audio', data: part.inlineData.data });
        }
      }
      if (sc.inputTranscription?.text) this.send({ type: 'transcript', role: 'user', text: sc.inputTranscription.text });
      if (sc.outputTranscription?.text) this.send({ type: 'transcript', role: 'model', text: sc.outputTranscription.text });
      if (sc.interrupted) {
        this.send({ type: 'interrupted' });
        this.clientPlaying = false;
        this.interruptTour();
      }
      if (sc.turnComplete) {
        this.send({ type: 'turn_complete' });
        this.onTurnComplete();
      }
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

  /** Count guests' spoken answers; tool-call turns complete silently and don't count. */
  private onTurnComplete() {
    const spoke = this.spokeThisTurn;
    this.spokeThisTurn = false;
    this.modelBusy = false;
    // If the browser never reports playback end, assume it after the audio's length.
    clearTimeout(this.playbackFallback);
    if (this.tour) {
      this.playbackFallback = setTimeout(() => {
        this.clientPlaying = false;
        this.advanceTour();
      }, this.turnAudioMs + 2000);
    }
    this.turnAudioMs = 0;
    this.advanceTour();
    if (this.user.loggedIn || !spoke) return;
    if (this.wrappingUp) return this.endGuest();
    this.guestTurns++;
    if (this.guestTurns >= this.opts.limits.guestTurns) this.wrapUpGuest();
  }

  /** Run the next tour step once the model is idle and the user has heard the previous one. */
  private advanceTour() {
    const tour = this.tour;
    if (!tour || this.modelBusy || this.clientPlaying || this.closed) return;
    clearTimeout(this.playbackFallback);

    if (tour.next >= tour.steps.length) {
      this.tour = undefined;
      this.send({ type: 'tool_call', id: 'tour-end', name: 'clear_highlight', args: {} });
      this.modelBusy = true;
      this.prompt('The tour is complete. In one short sentence, wrap up and ask if they have any questions.');
      return;
    }

    const step = tour.steps[tour.next++];
    const k = tour.next;
    const n = tour.steps.length;
    this.send({ type: 'tool_call', id: `tour-${k}`, name: 'highlight', args: { target: step.target } });
    this.modelBusy = true;
    // Watchdog: never let a silent model stall the tour.
    this.playbackFallback = setTimeout(() => {
      this.modelBusy = false;
      this.clientPlaying = false;
      this.advanceTour();
    }, 25_000);
    this.prompt(
      `Tour step ${k} of ${n}: the screen now highlights "${step.target}" — ${step.topic}. Explain it in one or two short sentences. Don't ask a question and don't call any tools.`,
    );
  }

  /** The user spoke or typed mid-tour: stop, and let the model offer to continue. */
  private interruptTour() {
    const tour = this.tour;
    if (!tour) return;
    this.cancelTour();
    const remaining = tour.steps.slice(Math.max(0, tour.next - 1));
    if (remaining.length) {
      this.silentContext(
        `The user interrupted the tour at step ${tour.next} of ${tour.steps.length}. Answer them first. If they want to continue, call start_tour with the remaining steps: ${JSON.stringify(remaining)}`,
      );
    }
  }

  private cancelTour() {
    this.tour = undefined;
    clearTimeout(this.playbackFallback);
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
    // Server-side enforcement — never rely on the prompt alone.
    if (!this.user.loggedIn) {
      if (name === 'fill_field' || DATA_TOOL_NAMES.has(name)) {
        return this.respond(id, name, { error: 'Not available to guests. Ask the user to log in first.' });
      }
      if (name === 'navigate') {
        const target = String(args.path ?? '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
        if (!GUEST_ROUTES.includes(target)) {
          return this.respond(id, name, { ok: false, error: 'Guests can only open public pages. Ask the user to log in first.' });
        }
      }
    }

    if (name === TOUR_TOOL.name) {
      if (!this.user.loggedIn) return this.respond(id, name, { error: 'Tours are available after login.' });
      const steps = (Array.isArray(args.steps) ? args.steps : [])
        .filter((s: any) => s && typeof s.target === 'string')
        .slice(0, 15)
        .map((s: any) => ({ target: String(s.target).slice(0, 100), topic: String(s.topic ?? '').slice(0, 120) }));
      if (!steps.length) return this.respond(id, name, { error: 'No valid steps. Call read_page to get target ids.' });
      this.tour = { steps, next: 0 };
      this.log.log(`tour started: ${steps.length} steps`);
      return this.respond(id, name, {
        ok: true,
        steps: steps.length,
        note: 'Tour started. Say at most one short intro sentence now. The app will highlight each step and prompt you with "Tour step k of n".',
      });
    }

    if (PUBLIC_DATA_TOOL_NAMES.has(name)) {
      this.send({ type: 'tool_activity', name });
      try {
        return this.respond(id, name, { result: await this.opts.data.searchMedicines(args.query) });
      } catch (e: any) {
        this.log.error(`public tool ${name} failed: ${e?.message}`);
        return this.respond(id, name, { error: 'Could not search right now.' });
      }
    }

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
    const result = msg.result && typeof msg.result === 'object' ? { ...msg.result } : { result: msg.result };
    if (pending.name === 'navigate' && typeof msg.result?.path === 'string') {
      this.path = msg.result.path;
      if (this.user.loggedIn && msg.result.ok) {
        result.next =
          'Page loaded. If you are showing the user their items, highlight each relevant element (target ids above; call read_page again if the items are not listed yet — data may still be loading) while you describe it in one sentence.';
      }
    }
    this.respond(msg.id, pending.name, result);
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
    this.cancelTour();
    this.releaseGuestSlot();
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
