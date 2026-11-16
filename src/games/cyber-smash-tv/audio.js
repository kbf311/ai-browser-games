// Retro Arcade Web Audio Synthesizer (Zero external assets required)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmInterval = null;
    this.bgmStep = 0;
    this.bgmPlaying = false;
    this.isBossBgm = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone(freq, endFreq, duration, type = 'square', gainVal = 0.12, delay = 0) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  _noise(duration, gainVal = 0.18, filterFreq = 1200) {
    if (this.muted || !this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  playShoot(weapon = 'NORMAL') {
    if (weapon === 'LASER') {
      this._tone(1100, 260, 0.09, 'sawtooth', 0.08);
    } else if (weapon === 'SPREAD') {
      this._tone(680, 220, 0.08, 'square', 0.07);
    } else if (weapon === 'HOMING') {
      this._tone(520, 880, 0.09, 'triangle', 0.08);
    } else {
      this._tone(780, 280, 0.06, 'square', 0.06);
    }
  }

  playHit() {
    this._tone(240, 120, 0.04, 'triangle', 0.06);
  }

  playExplosion(big = false) {
    if (big) {
      this._noise(0.45, 0.25, 700);
      this._tone(130, 32, 0.4, 'sawtooth', 0.18);
    } else {
      this._noise(0.16, 0.14, 1400);
      this._tone(200, 55, 0.14, 'square', 0.1);
    }
  }

  playPickup(isPowerup = false) {
    if (isPowerup) {
      this._tone(523, 523, 0.07, 'square', 0.1, 0);
      this._tone(659, 659, 0.07, 'square', 0.1, 0.06);
      this._tone(784, 784, 0.07, 'square', 0.1, 0.12);
      this._tone(1046, 1046, 0.14, 'square', 0.11, 0.18);
    } else {
      this._tone(880, 1320, 0.08, 'triangle', 0.09);
    }
  }

  playBomb() {
    this._noise(0.7, 0.3, 950);
    this._tone(180, 28, 0.65, 'sawtooth', 0.22);
    this._tone(440, 55, 0.5, 'square', 0.14, 0.05);
  }

  playPlayerHit() {
    this._noise(0.32, 0.22, 800);
    this._tone(300, 60, 0.3, 'sawtooth', 0.16);
  }

  playDoorOpen() {
    this._tone(330, 440, 0.1, 'square', 0.09, 0);
    this._tone(440, 660, 0.12, 'square', 0.09, 0.1);
    this._tone(660, 880, 0.18, 'square', 0.1, 0.2);
  }

  playBossWarning() {
    for (let i = 0; i < 3; i++) {
      this._tone(440, 220, 0.18, 'sawtooth', 0.13, i * 0.24);
    }
  }

  startBgm(boss = false) {
    this.isBossBgm = boss;
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.bgmStep = 0;

    const normalBass = [110, 110, 130.8, 146.8, 110, 110, 164.8, 146.8];
    const bossBass = [98, 98, 116.5, 98, 130.8, 98, 146.8, 116.5];

    this.bgmInterval = setInterval(() => {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const seq = this.isBossBgm ? bossBass : normalBass;
      const note = seq[this.bgmStep % seq.length];
      this._tone(note, note * 0.96, 0.11, 'sawtooth', 0.038);
      if (this.bgmStep % 2 === 1) {
        this._noise(0.03, 0.025, 5000);
      }
      if (this.bgmStep % 4 === 0) {
        this._tone(65, 35, 0.08, 'sine', 0.07);
      }
      this.bgmStep++;
    }, 135);
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

window.soundEngine = new SoundEngine();

