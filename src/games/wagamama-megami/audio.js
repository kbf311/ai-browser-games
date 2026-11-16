/**
 * Web Audio API を用いた天界BGM＆効果音ジェネレーター
 * 外部音声ファイル不要で、ブラウザ上で澄んだハープ・オルゴール風の音色を奏でます。
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmTimer = null;
    this.currentMood = 'normal'; // 'normal' | 'romantic' | 'tense'
    this.step = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBGM();
    } else {
      this.init();
      this.startBGM(this.currentMood);
    }
    return this.muted;
  }

  playTone(freq, duration = 0.25, type = 'sine', volume = 0.08, delay = 0) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // SE: メッセージ送り
  playClick() {
    this.init();
    this.playTone(880, 0.06, 'sine', 0.04);
  }

  // SE: 選択肢決定
  playSelect() {
    this.init();
    this.playTone(659.25, 0.1, 'triangle', 0.07, 0);
    this.playTone(880, 0.15, 'triangle', 0.07, 0.05);
  }

  // SE: 好感度アップ（キラキラ）
  playHeartUp() {
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.28, 'sine', 0.07, idx * 0.06);
    });
  }

  // SE: ご機嫌ダウン / 怒り
  playDown() {
    this.init();
    this.playTone(311.13, 0.18, 'sawtooth', 0.04, 0);
    this.playTone(233.08, 0.28, 'sawtooth', 0.04, 0.12);
  }

  // BGM再生
  startBGM(mood = 'normal') {
    this.currentMood = mood;
    if (this.muted) return;
    this.init();
    this.stopBGM();

    // 天界ハープのアルペジオパターン (Hz)
    const patterns = {
      normal: [
        523.25, 659.25, 783.99, 987.77, 783.99, 659.25,
        440.00, 523.25, 659.25, 880.00, 659.25, 523.25,
        349.23, 440.00, 523.25, 698.46, 523.25, 440.00,
        392.00, 493.88, 587.33, 783.99, 587.33, 493.88
      ],
      romantic: [
        523.25, 659.25, 783.99, 1046.50, 987.77, 783.99,
        440.00, 523.25, 659.25, 880.00, 783.99, 659.25,
        349.23, 440.00, 659.25, 698.46, 659.25, 523.25,
        392.00, 493.88, 659.25, 587.33, 493.88, 392.00
      ],
      tense: [
        440.00, 523.25, 622.25, 523.25,
        392.00, 493.88, 587.33, 493.88,
        349.23, 440.00, 523.25, 440.00,
        329.63, 415.30, 493.88, 415.30
      ]
    };

    const seq = patterns[mood] || patterns.normal;
    const interval = mood === 'romantic' ? 460 : mood === 'tense' ? 320 : 400;

    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const note = seq[this.step % seq.length];
      this.playTone(note, 0.65, 'sine', 0.035);
      // 4拍ごとに柔らかい低音ルートを添える
      if (this.step % 6 === 0) {
        this.playTone(note / 2, 1.3, 'triangle', 0.025);
      }
      this.step++;
    }, interval);
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

window.soundEngine = new SoundEngine();

