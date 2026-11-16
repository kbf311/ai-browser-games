// Web Audio API Chiptune/Synth BGM & SFX Engine
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;

    this.bgmEnabled = true;
    this.sfxEnabled = true;

    this.mode = 'none'; // 'none' | 'wave' | 'boss' | 'warning'
    this.step = 0;
    this.nextNoteTime = 0;
    this.timerId = null;
    this.tempoScale = 1.0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.65;
    compressor.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.bgmEnabled ? 0.42 : 0;
    this.bgmGain.connect(compressor);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxEnabled ? 0.65 : 0;
    this.sfxGain.connect(compressor);

    // Pre-generate white noise buffer for drums & explosions
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 1.0;
    this.noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  unlock() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = enabled;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(enabled ? 0.42 : 0, this.ctx.currentTime, 0.02);
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(enabled ? 0.65 : 0, this.ctx.currentTime, 0.02);
    }
  }

  setTempoScale(scale) {
    this.tempoScale = Math.max(0.8, Math.min(1.45, scale));
  }

  startBgm(mode) {
    this.unlock();
    if (this.mode === mode && this.timerId !== null) return;
    this.mode = mode;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    if (this.timerId === null) {
      this.timerId = setInterval(() => this._scheduler(), 25);
    }
  }

  stopBgm() {
    this.mode = 'none';
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  _midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  _playTone(freq, time, dur, type, vol, targetGain, slideTo = null) {
    if (!this.ctx || freq <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), time + dur);
    }
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(gain);
    gain.connect(targetGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  _playNoise(time, dur, filterFreq, filterType, vol, targetGain) {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(targetGain);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  _scheduler() {
    if (!this.ctx || this.mode === 'none') return;
    const lookahead = 0.12;
    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this._scheduleStep(this.step, this.nextNoteTime);
      const bpm = this.mode === 'boss' ? 156 : this.mode === 'warning' ? 130 : 124 * this.tempoScale;
      const stepDur = (60 / bpm) / 4; // 16th note
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  _scheduleStep(step, t) {
    if (!this.bgmEnabled) return;

    if (this.mode === 'warning') {
      if (step % 8 === 0) {
        this._playTone(520, t, 0.22, 'sawtooth', 0.22, this.bgmGain, 880);
      } else if (step % 8 === 4) {
        this._playTone(880, t, 0.22, 'sawtooth', 0.18, this.bgmGain, 440);
      }
      return;
    }

    if (this.mode === 'wave') {
      // Classic-inspired driving minor synth groove (A minor / F / G / E)
      const roots = [45, 45, 41, 43]; // A2, A2, F2, G2
      const bar = Math.floor(step / 16);
      const root = roots[bar];

      // Bass on 8th notes
      if (step % 2 === 0) {
        const oct = (step % 4 === 2) ? 12 : 0;
        this._playTone(this._midiToFreq(root + oct), t, 0.11, 'sawtooth', 0.22, this.bgmGain);
      }

      // Chiptune arpeggio
      const arpOffsets = [0, 3, 7, 12, 7, 3, 10, 7];
      if (step % 2 === 0) {
        const note = root + 24 + arpOffsets[(step / 2) % arpOffsets.length];
        this._playTone(this._midiToFreq(note), t, 0.09, 'square', 0.09, this.bgmGain);
      }

      // Lead motif on bars 1 & 3
      const lead = [69, 0, 72, 0, 76, 74, 72, 0, 71, 0, 69, 0, 67, 0, 64, 0];
      const leadNote = lead[step % 16];
      if (leadNote > 0 && (bar === 1 || bar === 3)) {
        this._playTone(this._midiToFreq(leadNote), t, 0.14, 'triangle', 0.18, this.bgmGain);
      }

      // Drums
      if (step % 4 === 0) {
        this._playTone(115, t, 0.09, 'sine', 0.3, this.bgmGain, 38);
      }
      if (step % 8 === 4) {
        this._playNoise(t, 0.09, 1800, 'highpass', 0.16, this.bgmGain);
      }
      if (step % 2 === 1) {
        this._playNoise(t, 0.03, 6500, 'highpass', 0.06, this.bgmGain);
      }
      return;
    }

    if (this.mode === 'boss') {
      // Intense Danmaku Boss Theme (D minor -> Bb -> C -> A)
      const roots = [38, 34, 36, 33]; // D2, Bb1, C2, A1
      const bar = Math.floor(step / 16);
      const root = roots[bar];

      // 16th rolling octave bass
      const bassNote = root + (step % 2 === 1 ? 12 : 0);
      this._playTone(this._midiToFreq(bassNote), t, 0.08, 'sawtooth', 0.22, this.bgmGain);

      // Fast 16th danmaku arpeggio
      const arp = [12, 15, 19, 24, 19, 15, 12, 19];
      this._playTone(this._midiToFreq(root + 24 + arp[step % 8]), t, 0.065, 'square', 0.08, this.bgmGain);

      // Urgent Boss Lead
      const bossLead = [
        74, 0, 74, 77, 79, 0, 81, 0, 82, 81, 79, 77, 76, 0, 74, 0,
        70, 0, 70, 74, 77, 0, 79, 0, 77, 76, 74, 72, 74, 0, 76, 0,
      ];
      const l = bossLead[step % 32];
      if (l > 0) {
        this._playTone(this._midiToFreq(l), t, 0.11, 'sawtooth', 0.14, this.bgmGain);
      }

      // Driving double-kick + snare
      if (step % 4 === 0 || step % 16 === 14) {
        this._playTone(135, t, 0.08, 'sine', 0.34, this.bgmGain, 36);
      }
      if (step % 8 === 4) {
        this._playNoise(t, 0.11, 1500, 'bandpass', 0.24, this.bgmGain);
      }
      if (step % 2 === 1) {
        this._playNoise(t, 0.03, 7500, 'highpass', 0.07, this.bgmGain);
      }
    }
  }

  // --- SFX ---
  playShoot(powerLevel = 1) {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 680 + powerLevel * 90;
    this._playTone(base, t, 0.075, powerLevel >= 4 ? 'sawtooth' : 'square', 0.14, this.sfxGain, 220);
  }

  playEnemyHit() {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this._playTone(320, t, 0.05, 'triangle', 0.14, this.sfxGain, 140);
  }

  playEnemyExplode(big = false) {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const dur = big ? 0.45 : 0.18;
    this._playNoise(t, dur, big ? 550 : 900, 'lowpass', big ? 0.38 : 0.24, this.sfxGain);
    this._playTone(big ? 160 : 240, t, dur, 'sawtooth', big ? 0.28 : 0.16, this.sfxGain, 38);
  }

  playPowerUp() {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this._playTone(n, t + idx * 0.045, 0.11, 'square', 0.18, this.sfxGain);
    });
  }

  playBarricadeErode() {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this._playNoise(t, 0.06, 650, 'bandpass', 0.15, this.sfxGain);
  }

  playBarricadeDeflect() {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    // Crystalline shield ping (throttled naturally by short duration & soft vol)
    this._playTone(1320 + Math.random() * 240, t, 0.055, 'sine', 0.08, this.sfxGain, 1760);
  }

  playPlayerHit() {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this._playNoise(t, 0.32, 700, 'lowpass', 0.38, this.sfxGain);
    this._playTone(220, t, 0.32, 'sawtooth', 0.25, this.sfxGain, 45);
  }

  playShieldBreak() {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this._playTone(880, t, 0.18, 'triangle', 0.24, this.sfxGain, 260);
  }

  playBomb() {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this._playNoise(t, 0.55, 1100, 'lowpass', 0.42, this.sfxGain);
    this._playTone(440, t, 0.45, 'sawtooth', 0.26, this.sfxGain, 55);
  }

  playVictory() {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.09, 0.18, 0.27, 0.40, 0.50];
    notes.forEach((n, i) => {
      this._playTone(n, t + times[i], 0.18, 'square', 0.2, this.sfxGain);
    });
  }
}

window.sound = new SoundEngine();
