// =========================================================
// 『もふもふ暴君と秘密の添い寝』ビジュアルノベル・エンジン
// =========================================================

(() => {
  const $ = (id) => document.getElementById(id);

  const stage = $('stage');
  const cgBack = $('cg-layer-back');
  const cgFront = $('cg-layer-front');
  const damageFlash = $('damage-flash');
  const particlesContainer = $('particles-container');

  const hud = $('hud');
  const phaseIcon = $('phase-icon');
  const phaseText = $('phase-text');
  const affectionBarFill = $('affection-bar-fill');
  const affectionValue = $('affection-value');

  const titleScreen = $('title-screen');
  const dialogueBox = $('dialogue-box');
  const speakerBadge = $('speaker-badge');
  const speakerName = $('speaker-name');
  const dialogueText = $('dialogue-text');
  const nextIndicator = $('next-indicator');
  const choicesContainer = $('choices-container');
  const rewardControls = $('reward-controls');

  const endingScreen = $('ending-screen');
  const endingCard = $('ending-card');
  const endingTag = $('ending-tag');
  const endingTitle = $('ending-title');
  const endingDesc = $('ending-desc');
  const endingStats = $('ending-stats');
  const btnRetryChapter = $('btn-retry-chapter');

  const backlogModal = $('backlog-modal');
  const backlogList = $('backlog-list');
  const galleryModal = $('gallery-modal');
  const galleryGrid = $('gallery-grid');
  const bgmBadge = $('bgm-badge');
  const bgmTitle = $('bgm-title');

  const state = {
    currentNodeId: 'start',
    lastCheckpoint: 'start',
    lineIndex: 0,
    isTyping: false,
    typeTimer: null,
    currentFullText: '',
    currentCG: '',
    soundEnabled: true,
    backlog: [],
    petCount: 0,
    inRewardInteraction: false,
    deathCount: 0
  };

  // -------------------------------------------------------
  // Web Audio API 簡易サウンド生成（外部音声ファイル不要）
  // -------------------------------------------------------
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playBGM(trackId) {
    if (!window.ClassicalMusic) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    window.ClassicalMusic.play(trackId, ctx);
  }

  function updateBGMForNode(nodeId, node) {
    if (!node) return;
    if ((node.ending && node.ending.type === 'bad') || node.effect === 'damage') {
      playBGM('toccata');
    } else if (
      nodeId.startsWith('night') ||
      nodeId.startsWith('reward') ||
      (node.ending && node.ending.type === 'happy')
    ) {
      playBGM('gymnopedie');
    } else {
      playBGM('minuet');
    }
  }

  if (window.ClassicalMusic) {
    window.ClassicalMusic.onTrackChange((track) => {
      if (bgmTitle && bgmBadge) {
        bgmTitle.textContent = track.title;
        bgmBadge.classList.remove('hidden');
      }
    });
  }

  function playSFX(type) {
    if (!state.soundEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'good') {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.08, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.36);
      });
    } else if (type === 'meow_tsun') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.28);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'purr') {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, now);
      lfo.frequency.setValueAtTime(24, now);
      lfoGain.gain.setValueAtTime(0.04, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      lfo.connect(lfoGain).connect(gain.gain);
      osc.connect(gain).connect(ctx.destination);
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.92);
      osc.stop(now + 0.92);
    } else if (type === 'attack') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.32);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'lullaby') {
      [392.0, 493.88, 587.33, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.16);
        gain.gain.setValueAtTime(0.07, now + i * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.9);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.16);
        osc.stop(now + i * 0.16 + 0.95);
      });
    }
  }

  // -------------------------------------------------------
  // CG切り替え・エフェクト
  // -------------------------------------------------------
  function setCG(src) {
    if (!src || state.currentCG === src) return;
    cgBack.style.backgroundImage = cgFront.style.backgroundImage;
    cgBack.classList.add('active');
    cgFront.classList.remove('active');

    requestAnimationFrame(() => {
      cgFront.style.backgroundImage = `url('${src}')`;
      void cgFront.offsetWidth;
      cgFront.classList.add('active');
    });
    state.currentCG = src;
  }

  function triggerDamageEffect() {
    stage.classList.remove('shake');
    damageFlash.classList.remove('flash');
    void stage.offsetWidth;
    stage.classList.add('shake');
    damageFlash.classList.add('flash');
  }

  function setParticles(enabled) {
    particlesContainer.innerHTML = '';
    if (!enabled) return;
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 4 + Math.random() * 8;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${5 + Math.random() * 6}s`;
      p.style.animationDelay = `${Math.random() * 4}s`;
      particlesContainer.appendChild(p);
    }
  }

  // -------------------------------------------------------
  // HUD & テキスト表示
  // -------------------------------------------------------
  function updateHUD(node) {
    phaseIcon.textContent = node.phaseIcon;
    phaseText.textContent = node.phaseText;
    const val = Math.max(0, Math.min(100, node.affection));
    affectionBarFill.style.width = `${val}%`;
    affectionValue.textContent = `${val}%`;
  }

  function typeLine(lineObj) {
    clearInterval(state.typeTimer);
    state.isTyping = true;
    state.currentFullText = lineObj.text;
    nextIndicator.style.opacity = '0.25';

    if (lineObj.speaker) {
      speakerBadge.classList.remove('hidden', 'leo-angry', 'leo-dere');
      if (lineObj.mood === 'angry') speakerBadge.classList.add('leo-angry');
      if (lineObj.mood === 'dere') speakerBadge.classList.add('leo-dere');
      speakerName.textContent = lineObj.speaker;
    } else {
      speakerBadge.classList.add('hidden');
    }

    if (lineObj.sfx) playSFX(lineObj.sfx);

    state.backlog.push({
      speaker: lineObj.speaker || 'ナレーション',
      text: lineObj.text
    });

    dialogueText.textContent = '';
    let idx = 0;
    state.typeTimer = setInterval(() => {
      idx++;
      dialogueText.textContent = state.currentFullText.slice(0, idx);
      if (idx >= state.currentFullText.length) {
        finishTyping();
      }
    }, 24);
  }

  function finishTyping() {
    clearInterval(state.typeTimer);
    state.isTyping = false;
    dialogueText.textContent = state.currentFullText;
    nextIndicator.style.opacity = '1';
  }

  // -------------------------------------------------------
  // シーン進行
  // -------------------------------------------------------
  let bgmDelayTimer = null;

  function loadNode(nodeId, options = {}) {
    const node = STORY_NODES[nodeId];
    if (!node) return;

    if (bgmDelayTimer) {
      clearTimeout(bgmDelayTimer);
      bgmDelayTimer = null;
    }

    state.currentNodeId = nodeId;
    state.lineIndex = 0;
    state.inRewardInteraction = false;

    if (node.checkpoint) {
      state.lastCheckpoint = node.checkpoint;
    }

    choicesContainer.classList.add('hidden');
    rewardControls.classList.add('hidden');
    endingScreen.classList.add('hidden');
    dialogueBox.classList.remove('hidden');

    setCG(node.cg);
    updateHUD(node);

    if (options.bgmDelayMs > 0) {
      if (window.ClassicalMusic) {
        window.ClassicalMusic.stop();
      }
      bgmDelayTimer = setTimeout(() => {
        bgmDelayTimer = null;
        if (state.currentNodeId === nodeId && titleScreen.classList.contains('hidden')) {
          updateBGMForNode(nodeId, node);
        }
      }, options.bgmDelayMs);
    } else {
      updateBGMForNode(nodeId, node);
    }

    if (node.effect === 'damage') {
      triggerDamageEffect();
      setParticles(false);
    } else if (node.effect === 'particles') {
      setParticles(true);
    } else {
      setParticles(false);
    }

    typeLine(node.lines[0]);
  }

  function advanceDialogue() {
    if (state.inRewardInteraction) return;
    const node = STORY_NODES[state.currentNodeId];
    if (!node) return;

    if (state.isTyping) {
      finishTyping();
      return;
    }

    state.lineIndex++;
    if (state.lineIndex < node.lines.length) {
      typeLine(node.lines[state.lineIndex]);
      return;
    }

    // セリフが全て終わった後の分岐
    if (node.choices) {
      showChoices(node.choices);
    } else if (node.ending) {
      showEnding(node.ending);
    } else if (node.rewardMode) {
      enterRewardInteraction();
    } else if (node.next) {
      loadNode(node.next);
    }
  }

  function showChoices(choices) {
    choicesContainer.innerHTML = '';
    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span class="choice-index">${i + 1}</span><span>${choice.text}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadNode(choice.next);
      });
      choicesContainer.appendChild(btn);
    });
    choicesContainer.classList.remove('hidden');
  }

  // -------------------------------------------------------
  // ご褒美タイム・添い寝インタラクション
  // -------------------------------------------------------
  const PET_REACTIONS = [
    '「んっ……そこ、耳の後ろ……気持ちいいに決まってるでしょ……ゴロゴロ……」',
    '「ふにゃあ……ッ、今の変な声は忘れなさい！　でも……やめないで……」',
    '「……あったかい。アンタの手、意外と悪くないわね……もっと撫でなさいよ」'
  ];

  function enterRewardInteraction() {
    state.inRewardInteraction = true;
    rewardControls.classList.remove('hidden');
    nextIndicator.style.opacity = '0';
  }

  $('btn-pet-cat').addEventListener('click', (e) => {
    e.stopPropagation();
    const text = PET_REACTIONS[state.petCount % PET_REACTIONS.length];
    state.petCount++;
    typeLine({
      speaker: 'レオ',
      mood: 'dere',
      text,
      sfx: 'purr'
    });
  });

  $('btn-sleep-together').addEventListener('click', (e) => {
    e.stopPropagation();
    playSFX('lullaby');
    rewardControls.classList.add('hidden');
    showEnding({
      type: 'happy',
      title: 'TRUE END：もふもふ暴君と秘密の添い寝',
      desc: 'すべてのお世話を完璧にやり遂げ、レオ様とひとつのお布団で朝までぐっすり眠ることができた！\n温かく柔らかい極上の毛並みに包まれながら、最高の幸せを噛みしめるのだった。'
    });
  });

  function showEnding(ending) {
    dialogueBox.classList.add('hidden');
    choicesContainer.classList.add('hidden');
    rewardControls.classList.add('hidden');
    endingScreen.classList.remove('hidden');

    endingCard.classList.remove('bad-end', 'happy-end');
    if (ending.type === 'bad') {
      state.deathCount++;
      endingCard.classList.add('bad-end');
      endingTag.textContent = 'BAD END — 死亡';
      btnRetryChapter.classList.remove('hidden');
    } else {
      endingCard.classList.add('happy-end');
      endingTag.textContent = 'HAPPY END — ご褒美タイム達成！';
      btnRetryChapter.classList.add('hidden');
    }

    endingTitle.textContent = ending.title;
    endingDesc.textContent = ending.desc;
    endingStats.textContent = `これまでの殉職回数：${state.deathCount} 回`;
  }

  // -------------------------------------------------------
  // モーダル（ログ・ギャラリー）
  // -------------------------------------------------------
  function openBacklog() {
    backlogList.innerHTML = '';
    if (state.backlog.length === 0) {
      backlogList.innerHTML = '<p style="color:#aaa;">まだ会話ログがありません。</p>';
    } else {
      state.backlog.forEach((entry) => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<div class="log-speaker">${entry.speaker}</div><div class="log-text"></div>`;
        div.querySelector('.log-text').textContent = entry.text;
        backlogList.appendChild(div);
      });
    }
    backlogModal.classList.remove('hidden');
    backlogList.scrollTop = backlogList.scrollHeight;
  }

  function openGallery() {
    galleryGrid.innerHTML = '';
    GALLERY_ITEMS.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'gallery-item';
      card.innerHTML = `
        <img src="${item.src}" alt="${item.title}" />
        <div class="gallery-caption">
          <strong style="color:#f5b963; display:block; margin-bottom:2px;">${item.title}</strong>
          <span>${item.desc}</span>
        </div>
      `;
      galleryGrid.appendChild(card);
    });
    galleryModal.classList.remove('hidden');
  }

  // -------------------------------------------------------
  // イベントリスナー
  // -------------------------------------------------------
  $('btn-start').addEventListener('click', () => {
    playSFX('good');
    titleScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    state.backlog = [];
    state.petCount = 0;
    loadNode('start', { bgmDelayMs: 600 });
  });

  $('btn-retry-chapter').addEventListener('click', () => {
    loadNode(state.lastCheckpoint || 'start');
  });

  $('btn-restart-all').addEventListener('click', () => {
    state.backlog = [];
    state.petCount = 0;
    loadNode('start');
  });

  $('btn-title-return').addEventListener('click', () => {
    clearInterval(state.typeTimer);
    setParticles(false);
    hud.classList.add('hidden');
    dialogueBox.classList.add('hidden');
    choicesContainer.classList.add('hidden');
    rewardControls.classList.add('hidden');
    endingScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden');
    setCG(CG_ASSETS.tsun);
    playBGM('canon');
  });

  $('btn-sound').addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    $('btn-sound').textContent = state.soundEnabled ? '🔊 音あり' : '🔇 ミュート';
    if (window.ClassicalMusic) {
      window.ClassicalMusic.setMuted(!state.soundEnabled);
      if (state.soundEnabled && !window.ClassicalMusic.getCurrentTrack()) {
        if (!titleScreen.classList.contains('hidden')) {
          playBGM('canon');
        } else {
          updateBGMForNode(state.currentNodeId, STORY_NODES[state.currentNodeId]);
        }
      }
    }
  });

  $('btn-backlog').addEventListener('click', openBacklog);
  $('btn-close-backlog').addEventListener('click', () => backlogModal.classList.add('hidden'));

  $('btn-gallery').addEventListener('click', openGallery);
  $('btn-ending-gallery').addEventListener('click', openGallery);
  $('btn-close-gallery').addEventListener('click', () => galleryModal.classList.add('hidden'));

  dialogueBox.addEventListener('click', advanceDialogue);

  document.addEventListener('keydown', (e) => {
    if (
      !titleScreen.classList.contains('hidden') ||
      !endingScreen.classList.contains('hidden') ||
      !backlogModal.classList.contains('hidden') ||
      !galleryModal.classList.contains('hidden') ||
      !choicesContainer.classList.contains('hidden')
    ) {
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      advanceDialogue();
    }
  });

  // 初回ユーザー操作で Web Audio API をアンロックしタイトルBGMを再生
  function unlockInitialAudio(e) {
    if (!state.soundEnabled) return;
    if (e && e.target && e.target.closest && e.target.closest('#btn-start')) {
      return;
    }
    if (!titleScreen.classList.contains('hidden')) {
      playBGM('canon');
    }
  }
  document.addEventListener('pointerdown', unlockInitialAudio, { once: true });
  document.addEventListener('keydown', unlockInitialAudio, { once: true });

  // 初期背景セット
  cgFront.style.backgroundImage = `url('${CG_ASSETS.tsun}')`;
  state.currentCG = CG_ASSETS.tsun;
})();
