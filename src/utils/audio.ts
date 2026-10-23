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

  /**
   * Helper: Synthesize a single firework rocket whistle + explosion crackle
   */
  private triggerSingleFireworkAudio(
    ctx: AudioContext,
    delaySec: number = 0,
    pitchMultiplier: number = 1,
    gainScale: number = 1
  ) {
    const start = ctx.currentTime + delaySec;

    // 1. Rising rocket whistle ("fiuuuu")
    const whistleOsc = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    whistleOsc.type = 'sine';
    whistleOsc.frequency.setValueAtTime(520 * pitchMultiplier, start);
    whistleOsc.frequency.exponentialRampToValueAtTime(1680 * pitchMultiplier, start + 0.28);

    whistleGain.gain.setValueAtTime(0.001, start);
    whistleGain.gain.linearRampToValueAtTime(0.11 * this.volume * gainScale, start + 0.05);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, start + 0.29);

    whistleOsc.connect(whistleGain);
    whistleGain.connect(ctx.destination);
    whistleOsc.start(start);
    whistleOsc.stop(start + 0.3);

    // 2. Explosion boom + crackle burst at start + 0.28s
    const boomTime = start + 0.28;
    const bufferSize = Math.floor(ctx.sampleRate * 0.45);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.pow(1 - i / bufferSize, 1.4);
      // Add crackle spikes
      const crackle = Math.random() > 0.85 ? 1.8 : 0.6;
      output[i] = (Math.random() * 2 - 1) * env * crackle;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950 * pitchMultiplier, boomTime);
    filter.Q.setValueAtTime(0.9, boomTime);

    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.28 * this.volume * gainScale, boomTime);
    boomGain.gain.exponentialRampToValueAtTime(0.001, boomTime + 0.44);

    noise.connect(filter);
    filter.connect(boomGain);
    boomGain.connect(ctx.destination);
    noise.start(boomTime);
  }

  /**
   * Helper: Synthesize a loud carnival "chicharra" (buzzer / wooden rattle ratchet)
   */
  private triggerChicharraAudio(ctx: AudioContext, delaySec: number = 0, durationSec: number = 0.75) {
    const start = ctx.currentTime + delaySec;

    // Rapid harsh sawtooth + square buzzer modulated by ratchet pulses
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const masterGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(145, start);
    osc2.frequency.setValueAtTime(295, start);

    // Ratchet clicks (fast FM / frequency wobble)
    const steps = Math.floor(durationSec * 28);
    for (let i = 0; i < steps; i++) {
      const t = start + i * (durationSec / steps);
      const mod = i % 2 === 0 ? 1.15 : 0.88;
      osc1.frequency.setValueAtTime(145 * mod, t);
      osc2.frequency.setValueAtTime(295 * mod, t);
    }

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1350, start);
    filter.Q.setValueAtTime(2.2, start);

    masterGain.gain.setValueAtTime(0.001, start);
    masterGain.gain.linearRampToValueAtTime(0.26 * this.volume, start + 0.03);
    masterGain.gain.setValueAtTime(0.26 * this.volume, start + durationSec - 0.08);
    masterGain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(start + durationSec + 0.02);
    osc2.stop(start + durationSec + 0.02);
  }

  /**
   * 1. MARCO DORADO: 1 Firework launch + pop + golden chime
   */
  public playGoldFireworkSound() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      this.triggerSingleFireworkAudio(ctx, 0, 1.0, 1.0);

      // Golden sparkle chime after explosion
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + 0.28 + idx * 0.06;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.14 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    } catch {
      // Audio error suppressed
    }
  }

  /**
   * 2. MARCO ESMERALDA: Firework + Chicharra buzzer sound
   */
  public playEmeraldChicharraSound() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Firework launch & burst
      this.triggerSingleFireworkAudio(ctx, 0, 1.08, 1.05);
      // Distinct Chicharra sound right after firework launch
      this.triggerChicharraAudio(ctx, 0.18, 0.85);
    } catch {
      // Audio error suppressed
    }
  }

  /**
   * 3. MARCO DIAMANTE: Many Fireworks + Chicharra + Tambores (Drums) + Maracas
   */
  public playDiamondFiestaSound() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Multiple Fireworks barrage (5 distinct launches & explosions)
      const fwDelays = [0, 0.22, 0.45, 0.72, 1.05, 1.35];
      const fwPitches = [0.95, 1.15, 1.02, 1.25, 0.9, 1.32];
      fwDelays.forEach((d, idx) => {
        this.triggerSingleFireworkAudio(ctx, d, fwPitches[idx], 0.9);
      });

      // Chicharra party rattle bursts
      this.triggerChicharraAudio(ctx, 0.1, 0.55);
      this.triggerChicharraAudio(ctx, 0.95, 0.6);

      // Tambores (Festive Tom/Batucada Drum pattern)
      const drumHits = [
        { time: 0.05, pitch: 130 },
        { time: 0.23, pitch: 110 },
        { time: 0.41, pitch: 145 },
        { time: 0.58, pitch: 105 },
        { time: 0.76, pitch: 135 },
        { time: 0.94, pitch: 155 },
        { time: 1.12, pitch: 115 },
        { time: 1.28, pitch: 145 },
        { time: 1.46, pitch: 100 },
        { time: 1.65, pitch: 160 },
      ];
      drumHits.forEach((hit) => {
        const t = ctx.currentTime + hit.time;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(hit.pitch * 1.6, t);
        osc.frequency.exponentialRampToValueAtTime(hit.pitch * 0.55, t + 0.16);

        gain.gain.setValueAtTime(0.32 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });

      // Maracas (High-passed crisp shaker rhythm "chiki-chiki-chiki")
      for (let i = 0; i < 14; i++) {
        const t = ctx.currentTime + 0.04 + i * 0.12;
        const bufLen = Math.floor(ctx.sampleRate * 0.055);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < bufLen; j++) {
          const env = Math.sin((j / bufLen) * Math.PI);
          data[j] = (Math.random() * 2 - 1) * env;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;

        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(4800, t);

        const mGain = ctx.createGain();
        const accent = i % 2 === 0 ? 0.22 : 0.13;
        mGain.gain.setValueAtTime(accent * this.volume, t);
        mGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

        src.connect(hp);
        hp.connect(mGain);
        mGain.connect(ctx.destination);
        src.start(t);
      }
    } catch {
      // Audio error suppressed
    }
  }

  /**
   * 4. MARCO VIP MÍSTICO: Beautiful Heavenly Harp & Angelic Choir Chords + Royal Fireworks
   */
  public playVipHeavenlySound() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Soft royal fireworks launching to draw the name in the sky
      this.triggerSingleFireworkAudio(ctx, 0.05, 1.1, 0.75);
      this.triggerSingleFireworkAudio(ctx, 0.55, 1.25, 0.75);
      this.triggerSingleFireworkAudio(ctx, 1.15, 1.38, 0.75);

      // Warm Angelic Pad / Choir Harmony (C Major 9th dreamy chord: C4, E4, G4, B4, D5)
      const choirFreqs = [261.63, 329.63, 392.0, 493.88, 587.33];
      choirFreqs.forEach((freq) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + 0.05;

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, start);
        // Slight detune for lush angelic chorus effect
        osc2.frequency.setValueAtTime(freq * 1.003, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.085 * this.volume, start + 0.45);
        gain.gain.setValueAtTime(0.085 * this.volume, start + 1.8);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 2.7);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(start);
        osc2.start(start);
        osc1.stop(start + 2.75);
        osc2.stop(start + 2.75);
      });

      // Cascading Celestial Harp / Crystal Bell Arpeggio ("sonidos hermosos")
      const harpNotes = [
        523.25, // C5
        659.25, // E5
        783.99, // G5
        987.77, // B5
        1174.66, // D6
        1318.51, // E6
        1567.98, // G6
        1975.53, // B6
        2093.0, // C7
      ];

      harpNotes.forEach((freq, idx) => {
        const t = ctx.currentTime + 0.12 + idx * 0.16;
        const osc = ctx.createOscillator();
        const bellOsc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        bellOsc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        bellOsc.frequency.setValueAtTime(freq * 2, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.16 * this.volume, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.15);

        osc.connect(gain);
        bellOsc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        bellOsc.start(t);
        osc.stop(t + 1.2);
        bellOsc.stop(t + 1.2);
      });
    } catch {
      // Audio error suppressed
    }
  }
}

export const soundEngine = new SoundEngine();

