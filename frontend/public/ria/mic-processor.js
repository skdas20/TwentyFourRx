/* eslint-disable */
/**
 * Ria mic AudioWorkletProcessor.
 *
 * Input:  mic audio at the AudioContext's native rate (global `sampleRate`, e.g. 48000 / 44100).
 * Output (via port):
 *   - ArrayBuffer: Int16 little-endian PCM, 16 kHz mono, `chunkSize` samples (~40 ms) per message.
 *   - { level: number }: RMS (0..1) of the 16 kHz signal, roughly every 100 ms.
 * Control (via port): { muted: boolean } — while muted nothing is posted.
 *
 * Downsampling uses a fractional box filter (weighted average of every input sample that
 * overlaps each output sample), so non-integer ratios like 44100 -> 16000 are handled and
 * there's basic anti-aliasing.
 */
class RiaMicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetRate = opts.targetRate || 16000;
    this.chunkSize = opts.chunkSize || 640; // 40 ms @ 16 kHz
    this.muted = !!opts.muted;

    this.ratio = sampleRate / this.targetRate; // input samples per output sample
    this.acc = 0; // input weight accumulated toward the current output sample
    this.sum = 0; // weighted sum for the current output sample

    this.out = new Int16Array(this.chunkSize);
    this.outIdx = 0;

    this.levelWindow = Math.round(this.targetRate / 10); // ~100 ms
    this.levelSumSq = 0;
    this.levelCount = 0;

    this.port.onmessage = (e) => {
      const d = e.data;
      if (d && typeof d.muted === 'boolean') {
        this.muted = d.muted;
        this.reset();
      }
    };
  }

  reset() {
    this.acc = 0;
    this.sum = 0;
    this.outIdx = 0;
    this.levelSumSq = 0;
    this.levelCount = 0;
  }

  emit(v) {
    // v is a float in roughly [-1, 1]
    if (v > 1) v = 1;
    else if (v < -1) v = -1;

    this.levelSumSq += v * v;
    this.levelCount++;
    if (this.levelCount >= this.levelWindow) {
      this.port.postMessage({ level: Math.sqrt(this.levelSumSq / this.levelCount) });
      this.levelSumSq = 0;
      this.levelCount = 0;
    }

    this.out[this.outIdx++] = v < 0 ? Math.round(v * 0x8000) : Math.round(v * 0x7fff);
    if (this.outIdx >= this.chunkSize) {
      const buf = this.out.buffer;
      this.port.postMessage(buf, [buf]);
      this.out = new Int16Array(this.chunkSize);
      this.outIdx = 0;
    }
  }

  process(inputs, outputs) {
    // Keep any connected output silent (it only exists to keep the node pulled).
    const output = outputs[0];
    if (output) for (let c = 0; c < output.length; c++) output[c].fill(0);

    if (this.muted) return true;
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channels = input.length;
    const frames = input[0].length;
    const ratio = this.ratio;

    for (let i = 0; i < frames; i++) {
      // Mix down to mono.
      let x = input[0][i];
      if (channels > 1) {
        for (let c = 1; c < channels; c++) x += input[c][i];
        x /= channels;
      }

      // Distribute this sample's unit weight across output bins of width `ratio`.
      let w = 1;
      while (w > 0) {
        const need = ratio - this.acc;
        if (w < need) {
          this.sum += x * w;
          this.acc += w;
          w = 0;
        } else {
          this.sum += x * need;
          this.emit(this.sum / ratio);
          this.sum = 0;
          this.acc = 0;
          w -= need;
          if (w < 1e-9) w = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('ria-mic-processor', RiaMicProcessor);
