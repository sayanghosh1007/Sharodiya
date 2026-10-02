// Authentic Bengali Durga Puja "Dhak" (ঢাক) & Ambient Sound Synthesizer
// Pure Web Audio API - Zero external audio file dependencies, instant zero-latency playback

export class DhakAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.tempo = 118; // BPM
    this.timerId = null;
    this.step = 0;
    this.volume = 0.45;
    this.masterGain = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // Synthesize "Dha" (Deep resonance bass membrane hit)
  playDha(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(58, time + 0.18);

    // Click attack
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.36);
  }

  // Synthesize "Tin" / "Ta" (Crisp rim stick slap)
  playTin(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, time);
    osc.frequency.exponentialRampToValueAtTime(180, time + 0.08);

    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  // Synthesize "Kashi" (Traditional brass cymbal/gong accent)
  playKashi(time) {
    if (!this.ctx) return;
    // Dual high overtone metallic oscillators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1240, time);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2480, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.setValueAtTime(6.0, time);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.46);
    osc2.stop(time + 0.46);
  }

  // Synthesize Shankho (Conch Shell) Divine Tone
  playConch() {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(460, now + 0.8);
    osc.frequency.linearRampToValueAtTime(450, now + 2.2);
    osc.frequency.linearRampToValueAtTime(310, now + 3.0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 3.3);
  }

  start() {
    this.ensureContext();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.step = 0;

    const intervalMs = (60 / this.tempo / 4) * 1000; // 16th note subdivisions

    this.timerId = setInterval(() => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;

      // 16-step traditional Durga Puja Dhak rhythm pattern
      // Step: 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
      // Dha:  X     X        X     X     X     X     X
      // Tin:     X     X  X     X     X     X     X     X  X
      // Kashi:X        X        X        X        X
      const s = this.step % 16;

      if (s === 0 || s === 3 || s === 6 || s === 8 || s === 11 || s === 14) {
        this.playDha(now);
      }
      if (s === 1 || s === 4 || s === 5 || s === 7 || s === 9 || s === 12 || s === 15) {
        this.playTin(now);
      }
      if (s === 0 || s === 4 || s === 8 || s === 12) {
        this.playKashi(now);
      }

      this.step++;
    }, intervalMs);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }
}
