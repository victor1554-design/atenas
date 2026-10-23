// Web Audio synthesized sound effects for TikTok Soccer Battle
class SoccerSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.7;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  // Quick pleasant ding for small points (Heart +1)
  public playHeartSound() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(this.volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // Nice double chime for Rose (+5)
  public playRoseSound() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [0, 0.08].forEach((delay, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 659.25 : 987.77, now + delay);

        gain.gain.setValueAtTime(this.volume * 0.35, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.27);
      });
    } catch {}
  }

  // Energetic bouncy chord for Donut (+10)
  public playDonutSound() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(this.volume * 0.35, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.32);
      });
    } catch {}
  }

  // Epic Goal Horn & Stadium Roar for Lion (+150 pts!)
  public playLionSound() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Stadium Horn (Dual brassy saws)
      [146.83, 220, 293.66].forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.setValueAtTime(freq * 1.05, now + 0.4);

        gain.gain.setValueAtTime(this.volume * 0.3, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 1.25);
      });

      // 2. Crowd roar burst (filtered noise)
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.Q.setValueAtTime(2.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(this.volume * 0.45, now + 0.3);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 1.5);
    } catch {}
  }

  // Referee whistle when team switches leader or joins
  public playWhistleSound() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.linearRampToValueAtTime(2600, now + 0.08);
      osc.frequency.linearRampToValueAtTime(2350, now + 0.2);

      gain.gain.setValueAtTime(this.volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {}
  }

  // Triumphant Fanfare when a team wins the round
  public playVictoryFanfare() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Fanfare sequence: C4 - G4 - C5 - E5 - G5
      const notes = [
        { freq: 261.63, delay: 0, dur: 0.15 },
        { freq: 392.0, delay: 0.15, dur: 0.15 },
        { freq: 523.25, delay: 0.3, dur: 0.2 },
        { freq: 659.25, delay: 0.5, dur: 0.2 },
        { freq: 783.99, delay: 0.7, dur: 0.9 },
      ];

      notes.forEach((note) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.freq, now + note.delay);

        gain.gain.setValueAtTime(this.volume * 0.35, now + note.delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + note.dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + note.delay);
        osc.stop(now + note.delay + note.dur + 0.05);
      });
    } catch {}
  }
}

export const soccerAudio = new SoccerSoundEngine();
