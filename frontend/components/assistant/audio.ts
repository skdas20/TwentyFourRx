/**
 * Ria browser audio engine.
 *
 * - MicCapture: mic -> AudioWorklet (/ria/mic-processor.js) -> base64 PCM16 @16 kHz mono, ~40 ms chunks.
 * - PcmPlayer:  base64 PCM16 mono chunks (default 24 kHz) -> gapless scheduled playback, instant interrupt.
 *
 * SSR-safe: nothing touches `window` / `AudioContext` at module load; everything is created lazily.
 */

const MIC_WORKLET_URL = '/ria/mic-processor.js';
const MIC_TARGET_RATE = 16000;
const MIC_CHUNK_SAMPLES = 640; // 40 ms @ 16 kHz

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor {
  if (typeof window === 'undefined') throw new Error('Audio is only available in the browser');
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  const Ctor = w.AudioContext || w.webkitAudioContext;
  if (!Ctor) throw new Error('This browser does not support Web Audio');
  return Ctor;
}

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[],
    );
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decodes Int16 little-endian PCM bytes to Float32 samples in [-1, 1). */
function pcm16ToFloat32(bytes: Uint8Array): Float32Array<ArrayBuffer> {
  const n = bytes.length >> 1; // drop a trailing odd byte, if any
  const out = new Float32Array(n);
  const view = new DataView(bytes.buffer, bytes.byteOffset, n * 2);
  for (let i = 0; i < n; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}

function friendlyMicError(err: unknown): Error {
  const name = (err as { name?: string } | null)?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new Error('Microphone permission was denied');
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return new Error('No microphone was found');
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new Error('The microphone is unavailable (it may be in use by another app)');
    default:
      return err instanceof Error ? err : new Error('Could not access the microphone');
  }
}

// ---------------------------------------------------------------------------
// MicCapture
// ---------------------------------------------------------------------------

/** Captures the microphone and emits base64 PCM16 @16 kHz chunks (~40 ms). */
export class MicCapture {
  private readonly onChunk: (base64: string) => void;
  private readonly onLevel?: (rms: number) => void;

  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;

  private _muted = false;
  private startPromise: Promise<void> | null = null;
  /** Bumped on stop() so an in-flight start() knows to bail out. */
  private generation = 0;

  constructor(opts: { onChunk: (base64: string) => void; onLevel?: (rms: number) => void }) {
    this.onChunk = opts.onChunk;
    this.onLevel = opts.onLevel;
  }

  /** Requests the mic (echoCancellation, noiseSuppression, autoGainControl all true, channelCount 1). Throws a friendly Error on permission denial ("Microphone permission was denied") or no device. */
  start(): Promise<void> {
    if (this.node) return Promise.resolve();
    if (this.startPromise) return this.startPromise;
    const p = this.doStart().finally(() => {
      if (this.startPromise === p) this.startPromise = null;
    });
    this.startPromise = p;
    return p;
  }

  private async doStart(): Promise<void> {
    const gen = ++this.generation;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access requires a secure (HTTPS) connection and a supported browser');
    }

    // Create the context synchronously (still inside the user gesture) so it isn't born suspended.
    const Ctor = getAudioContextCtor();
    const ctx = new Ctor();
    this.ctx = ctx;
    const resumeP = ctx.resume().catch(() => undefined);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
    } catch (err) {
      if (gen === this.generation) this.teardown();
      throw friendlyMicError(err);
    }

    if (gen !== this.generation) {
      // stop() was called while we were waiting for permission.
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;

    try {
      if (!ctx.audioWorklet) throw new Error('This browser does not support AudioWorklet');
      await ctx.audioWorklet.addModule(MIC_WORKLET_URL);
      await resumeP;
    } catch (err) {
      if (gen === this.generation) this.teardown();
      throw err instanceof Error ? err : new Error('Failed to start the audio processor');
    }
    if (gen !== this.generation) return;

    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, 'ria-mic-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      channelCount: 1,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      processorOptions: {
        targetRate: MIC_TARGET_RATE,
        chunkSize: MIC_CHUNK_SAMPLES,
        muted: this._muted,
      },
    });

    node.port.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d instanceof ArrayBuffer) {
        if (!this._muted) this.onChunk(bytesToBase64(new Uint8Array(d)));
      } else if (d && typeof d.level === 'number') {
        if (!this._muted) this.onLevel?.(d.level);
      }
    };

    // Route through a zero-gain node to the destination so Chrome keeps pulling the worklet,
    // without the mic ever being audible.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    source.connect(node);
    node.connect(sink);
    sink.connect(ctx.destination);

    this.source = source;
    this.node = node;
    this.sink = sink;

    // If the user unplugs the mic / revokes permission, the track ends.
    stream.getAudioTracks().forEach((t) => {
      t.onended = () => {
        if (gen === this.generation) this.stop();
      };
    });
  }

  setMuted(muted: boolean): void {
    if (this._muted === muted) return;
    this._muted = muted;
    this.node?.port.postMessage({ muted });
    if (muted) this.onLevel?.(0);
  }

  get muted(): boolean {
    return this._muted;
  }

  /** Stops tracks, disconnects nodes, closes its AudioContext. Idempotent. */
  stop(): void {
    this.generation++;
    this.startPromise = null;
    this.teardown();
  }

  private teardown(): void {
    if (this.node) {
      this.node.port.onmessage = null;
      try {
        this.node.port.close();
      } catch {
        /* ignore */
      }
    }
    for (const n of [this.source, this.node, this.sink]) {
      try {
        n?.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.source = null;
    this.node = null;
    this.sink = null;

    if (this.stream) {
      this.stream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.stream = null;
    }

    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      if (ctx.state !== 'closed') ctx.close().catch(() => undefined);
    }
  }
}

