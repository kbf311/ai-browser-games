/**
 * わがまま女神と契約結婚！？ メインゲームエンジン
 */
(function () {
  const SAVE_KEY = 'celestia_vn_save_v1';
  const GALLERY_KEY = 'celestia_vn_gallery_v1';

  const state = {
    sceneId: 'prologue_1',
    lineIndex: 0,
    affection: 20,
    mood: 50,
    isTyping: false,
    typingTimer: null,
    autoMode: false,
    autoTimer: null,
    log: [],
    unlockedCGs: new Set(['title']),
    currentCG: 'title'
  };

  // DOM Elements
  const els = {
    container: document.getElementById('game-container'),
    cgBack: document.getElementById('cg-image-back'),
    cgFront: document.getElementById('cg-image-front'),
    titleScreen: document.getElementById('title-screen'),
    playScreen: document.getElementById('play-screen'),
    endingScreen: document.getElementById('ending-screen'),
    btnStart: document.getElementById('btn-start'),
    btnContinue: document.getElementById('btn-continue'),
    btnGallery: document.getElementById('btn-gallery'),
    affectionBar: document.getElementById('affection-bar'),
    affectionVal: document.getElementById('affection-value'),
    moodBar: document.getElementById('mood-bar'),
    moodVal: document.getElementById('mood-value'),
    chapterBadge: document.getElementById('chapter-badge'),
    speakerTag: document.getElementById('speaker-tag'),
    speakerName: document.getElementById('speaker-name'),
    dialogueBox: document.getElementById('dialogue-box'),
    dialogueText: document.getElementById('dialogue-text'),
    nextIndicator: document.getElementById('next-indicator'),
    choicesContainer: document.getElementById('choices-container'),
    floatingEffects: document.getElementById('floating-effects'),
    btnAuto: document.getElementById('btn-auto'),
    btnLog: document.getElementById('btn-log'),
    btnSave: document.getElementById('btn-save'),
    btnSound: document.getElementById('btn-sound'),
    btnToTitle: document.getElementById('btn-to-title'),
    logModal: document.getElementById('log-modal'),
    logList: document.getElementById('log-list'),
    btnCloseLog: document.getElementById('btn-close-log'),
    galleryModal: document.getElementById('gallery-modal'),
    galleryGrid: document.getElementById('gallery-grid'),
    btnCloseGallery: document.getElementById('btn-close-gallery'),
    cgPreviewModal: document.getElementById('cg-preview-modal'),
    cgPreviewImg: document.getElementById('cg-preview-img'),
    cgPreviewCaption: document.getElementById('cg-preview-caption'),
    btnClosePreview: document.getElementById('btn-close-preview'),
    endingType: document.getElementById('ending-type'),
    endingTitle: document.getElementById('ending-title'),
    endingSummary: document.getElementById('ending-summary'),
    endAffection: document.getElementById('end-affection'),
    endMood: document.getElementById('end-mood'),
    btnEndGallery: document.getElementById('btn-end-gallery'),
    btnEndTitle: document.getElementById('btn-end-title'),
    toast: document.getElementById('toast'),
    canvas: document.getElementById('particle-canvas')
  };

  // ==========================================
  // パーティクル演出 (光の粒子＆花びら)
  // ==========================================
  function initParticles() {
    const canvas = els.canvas;
    const ctx = canvas.getContext('2d');
    let width = 1280;
    let height = 720;

    function resize() {
      const rect = els.container.getBoundingClientRect();
      width = canvas.width = rect.width || 1280;
      height = canvas.height = rect.height || 720;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 34 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.6 + 1.2,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -Math.random() * 0.55 - 0.2,
      alpha: Math.random() * 0.6 + 0.2,
      isPink: Math.random() > 0.68
    }));

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.isPink
          ? `rgba(255, 184, 208, ${p.alpha})`
          : `rgba(255, 234, 167, ${p.alpha})`;
        ctx.shadowColor = p.isPink ? '#ff9ff3' : '#feca57';
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ==========================================
  // セーブ・ロード・ギャラリー管理
  // ==========================================
  function loadUnlockedCGs() {
    try {
      const raw = localStorage.getItem(GALLERY_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        arr.forEach((id) => state.unlockedCGs.add(id));
      }
    } catch (e) {}
  }

  function unlockCG(cgId) {
    if (!cgId) return;
    if (!state.unlockedCGs.has(cgId)) {
      state.unlockedCGs.add(cgId);
      try {
        localStorage.setItem(GALLERY_KEY, JSON.stringify([...state.unlockedCGs]));
      } catch (e) {}
    }
  }

  function hasSaveData() {
    return Boolean(localStorage.getItem(SAVE_KEY));
  }

  function saveGame() {
    const data = {
      sceneId: state.sceneId,
      lineIndex: state.lineIndex,
      affection: state.affection,
      mood: state.mood,
      log: state.log.slice(-40)
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    els.btnContinue.disabled = false;
    showToast('セーブしました！');
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      state.sceneId = data.sceneId || 'prologue_1';
      state.lineIndex = data.lineIndex || 0;
      state.affection = typeof data.affection === 'number' ? data.affection : 20;
      state.mood = typeof data.mood === 'number' ? data.mood : 50;
      state.log = Array.isArray(data.log) ? data.log : [];
      switchScreen('play');
      updateHUD();
      renderCurrentScene(true);
      window.soundEngine.startBGM(window.STORY_SCENES[state.sceneId]?.bgm || 'normal');
    } catch (e) {
      showToast('ロードに失敗しました');
    }
  }

  // ==========================================
  // UI ヘルパー
  // ==========================================
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(els.toast._timer);
    els.toast._timer = setTimeout(() => {
      els.toast.classList.add('hidden');
    }, 1800);
  }

  function switchScreen(name) {
    els.titleScreen.classList.toggle('active', name === 'title');
    els.playScreen.classList.toggle('active', name === 'play');
    els.endingScreen.classList.toggle('active', name === 'ending');
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function updateHUD() {
    const aff = clamp(state.affection, 0, 100);
    const md = clamp(state.mood, 0, 100);
    els.affectionBar.style.width = `${aff}%`;
    els.affectionVal.textContent = aff;
    els.moodBar.style.width = `${md}%`;
    els.moodVal.textContent = md;
  }

  function showFloatingDelta(affDelta, moodDelta) {
    const msgs = [];
    if (affDelta > 0) msgs.push(`♥ 好感度 +${affDelta}`);
    if (affDelta < 0) msgs.push(`💔 好感度 ${affDelta}`);
    if (moodDelta > 0) msgs.push(`✦ ご機嫌 +${moodDelta}`);
    if (moodDelta < 0) msgs.push(`💢 ご機嫌 ${moodDelta}`);
    if (msgs.length === 0) return;

    const badge = document.createElement('div');
    badge.className = `float-badge ${affDelta >= 0 && moodDelta >= 0 ? 'plus' : 'minus'}`;
    badge.textContent = msgs.join('  ');
    els.floatingEffects.appendChild(badge);
    setTimeout(() => badge.remove(), 1550);
  }

  function setCG(cgId) {
    if (!cgId || state.currentCG === cgId) return;
    const cgObj = window.CG_LIST.find((c) => c.id === cgId);
    if (!cgObj) return;
    unlockCG(cgId);

    els.cgBack.src = cgObj.src;
    els.cgFront.classList.add('fading-out');
    setTimeout(() => {
      els.cgFront.src = cgObj.src;
      els.cgFront.classList.remove('fading-out');
    }, 600);
    state.currentCG = cgId;
  }

  function triggerShake() {
    els.container.classList.remove('shake');
    void els.container.offsetWidth;
    els.container.classList.add('shake');
  }

  // ==========================================
  // ノベル進行エンジン
  // ==========================================
  function startNewGame() {
    state.sceneId = 'prologue_1';
    state.lineIndex = 0;
    state.affection = 20;
    state.mood = 50;
    state.log = [];
    state.autoMode = false;
    els.btnAuto.classList.remove('active');
    switchScreen('play');
    updateHUD();
    renderCurrentScene(true);
    window.soundEngine.startBGM('normal');
  }

  function renderCurrentScene(isNewScene = false) {
    const scene = window.STORY_SCENES[state.sceneId];
    if (!scene) return;

    els.choicesContainer.classList.add('hidden');
    els.choicesContainer.innerHTML = '';

    if (isNewScene) {
      els.chapterBadge.textContent = scene.chapter;
      if (scene.cg) setCG(scene.cg);
      if (scene.bgm) window.soundEngine.startBGM(scene.bgm);
      if (scene.shake) triggerShake();
    }

    const line = scene.lines[state.lineIndex];
    if (!line) {
      handleSceneEnd(scene);
      return;
    }

    // 話者表示
    if (line.speaker) {
      els.speakerTag.classList.remove('hidden');
      els.speakerName.textContent = line.speaker;
    } else {
      els.speakerTag.classList.add('hidden');
    }

    // ログ追加
    state.log.push({ speaker: line.speaker || '地の文', text: line.text });

    // タイプライター演出
    typeText(line.text);
  }

  function typeText(fullText) {
    clearInterval(state.typingTimer);
    clearTimeout(state.autoTimer);
    state.isTyping = true;
    els.nextIndicator.classList.add('hidden');
    els.dialogueText.textContent = '';

    let idx = 0;
    state.typingTimer = setInterval(() => {
      idx++;
      els.dialogueText.textContent = fullText.slice(0, idx);
      if (idx >= fullText.length) {
        finishTyping();
      }
    }, 26);
  }

  function finishTyping() {
    clearInterval(state.typingTimer);
    const scene = window.STORY_SCENES[state.sceneId];
    const line = scene?.lines[state.lineIndex];
    if (line) {
      els.dialogueText.textContent = line.text;
    }
    state.isTyping = false;
    els.nextIndicator.classList.remove('hidden');

    if (state.autoMode) {
      state.autoTimer = setTimeout(() => {
        advanceDialogue();
      }, 1700);
    }
  }

  function advanceDialogue() {
    if (!els.playScreen.classList.contains('active')) return;
    if (!els.choicesContainer.classList.contains('hidden')) return;
    if (!els.logModal.classList.contains('hidden')) return;
    if (!els.galleryModal.classList.contains('hidden')) return;

    if (state.isTyping) {
      finishTyping();
      return;
    }

    window.soundEngine.playClick();
    state.lineIndex++;
    renderCurrentScene(false);
  }

  function handleSceneEnd(scene) {
    if (scene.choices && scene.choices.length > 0) {
      showChoices(scene.choices);
    } else if (scene.next) {
      state.sceneId = scene.next;
      state.lineIndex = 0;
      renderCurrentScene(true);
    } else if (scene.ending) {
      showEnding(scene.ending);
    }
  }

  function showChoices(choices) {
    clearTimeout(state.autoTimer);
    els.nextIndicator.classList.add('hidden');
    els.choicesContainer.innerHTML = '';
    els.choicesContainer.classList.remove('hidden');

    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.style.animationDelay = `${i * 0.08}s`;
      btn.textContent = choice.text;
      btn.addEventListener('click', () => selectChoice(choice));
      els.choicesContainer.appendChild(btn);
    });
  }

  function selectChoice(choice) {
    window.soundEngine.playSelect();
    const affDelta = choice.affection || 0;
    const moodDelta = choice.mood || 0;
    state.affection = clamp(state.affection + affDelta, 0, 100);
    state.mood = clamp(state.mood + moodDelta, 0, 100);
    updateHUD();
    showFloatingDelta(affDelta, moodDelta);

    if (affDelta >= 12) {
      setTimeout(() => window.soundEngine.playHeartUp(), 160);
    } else if (affDelta < 0 || moodDelta < 0) {
      setTimeout(() => window.soundEngine.playDown(), 160);
    }

    state.log.push({ speaker: '【選択】', text: choice.text });

    if (choice.next === 'resolve_ending') {
      if (state.affection >= 75 && state.mood >= 55) {
        state.sceneId = 'end_true';
      } else if (state.affection >= 45) {
        state.sceneId = 'end_sweet';
      } else {
        state.sceneId = 'end_bad';
      }
    } else {
      state.sceneId = choice.next;
    }

    state.lineIndex = 0;
    renderCurrentScene(true);
  }

  function showEnding(ending) {
    state.autoMode = false;
    els.btnAuto.classList.remove('active');
    els.endingType.textContent = ending.type;
    els.endingTitle.textContent = ending.title;
    els.endingSummary.textContent = ending.summary;
    els.endAffection.textContent = state.affection;
    els.endMood.textContent = state.mood;
    switchScreen('ending');
  }

  // ==========================================
  // モーダル（ログ・CGギャラリー）
  // ==========================================
  function openLog() {
    els.logList.innerHTML = '';
    state.log.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'log-entry';
      div.innerHTML = `<div class="log-speaker">${escapeHtml(item.speaker)}</div><div class="log-text">${escapeHtml(item.text)}</div>`;
      els.logList.appendChild(div);
    });
    els.logModal.classList.remove('hidden');
    els.logList.scrollTop = els.logList.scrollHeight;
  }

  function openGallery() {
    els.galleryGrid.innerHTML = '';
    window.CG_LIST.forEach((cg) => {
      const unlocked = state.unlockedCGs.has(cg.id);
      const card = document.createElement('div');
      card.className = `gallery-card ${unlocked ? '' : 'locked'}`;
      if (unlocked) {
        card.innerHTML = `<img src="${cg.src}" alt="${escapeHtml(cg.title)}"><div class="gallery-card-label">${escapeHtml(cg.title)}</div>`;
        card.addEventListener('click', () => {
          els.cgPreviewImg.src = cg.src;
          els.cgPreviewCaption.textContent = cg.title;
          els.cgPreviewModal.classList.remove('hidden');
        });
      } else {
        card.innerHTML = `<span>🔒 未解放</span>`;
      }
      els.galleryGrid.appendChild(card);
    });
    els.galleryModal.classList.remove('hidden');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ==========================================
  // イベントリスナー登録
  // ==========================================
  function bindEvents() {
    els.btnStart.addEventListener('click', () => {
      window.soundEngine.playSelect();
      startNewGame();
    });

    els.btnContinue.addEventListener('click', () => {
      window.soundEngine.playSelect();
      loadGame();
    });

    els.btnGallery.addEventListener('click', () => {
      window.soundEngine.playClick();
      openGallery();
    });

    els.dialogueBox.addEventListener('click', advanceDialogue);

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (els.playScreen.classList.contains('active')) {
          e.preventDefault();
          advanceDialogue();
        }
      }
    });

    els.btnAuto.addEventListener('click', () => {
      state.autoMode = !state.autoMode;
      els.btnAuto.classList.toggle('active', state.autoMode);
      if (state.autoMode && !state.isTyping) {
        advanceDialogue();
      }
    });

    els.btnLog.addEventListener('click', openLog);
    els.btnCloseLog.addEventListener('click', () => els.logModal.classList.add('hidden'));

    els.btnSave.addEventListener('click', saveGame);

    els.btnSound.addEventListener('click', () => {
      const muted = window.soundEngine.toggleMute();
      els.btnSound.textContent = muted ? '🔇' : '🔊';
    });

    els.btnToTitle.addEventListener('click', () => {
      window.soundEngine.stopBGM();
      setCG('title');
      switchScreen('title');
    });

    els.btnCloseGallery.addEventListener('click', () => els.galleryModal.classList.add('hidden'));
    els.btnClosePreview.addEventListener('click', () => els.cgPreviewModal.classList.add('hidden'));

    els.btnEndGallery.addEventListener('click', openGallery);
    els.btnEndTitle.addEventListener('click', () => {
      window.soundEngine.stopBGM();
      setCG('title');
      switchScreen('title');
    });
  }

  // 初期化
  loadUnlockedCGs();
  els.btnContinue.disabled = !hasSaveData();
  initParticles();
  bindEvents();
})();

