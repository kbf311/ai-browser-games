(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // UI elements
  const scoreEl = document.getElementById('score-val');
  const highEl = document.getElementById('high-val');
  const stageEl = document.getElementById('stage-val');
  const powerEl = document.getElementById('power-val');
  const bitsEl = document.getElementById('bits-val');
  const livesEl = document.getElementById('lives-val');
  const bossHud = document.getElementById('boss-hud');
  const bossNameEl = document.getElementById('boss-name');
  const bossHpFill = document.getElementById('boss-hp-fill');

  const overlayTitle = document.getElementById('overlay-title');
  const overlayPause = document.getElementById('overlay-pause');
  const overlayGameOver = document.getElementById('overlay-gameover');
  const finalScoreEl = document.getElementById('final-score-val');

  const btnStart = document.getElementById('btn-start');
  const btnResume = document.getElementById('btn-resume');
  const btnRetry = document.getElementById('btn-retry');
  const btnBgm = document.getElementById('btn-bgm');
  const btnSfx = document.getElementById('btn-sfx');
  const btnPause = document.getElementById('btn-pause');

  // Pixel art invader matrices (11x8 / 8x8)
  const SPRITES = {
    squid: [
      [
        '00011000',
        '00111100',
        '01111110',
        '11011011',
        '11111111',
        '00100100',
        '01011010',
        '10100101',
      ],
      [
        '00011000',
        '00111100',
        '01111110',
        '11011011',
        '11111111',
        '01011010',
        '10000001',
        '01000010',
      ],
    ],
    crab: [
      [
        '00100000100',
        '00010001000',
        '00111111100',
        '01101110110',
        '11111111111',
        '10111111101',
        '10100000101',
        '00011011000',
      ],
      [
        '00100000100',
        '10010001001',
        '10111111101',
        '11101110111',
        '11111111111',
        '01111111110',
        '00100000100',
        '01000000010',
      ],
    ],
    octopus: [
      [
        '000011110000',
        '011111111110',
        '111111111111',
        '111001100111',
        '111111111111',
        '000110011000',
        '001101101100',
        '110000000011',
      ],
      [
        '000011110000',
        '011111111110',
        '111111111111',
        '111001100111',
        '111111111111',
        '001110011100',
        '011001100110',
        '001100001100',
      ],
    ],
  };

  // Input state
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (game.state === 'WAVE' || game.state === 'BOSS') {
        togglePause();
      } else if (game.state === 'PAUSED') {
        togglePause();
      }
      return;
    }
    keys.add(e.code);
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  // Touch controls
  document.querySelectorAll('.touch-btn').forEach((btn) => {
    const code = btn.dataset.key === 'Shift' ? 'ShiftLeft' : btn.dataset.key;
    const on = (e) => {
      e.preventDefault();
      keys.add(code);
    };
    const off = (e) => {
      e.preventDefault();
      keys.delete(code);
    };
    btn.addEventListener('touchstart', on, { passive: false });
    btn.addEventListener('touchend', off, { passive: false });
    btn.addEventListener('touchcancel', off, { passive: false });
    btn.addEventListener('mousedown', on);
    btn.addEventListener('mouseup', off);
    btn.addEventListener('mouseleave', off);
  });

  // Audio buttons
  btnBgm.addEventListener('click', () => {
    window.sound.unlock();
    const next = !window.sound.bgmEnabled;
    window.sound.setBgmEnabled(next);
    btnBgm.textContent = `BGM: ${next ? 'ON' : 'OFF'}`;
    btnBgm.classList.toggle('off', !next);
  });

  btnSfx.addEventListener('click', () => {
    window.sound.unlock();
    const next = !window.sound.sfxEnabled;
    window.sound.setSfxEnabled(next);
    btnSfx.textContent = `SFX: ${next ? 'ON' : 'OFF'}`;
    btnSfx.classList.toggle('off', !next);
  });

  btnPause.addEventListener('click', () => {
    if (game.state === 'WAVE' || game.state === 'BOSS' || game.state === 'PAUSED') {
      togglePause();
    }
  });

  btnStart.addEventListener('click', () => startNewGame());
  btnRetry.addEventListener('click', () => startNewGame());
  btnResume.addEventListener('click', () => togglePause());

  function togglePause() {
    if (game.state === 'PAUSED') {
      game.state = game.prevState;
      overlayPause.classList.add('hidden');
    } else if (game.state === 'WAVE' || game.state === 'BOSS') {
      game.prevState = game.state;
      game.state = 'PAUSED';
      overlayPause.classList.remove('hidden');
    }
  }

  // Starfield background
  const stars = Array.from({ length: 85 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.6 + 0.4,
    speed: Math.random() * 28 + 12,
    alpha: Math.random() * 0.6 + 0.25,
  }));

  // Game state object
  const game = {
    state: 'TITLE', // TITLE | WAVE | BOSS_WARNING | BOSS | STAGE_CLEAR | PAUSED | GAME_OVER
    prevState: 'WAVE',
    score: 0,
    highScore: Number(localStorage.getItem('hyper_invader_high') || 0),
    stage: 1,
    lives: 3,
    screenShake: 0,
    flashAlpha: 0,
    stateTimer: 0,
    deflectSfxCooldown: 0,

    player: null,
    barricades: [],
    invaders: [],
    invaderDir: 1,
    invaderMoveTimer: 0,
    invaderAnimFrame: 0,
    invaderShootTimer: 0,
    ufo: null,
    ufoTimer: 12,

    boss: null,
    playerBullets: [],
    enemyBullets: [],
    items: [],
    particles: [],
    floatingTexts: [],
  };

  function createPlayer() {
    return {
      x: W / 2,
      y: H - 56,
      w: 36,
      h: 24,
      hitboxR: 4.5,
      baseSpeed: 290,
      powerLevel: 1, // 1..5
      speedLevel: 1, // 1..4
      bits: 0, // 0..4 orbiting drones
      shield: false,
      overdriveTimer: 0,
      invulnTimer: 0,
      fireCooldown: 0,
      bitAngle: 0,
    };
  }

  function createBarricades() {
    const bunkers = [];
    const cols = 16;
    const rows = 11;
    const cellSize = 5;
    const totalW = cols * cellSize; // 80px
    const positions = [120, 290, 510, 680];

    positions.forEach((cx) => {
      const cells = [];
      for (let r = 0; r < rows; r++) {
        const rowArr = [];
        for (let c = 0; c < cols; c++) {
          let alive = true;
          // Bevel top corners
          if (r === 0 && (c < 2 || c >= cols - 2)) alive = false;
          if (r === 1 && (c < 1 || c >= cols - 1)) alive = false;
          // Arch cutout at bottom
          if (r >= rows - 4 && c >= 5 && c <= cols - 6) alive = false;
          if (r === rows - 5 && c >= 6 && c <= cols - 7) alive = false;
          rowArr.push(alive ? 1 : 0);
        }
        cells.push(rowArr);
      }
      bunkers.push({
        x: cx - totalW / 2,
        y: 530,
        cols,
        rows,
        cellSize,
        cells,
        deflectFlash: 0,
      });
    });
    return bunkers;
  }

  function repairBarricades(ratio = 0.25) {
    game.barricades.forEach((b) => {
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          // Only repair valid arch cells
          let valid = true;
          if (r === 0 && (c < 2 || c >= b.cols - 2)) valid = false;
          if (r === 1 && (c < 1 || c >= b.cols - 1)) valid = false;
          if (r >= b.rows - 4 && c >= 5 && c <= b.cols - 6) valid = false;
          if (r === b.rows - 5 && c >= 6 && c <= b.cols - 7) valid = false;
          if (valid && b.cells[r][c] === 0 && Math.random() < ratio) {
            b.cells[r][c] = 1;
          }
        }
      }
    });
  }

  function createInvaderWave(stage) {
    const list = [];
    const rows = 5;
    const cols = 11;
    const startX = 110;
    const startY = 86;
    const gapX = 52;
    const gapY = 40;

    for (let r = 0; r < rows; r++) {
      let type = 'octopus';
      let color = '#3dff8b';
      let points = 10;
      let hp = 1;
      if (r === 0) {
        type = 'squid';
        color = '#ff2e93';
        points = 30;
        hp = stage >= 3 ? 2 : 1;
      } else if (r <= 2) {
        type = 'crab';
        color = '#22f3ff';
        points = 20;
        hp = stage >= 4 ? 2 : 1;
      }

      for (let c = 0; c < cols; c++) {
        list.push({
          x: startX + c * gapX,
          y: startY + r * gapY,
          w: type === 'squid' ? 24 : type === 'crab' ? 33 : 36,
          h: 24,
          type,
          color,
          points,
          hp,
          maxHp: hp,
          hitFlash: 0,
        });
      }
    }
    return list;
  }

  function createBoss(stage) {
    const names = [
      'DREADNOUGHT CORE',
      'CRIMSON SERAPHIM',
      'ABYSSAL LEVIATHAN',
      'OMEGA VALKYRIE',
    ];
    const maxHp = 1350 + (stage - 1) * 750;
    return {
      name: names[(stage - 1) % names.length] + (stage > 4 ? ` MK-${stage}` : ''),
      x: W / 2,
      y: -90,
      targetY: 132,
      w: 176,
      h: 90,
      hp: maxHp,
      maxHp,
      time: 0,
      moveTime: 0,
      entering: true,
      invulnTimer: 0,
      spiralAngle: 0,
      patternTimer: 0,
      ringTimer: 1.5,
      aimTimer: 0.9,
      hitFlash: 0,
      dying: false,
      deathTimer: 0,
    };
  }

  function startNewGame() {
    window.sound.unlock();
    game.score = 0;
    game.stage = 1;
    game.lives = 3;
    game.player = createPlayer();
    game.barricades = createBarricades();
    game.playerBullets = [];
    game.enemyBullets = [];
    game.items = [];
    game.particles = [];
    game.floatingTexts = [];
    game.ufo = null;
    game.boss = null;

    overlayTitle.classList.add('hidden');
    overlayPause.classList.add('hidden');
    overlayGameOver.classList.add('hidden');
    bossHud.classList.add('hidden');

    startWave(1);
    updateHud();
  }

  function startWave(stage) {
    game.stage = stage;
    game.state = 'WAVE';
    game.invaders = createInvaderWave(stage);
    game.invaderDir = 1;
    game.invaderMoveTimer = 0;
    game.invaderShootTimer = 1.0;
    game.ufo = null;
    game.ufoTimer = 9 + Math.random() * 5;
    game.playerBullets = [];
    game.enemyBullets = [];
    bossHud.classList.add('hidden');
    window.sound.setTempoScale(1.0);
    window.sound.startBgm('wave');
    addFloatingText(W / 2, H / 2 - 40, `STAGE ${stage} START!`, '#22f3ff', 1.4);
  }

  function startBossWarning() {
    game.state = 'BOSS_WARNING';
    game.stateTimer = 2.6;
    game.enemyBullets = [];
    game.ufo = null;
    window.sound.startBgm('warning');
  }

  function startBossFight() {
    game.state = 'BOSS';
    game.boss = createBoss(game.stage);
    bossNameEl.textContent = game.boss.name;
    bossHud.classList.remove('hidden');
    updateBossHud();
    window.sound.startBgm('boss');
  }

  function addScore(pts) {
    game.score += pts;
    if (game.score > game.highScore) {
      game.highScore = game.score;
      localStorage.setItem('hyper_invader_high', String(game.highScore));
    }
  }

  function updateHud() {
    scoreEl.textContent = String(game.score).padStart(6, '0');
    highEl.textContent = String(game.highScore).padStart(6, '0');
    stageEl.textContent = String(game.stage).padStart(2, '0');
    if (game.player) {
      const p = game.player;
      powerEl.textContent = p.overdriveTimer > 0 ? 'HYPER!' : `LV.${p.powerLevel}`;
      bitsEl.textContent = `${p.bits}/4`;
      livesEl.textContent = '♥'.repeat(Math.max(0, game.lives)) || '---';
    }
  }

  function updateBossHud() {
    if (!game.boss) return;
    const pct = Math.max(0, (game.boss.hp / game.boss.maxHp) * 100);
    bossHpFill.style.width = `${pct}%`;
  }

  function addFloatingText(x, y, text, color = '#fff', duration = 1.0) {
    game.floatingTexts.push({ x, y, text, color, life: duration, maxLife: duration });
  }

  function spawnParticles(x, y, color, count = 14, speed = 170) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.25 + Math.random() * 0.75) * speed;
      game.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        size: Math.random() * 3 + 1.5,
        color,
      });
    }
  }

  function maybeDropItem(x, y, guaranteed = false) {
    if (!guaranteed && Math.random() > 0.24) return;
    const roll = Math.random();
    let type = 'P';
    if (roll < 0.38) type = 'P'; // Power Up
    else if (roll < 0.62) type = 'O'; // Option Bit Drone
    else if (roll < 0.78) type = 'S'; // Speed & Rapid
    else if (roll < 0.91) type = 'B'; // Barrier Shield + Base Repair
    else type = 'H'; // Hyper Bomb

    // If already maxed on P, sometimes convert to H or O
    if (type === 'P' && game.player.powerLevel >= 5 && Math.random() < 0.45) {
      type = game.player.bits < 4 ? 'O' : 'H';
    }

    const colors = {
      P: '#ffd447',
      O: '#22f3ff',
      S: '#3dff8b',
      B: '#4da6ff',
      H: '#ff2e93',
    };

    game.items.push({
      x,
      y,
      vy: 115,
      r: 13,
      type,
      color: colors[type],
      phase: Math.random() * Math.PI * 2,
    });
  }

  function applyItem(item) {
    const p = game.player;
    window.sound.playPowerUp();
    addScore(150);

    switch (item.type) {
      case 'P':
        if (p.powerLevel < 5) {
          p.powerLevel++;
          addFloatingText(p.x, p.y - 24, `POWER UP! LV.${p.powerLevel}`, '#ffd447', 1.1);
        } else {
          p.overdriveTimer = 6.0;
          addFloatingText(p.x, p.y - 24, 'HYPER OVERDRIVE!!', '#ffd447', 1.3);
        }
        break;
      case 'O':
        if (p.bits < 4) {
          p.bits++;
          addFloatingText(p.x, p.y - 24, `BIT DRONE +1 (${p.bits}/4)`, '#22f3ff', 1.1);
        } else {
          p.overdriveTimer = Math.max(p.overdriveTimer, 4.5);
          addFloatingText(p.x, p.y - 24, 'FULL BITS! +500', '#22f3ff', 1.0);
          addScore(500);
        }
        break;
      case 'S':
        if (p.speedLevel < 4) {
          p.speedLevel++;
          addFloatingText(p.x, p.y - 24, `SPEED & RAPID LV.${p.speedLevel}`, '#3dff8b', 1.1);
        } else {
          addScore(400);
          addFloatingText(p.x, p.y - 24, 'MAX SPEED! +400', '#3dff8b', 1.0);
        }
        break;
      case 'B':
        p.shield = true;
        repairBarricades(0.22);
        addFloatingText(p.x, p.y - 24, 'SHIELD + 基地修復!', '#4da6ff', 1.15);
        break;
      case 'H':
        triggerHyperBomb();
        break;
    }
    spawnParticles(p.x, p.y, item.color, 18, 200);
    updateHud();
  }

  function triggerHyperBomb() {
    window.sound.playBomb();
    game.screenShake = 0.35;
    game.flashAlpha = 0.5;
    addFloatingText(W / 2, H / 2, 'HYPER NOVA BOMB!!', '#ff2e93', 1.2);

    // Convert all enemy bullets to particles & score
    game.enemyBullets.forEach((b) => {
      spawnParticles(b.x, b.y, b.color || '#ff2e93', 4, 90);
      addScore(15);
    });
    game.enemyBullets = [];

    // Damage invaders or boss
    game.invaders.forEach((inv) => {
      inv.hp -= 3;
      inv.hitFlash = 0.15;
    });
    if (game.boss && !game.boss.dying) {
      damageBoss(180);
    }
  }

  function firePlayerWeapons() {
    const p = game.player;
    const hyper = p.overdriveTimer > 0;
    const lv = hyper ? 5 : p.powerLevel;
    window.sound.playShoot(lv);

    const addBullet = (x, y, vx, vy, dmg, color, kind = 'bolt', w = 4, h = 14) => {
      game.playerBullets.push({
        x, y, vx, vy, dmg, color, kind, w, h,
        pierce: kind === 'laser' ? 3 : 1,
        hitSet: new Set(),
      });
    };

    if (lv === 1) {
      addBullet(p.x, p.y - 16, 0, -620, 1, '#22f3ff');
    } else if (lv === 2) {
      addBullet(p.x - 8, p.y - 14, 0, -680, 1, '#22f3ff');
      addBullet(p.x + 8, p.y - 14, 0, -680, 1, '#22f3ff');
    } else if (lv === 3) {
      addBullet(p.x, p.y - 16, 0, -720, 1.3, '#ffd447');
      addBullet(p.x - 10, p.y - 12, -110, -690, 1, '#22f3ff');
      addBullet(p.x + 10, p.y - 12, 110, -690, 1, '#22f3ff');
    } else if (lv === 4) {
      addBullet(p.x, p.y - 18, 0, -820, 2.2, '#ff2e93', 'laser', 6, 24);
      [-180, -85, 85, 180].forEach((vx) => {
        addBullet(p.x, p.y - 12, vx, -700, 1, '#22f3ff');
      });
    } else {
      // Lv.5 HYPER OVERDRIVE: Dual rail lasers + 7-way fan + homing missiles!
      addBullet(p.x - 7, p.y - 18, 0, -880, 2.2, '#ff2e93', 'laser', 6, 26);
      addBullet(p.x + 7, p.y - 18, 0, -880, 2.2, '#ff2e93', 'laser', 6, 26);
      [-260, -170, -80, 80, 170, 260].forEach((vx) => {
        addBullet(p.x, p.y - 12, vx, -740, 1.1, '#ffd447');
      });
      // Homing missiles
      addBullet(p.x - 16, p.y - 6, -130, -320, 2.5, '#3dff8b', 'homing', 6, 12);
      addBullet(p.x + 16, p.y - 6, 130, -320, 2.5, '#3dff8b', 'homing', 6, 12);
    }

    // Orbiting Bit Drones also fire!
    for (let i = 0; i < p.bits; i++) {
      const pos = getBitPosition(p, i);
      addBullet(pos.x, pos.y - 10, 0, -720, 1.1, '#3dff8b', 'bolt', 4, 12);
      if (lv >= 4) {
        addBullet(pos.x, pos.y - 10, (i % 2 === 0 ? -70 : 70), -680, 0.8, '#22f3ff', 'bolt', 3, 10);
      }
    }
  }

  function getBitPosition(p, idx) {
    const angle = p.bitAngle + (idx * Math.PI * 2) / Math.max(1, p.bits);
    const rx = 38;
    const ry = 18;
    return {
      x: p.x + Math.cos(angle) * rx,
      y: p.y + Math.sin(angle) * ry,
    };
  }

  function damageBoss(dmg) {
    const b = game.boss;
    if (!b || b.dying || b.entering || b.invulnTimer > 0) return false;
    b.hp -= dmg;
    b.hitFlash = 0.06;
    addScore(Math.round(dmg * 4));
    updateBossHud();

    if (b.hp <= 0) {
      b.hp = 0;
      b.dying = true;
      b.deathTimer = 1.9;
      game.enemyBullets = [];
      window.sound.playEnemyExplode(true);
      updateBossHud();
    }
    return true;
  }

  function hurtPlayer() {
    const p = game.player;
    if (p.invulnTimer > 0) return;

    if (p.shield) {
      p.shield = false;
      p.invulnTimer = 1.5;
      window.sound.playShieldBreak();
      spawnParticles(p.x, p.y, '#4da6ff', 22, 220);
      addFloatingText(p.x, p.y - 24, 'SHIELD SAVED!', '#4da6ff', 1.0);
      return;
    }

    window.sound.playPlayerHit();
    game.screenShake = 0.4;
    spawnParticles(p.x, p.y, '#ff4757', 30, 240);
    game.lives--;
    p.powerLevel = Math.max(1, p.powerLevel - 1);
    p.invulnTimer = 2.2;
    updateHud();

    if (game.lives <= 0) {
      game.state = 'GAME_OVER';
      window.sound.stopBgm();
      finalScoreEl.textContent = String(game.score);
      overlayGameOver.classList.remove('hidden');
    }
  }

  // Barricade collision helpers
  function checkBarricadeHit(x, y, canDestroy) {
    for (const b of game.barricades) {
      const bw = b.cols * b.cellSize;
      const bh = b.rows * b.cellSize;
      if (x < b.x || x >= b.x + bw || y < b.y || y >= b.y + bh) continue;

      const c = Math.floor((x - b.x) / b.cellSize);
      const r = Math.floor((y - b.y) / b.cellSize);
      if (r >= 0 && r < b.rows && c >= 0 && c < b.cols && b.cells[r][c] === 1) {
        if (canDestroy) {
          // Erode small blast radius
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const rr = r + dr;
              const cc = c + dc;
              if (rr >= 0 && rr < b.rows && cc >= 0 && cc < b.cols) {
                if (Math.abs(dr) + Math.abs(dc) <= 2 && Math.random() < 0.85) {
                  b.cells[rr][cc] = 0;
                }
              }
            }
          }
          window.sound.playBarricadeErode();
          spawnParticles(x, y, '#3dff8b', 5, 80);
        } else {
          // Boss bullet deflected! Barricade stays 100% intact!
          b.deflectFlash = 0.14;
          if (game.deflectSfxCooldown <= 0) {
            window.sound.playBarricadeDeflect();
            game.deflectSfxCooldown = 0.055;
          }
          spawnParticles(x, y, '#22f3ff', 4, 110);
        }
        return true;
      }
    }
    return false;
  }

  function erodeBarricadesByInvaders() {
    for (const inv of game.invaders) {
      const left = inv.x - inv.w / 2;
      const right = inv.x + inv.w / 2;
      const top = inv.y - inv.h / 2;
      const bottom = inv.y + inv.h / 2;

      for (const b of game.barricades) {
        if (right < b.x || left > b.x + b.cols * b.cellSize || bottom < b.y || top > b.y + b.rows * b.cellSize) {
          continue;
        }
        for (let r = 0; r < b.rows; r++) {
          for (let c = 0; c < b.cols; c++) {
            if (b.cells[r][c] === 0) continue;
            const cx = b.x + c * b.cellSize + b.cellSize / 2;
            const cy = b.y + r * b.cellSize + b.cellSize / 2;
            if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
              b.cells[r][c] = 0;
            }
          }
        }
      }
    }
  }

  // Boss Danmaku Spawner
  function updateBossDanmaku(dt) {
    const b = game.boss;
    if (!b || b.dying) return;

    b.time += dt;
    if (b.entering) {
      b.y += 140 * dt;
      if (b.y >= b.targetY) {
        b.y = b.targetY;
        b.entering = false;
        b.moveTime = 0;
        b.invulnTimer = 5.0; // Invincible for 5s after starting attack
        addFloatingText(b.x, b.y + 68, 'BOSS INVINCIBLE (5.0s)', '#22f3ff', 1.5);
      }
      return;
    }

    if (b.invulnTimer > 0) {
      b.invulnTimer = Math.max(0, b.invulnTimer - dt);
    }

    // Smooth figure-8 / patrol movement starting cleanly from (W/2, targetY)
    b.moveTime += dt;
    const hpRatio = b.hp / b.maxHp;
    const phase = hpRatio > 0.65 ? 1 : hpRatio > 0.30 ? 2 : 3;
    const moveSpeed = phase === 1 ? 0.9 : phase === 2 ? 1.25 : 1.55;
    b.x = W / 2 + Math.sin(b.moveTime * moveSpeed) * 210;
    b.y = b.targetY + Math.sin(b.moveTime * moveSpeed * 2) * 26;

    const spawnBullet = (x, y, angle, speed, color, r = 5) => {
      game.enemyBullets.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r,
        color,
        fromBoss: true, // CANNOT destroy barricades!
      });
    };

    // Pattern 1: Spiral streams
    b.patternTimer -= dt;
    const spiralInterval = phase === 1 ? 0.14 : phase === 2 ? 0.095 : 0.07;
    if (b.patternTimer <= 0) {
      b.patternTimer = spiralInterval;
      b.spiralAngle += phase === 1 ? 0.28 : phase === 2 ? 0.33 : 0.38;
      const arms = phase === 1 ? 4 : phase === 2 ? 6 : 8;
      for (let i = 0; i < arms; i++) {
        const a = b.spiralAngle + (i * Math.PI * 2) / arms;
        spawnBullet(b.x, b.y + 12, a, 185 + phase * 22, phase === 3 ? '#ff2e93' : '#ff6b9d', 5);
      }
      if (phase >= 2) {
        // Counter-rotating wing emitters
        const a2 = -b.spiralAngle * 1.2;
        spawnBullet(b.x - 62, b.y + 16, a2 + Math.PI / 2, 210, '#ffd447', 4.5);
        spawnBullet(b.x + 62, b.y + 16, -a2 + Math.PI / 2, 210, '#ffd447', 4.5);
      }
    }

    // Pattern 2: Mandala / Ring bursts
    b.ringTimer -= dt;
    if (b.ringTimer <= 0) {
      b.ringTimer = phase === 1 ? 2.4 : phase === 2 ? 1.9 : 1.5;
      const count = phase === 1 ? 16 : phase === 2 ? 22 : 28;
      const offset = Math.random() * Math.PI;
      for (let i = 0; i < count; i++) {
        const a = offset + (i * Math.PI * 2) / count;
        spawnBullet(b.x, b.y, a, 165 + (i % 2) * 35, '#a855f7', 5.5);
      }
    }

    // Pattern 3: Aimed fan toward player
    b.aimTimer -= dt;
    if (b.aimTimer <= 0) {
      b.aimTimer = phase === 1 ? 1.6 : phase === 2 ? 1.25 : 1.05;
      const aim = Math.atan2(game.player.y - b.y, game.player.x - b.x);
      const fanCount = phase === 1 ? 5 : phase === 2 ? 7 : 9;
      const spread = 0.14;
      for (let i = 0; i < fanCount; i++) {
        const a = aim + (i - (fanCount - 1) / 2) * spread;
        spawnBullet(b.x, b.y + 24, a, 240 + phase * 20, '#22f3ff', 5);
      }
    }
  }

  // Main Update
  function update(dt) {
    // Stars always drift gently
    for (const s of stars) {
      s.y += s.speed * dt;
      if (s.y > H) {
        s.y = -4;
        s.x = Math.random() * W;
      }
    }

    if (game.state === 'TITLE' || game.state === 'PAUSED' || game.state === 'GAME_OVER') {
      return;
    }

    if (game.screenShake > 0) game.screenShake = Math.max(0, game.screenShake - dt);
    if (game.flashAlpha > 0) game.flashAlpha = Math.max(0, game.flashAlpha - dt * 1.4);
    if (game.deflectSfxCooldown > 0) game.deflectSfxCooldown -= dt;

    game.barricades.forEach((b) => {
      if (b.deflectFlash > 0) b.deflectFlash = Math.max(0, b.deflectFlash - dt);
    });

    // Player movement & firing
    const p = game.player;
    if (p) {
      p.bitAngle += dt * 2.8;
      if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
      if (p.overdriveTimer > 0) {
        p.overdriveTimer = Math.max(0, p.overdriveTimer - dt);
        if (p.overdriveTimer === 0) updateHud();
      }

      const slow = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const speed = (p.baseSpeed + (p.speedLevel - 1) * 45) * (slow ? 0.45 : 1);
      let dx = 0;
      let dy = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;

      if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }

      p.x = Math.max(24, Math.min(W - 24, p.x + dx * speed * dt));
      // Allow vertical micro-dodging in the lower defense zone
      p.y = Math.max(H - 175, Math.min(H - 34, p.y + dy * speed * dt));

      p.fireCooldown -= dt;
      const shooting = keys.has('Space') || keys.has('KeyZ');
      const baseCadence = Math.max(0.085, 0.22 - (p.speedLevel - 1) * 0.032 - (p.powerLevel - 1) * 0.015);
      const cadence = p.overdriveTimer > 0 ? 0.075 : baseCadence;
      if (shooting && p.fireCooldown <= 0) {
        p.fireCooldown = cadence;
        firePlayerWeapons();
      }
    }

    // State-specific logic
    if (game.state === 'BOSS_WARNING') {
      game.stateTimer -= dt;
      if (game.stateTimer <= 0) {
        startBossFight();
      }
    } else if (game.state === 'STAGE_CLEAR') {
      game.stateTimer -= dt;
      if (game.stateTimer <= 0) {
        repairBarricades(0.35);
        startWave(game.stage + 1);
        updateHud();
      }
    } else if (game.state === 'WAVE') {
      updateWave(dt);
    } else if (game.state === 'BOSS') {
      updateBossState(dt);
    }

    updateBullets(dt);
    updateItems(dt);
    updateParticles(dt);
    updateFloatingTexts(dt);
  }

  function updateWave(dt) {
    // UFO logic
    if (!game.ufo) {
      game.ufoTimer -= dt;
      if (game.ufoTimer <= 0) {
        const fromLeft = Math.random() < 0.5;
        game.ufo = {
          x: fromLeft ? -30 : W + 30,
          y: 44,
          vx: fromLeft ? 145 : -145,
          w: 44,
          h: 20,
          points: 250,
        };
        game.ufoTimer = 14 + Math.random() * 8;
      }
    } else {
      game.ufo.x += game.ufo.vx * dt;
      if (game.ufo.x < -50 || game.ufo.x > W + 50) {
        game.ufo = null;
      }
    }

    // Invaders march
    const count = game.invaders.length;
    if (count === 0) {
      startBossWarning();
      return;
    }

    const ratio = count / 55;
    window.sound.setTempoScale(1.0 + (1 - ratio) * 0.35);
    const stepInterval = Math.max(0.08, (0.55 * ratio + 0.06) / (1 + (game.stage - 1) * 0.12));

    game.invaderMoveTimer += dt;
    if (game.invaderMoveTimer >= stepInterval) {
      game.invaderMoveTimer = 0;
      game.invaderAnimFrame = 1 - game.invaderAnimFrame;

      let hitEdge = false;
      const stepX = 14 * game.invaderDir;
      for (const inv of game.invaders) {
        if (inv.x + stepX < 28 || inv.x + stepX > W - 28) {
          hitEdge = true;
          break;
        }
      }

      if (hitEdge) {
        game.invaderDir *= -1;
        for (const inv of game.invaders) {
          inv.y += 20;
        }
      } else {
        for (const inv of game.invaders) {
          inv.x += stepX;
        }
      }

      erodeBarricadesByInvaders();

      // Check if invaders reached player line
      for (const inv of game.invaders) {
        if (inv.y + inv.h / 2 >= H - 68) {
          game.lives = 0;
          hurtPlayer();
          return;
        }
      }
    }

    // Invader shooting
    game.invaderShootTimer -= dt;
    if (game.invaderShootTimer <= 0) {
      game.invaderShootTimer = Math.max(0.32, 1.05 - game.stage * 0.08) * (0.6 + ratio * 0.5);
      const shooter = game.invaders[Math.floor(Math.random() * game.invaders.length)];
      if (shooter) {
        game.enemyBullets.push({
          x: shooter.x,
          y: shooter.y + 14,
          vx: 0,
          vy: 260 + game.stage * 20,
          r: 4.5,
          color: '#ff6b6b',
          fromBoss: false, // Normal invader bullets CAN erode barricades
        });
      }
    }

    game.invaders.forEach((inv) => {
      if (inv.hitFlash > 0) inv.hitFlash = Math.max(0, inv.hitFlash - dt);
    });
  }

  function updateBossState(dt) {
    const b = game.boss;
    if (!b) return;
    if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);

    if (b.dying) {
      b.deathTimer -= dt;
      if (Math.random() < 0.45) {
        const ex = b.x + (Math.random() - 0.5) * b.w;
        const ey = b.y + (Math.random() - 0.5) * b.h;
        spawnParticles(ex, ey, Math.random() < 0.5 ? '#ffd447' : '#ff2e93', 14, 220);
        game.screenShake = 0.15;
      }
      if (b.deathTimer <= 0) {
        const bonus = 2000 * game.stage;
        addScore(bonus);
        window.sound.playVictory();
        spawnParticles(b.x, b.y, '#22f3ff', 55, 320);
        addFloatingText(W / 2, H / 2 - 20, `BOSS DEFEATED! +${bonus}`, '#ffd447', 1.8);
        game.boss = null;
        bossHud.classList.add('hidden');
        game.state = 'STAGE_CLEAR';
        game.stateTimer = 2.4;
        updateHud();
      }
      return;
    }

    updateBossDanmaku(dt);
  }

  function updateBullets(dt) {
    // Player bullets
    for (let i = game.playerBullets.length - 1; i >= 0; i--) {
      const b = game.playerBullets[i];

      // Homing missile steering
      if (b.kind === 'homing') {
        let target = null;
        let bestDist = Infinity;
        if (game.boss && !game.boss.dying) {
          target = game.boss;
        } else {
          for (const inv of game.invaders) {
            const d = Math.hypot(inv.x - b.x, inv.y - b.y);
            if (d < bestDist) {
              bestDist = d;
              target = inv;
            }
          }
        }
        if (target) {
          const desired = Math.atan2(target.y - b.y, target.x - b.x);
          const speed = Math.hypot(b.vx, b.vy) || 460;
          const cur = Math.atan2(b.vy, b.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const nextAngle = cur + Math.max(-7 * dt, Math.min(7 * dt, diff));
          b.vx = Math.cos(nextAngle) * Math.min(560, speed + 160 * dt);
          b.vy = Math.sin(nextAngle) * Math.min(560, speed + 160 * dt);
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.y < -30 || b.y > H + 30 || b.x < -30 || b.x > W + 30) {
        game.playerBullets.splice(i, 1);
        continue;
      }

      // Player bullets also erode/destroy barricades
      if (checkBarricadeHit(b.x, b.y, true)) {
        game.playerBullets.splice(i, 1);
        continue;
      }

      let removed = false;

      // Hit UFO
      if (game.ufo) {
        const u = game.ufo;
        if (Math.abs(b.x - u.x) < u.w / 2 + 4 && Math.abs(b.y - u.y) < u.h / 2 + 4) {
          addScore(u.points);
          window.sound.playEnemyExplode(true);
          spawnParticles(u.x, u.y, '#ffd447', 24, 210);
          addFloatingText(u.x, u.y, `+${u.points}`, '#ffd447', 1.0);
          maybeDropItem(u.x, u.y, true);
          game.ufo = null;
          b.pierce--;
          if (b.pierce <= 0) removed = true;
        }
      }

      // Hit Invaders
      if (!removed) {
        for (let j = game.invaders.length - 1; j >= 0; j--) {
          const inv = game.invaders[j];
          if (b.hitSet.has(inv)) continue;
          if (Math.abs(b.x - inv.x) < inv.w / 2 + b.w / 2 && Math.abs(b.y - inv.y) < inv.h / 2 + b.h / 2) {
            b.hitSet.add(inv);
            inv.hp -= b.dmg;
            inv.hitFlash = 0.08;
            if (inv.hp <= 0) {
              addScore(inv.points);
              window.sound.playEnemyExplode(false);
              spawnParticles(inv.x, inv.y, inv.color, 12, 160);
              maybeDropItem(inv.x, inv.y, false);
              game.invaders.splice(j, 1);
              updateHud();
            } else {
              window.sound.playEnemyHit();
            }
            b.pierce--;
            if (b.pierce <= 0) {
              removed = true;
              break;
            }
          }
        }
      }

      // Hit Boss
      if (!removed && game.boss && !game.boss.dying) {
        const boss = game.boss;
        if (!b.hitSet.has(boss) && Math.abs(b.x - boss.x) < boss.w / 2 && Math.abs(b.y - boss.y) < boss.h / 2) {
          b.hitSet.add(boss);
          const damaged = damageBoss(b.dmg * 10);
          spawnParticles(b.x, b.y, damaged ? '#ffd447' : '#22f3ff', 5, 110);
          removed = true;
        }
      }

      if (removed) {
        game.playerBullets.splice(i, 1);
      }
    }

    // Enemy / Boss bullets
    const p = game.player;
    for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
      const eb = game.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;

      if (eb.x < -20 || eb.x > W + 20 || eb.y < -20 || eb.y > H + 20) {
        game.enemyBullets.splice(i, 1);
        continue;
      }

      // Barricade check:
      // Normal invader bullets CAN erode barricades (canDestroy = !eb.fromBoss)
      // Boss bullets CANNOT destroy barricades (canDestroy = false) -> blocked & deflected!
      if (checkBarricadeHit(eb.x, eb.y, !eb.fromBoss)) {
        game.enemyBullets.splice(i, 1);
        continue;
      }

      // Player hitbox check (small danmaku core)
      if (p && p.invulnTimer <= 0) {
        const dist = Math.hypot(eb.x - p.x, eb.y - p.y);
        if (dist < p.hitboxR + eb.r * 0.75) {
          game.enemyBullets.splice(i, 1);
          hurtPlayer();
        }
      }
    }
  }

  function updateItems(dt) {
    const p = game.player;
    for (let i = game.items.length - 1; i >= 0; i--) {
      const it = game.items[i];
      it.y += it.vy * dt;
      it.phase += dt * 5;
      if (it.y > H + 24) {
        game.items.splice(i, 1);
        continue;
      }
      if (p && Math.hypot(it.x - p.x, it.y - p.y) < it.r + 22) {
        applyItem(it);
        game.items.splice(i, 1);
      }
    }
  }

  function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const pt = game.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= dt;
      if (pt.life <= 0) game.particles.splice(i, 1);
    }
  }

  function updateFloatingTexts(dt) {
    for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
      const ft = game.floatingTexts[i];
      ft.y -= 32 * dt;
      ft.life -= dt;
      if (ft.life <= 0) game.floatingTexts.splice(i, 1);
    }
  }

  // --- Rendering ---
  function drawSprite(matrix, cx, cy, scale, color) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const startX = cx - (cols * scale) / 2;
    const startY = cy - (rows * scale) / 2;
    ctx.fillStyle = color;
    for (let r = 0; r < rows; r++) {
      const row = matrix[r];
      for (let c = 0; c < cols; c++) {
        if (row[c] === '1') {
          ctx.fillRect(Math.round(startX + c * scale), Math.round(startY + r * scale), scale, scale);
        }
      }
    }
  }

  function drawBarricades() {
    const isBoss = game.state === 'BOSS' || game.state === 'BOSS_WARNING';
    for (const b of game.barricades) {
      if (isBoss) {
        ctx.save();
        ctx.strokeStyle = b.deflectFlash > 0 ? '#ffffff' : 'rgba(34, 243, 255, 0.45)';
        ctx.lineWidth = b.deflectFlash > 0 ? 2.5 : 1.2;
        ctx.strokeRect(b.x - 3, b.y - 3, b.cols * b.cellSize + 6, b.rows * b.cellSize + 6);
        ctx.restore();
      }

      ctx.fillStyle = b.deflectFlash > 0 ? '#a8ffff' : isBoss ? '#22f3ff' : '#3dff8b';
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          if (b.cells[r][c] === 1) {
            ctx.fillRect(b.x + c * b.cellSize, b.y + r * b.cellSize, b.cellSize - 0.4, b.cellSize - 0.4);
          }
        }
      }
    }
  }

  function drawPlayer() {
    const p = game.player;
    if (!p) return;
    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 16) % 2 === 0) return;

    // Orbiting Bit Drones
    for (let i = 0; i < p.bits; i++) {
      const pos = getBitPosition(p, i);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.fillStyle = '#22f3ff';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, 6);
      ctx.lineTo(-7, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Energy Shield
    if (p.shield) {
      ctx.save();
      ctx.strokeStyle = 'rgba(77, 166, 255, 0.85)';
      ctx.fillStyle = 'rgba(77, 166, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Player Ship
    ctx.save();
    ctx.translate(p.x, p.y);
    const hyper = p.overdriveTimer > 0;
    ctx.fillStyle = hyper ? '#ffd447' : p.powerLevel >= 4 ? '#ff2e93' : '#22f3ff';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(18, 10);
    ctx.lineTo(8, 10);
    ctx.lineTo(5, 14);
    ctx.lineTo(-5, 14);
    ctx.lineTo(-8, 10);
    ctx.lineTo(-18, 10);
    ctx.closePath();
    ctx.fill();

    // Cockpit / Danmaku Hitbox Core
    const slow = keys.has('ShiftLeft') || keys.has('ShiftRight');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, slow ? p.hitboxR + 1 : p.hitboxR, 0, Math.PI * 2);
    ctx.fill();
    if (slow) {
      ctx.strokeStyle = '#ff2e93';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.hitboxR + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoss() {
    const b = game.boss;
    if (!b) return;
    ctx.save();
    ctx.translate(b.x, b.y);

    const flash = b.hitFlash > 0;
    // Outer Wings
    ctx.fillStyle = flash ? '#ffffff' : '#2b1055';
    ctx.strokeStyle = flash ? '#ffffff' : '#ff2e93';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-88, -12);
    ctx.lineTo(-42, -42);
    ctx.lineTo(42, -42);
    ctx.lineTo(88, -12);
    ctx.lineTo(74, 34);
    ctx.lineTo(28, 22);
    ctx.lineTo(0, 44);
    ctx.lineTo(-28, 22);
    ctx.lineTo(-74, 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Reactor Core
    const pulse = 1 + Math.sin(b.time * 8) * 0.14;
    ctx.fillStyle = flash ? '#ffffff' : '#ff2e93';
    ctx.beginPath();
    ctx.arc(0, 2, 18 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd447';
    ctx.beginPath();
    ctx.arc(0, 2, 9 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Wing cannons
    ctx.fillStyle = '#22f3ff';
    ctx.fillRect(-66, 12, 10, 14);
    ctx.fillRect(56, 12, 10, 14);

    // Invincibility barrier (5s after starting attack)
    if (b.entering || b.invulnTimer > 0) {
      ctx.strokeStyle = 'rgba(34, 243, 255, 0.85)';
      ctx.fillStyle = 'rgba(34, 243, 255, 0.12)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 98, 56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (b.invulnTimer > 0) {
        ctx.fillStyle = '#22f3ff';
        ctx.font = 'bold 13px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`SHIELD ${b.invulnTimer.toFixed(1)}s`, 0, -56);
      }
    }

    ctx.restore();
  }

  function render() {
    ctx.save();
    if (game.screenShake > 0) {
      const mag = game.screenShake * 18;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // Background
    ctx.fillStyle = '#03050b';
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const s of stars) {
      ctx.fillStyle = `rgba(210, 230, 255, ${s.alpha})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }

    drawBarricades();

    // UFO
    if (game.ufo) {
      const u = game.ufo;
      ctx.fillStyle = '#ff2e93';
      ctx.beginPath();
      ctx.ellipse(u.x, u.y, u.w / 2, u.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd447';
      ctx.beginPath();
      ctx.ellipse(u.x, u.y - 5, u.w / 4, u.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Invaders
    for (const inv of game.invaders) {
      const frame = SPRITES[inv.type][game.invaderAnimFrame];
      drawSprite(frame, inv.x, inv.y, 3, inv.hitFlash > 0 ? '#ffffff' : inv.color);
    }

    drawBoss();

    // Power-up items
    for (const it of game.items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.scale(1 + Math.sin(it.phase) * 0.08, 1 + Math.sin(it.phase) * 0.08);
      ctx.fillStyle = 'rgba(10, 16, 32, 0.9)';
      ctx.strokeStyle = it.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(-13, -13, 26, 26, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = it.color;
      ctx.font = 'bold 15px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(it.type, 0, 1);
      ctx.restore();
    }

    // Player Bullets
    for (const b of game.playerBullets) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    }

    // Enemy / Boss Bullets
    for (const eb of game.enemyBullets) {
      ctx.fillStyle = eb.color;
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    drawPlayer();

    // Particles
    for (const pt of game.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // Floating Texts
    for (const ft of game.floatingTexts) {
      ctx.globalAlpha = Math.min(1, ft.life / ft.maxLife * 1.4);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    // Boss Warning Banner
    if (game.state === 'BOSS_WARNING') {
      const blink = Math.floor(game.stateTimer * 8) % 2 === 0;
      ctx.fillStyle = blink ? 'rgba(255, 46, 147, 0.16)' : 'rgba(255, 46, 147, 0.05)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#ff2e93';
      ctx.font = '900 34px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WARNING // BOSS APPROACHING', W / 2, H / 2 - 20);

      ctx.fillStyle = '#22f3ff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('基地バリケード無敵化 — ボスの弾幕を遮断せよ！', W / 2, H / 2 + 16);
    }

    if (game.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${game.flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  updateHud();
  requestAnimationFrame(loop);
})();
