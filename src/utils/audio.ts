import type { PlotterSoundId } from '../types/tiktok';

/**
 * Web Audio API synthesizer for zero-dependency sound effects.
 * Safe for browser sandbox without relying on external mp3 assets.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private plotterSound: PlotterSoundId = 'pencil';
  private plotterVolume: number = 0.8;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setPlotterSound(id: PlotterSoundId) {
    this.plotterSound = id;
  }

  public setPlotterVolume(vol: number) {
    this.plotterVolume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Continuous gentle pencil scribble sound
   */
  public playPencilScratch(level = 1) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const bufferSize = ctx.sampleRate * 0.12; // 120ms buffer
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.45;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200 + Math.random() * 800, ctx.currentTime);
      filter.Q.setValueAtTime(3.0, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.0001, 0.22 * this.volume * level), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
    } catch {
      // Audio might be blocked until user gesture
    }
  }

  /**
   * Plays the selected plotter drawing sound for `durationMs`. Returns a function
   * that stops it early (e.g. when the drawing is cancelled).
   */
  public startDrawingSound(durationMs: number): () => void {
    const noop = () => {};
    if (!this.enabled || this.plotterSound === 'off') return noop;
    const ctx = this.getContext();
    if (!ctx) return noop;

    const stops: (() => void)[] = [];
    if (this.plotterSound === 'pencil') {
      stops.push(this.startPencilLoop(durationMs));
    }
    if (this.plotterSound !== 'pencil') {
      try {
        stops.push(this.startSynthLayer(ctx, durationMs));
      } catch {
        // Audio might be blocked until user gesture
      }
    }
    return () => stops.forEach((stop) => stop());
  }

  /** Short sample of the selected plotter sound, for the settings preview button */
  public previewDrawingSound() {
    this.startDrawingSound(1500);
  }

  // Original pencil scribble, repeated every 180ms
  private startPencilLoop(durationMs: number): () => void {
    this.playPencilScratch(this.plotterVolume);
    const interval = setInterval(() => this.playPencilScratch(this.plotterVolume), 180);
    const timeout = setTimeout(() => clearInterval(interval), durationMs);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }

  // Web Audio layer for the dot matrix / felt pen sounds
  private startSynthLayer(ctx: AudioContext, durationMs: number): () => void {
    const now = ctx.currentTime;
    const end = now + durationMs / 1000;
    const level = 0.1 * this.volume * this.plotterVolume;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(level, now + 0.05);
    master.gain.setValueAtTime(level, Math.max(now + 0.05, end - 0.08));
    master.gain.linearRampToValueAtTime(0, end);
    master.connect(ctx.destination);

    const sources: AudioScheduledSourceNode[] = [];
    const noiseSource = (lengthSec: number) => {
      const len = Math.ceil(ctx.sampleRate * lengthSec);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      return src;
    };
    // Gate `input` on/off with a square LFO at `rate` Hz
    const gated = (input: AudioNode, rate: number, depth: number) => {
      const gate = ctx.createGain();
      gate.gain.setValueAtTime(0, now);
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(rate, now);
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.setValueAtTime(depth, now);
      lfo.connect(lfoDepth);
      lfoDepth.connect(gate.gain);
      input.connect(gate);
      sources.push(lfo);
      return gate;
    };

    if (this.plotterSound === 'dot_matrix') {
      // Fast needle hits in bursts, with a short pause per printed line
      const needle = ctx.createOscillator();
      needle.type = 'square';
      needle.frequency.setValueAtTime(1800, now);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.setValueAtTime(2400, now);
      band.Q.setValueAtTime(2, now);
      needle.connect(band);
      const line = ctx.createGain();
      line.gain.setValueAtTime(1, now);
      for (let t = now + 0.3; t < end; t += 0.35) {
        line.gain.setValueAtTime(0, t);
        line.gain.setValueAtTime(1, t + 0.05);
      }
      gated(band, 45, 0.6).connect(line);
      line.connect(master);
      sources.push(needle);
    } else if (this.plotterSound === 'pen_plotter') {
      // Soft felt-tip friction with gentle strokes + low carriage hum
      const noise = noiseSource(durationMs / 1000);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.setValueAtTime(900, now);
      band.Q.setValueAtTime(0.8, now);
      const stroke = ctx.createGain();
      stroke.gain.setValueAtTime(0.4, now);
      for (let t = now + 0.15; t < end; t += 0.15) {
        stroke.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.75, t);
      }
      noise.connect(band);
      band.connect(stroke);
      stroke.connect(master);

      const hum = ctx.createOscillator();
      hum.type = 'sine';
      hum.frequency.setValueAtTime(95, now);
      const humGain = ctx.createGain();
      humGain.gain.setValueAtTime(0.5, now);
      hum.connect(humGain);
      humGain.connect(master);
      sources.push(noise, hum);
    }

    sources.forEach((src) => {
      src.start(now);
      src.stop(end + 0.05);
    });

    return () => {
      try {
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0, t + 0.05);
        sources.forEach((src) => src.stop(t + 0.06));
      } catch {
        // Already stopped
      }
    };
  }

  /**
   * Mechanical printer paper step / feed sound
   */
  public playPaperFeedSound() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.06 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // Audio error suppressed
    }
  }

  /**
   * Completed regular drawing chime
   */
  public playDrawComplete(tier: 'heart' | 'flower' | 'donut') {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const baseFreq = tier === 'heart' ? 440 : tier === 'flower' ? 523.25 : 659.25;
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.15 * this.volume, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.28);
      });
    } catch {
      // Audio error suppressed
    }
  }

  /**
   * Epic fanfare for Big Gift "GOOT" fullscreen takeover
   */
  public playGootFanfare() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Dramatic brass arpeggio (C4 - E4 - G4 - C5 - E5 - G5 with power)
      const frequencies = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = i === frequencies.length - 1 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);

        const startTime = ctx.currentTime + i * 0.09;
        const duration = i === frequencies.length - 1 ? 1.2 : 0.25;

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.linearRampToValueAtTime(0.22 * this.volume, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      });
    } catch {
      // Audio error suppressed
    }
  }
}

export const soundEngine = new SoundEngine();