// ---------------------------------------------------------------------------
// PcmPlayer
// ---------------------------------------------------------------------------

/** Gapless playback of base64 PCM16 mono chunks (default 24 kHz) with instant interruption. */
export class PcmPlayer {
  private readonly sampleRate: number;
  private readonly onPlayingChange?: (playing: boolean) => void;
  private readonly onLevel?: (rms: number) => void;

  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserBuf: Float32Array<ArrayBuffer> | null = null;

  private readonly sources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private _playing = false;
  private levelTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  constructor(opts?: {
    sampleRate?: number;
    onPlayingChange?: (playing: boolean) => void;
    onLevel?: (rms: number) => void;
  }) {
    this.sampleRate = opts?.sampleRate ?? 24000;
    this.onPlayingChange = opts?.onPlayingChange;
    this.onLevel = opts?.onLevel;
  }

  /** Lazily creates the AudioContext + output graph. */
  private ensureContext(): AudioContext | null {
    if (this.closed) return null;
    if (this.ctx) return this.ctx;

    const Ctor = getAudioContextCtor();
    let ctx: AudioContext;
    try {
      ctx = new Ctor({ sampleRate: this.sampleRate });
    } catch {
      // Some browsers reject non-native rates; buffers created at this.sampleRate are
      // resampled by the browser automatically.
      ctx = new Ctor();
    }

    const output = ctx.createGain();
    output.gain.value = 1;
    if (this.onLevel) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      output.connect(analyser);
      analyser.connect(ctx.destination);
      this.analyser = analyser;
      this.analyserBuf = new Float32Array(analyser.fftSize);
    } else {
      output.connect(ctx.destination);
    }

    this.ctx = ctx;
    this.output = output;
    return ctx;
  }

  /** Must be called from a user gesture at least once (autoplay policy). Safe to call repeatedly. */
  async resume(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* still suspended; needsGesture stays true */
      }
    }
  }

  /** True if the AudioContext is suspended (needs a user gesture). */
  get needsGesture(): boolean {
    if (this.closed) return false;
    return !this.ctx || this.ctx.state !== 'running';
  }

  enqueue(base64: string): void {
    if (!base64) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.output) return;

    let samples: Float32Array<ArrayBuffer>;
    try {
      samples = pcm16ToFloat32(base64ToBytes(base64));
    } catch {
      return; // malformed chunk
    }
    if (samples.length === 0) return;

    const buffer = ctx.createBuffer(1, samples.length, this.sampleRate);
    buffer.copyToChannel(samples, 0);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.output);

    const startAt = Math.max(ctx.currentTime + 0.02, this.nextStartTime);
    src.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    this.sources.add(src);
    src.onended = () => {
      try {
        src.disconnect();
      } catch {
        /* ignore */
      }
      // If interrupt() already cleared this source, nothing to do.
      if (!this.sources.delete(src)) return;
      if (this.sources.size === 0) this.setPlaying(false);
    };

    this.setPlaying(true);
  }

  /** Immediately stops everything scheduled/playing (used when the user barges in). */
  interrupt(): void {
    const srcs = Array.from(this.sources);
    this.sources.clear();
    for (const src of srcs) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* not started / already stopped */
      }
      try {
        src.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.nextStartTime = 0;
    this.setPlaying(false);
  }

  get playing(): boolean {
    return this._playing;
  }

  close(): void {
    if (this.closed) return;
    this.interrupt();
    this.closed = true;
    this.stopLevelLoop();
    try {
      this.output?.disconnect();
      this.analyser?.disconnect();
    } catch {
      /* ignore */
    }
    this.output = null;
    this.analyser = null;
    this.analyserBuf = null;
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      if (ctx.state !== 'closed') ctx.close().catch(() => undefined);
    }
  }

  private setPlaying(playing: boolean): void {
    if (this._playing === playing) return;
    this._playing = playing;
    if (playing) this.startLevelLoop();
    else this.stopLevelLoop();
    this.onPlayingChange?.(playing);
  }

  private startLevelLoop(): void {
    if (!this.onLevel || !this.analyser || this.levelTimer) return;
    this.levelTimer = setInterval(() => {
      const a = this.analyser;
      const buf = this.analyserBuf;
      if (!a || !buf) return;
      a.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      this.onLevel?.(Math.sqrt(sum / buf.length));
    }, 100);
  }

  private stopLevelLoop(): void {
    if (this.levelTimer) {
      clearInterval(this.levelTimer);
      this.levelTimer = null;
      this.onLevel?.(0);
    }
  }
}
