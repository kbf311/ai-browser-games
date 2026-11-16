// =========================================================
// 『もふもふ暴君と秘密の添い寝』クラシックBGM演奏エンジン
// Web Audio API を用いたコード演奏（外部音声ファイル不要）
// =========================================================

window.ClassicalMusic = (() => {
  const NOTE_INDEX = {
    C: 0, 'C#': 1, Db: 1,
    D: 2, 'D#': 3, Eb: 3,
    E: 4,
    F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8,
    A: 9, 'A#': 10, Bb: 10,
    B: 11
  };

  function noteToFreq(note) {
    if (!note) return 0;
    const match = /^([A-G][#b]?)(-?\d)$/.exec(note.trim());
    if (!match) return 0;
    const semitone = NOTE_INDEX[match[1]];
    const octave = parseInt(match[2], 10);
    const midi = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // -------------------------------------------------------
  // 楽曲定義
  // events: [beatOffset, durationBeats, notes(string | string[]), velocity, instrument]
  // -------------------------------------------------------

  // 1. パッヘルベル『カノン ニ長調』（タイトル画面）
  function buildCanon() {
    const chords = [
      { bass: 'D3', arp: ['A3', 'D4', 'F#4', 'D4'] },
      { bass: 'A2', arp: ['E3', 'A3', 'C#4', 'A3'] },
      { bass: 'B2', arp: ['F#3', 'B3', 'D4', 'B3'] },
      { bass: 'F#2', arp: ['C#3', 'F#3', 'A3', 'F#3'] },
      { bass: 'G2', arp: ['D3', 'G3', 'B3', 'G3'] },
      { bass: 'D2', arp: ['A2', 'D3', 'F#3', 'D3'] },
      { bass: 'G2', arp: ['D3', 'G3', 'B3', 'G3'] },
      { bass: 'A2', arp: ['E3', 'A3', 'C#4', 'A3'] }
    ];

    const events = [];
    const cycleBeats = 16; // 8 chords * 2 beats each

    function addAccompaniment(startBeat) {
      chords.forEach((ch, idx) => {
        const b = startBeat + idx * 2;
        events.push([b, 2.0, ch.bass, 0.36, 'strings']);
        ch.arp.forEach((n, i) => {
          events.push([b + i * 0.5, 0.75, n, 0.24, 'piano']);
        });
      });
    }

    // Cycle 1: 静かなアルペジオ導入 + ロングトーン主題
    addAccompaniment(0);
    const theme1 = [
      [0, 2, 'F#5'], [2, 2, 'E5'], [4, 2, 'D5'], [6, 2, 'C#5'],
      [8, 2, 'B4'], [10, 2, 'A4'], [12, 2, 'B4'], [14, 2, 'C#5']
    ];
    theme1.forEach(([b, d, n]) => events.push([b, d, n, 0.44, 'piano']));

    // Cycle 2: 優雅な4分音符・8分音符変奏
    addAccompaniment(cycleBeats);
    const theme2 = [
      [0, 1, 'D5'], [1, 1, 'F#5'], [2, 1, 'A5'], [3, 1, 'G5'],
      [4, 1, 'F#5'], [5, 1, 'D5'], [6, 1, 'F#5'], [7, 1, 'E5'],
      [8, 1, 'D5'], [9, 1, 'B4'], [10, 1, 'D5'], [11, 1, 'A5'],
      [12, 1, 'G5'], [13, 1, 'B5'], [14, 1, 'A5'], [15, 1, 'G5'],
      [16, 0.5, 'F#5'], [16.5, 0.5, 'D5'], [17, 0.5, 'E5'], [17.5, 0.5, 'C#5'],
      [18, 0.5, 'D5'], [18.5, 0.5, 'E5'], [19, 0.5, 'F#5'], [19.5, 0.5, 'G5'],
      [20, 0.5, 'A5'], [20.5, 0.5, 'F#5'], [21, 0.5, 'G5'], [21.5, 0.5, 'A5'],
      [22, 0.5, 'B5'], [22.5, 0.5, 'A5'], [23, 0.5, 'G5'], [23.5, 0.5, 'F#5'],
      [24, 0.5, 'G5'], [24.5, 0.5, 'B4'], [25, 0.5, 'C#5'], [25.5, 0.5, 'D5'],
      [26, 0.5, 'E5'], [26.5, 0.5, 'F#5'], [27, 0.5, 'G5'], [27.5, 0.5, 'E5'],
      [28, 0.5, 'F#5'], [28.5, 0.5, 'G5'], [29, 0.5, 'A5'], [29.5, 0.5, 'F#5'],
      [30, 0.5, 'E5'], [30.5, 0.5, 'D5'], [31, 0.5, 'E5'], [31.5, 0.5, 'C#5']
    ];
    addAccompaniment(cycleBeats * 2);
    theme2.forEach(([b, d, n]) => events.push([cycleBeats + b, d, n, 0.46, 'piano']));

    return {
      id: 'canon',
      title: 'パッヘルベル『カノン ニ長調』',
      bpm: 74,
      totalBeats: cycleBeats * 3,
      events
    };
  }

  // 2. J.S.バッハ（ペツォールト）『メヌエット ト長調 BWV Anh.114』（日常パート）
  function buildMinuet() {
    // 3/4拍子: 1小節 = 3拍
    // 形式: [小節(1-based), 小節内拍(0-based), 長さ, 音名, 音量, 楽器]
    const raw = [];
    const r = (m, b, d, n) => raw.push([m, b, d, n, 0.45, 'piano']);
    const l = (m, b, d, n) => raw.push([m, b, d, n, 0.30, 'piano']);

    // --- Aパート (1〜16小節) ---
    r(1, 0, 1, 'D5'); r(1, 1, 0.5, 'G4'); r(1, 1.5, 0.5, 'A4'); r(1, 2, 0.5, 'B4'); r(1, 2.5, 0.5, 'C5');
    l(1, 0, 2, ['G3', 'B3', 'D4']); l(1, 2, 1, 'A3');

    r(2, 0, 1, 'D5'); r(2, 1, 1, 'G4'); r(2, 2, 1, 'G4');
    l(2, 0, 3, 'B3');

    r(3, 0, 1, 'E5'); r(3, 1, 0.5, 'C5'); r(3, 1.5, 0.5, 'D5'); r(3, 2, 0.5, 'E5'); r(3, 2.5, 0.5, 'F#5');
    l(3, 0, 3, 'C4');

    r(4, 0, 1, 'G5'); r(4, 1, 1, 'G4'); r(4, 2, 1, 'G4');
    l(4, 0, 3, 'B3');

    r(5, 0, 1, 'C5'); r(5, 1, 0.5, 'D5'); r(5, 1.5, 0.5, 'C5'); r(5, 2, 0.5, 'B4'); r(5, 2.5, 0.5, 'A4');
    l(5, 0, 3, 'A3');

    r(6, 0, 1, 'B4'); r(6, 1, 0.5, 'C5'); r(6, 1.5, 0.5, 'B4'); r(6, 2, 0.5, 'A4'); r(6, 2.5, 0.5, 'G4');
    l(6, 0, 3, 'G3');

    r(7, 0, 1, 'F#4'); r(7, 1, 0.5, 'G4'); r(7, 1.5, 0.5, 'A4'); r(7, 2, 0.5, 'B4'); r(7, 2.5, 0.5, 'G4');
    l(7, 0, 2, 'D3'); l(7, 2, 1, 'B3');

    r(8, 0, 2.8, 'A4');
    l(8, 0, 1, 'D4'); l(8, 1, 1, 'D3'); l(8, 2, 1, 'C4');

    r(9, 0, 1, 'D5'); r(9, 1, 0.5, 'G4'); r(9, 1.5, 0.5, 'A4'); r(9, 2, 0.5, 'B4'); r(9, 2.5, 0.5, 'C5');
    l(9, 0, 2, 'B3'); l(9, 2, 1, 'A3');

    r(10, 0, 1, 'D5'); r(10, 1, 1, 'G4'); r(10, 2, 1, 'G4');
    l(10, 0, 3, 'B3');

    r(11, 0, 1, 'E5'); r(11, 1, 0.5, 'C5'); r(11, 1.5, 0.5, 'D5'); r(11, 2, 0.5, 'E5'); r(11, 2.5, 0.5, 'F#5');
    l(11, 0, 3, 'C4');

    r(12, 0, 1, 'G5'); r(12, 1, 1, 'G4'); r(12, 2, 1, 'G4');
    l(12, 0, 3, 'B3');

    r(13, 0, 1, 'C5'); r(13, 1, 0.5, 'D5'); r(13, 1.5, 0.5, 'C5'); r(13, 2, 0.5, 'B4'); r(13, 2.5, 0.5, 'A4');
    l(13, 0, 3, 'A3');

    r(14, 0, 1, 'B4'); r(14, 1, 0.5, 'C5'); r(14, 1.5, 0.5, 'B4'); r(14, 2, 0.5, 'A4'); r(14, 2.5, 0.5, 'G4');
    l(14, 0, 3, 'G3');

    r(15, 0, 1, 'A4'); r(15, 1, 0.5, 'B4'); r(15, 1.5, 0.5, 'A4'); r(15, 2, 0.5, 'G4'); r(15, 2.5, 0.5, 'F#4');
    l(15, 0, 2, 'D3'); l(15, 2, 1, 'D3');

    r(16, 0, 2.8, 'G4');
    l(16, 0, 2, 'G3'); l(16, 2, 1, 'G2');

    // --- Bパート (17〜32小節) ---
    r(17, 0, 1, 'B5'); r(17, 1, 0.5, 'G5'); r(17, 1.5, 0.5, 'A5'); r(17, 2, 0.5, 'B5'); r(17, 2.5, 0.5, 'G5');
    l(17, 0, 3, 'G3');

    r(18, 0, 1, 'A5'); r(18, 1, 0.5, 'D5'); r(18, 1.5, 0.5, 'E5'); r(18, 2, 0.5, 'F#5'); r(18, 2.5, 0.5, 'D5');
    l(18, 0, 3, 'F#3');

    r(19, 0, 1, 'G5'); r(19, 1, 0.5, 'E5'); r(19, 1.5, 0.5, 'F#5'); r(19, 2, 0.5, 'G5'); r(19, 2.5, 0.5, 'D5');
    l(19, 0, 2, 'E3'); l(19, 2, 1, 'G3');

    r(20, 0, 1, 'C#5'); r(20, 1, 0.5, 'B4'); r(20, 1.5, 0.5, 'C#5'); r(20, 2, 1, 'A4');
    l(20, 0, 2, 'A3'); l(20, 2, 1, 'A2');

    r(21, 0, 0.5, 'A4'); r(21, 0.5, 0.5, 'B4'); r(21, 1, 0.5, 'C#5'); r(21, 1.5, 0.5, 'D5'); r(21, 2, 0.5, 'E5'); r(21, 2.5, 0.5, 'F#5');
    l(21, 0, 3, 'A3');

    r(22, 0, 1, 'G5'); r(22, 1, 1, 'F#5'); r(22, 2, 1, 'E5');
    l(22, 0, 1, 'A3'); l(22, 1, 1, 'G3'); l(22, 2, 1, 'A3');

    r(23, 0, 1, 'F#5'); r(23, 1, 1, 'A4'); r(23, 2, 1, 'C#5');
    l(23, 0, 2, 'D3'); l(23, 2, 1, 'A2');

    r(24, 0, 2.8, 'D5');
    l(24, 0, 2, 'D3'); l(24, 2, 1, 'C3');

    r(25, 0, 1, 'D5'); r(25, 1, 0.5, 'G4'); r(25, 1.5, 0.5, 'F#4'); r(25, 2, 1, 'G4');
    l(25, 0, 3, 'B2');

    r(26, 0, 1, 'E5'); r(26, 1, 0.5, 'G4'); r(26, 1.5, 0.5, 'F#4'); r(26, 2, 1, 'G4');
    l(26, 0, 3, 'C3');

    r(27, 0, 1, 'D5'); r(27, 1, 1, 'C5'); r(27, 2, 1, 'B4');
    l(27, 0, 2, 'G3'); l(27, 2, 1, 'G2');

    r(28, 0, 0.5, 'A4'); r(28, 0.5, 0.5, 'G4'); r(28, 1, 0.5, 'F#4'); r(28, 1.5, 0.5, 'G4'); r(28, 2, 1, 'A4');
    l(28, 0, 3, 'D3');

    r(29, 0, 0.5, 'D4'); r(29, 0.5, 0.5, 'E4'); r(29, 1, 0.5, 'F#4'); r(29, 1.5, 0.5, 'G4'); r(29, 2, 0.5, 'A4'); r(29, 2.5, 0.5, 'B4');
    l(29, 0, 3, 'D3');

    r(30, 0, 1, 'C5'); r(30, 1, 1, 'B4'); r(30, 2, 1, 'A4');
    l(30, 0, 1, 'E3'); l(30, 1, 1, 'F#3'); l(30, 2, 1, 'D3');

    r(31, 0, 0.5, 'B4'); r(31, 0.5, 0.5, 'D5'); r(31, 1, 1, 'G4'); r(31, 2, 1, 'F#4');
    l(31, 0, 1, 'G3'); l(31, 1, 1, 'D3'); l(31, 2, 1, 'D3');

    r(32, 0, 2.8, 'G4');
    l(32, 0, 2.8, 'G3');

    const events = raw.map(([m, b, d, n, v, inst]) => [(m - 1) * 3 + b, d, n, v, inst]);
    return {
      id: 'minuet',
      title: 'バッハ『メヌエット ト長調』',
      bpm: 114,
      totalBeats: 32 * 3,
      events
    };
  }

  // 3. エリック・サティ『ジムノペディ 第1番』（夜・添い寝・HAPPY END）
  function buildGymnopedie() {
    const raw = [];
    const addBar = (m, bass, chord, melody) => {
      raw.push([m, 0, 2.8, bass, 0.28, 'strings']);
      raw.push([m, 1, 1.8, chord, 0.22, 'piano']);
      if (melody) {
        melody.forEach(([b, d, n]) => {
          raw.push([m, b, d, n, 0.36, 'musicbox']);
        });
      }
    };

    // 1〜4小節: 夢のようなイントロ (Gmaj7 - Dmaj7)
    addBar(1, 'G2', ['B3', 'D4', 'F#4']);
    addBar(2, 'D3', ['A3', 'C#4', 'F#4']);
    addBar(3, 'G2', ['B3', 'D4', 'F#4']);
    addBar(4, 'D3', ['A3', 'C#4', 'F#4']);

    // 5〜12小節: 有名な第1主題
    addBar(5, 'G2', ['B3', 'D4', 'F#4'], [[1, 1, 'F#5'], [2, 1, 'A5']]);
    addBar(6, 'D3', ['A3', 'C#4', 'F#4'], [[0, 1, 'G5'], [1, 1, 'F#5'], [2, 1, 'C#5']]);
    addBar(7, 'G2', ['B3', 'D4', 'F#4'], [[0, 1, 'B4'], [1, 1, 'C#5'], [2, 1, 'D5']]);
    addBar(8, 'D3', ['A3', 'C#4', 'F#4'], [[0, 2.8, 'A4']]);

    addBar(9, 'G2', ['B3', 'D4', 'F#4'], [[0, 2.8, 'F#4']]);
    addBar(10, 'D3', ['A3', 'C#4', 'F#4'], [[0, 2.8, 'F#4']]);
    addBar(11, 'G2', ['B3', 'D4', 'F#4'], [[0, 2.8, 'F#4']]);
    addBar(12, 'D3', ['A3', 'C#4', 'F#4'], [[0, 2.8, 'F#4']]);

    // 13〜20小節: 第2主題への展開
    addBar(13, 'G2', ['B3', 'D4', 'F#4'], [[1, 1, 'F#5'], [2, 1, 'A5']]);
    addBar(14, 'D3', ['A3', 'C#4', 'F#4'], [[0, 1, 'G5'], [1, 1, 'F#5'], [2, 1, 'C#5']]);
    addBar(15, 'G2', ['B3', 'D4', 'F#4'], [[0, 1, 'B4'], [1, 1, 'C#5'], [2, 1, 'D5']]);
    addBar(16, 'D3', ['A3', 'C#4', 'F#4'], [[0, 2.8, 'A4']]);

    addBar(17, 'F#2', ['A3', 'C#4', 'E4'], [[0, 2.8, 'C#5']]);
    addBar(18, 'B2', ['D4', 'F#4', 'A4'], [[0, 2.8, 'F#5']]);
    addBar(19, 'E2', ['G3', 'B3', 'E4'], [[0, 2.8, 'E4']]);
    addBar(20, 'A2', ['E3', 'A3', 'C#4'], [[0, 1, 'A4'], [1, 1, 'B4'], [2, 1, 'C#5']]);

    const events = raw.map(([m, b, d, n, v, inst]) => [(m - 1) * 3 + b, d, n, v, inst]);
    return {
      id: 'gymnopedie',
      title: 'サティ『ジムノペディ 第1番』',
      bpm: 72,
      totalBeats: 20 * 3,
      events
    };
  }

  // 4. J.S.バッハ『トッカータとフーガ ニ短調 BWV565』風（惨劇・BAD END）
  function buildToccata() {
    const events = [
      // 劇的な冒頭モチーフ（高音）
      [0, 0.25, 'A5', 0.45, 'organ'],
      [0.25, 0.25, 'G5', 0.45, 'organ'],
      [0.5, 2.0, 'A5', 0.50, 'organ'],
      [2.5, 0.25, 'G5', 0.42, 'organ'],
      [2.75, 0.25, 'F5', 0.42, 'organ'],
      [3.0, 0.25, 'E5', 0.42, 'organ'],
      [3.25, 0.25, 'D5', 0.42, 'organ'],
      [3.5, 0.5, 'C#5', 0.46, 'organ'],
      [4.0, 2.0, 'D5', 0.50, 'organ'],

      // 1オクターブ下で応答
      [6.5, 0.25, 'A4', 0.45, 'organ'],
      [6.75, 0.25, 'G4', 0.45, 'organ'],
      [7.0, 1.75, 'A4', 0.50, 'organ'],
      [8.75, 0.5, 'E4', 0.44, 'organ'],
      [9.25, 0.5, 'F4', 0.44, 'organ'],
      [9.75, 0.5, 'C#4', 0.44, 'organ'],
      [10.25, 1.75, 'D4', 0.50, 'organ'],

      // 重厚な減七のアルペジオとニ短調の終止和音
      [12.0, 0.5, ['D2', 'D3'], 0.48, 'organ'],
      [12.5, 0.5, 'C#4', 0.42, 'organ'],
      [13.0, 0.5, 'E4', 0.42, 'organ'],
      [13.5, 0.5, 'G4', 0.42, 'organ'],
      [14.0, 0.5, 'Bb4', 0.44, 'organ'],
      [14.5, 0.5, 'C#5', 0.46, 'organ'],
      [15.0, 3.0, ['D2', 'A2', 'D3', 'F4', 'A4', 'D5'], 0.55, 'organ'],
      [18.5, 1.5, ['A2', 'E3', 'A3', 'C#4', 'E4', 'A4'], 0.48, 'organ'],
      [20.0, 4.0, ['D2', 'A2', 'D3', 'F3', 'A3', 'D4'], 0.55, 'organ']
    ];

    return {
      id: 'toccata',
      title: 'バッハ『トッカータとフーガ ニ短調』',
      bpm: 108,
      totalBeats: 24,
      events
    };
  }

  const TRACKS = {
    canon: buildCanon(),
    minuet: buildMinuet(),
    gymnopedie: buildGymnopedie(),
    toccata: buildToccata()
  };

  // -------------------------------------------------------
  // Web Audio API 音響合成 & スケジューラ
  // -------------------------------------------------------
  let ctx = null;
  let masterGain = null;
  let reverbSend = null;
  let isMuted = false;
  let currentTrack = null;
  let isPlaying = false;
  let timerId = null;
  let nextNoteIndex = 0;
  let cycleStartTime = 0;
  let activeVoices = [];
  let onTrackChangeCallback = null;

  function ensureContext(externalCtx) {
    if (!ctx) {
      ctx = externalCtx || new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = isMuted ? 0 : 0.65;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.ratio.value = 4;

      masterGain.connect(compressor);
      compressor.connect(ctx.destination);

      // 柔らかな室内残響 (ConvolverNode)
      reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.24;
      const convolver = ctx.createConvolver();
      convolver.buffer = createImpulseResponse(ctx, 1.6, 2.8);
      reverbSend.connect(convolver);
      convolver.connect(masterGain);
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function createImpulseResponse(audioCtx, duration, decay) {
    const length = Math.floor(audioCtx.sampleRate * duration);
    const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay);
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return impulse;
  }

  function triggerVoice(freq, startTime, duration, velocity, instrument) {
    if (!ctx || !freq || isMuted) return;

    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';

    let osc1 = ctx.createOscillator();
    let osc2 = null;

    if (instrument === 'piano') {
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, startTime);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.22;
      osc2.connect(osc2Gain).connect(filter);

      filter.frequency.setValueAtTime(Math.min(4800, freq * 6), startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.5), startTime + duration);

      const peak = velocity * 0.28;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(peak * 0.35, startTime + Math.min(0.25, duration * 0.5));
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.15);
    } else if (instrument === 'strings') {
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.002, startTime);
      osc2.connect(filter);

      filter.frequency.setValueAtTime(Math.max(500, freq * 2.5), startTime);

      const peak = velocity * 0.16;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.12);
      gain.gain.setValueAtTime(peak * 0.85, startTime + Math.max(0.15, duration - 0.1));
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.25);
    } else if (instrument === 'musicbox') {
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 3, startTime);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.14, startTime);
      osc2Gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      osc2.connect(osc2Gain).connect(filter);

      filter.frequency.setValueAtTime(6000, startTime);

      const peak = velocity * 0.25;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.45);
    } else {
      // organ
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq * 2, startTime);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.28;
      osc2.connect(osc2Gain).connect(filter);

      filter.frequency.setValueAtTime(1900, startTime);

      const peak = velocity * 0.18;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.025);
      gain.gain.setValueAtTime(peak * 0.9, startTime + Math.max(0.05, duration - 0.05));
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.18);
    }

    osc1.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    gain.connect(reverbSend);

    const stopTime = startTime + duration + 0.5;
    osc1.start(startTime);
    osc1.stop(stopTime);
    if (osc2) {
      osc2.start(startTime);
      osc2.stop(stopTime);
    }

    const entry = { osc1, osc2, gain };
    activeVoices.push(entry);
    osc1.onended = () => {
      const idx = activeVoices.indexOf(entry);
      if (idx !== -1) activeVoices.splice(idx, 1);
    };
  }

  function scheduleAhead() {
    if (!isPlaying || !currentTrack || !ctx) return;

    const secPerBeat = 60 / currentTrack.bpm;
    const lookahead = 0.18;
    const horizon = ctx.currentTime + lookahead;

    while (true) {
      if (nextNoteIndex >= currentTrack.events.length) {
        cycleStartTime += currentTrack.totalBeats * secPerBeat;
        nextNoteIndex = 0;
      }

      const ev = currentTrack.events[nextNoteIndex];
      const [beatOffset, durBeats, notes, velocity, instrument] = ev;
      const eventTime = cycleStartTime + beatOffset * secPerBeat;

      if (eventTime > horizon) break;

      if (eventTime >= ctx.currentTime - 0.05) {
        const durSec = durBeats * secPerBeat;
        const noteList = Array.isArray(notes) ? notes : [notes];
        noteList.forEach((n) => {
          triggerVoice(noteToFreq(n), Math.max(ctx.currentTime, eventTime), durSec, velocity, instrument);
        });
      }

      nextNoteIndex++;
    }
  }

  function stopVoices() {
    if (!ctx) return;
    const now = ctx.currentTime;
    activeVoices.forEach(({ osc1, osc2, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value || 0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc1.stop(now + 0.1);
        if (osc2) osc2.stop(now + 0.1);
      } catch (_) {
        // already stopped
      }
    });
    activeVoices = [];
  }

  function play(trackId, externalCtx) {
    const track = TRACKS[trackId];
    if (!track) return;

    if (currentTrack && currentTrack.id === trackId && isPlaying) {
      return;
    }

    ensureContext(externalCtx);
    stopVoices();
    clearInterval(timerId);

    currentTrack = track;
    isPlaying = true;
    nextNoteIndex = 0;
    cycleStartTime = ctx.currentTime + 0.06;

    timerId = setInterval(scheduleAhead, 25);
    scheduleAhead();

    if (onTrackChangeCallback) {
      onTrackChangeCallback(track);
    }
  }

  function stop() {
    isPlaying = false;
    clearInterval(timerId);
    timerId = null;
    stopVoices();
  }

  function setMuted(muted) {
    isMuted = !!muted;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.65, ctx.currentTime, 0.04);
    }
    if (isMuted) {
      stopVoices();
    } else if (currentTrack && !isPlaying) {
      play(currentTrack.id);
    }
  }

  function onTrackChange(cb) {
    onTrackChangeCallback = cb;
  }

  function getCurrentTrack() {
    return currentTrack;
  }

  return {
    play,
    stop,
    setMuted,
    onTrackChange,
    getCurrentTrack,
    ensureContext
  };
})();
