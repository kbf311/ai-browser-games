/**
 * Web Audio API Chiptune Sequencer & Retro SFX Engine
 * Zero external audio assets — 100% synthesized in JavaScript.
 */
class ArcadeAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;

    this.muted = false;
    this.volume = 0.65;

    this.currentTrack = null;
    this.isPlaying = false;
    this.stepIndex = 0;
    this.nextNoteTime = 0;
    this.schedulerTimer = null;

    this.tracks = this._buildTracks();
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this._createNoiseBuffer();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  _noteToFreq(note) {
    if (!note || note === "-") return 0;
    const map = {
      C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4,
      F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9,
      "A#": 10, Bb: 10, B: 11,
    };
    const match = note.match(/^([A-G][#b]?)(-?\d)$/);
    if (!match) return 0;
    const semitone = map[match[1]];
    const octave = parseInt(match[2], 10);
    const midi = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  _playTone(freq, startTime, duration, type = "square", gainVal = 0.14, slideTo = null) {
    if (!this.ctx || !freq) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  _playDrum(kind, startTime) {
    if (!this.ctx || !this.noiseBuffer) return;
    if (kind === "K") {
      // Kick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, startTime);
      osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.09);
      gain.gain.setValueAtTime(0.24, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.11);
    } else if (kind === "S" || kind === "H") {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = kind === "H" ? "highpass" : "bandpass";
      filter.frequency.value = kind === "H" ? 6500 : 1800;

      const gain = this.ctx.createGain();
      const dur = kind === "H" ? 0.035 : 0.085;
      const vol = kind === "H" ? 0.06 : 0.12;
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(startTime);
      src.stop(startTime + dur + 0.01);
    }
  }

  _buildTracks() {
    return {
      // Dramatic arcade intro fanfare
      intro: {
        bpm: 150,
        loop: false,
        stepLen: 0.25, // 16th note
        lead: [
          "C4", "-", "E4", "-", "G4", "-", "C5", "-",
          "B4", "-", "G4", "-", "A4", "-", "F4", "-",
          "G4", "G4", "E4", "-", "C4", "-", "-", "-",
        ],
        bass: [
          "C2", "-", "C3", "-", "C2", "-", "C3", "-",
          "G2", "-", "G3", "-", "F2", "-", "F3", "-",
          "C2", "G2", "C3", "-", "C2", "-", "-", "-",
        ],
        drums: [
          "K", "-", "H", "-", "S", "-", "H", "-",
          "K", "-", "H", "-", "S", "-", "H", "-",
          "K", "S", "K", "-", "K", "-", "-", "-",
        ],
      },

      // Stage 1: Upbeat, driving 8-bit girder groove
      stage1: {
        bpm: 142,
        loop: true,
        stepLen: 0.25,
        lead: [
          "E4", "-", "G4", "-", "A4", "-", "G4", "-",
          "E4", "-", "D4", "E4", "C4", "-", "-", "-",
          "D4", "-", "F4", "-", "G4", "-", "F4", "-",
          "D4", "-", "C4", "D4", "B3", "-", "G3", "-",

          "E4", "-", "G4", "-", "A4", "-", "C5", "-",
          "B4", "-", "A4", "G4", "E4", "-", "C4", "-",
          "D4", "F4", "A4", "-", "G4", "-", "B4", "-",
          "C5", "-", "-", "-", "G4", "-", "-", "-",
        ],
        bass: [
          "C2", "-", "C3", "-", "G2", "-", "C3", "-",
          "C2", "-", "C3", "-", "G2", "-", "E2", "-",
          "D2", "-", "D3", "-", "G2", "-", "D3", "-",
          "G2", "-", "G3", "-", "D2", "-", "G2", "-",

          "C2", "-", "C3", "-", "A2", "-", "A3", "-",
          "G2", "-", "G3", "-", "C2", "-", "E2", "-",
          "F2", "-", "F3", "-", "G2", "-", "G3", "-",
          "C2", "-", "G2", "-", "C3", "-", "G2", "-",
        ],
        drums: [
          "K", "-", "H", "-", "S", "-", "H", "-",
          "K", "-", "H", "K", "S", "-", "H", "-",
          "K", "-", "H", "-", "S", "-", "H", "-",
          "K", "-", "H", "K", "S", "-", "S", "-",

          "K", "-", "H", "-", "S", "-", "H", "-",
          "K", "-", "H", "K", "S", "-", "H", "-",
          "K", "-", "H", "-", "S", "-", "H", "S",
          "K", "-", "H", "-", "S", "K", "S", "-",
        ],
      },

      // Stage 2: Faster steelworks / rivet groove
      stage2: {
        bpm: 154,
        loop: true,
        stepLen: 0.25,
        lead: [
          "A4", "-", "C5", "-", "E5", "-", "C5", "-",
          "D5", "-", "C5", "B4", "A4", "-", "E4", "-",
          "F4", "-", "A4", "-", "C5", "-", "A4", "-",
          "B4", "-", "G#4", "-", "E4", "-", "-", "-",

          "A4", "-", "C5", "-", "E5", "-", "G5", "-",
          "F5", "-", "E5", "D5", "C5", "-", "A4", "-",
          "D5", "-", "F5", "-", "E5", "-", "G#4", "-",
          "A4", "-", "-", "-", "E4", "-", "-", "-",
        ],
        bass: [
          "A2", "-", "A3", "-", "E2", "-", "A3", "-",
          "A2", "-", "E2", "-", "A2", "-", "G2", "-",
          "F2", "-", "F3", "-", "C2", "-", "F3", "-",
          "E2", "-", "E3", "-", "B2", "-", "E2", "-",

          "A2", "-", "A3", "-", "G2", "-", "G3", "-",
          "F2", "-", "F3", "-", "E2", "-", "E3", "-",
          "D2", "-", "D3", "-", "E2", "-", "E3", "-",
          "A2", "-", "E2", "-", "A2", "-", "E2", "-",
        ],
        drums: [
          "K", "H", "H", "-", "S", "H", "H", "-",
          "K", "H", "K", "-", "S", "H", "S", "-",
          "K", "H", "H", "-", "S", "H", "H", "-",
          "K", "H", "K", "-", "S", "-", "S", "S",

          "K", "H", "H", "-", "S", "H", "H", "-",
          "K", "H", "K", "-", "S", "H", "S", "-",
          "K", "H", "H", "-", "S", "H", "K", "S",
          "K", "-", "S", "-", "K", "S", "S", "-",
        ],
      },

      // Hammer power-up: Frantic, triumphant arcade riff
      hammer: {
        bpm: 192,
        loop: true,
        stepLen: 0.25,
        lead: [
          "C5", "E5", "G5", "E5", "C5", "E5", "G5", "E5",
          "D5", "F5", "A5", "F5", "D5", "F5", "A5", "F5",
          "E5", "G5", "B5", "G5", "D5", "F5", "A5", "F5",
          "C5", "E5", "G5", "C6", "G5", "E5", "C5", "-",
        ],
        bass: [
          "C3", "-", "G2", "-", "C3", "-", "G2", "-",
          "D3", "-", "A2", "-", "D3", "-", "A2", "-",
          "E3", "-", "B2", "-", "D3", "-", "A2", "-",
          "C3", "-", "G2", "-", "C3", "-", "G2", "-",
        ],
        drums: [
          "K", "H", "S", "H", "K", "H", "S", "H",
          "K", "H", "S", "H", "K", "H", "S", "H",
          "K", "H", "S", "H", "K", "H", "S", "H",
          "K", "S", "K", "S", "K", "S", "S", "-",
        ],
      },

      // Stage Clear jingle
      clear: {
        bpm: 160,
        loop: false,
        stepLen: 0.25,
        lead: [
          "C5", "-", "E5", "-", "G5", "-", "C6", "-",
          "G5", "-", "A5", "-", "B5", "-", "C6", "-",
          "-", "-", "C6", "-", "-", "-", "-", "-",
        ],
        bass: [
          "C3", "-", "E3", "-", "G3", "-", "C4", "-",
          "E3", "-", "F3", "-", "G3", "-", "C3", "-",
          "-", "-", "C3", "-", "-", "-", "-", "-",
        ],
        drums: [
          "K", "-", "S", "-", "K", "-", "S", "-",
          "K", "K", "S", "-", "K", "S", "K", "-",
          "-", "-", "K", "-", "-", "-", "-", "-",
        ],
      },

      // Game Over jingle
      gameover: {
        bpm: 120,
        loop: false,
        stepLen: 0.25,
        lead: [
          "E4", "-", "Eb4", "-", "D4", "-", "C#4", "-",
          "C4", "-", "-", "-", "G3", "-", "C3", "-",
        ],
        bass: [
          "C3", "-", "B2", "-", "Bb2", "-", "A2", "-",
          "G2", "-", "-", "-", "G1", "-", "C2", "-",
        ],
        drums: [
          "K", "-", "H", "-", "S", "-", "H", "-",
          "K", "-", "-", "-", "S", "-", "K", "-",
        ],
      },
    };
  }

  playTrack(name) {
    this.init();
    if (this.currentTrack === name && this.isPlaying) return;
    this.stopMusic();

    const track = this.tracks[name];
    if (!track) return;

    this.currentTrack = name;
    this.isPlaying = true;
    this.stepIndex = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.04;

    this.schedulerTimer = setInterval(() => this._schedule(), 25);
  }

  stopMusic() {
    this.isPlaying = false;
    this.currentTrack = null;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  _schedule() {
    if (!this.isPlaying || !this.ctx) return;
    const track = this.tracks[this.currentTrack];
    if (!track) return;

    const secondsPerBeat = 60.0 / track.bpm;
    const stepDuration = secondsPerBeat * track.stepLen;

    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      if (this.stepIndex >= track.lead.length) {
        if (track.loop) {
          this.stepIndex = 0;
        } else {
          this.stopMusic();
          return;
        }
      }

      const i = this.stepIndex;
      const leadNote = track.lead[i];
      const bassNote = track.bass ? track.bass[i] : "-";
      const drumHit = track.drums ? track.drums[i] : "-";

      if (leadNote && leadNote !== "-") {
        this._playTone(
          this._noteToFreq(leadNote),
          this.nextNoteTime,
          stepDuration * 0.88,
          "square",
          0.11
        );
      }
      if (bassNote && bassNote !== "-") {
        this._playTone(
          this._noteToFreq(bassNote),
          this.nextNoteTime,
          stepDuration * 0.92,
          "triangle",
          0.15
        );
      }
      if (drumHit && drumHit !== "-") {
        this._playDrum(drumHit, this.nextNoteTime);
      }

      this.nextNoteTime += stepDuration;
      this.stepIndex++;
    }
  }

  // --- Sound Effects ---

  sfxJump() {
    this.init();
    const t = this.ctx.currentTime;
    this._playTone(220, t, 0.16, "square", 0.14, 580);
  }

  sfxStep() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    this._playTone(130, t, 0.03, "triangle", 0.05, 95);
  }

  sfxScore() {
    this.init();
    const t = this.ctx.currentTime;
    this._playTone(784, t, 0.06, "square", 0.14);
    this._playTone(1046.5, t + 0.06, 0.11, "square", 0.14);
  }

  sfxPickup() {
    this.init();
    const t = this.ctx.currentTime;
    this._playTone(523.25, t, 0.06, "square", 0.14);
    this._playTone(659.25, t + 0.06, 0.06, "square", 0.14);
    this._playTone(783.99, t + 0.12, 0.08, "square", 0.14);
    this._playTone(1046.5, t + 0.18, 0.14, "square", 0.14);
  }

  sfxSmash() {
    this.init();
    const t = this.ctx.currentTime;
    this._playDrum("S", t);
    this._playTone(240, t, 0.12, "sawtooth", 0.18, 60);
  }

  sfxRivet() {
    this.init();
    const t = this.ctx.currentTime;
    this._playTone(880, t, 0.05, "square", 0.13, 1320);
  }

  sfxThrow() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    this._playTone(160, t, 0.12, "sawtooth", 0.1, 80);
  }

  sfxDeath() {
    this.init();
    const t = this.ctx.currentTime;
    this._playTone(440, t, 0.14, "sawtooth", 0.18, 320);
    this._playTone(320, t + 0.14, 0.16, "sawtooth", 0.18, 190);
    this._playTone(190, t + 0.30, 0.28, "sawtooth", 0.18, 70);
    this._playDrum("S", t);
  }
}
