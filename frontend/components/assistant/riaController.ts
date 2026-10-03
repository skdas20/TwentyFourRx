import { MicCapture, PcmPlayer } from './audio';
import { clearHighlight, getPageSnapshot, runUiTool, UiToolDeps } from './uiTools';

export type RiaStatus = 'idle' | 'resumable' | 'connecting' | 'listening' | 'speaking' | 'error';

export interface RiaState {
  status: RiaStatus;
  muted: boolean;
  /** Short status line under the name, e.g. "Checking your account…". */
  activity: string;
  /** Live captions of the current exchange. */
  userText: string;
  riaText: string;
  error: string;
  /** 0..1 meter values for the visualiser. */
  micLevel: number;
  outLevel: number;
  /** True while the user is not logged in (short, basic-help mode). */
  guest: boolean;
  /** Shown after a session ends, e.g. 'login' = ask the user to log in to continue. */
  notice: '' | 'login';
}

const STORAGE_KEY = 'ria.session';
const RESUME_WINDOW_MS = 10 * 60_000;
const IDLE_TIMEOUT_MS = 2 * 60_000;

const DATA_TOOL_ACTIVITY: Record<string, string> = {
  get_my_account: 'Checking your account…',
  get_my_selling: 'Looking at your listings…',
  get_my_buying: 'Looking at your purchases…',
  get_my_deliveries: 'Checking your deliveries…',
  get_my_notifications: 'Reading your notifications…',
  get_my_support_tickets: 'Checking your tickets…',
};

function wsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_ASSISTANT_WS_URL;
  if (configured) return configured;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/api/v1/assistant/live`;
}

function readToken(): string | null {
  try {
    return localStorage.getItem('accessToken') || null;
  } catch {
    return null;
  }
}

function readStored(): { handle?: string; at?: number } | null {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeStored(value: { handle?: string; at: number } | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Owns one Ria voice session: mic → backend WebSocket → Gemini Live, audio
 * playback, and the browser tools. Lives outside React so the session
 * survives client-side navigation; the widget subscribes to its state.
 */
export class RiaController {
  private state: RiaState = {
    status: 'idle',
    muted: false,
    activity: '',
    userText: '',
    riaText: '',
    error: '',
    micLevel: 0,
    outLevel: 0,
    guest: true,
    notice: '',
  };
  private listeners = new Set<() => void>();
  private ws?: WebSocket;
  private mic?: MicCapture;
  private player?: PcmPlayer;
  private deps?: UiToolDeps;
  private token: string | null = null;
  private path = '/';
  private handle?: string;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private userTurnOpen = false;
  private riaTurnOpen = false;

  // ── store plumbing (useSyncExternalStore) ──
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = () => this.state;
  private set(patch: Partial<RiaState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  get active() {
    return this.state.status === 'connecting' || this.state.status === 'listening' || this.state.status === 'speaking';
  }

  /** Called once by the widget on mount. */
  init(deps: UiToolDeps) {
    this.deps = deps;
    this.path = deps.getPath();
    const stored = readStored();
    if (stored?.handle && stored.at && Date.now() - stored.at < RESUME_WINDOW_MS && this.state.status === 'idle') {
      this.handle = stored.handle;
      this.set({ status: 'resumable' });
    }
  }

  // ── lifecycle ──

  /** Must be called from a click (audio autoplay + mic permission). */
  async start(resume = false) {
    if (this.active) return;
    if (!resume) this.handle = undefined;
    // Always open with the mic live.
    this.set({ status: 'connecting', activity: 'Connecting…', error: '', userText: '', riaText: '', muted: false, notice: '' });

    this.player = new PcmPlayer({
      sampleRate: 24000,
      onPlayingChange: (playing) => {
        if (!this.active) return;
        this.set({ status: playing ? 'speaking' : 'listening', activity: playing ? '' : this.state.activity });
        this.bumpIdle();
      },
      onLevel: (outLevel) => this.set({ outLevel }),
    });
    this.mic = new MicCapture({
      onChunk: (data) => this.sendRaw({ type: 'audio', data }),
      onLevel: (micLevel) => this.set({ micLevel }),
    });

    try {
      await Promise.all([this.player.resume(), this.mic.start()]);
    } catch (e: any) {
      return this.fail(e?.message || 'Could not access the microphone.');
    }
    this.mic.setMuted(false);

    this.token = readToken();
    const ws = new WebSocket(wsUrl());
    this.ws = ws;
    ws.onopen = () =>
      ws.send(JSON.stringify({ type: 'start', token: this.token, path: this.path, handle: resume ? this.handle : undefined }));
    ws.onmessage = (ev) => this.onMessage(ev.data);
    ws.onerror = () => this.ws === ws && this.fail('Could not reach Ria. Check your connection and try again.');
    ws.onclose = () => {
      if (this.ws === ws && this.active) this.fail('Ria got disconnected.');
    };
  }

  stop() {
    this.sendRaw({ type: 'stop' });
    this.teardown();
    writeStored(null);
    this.handle = undefined;
    this.set({ status: 'idle', activity: '', micLevel: 0, outLevel: 0 });
  }

  dismissResume() {
    writeStored(null);
    this.handle = undefined;
    this.set({ status: 'idle' });
  }

  toggleMute() {
    const muted = !this.state.muted;
    this.mic?.setMuted(muted);
    if (muted) this.sendRaw({ type: 'audio_end' });
    this.set({ muted, micLevel: 0 });
  }

  sendText(text: string) {
    const t = text.trim();
    if (!t || !this.active) return;
    this.player?.interrupt();
    this.set({ userText: t, riaText: '' });
    this.userTurnOpen = false;
    this.sendRaw({ type: 'text', text: t });
    this.bumpIdle();
  }

  /** Widget calls this on every route change. */
  onRouteChange(path: string) {
    if (path === this.path) return;
    this.path = path;
    if (!this.active) return;
    // Give the new page a moment to render so the title is meaningful.
    setTimeout(() => {
      if (!this.active || this.path !== path) return;
      const snap = getPageSnapshot();
      this.sendRaw({ type: 'context', path, note: `The user is now on page ${path} (${snap.title}).` });
      this.syncAuth();
    }, 700);
  }

  /** Re-check the login token (login/logout don't emit events). */
  syncAuth() {
    const token = readToken();
    if (token === this.token) return;
    this.token = token;
    this.sendRaw({ type: 'auth', token });
  }

  // ── internals ──

  private sendRaw(msg: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private async onMessage(raw: string) {
    let m: any;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    switch (m.type) {
      case 'ready':
        this.set({ status: 'listening', activity: '', guest: !m.user?.loggedIn });
        this.bumpIdle();
        break;
      case 'mode':
        this.set({ guest: !m.loggedIn });
        break;
      case 'audio':
        this.player?.enqueue(m.data);
        break;
      case 'interrupted':
        this.player?.interrupt();
        break;
      case 'transcript':
        this.onTranscript(m.role, m.text);
        break;
      case 'turn_complete':
        this.riaTurnOpen = false;
        this.userTurnOpen = false;
        if (this.state.activity) this.set({ activity: '' });
        break;
      case 'tool_activity':
        this.set({ activity: DATA_TOOL_ACTIVITY[m.name] ?? 'One moment…' });
        break;
      case 'tool_call':
        await this.runTool(m.id, m.name, m.args ?? {});
        break;
      case 'resume_handle':
        this.handle = m.handle;
        writeStored({ handle: m.handle, at: Date.now() });
        break;
      case 'error':
        if (m.reason === 'guest_busy') {
          this.teardown();
          writeStored(null);
          this.set({ status: 'idle', activity: '', notice: 'login' });
        } else if (m.fatal) this.fail(m.message);
        break;
      case 'ended':
        if (this.active) this.finish(m.reason === 'guest_limit' ? 'login' : '');
        break;
    }
  }

  private onTranscript(role: 'user' | 'model', text: string) {
    if (role === 'user') {
      // A new user utterance starts a fresh caption pair.
      if (!this.userTurnOpen) {
        this.userTurnOpen = true;
        this.riaTurnOpen = false;
        this.set({ userText: text, riaText: '' });
      } else {
        this.set({ userText: this.state.userText + text });
      }
      this.bumpIdle();
    } else {
      if (!this.riaTurnOpen) {
        this.riaTurnOpen = true;
        this.userTurnOpen = false;
        this.set({ riaText: text });
      } else {
        this.set({ riaText: this.state.riaText + text });
      }
    }
  }

  private async runTool(id: string, name: string, args: Record<string, any>) {
    if (!this.deps) return;
    let result: Record<string, unknown>;
    try {
      result = await runUiTool(name, args, this.deps);
    } catch (e: any) {
      result = { ok: false, error: e?.message || 'Tool failed' };
    }
    if (name === 'navigate' && typeof result.path === 'string') this.path = result.path;
    this.sendRaw({ type: 'tool_result', id, result });
    // Navigation may have logged the user in/out (e.g. after the login page).
    if (name === 'navigate') this.syncAuth();
  }

  /** End after Ria's last sentence has finished playing (max 10 s). */
  private async finish(notice: RiaState['notice']) {
    // Detach first so the server's socket close isn't reported as an error.
    const ws = this.ws;
    this.ws = undefined;
    try {
      ws?.close();
    } catch {}
    this.mic?.stop();
    this.mic = undefined;
    const player = this.player;
    for (let i = 0; i < 50 && player?.playing; i++) await new Promise((r) => setTimeout(r, 200));
    this.teardown();
    writeStored(null);
    this.handle = undefined;
    this.set({ status: 'idle', activity: '', micLevel: 0, outLevel: 0, notice });
  }

  dismissNotice() {
    this.set({ notice: '' });
  }

  /** Auto-sleep after a quiet spell so the mic isn't left open by accident. */
  private bumpIdle() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.state.status === 'listening') this.stop();
    }, IDLE_TIMEOUT_MS);
  }

  private fail(message: string) {
    this.teardown();
    this.set({ status: 'error', error: message, activity: '', micLevel: 0, outLevel: 0 });
  }

  private teardown() {
    clearTimeout(this.idleTimer);
    const ws = this.ws;
    this.ws = undefined;
    try {
      ws?.close();
    } catch {}
    this.mic?.stop();
    this.mic = undefined;
    this.player?.close();
    this.player = undefined;
    clearHighlight();
    this.userTurnOpen = this.riaTurnOpen = false;
  }
}

/** One controller per tab, shared across route changes. */
export const ria = typeof window !== 'undefined' ? new RiaController() : (null as unknown as RiaController);

// Expose for local debugging / browser tests only.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__ria = ria;
}
