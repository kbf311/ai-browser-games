(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const W = canvas.width;   // 960
  const H = canvas.height;  // 600
  const WALL = 46;
  const ARENA = {
    left: WALL,
    right: W - WALL,
    top: WALL,
    bottom: H - WALL,
    width: W - WALL * 2,
    height: H - WALL * 2
  };

  // DOM Elements
  const elScore = document.getElementById('score-val');
  const elHiScore = document.getElementById('hiscore-val');
  const elRoom = document.getElementById('room-val');
  const elLives = document.getElementById('lives-val');
  const elBombs = document.getElementById('bombs-val');
  const elWeapon = document.getElementById('weapon-val');
  const elMult = document.getElementById('mult-val');
  const elBanner = document.getElementById('announcer-banner');
  const elBannerText = document.getElementById('announcer-text');

  const screenTitle = document.getElementById('screen-title');
  const screenPause = document.getElementById('screen-pause');
  const screenGameover = document.getElementById('screen-gameover');

  const btnStart = document.getElementById('btn-start');
  const btnResume = document.getElementById('btn-resume');
  const btnRestartPause = document.getElementById('btn-restart-pause');
  const btnRetry = document.getElementById('btn-retry');
  const btnMute = document.getElementById('btn-mute');

  const HI_KEY = 'cyber_smash_tv_hiscore';
  let highScore = parseInt(localStorage.getItem(HI_KEY) || '100000', 10);

  // Input State
  const keys = new Set();
  const mouse = { x: W / 2, y: H / 2, down: false, active: false };

  // Game State
  let state = 'TITLE'; // TITLE | PLAYING | PAUSED | ROOM_CLEAR | TRANSITION | GAMEOVER
  let lastTime = 0;
  let bannerTimer = 0;
  let shakeTime = 0;
  let shakeMag = 0;
  let flashAlpha = 0;
  let flashColor = '#ffffff';

  const stats = {
    score: 0,
    kills: 0,
    prizes: 0,
    loop: 1,
    room: 1,
    multiplier: 1.0,
    multDecayTimer: 0
  };

  const player = {
    x: W / 2,
    y: H / 2,
    r: 14,
    speed: 235,
    aimAngle: 0,
    walkPhase: 0,
    lives: 3,
    bombs: 3,
    invuln: 0,
    shield: 0,
    speedBoost: 0,
    weapon: 'NORMAL',
    weaponTimer: 0,
    fireCooldown: 0
  };

  let bullets = [];
  let enemyBullets = [];
  let enemies = [];
  let pickups = [];
  let particles = [];
  let decals = [];
  let floatingTexts = [];
  let gates = [];
  let openExits = [];
  let roomBonusNext = false;

  const waveCtrl = {
    waveIndex: 0,
    totalWaves: 3,
    spawnQueue: [],
    spawnTimer: 0,
    waveDelay: 0,
    bossSpawned: false
  };

  const ROOM_NAMES = [
    'STUDIO A: WELCOME!',
    'STUDIO B: LASER ALLEY',
    'STUDIO C: PRIZE VAULT',
    'STUDIO D: HEAVY METAL',
    'FINAL ARENA: MUTOID BOSS'
  ];

  const ANNOUNCER_LINES = [
    'BIG MONEY! BIG PRIZES! I LOVE IT!',
    'GOOD LUCK! YOU\'LL NEED IT!',
    'TOTAL CARNAGE!',
    'KEEP FIRING, CONTESTANT!',
    'THAT\'S GONNA LEAVE A MARK!'
  ];

  // Utility
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

  function showBanner(text, duration = 2.6) {
    elBannerText.textContent = text;
    elBanner.classList.remove('hidden');
    bannerTimer = duration;
  }

  function addShake(mag = 6, time = 0.18) {
    shakeMag = Math.max(shakeMag, mag);
    shakeTime = Math.max(shakeTime, time);
  }

  function addFlash(color = '#ffffff', alpha = 0.45) {
    flashColor = color;
    flashAlpha = Math.max(flashAlpha, alpha);
  }

  function addScore(base) {
    const pts = Math.round(base * stats.multiplier);
    stats.score += pts;
    if (stats.score > highScore) {
      highScore = stats.score;
      localStorage.setItem(HI_KEY, String(highScore));
    }
    return pts;
  }

  function spawnFloatingText(x, y, text, color = '#ffd500', size = 14) {
    floatingTexts.push({
      x, y, text, color, size,
      vy: -42,
      life: 0.95,
      maxLife: 0.95
    });
  }

  function spawnParticles(x, y, color, count = 12, speed = 180, size = 3.5) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(speed * 0.25, speed);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: rand(size * 0.6, size * 1.4),
        color,
        life: rand(0.25, 0.55),
        maxLife: 0.55
      });
    }
  }

  function initGates() {
    gates = [
      { id: 'TOP', x: W / 2, y: ARENA.top, nx: 0, ny: 1, w: 72, h: 12, active: 0 },
      { id: 'BOTTOM', x: W / 2, y: ARENA.bottom, nx: 0, ny: -1, w: 72, h: 12, active: 0 },
      { id: 'LEFT', x: ARENA.left, y: H / 2, nx: 1, ny: 0, w: 12, h: 72, active: 0 },
      { id: 'RIGHT', x: ARENA.right, y: H / 2, nx: -1, ny: 0, w: 12, h: 72, active: 0 }
    ];
  }

  function startNewGame() {
    window.soundEngine.init();
    stats.score = 0;
    stats.kills = 0;
    stats.prizes = 0;
    stats.loop = 1;
    stats.room = 1;
    stats.multiplier = 1.0;
    stats.multDecayTimer = 0;

    player.x = W / 2;
    player.y = H / 2;
    player.lives = 3;
    player.bombs = 3;
    player.invuln = 1.5;
    player.shield = 0;
    player.speedBoost = 0;
    player.weapon = 'NORMAL';
    player.weaponTimer = 0;
    player.fireCooldown = 0;

    roomBonusNext = false;
    screenTitle.classList.add('hidden');
    screenPause.classList.add('hidden');
    screenGameover.classList.add('hidden');

    setupRoom(1);
    state = 'PLAYING';
    showBanner('GOOD LUCK! YOU\'LL NEED IT!', 3.0);
  }

  function setupRoom(roomNum) {
    stats.room = roomNum;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    pickups = [];
    particles = [];
    decals = [];
    floatingTexts = [];
    openExits = [];
    initGates();

    const isBoss = roomNum === 5;
    window.soundEngine.startBgm(isBoss);

    waveCtrl.waveIndex = 0;
    waveCtrl.totalWaves = isBoss ? 1 : (roomNum === 1 ? 3 : 4);
    waveCtrl.spawnQueue = [];
    waveCtrl.spawnTimer = 0.6;
    waveCtrl.waveDelay = 0.5;
    waveCtrl.bossSpawned = false;

    // Spawn initial prizes in room
    const prizeCount = roomBonusNext ? 8 : (roomNum === 3 ? 6 : 3);
    for (let i = 0; i < prizeCount; i++) {
      spawnPrize(rand(ARENA.left + 80, ARENA.right - 80), rand(ARENA.top + 80, ARENA.bottom - 80));
    }
    roomBonusNext = false;

    if (isBoss) {
      showBanner('WARNING: MUTOID TITAN APPROACHING!', 3.2);
      window.soundEngine.playBossWarning();
    } else {
      showBanner(`${ROOM_NAMES[roomNum - 1]} (LOOP ${stats.loop})`, 2.4);
    }

    buildWave(0);
  }

  function buildWave(wIdx) {
    const r = stats.room;
    const loop = stats.loop;
    const scale = 1 + (loop - 1) * 0.35;
    const q = [];

    if (r === 5) {
      // Boss Room
      waveCtrl.bossSpawned = true;
      enemies.push(createBoss(W / 2, ARENA.top + 110, loop));
      for (let i = 0; i < 4; i++) {
        q.push('GRUNT');
      }
      waveCtrl.spawnQueue = q;
      return;
    }

    const baseCount = Math.round((8 + r * 3 + wIdx * 4) * scale);
    for (let i = 0; i < baseCount; i++) {
      const roll = Math.random();
      if (r >= 4 && roll < 0.14) q.push('TANK');
      else if (r >= 3 && roll < 0.28) q.push('BOMBER');
      else if (r >= 2 && roll < 0.46) q.push('SHOOTER');
      else if (roll < 0.68) q.push('RUNNER');
      else q.push('GRUNT');
    }
    waveCtrl.spawnQueue = q;
  }

  function createEnemy(type, x, y) {
    const loopMult = 1 + (stats.loop - 1) * 0.25;
    const base = {
      type, x, y,
      vx: 0, vy: 0,
      hitFlash: 0,
      shootTimer: rand(0.8, 2.2),
      phase: rand(0, Math.PI * 2),
      isBoss: false
    };

    switch (type) {
      case 'RUNNER':
        return { ...base, r: 12, hp: Math.ceil(1 * loopMult), maxHp: 1, speed: 155 * (1 + (stats.loop - 1) * 0.1), color: '#ffd500', score: 150 };
      case 'SHOOTER':
        return { ...base, r: 15, hp: Math.ceil(3 * loopMult), maxHp: 3, speed: 78, color: '#c44dff', score: 250 };
      case 'TANK':
        return { ...base, r: 21, hp: Math.ceil(10 * loopMult), maxHp: 10, speed: 58, color: '#ff7b00', score: 500 };
      case 'BOMBER':
        return { ...base, r: 15, hp: Math.ceil(2 * loopMult), maxHp: 2, speed: 120, color: '#ff2a85', score: 300, fuse: 0 };
      case 'GRUNT':
      default:
        return { ...base, r: 13, hp: Math.ceil(2 * loopMult), maxHp: 2, speed: 105 * (1 + (stats.loop - 1) * 0.08), color: '#ff3b3b', score: 100 };
    }
  }

  function createBoss(x, y, loop) {
    const hp = 140 + (loop - 1) * 70;
    return {
      type: 'BOSS',
      isBoss: true,
      x, y,
      vx: 75, vy: 45,
      r: 44,
      hp, maxHp: hp,
      speed: 85,
      color: '#ff2a85',
      score: 10000,
      hitFlash: 0,
      attackTimer: 1.5,
      patternIdx: 0,
      spinAngle: 0
    };
  }

  function spawnPrize(x, y) {
    const table = [
      { kind: 'PRIZE', name: '$1,000', val: 1000, color: '#39ff14', icon: '$' },
      { kind: 'PRIZE', name: 'GOLD BAR', val: 2500, color: '#ffd500', icon: 'Au' },
      { kind: 'PRIZE', name: 'BIG TV', val: 5000, color: '#00f0ff', icon: 'TV' },
      { kind: 'PRIZE', name: 'SPORT CAR', val: 8000, color: '#ff2a85', icon: '🚗' },
      { kind: 'PRIZE', name: 'DIAMOND', val: 12000, color: '#ffffff', icon: '💎' }
    ];
    const r = Math.random();
    const item = r < 0.45 ? table[0] : r < 0.72 ? table[1] : r < 0.88 ? table[2] : r < 0.96 ? table[3] : table[4];
    pickups.push({
      ...item,
      x: clamp(x, ARENA.left + 24, ARENA.right - 24),
      y: clamp(y, ARENA.top + 24, ARENA.bottom - 24),
      r: 13,
      life: 14,
      bob: rand(0, Math.PI * 2)
    });
  }

  function spawnPowerup(x, y) {
    const roll = Math.random();
    let item;
    if (roll < 0.22) item = { kind: 'WEAPON', weapon: 'SPREAD', name: 'SPREAD', color: '#ff7b00', icon: 'S' };
    else if (roll < 0.42) item = { kind: 'WEAPON', weapon: 'LASER', name: 'LASER', color: '#00f0ff', icon: 'L' };
    else if (roll < 0.60) item = { kind: 'WEAPON', weapon: 'HOMING', name: 'HOMING', color: '#ff2a85', icon: 'H' };
    else if (roll < 0.74) item = { kind: 'WEAPON', weapon: 'SPIN', name: '360° BURST', color: '#39ff14', icon: 'O' };
    else if (roll < 0.84) item = { kind: 'SHIELD', name: 'SHIELD', color: '#ffd500', icon: '★' };
    else if (roll < 0.92) item = { kind: 'SPEED', name: 'TURBO', color: '#80ffea', icon: '⚡' };
    else if (roll < 0.98) item = { kind: 'BOMB', name: '+1 BOMB', color: '#ff4444', icon: 'B' };
    else item = { kind: '1UP', name: '1UP!', color: '#39ff14', icon: '♥' };

    pickups.push({
      ...item,
      x: clamp(x, ARENA.left + 24, ARENA.right - 24),
      y: clamp(y, ARENA.top + 24, ARENA.bottom - 24),
      r: 15,
      life: 15,
      bob: rand(0, Math.PI * 2)
    });
  }

  function triggerBomb() {
    if (player.bombs <= 0 || state !== 'PLAYING') return;
    player.bombs--;
    window.soundEngine.playBomb();
    addShake(14, 0.45);
    addFlash('#ffffff', 0.75);
    enemyBullets = [];

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.isBoss) {
        damageEnemy(e, 28, i);
      } else {
        damageEnemy(e, 999, i);
      }
    }
    showBanner('MEGA SMART BOMB! TOTAL CARNAGE!', 2.0);
  }

  function damageEnemy(e, dmg, index) {
    e.hp -= dmg;
    e.hitFlash = 0.08;
    if (e.hp <= 0) {
      enemies.splice(index, 1);
      stats.kills++;
      const pts = addScore(e.score);
      spawnParticles(e.x, e.y, e.color, e.isBoss ? 65 : 16, e.isBoss ? 340 : 190, e.isBoss ? 6 : 3.5);
      decals.push({ x: e.x, y: e.y, r: e.r * 0.9, life: 6 });
      window.soundEngine.playExplosion(e.isBoss || e.type === 'TANK');

      if (e.type === 'BOMBER') {
        addShake(7, 0.2);
        for (let a = 0; a < 8; a++) {
          const ang = (Math.PI * 2 * a) / 8;
          enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 210, vy: Math.sin(ang) * 210, r: 5, color: '#ff2a85' });
        }
      }

      if (e.isBoss) {
        addShake(18, 0.6);
        addFlash('#ffd500', 0.6);
        spawnFloatingText(e.x, e.y, `+${pts.toLocaleString()} BOSS SMASHED!`, '#ffd500', 20);
        for (let k = 0; k < 12; k++) {
          spawnPrize(e.x + rand(-110, 110), e.y + rand(-80, 80));
        }
        waveCtrl.spawnQueue = [];
        enemies = [];
      } else {
        if (Math.random() < 0.24) spawnPrize(e.x, e.y);
        else if (Math.random() < 0.13) spawnPowerup(e.x, e.y);
      }
    } else {
      window.soundEngine.playHit();
    }
  }

  function hurtPlayer() {
    if (player.invuln > 0 || player.shield > 0) return;
    player.lives--;
    player.invuln = 2.2;
    stats.multiplier = Math.max(1.0, Number((stats.multiplier * 0.5).toFixed(1)));
    window.soundEngine.playPlayerHit();
    addShake(12, 0.35);
    addFlash('#ff2244', 0.55);
    spawnParticles(player.x, player.y, '#00f0ff', 24, 240, 4);

    if (player.lives <= 0) {
      gameOver();
    } else {
      showBanner('OUCH! HANG IN THERE!', 1.8);
    }
  }

  function gameOver() {
    state = 'GAMEOVER';
    window.soundEngine.stopBgm();
    document.getElementById('final-score').textContent = stats.score.toLocaleString();
    document.getElementById('final-prizes').textContent = stats.prizes;
    document.getElementById('final-kills').textContent = stats.kills;
    document.getElementById('final-room').textContent = `LOOP ${stats.loop} - ROOM ${stats.room}`;
    screenGameover.classList.remove('hidden');
  }

  function firePlayerWeapon(angle) {
    const x = player.x + Math.cos(angle) * 16;
    const y = player.y + Math.sin(angle) * 16;
    const w = player.weapon;
    const spdBoost = player.speedBoost > 0 ? 0.72 : 1;

    window.soundEngine.playShoot(w);

    if (w === 'SPREAD') {
      player.fireCooldown = 0.14 * spdBoost;
      [-0.26, -0.13, 0, 0.13, 0.26].forEach(off => {
        const a = angle + off;
        bullets.push({ x, y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, r: 4.5, dmg: 1, color: '#ff9d00', pierce: 0 });
      });
    } else if (w === 'LASER') {
      player.fireCooldown = 0.11 * spdBoost;
      bullets.push({ x, y, vx: Math.cos(angle) * 900, vy: Math.sin(angle) * 900, r: 6, dmg: 2, color: '#00f0ff', pierce: 4, isLaser: true, angle });
    } else if (w === 'HOMING') {
      player.fireCooldown = 0.15 * spdBoost;
      [-0.2, 0.2].forEach(off => {
        const a = angle + off;
        bullets.push({ x, y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, r: 5.5, dmg: 2, color: '#ff2a85', pierce: 0, homing: true });
      });
    } else if (w === 'SPIN') {
      player.fireCooldown = 0.16 * spdBoost;
      for (let i = 0; i < 8; i++) {
        const a = angle + (Math.PI * 2 * i) / 8;
        bullets.push({ x: player.x, y: player.y, vx: Math.cos(a) * 580, vy: Math.sin(a) * 580, r: 4.5, dmg: 1.5, color: '#39ff14', pierce: 0 });
      }
    } else {
      player.fireCooldown = 0.115 * spdBoost;
      const px = -Math.sin(angle) * 5;
      const py = Math.cos(angle) * 5;
      bullets.push({ x: x + px, y: y + py, vx: Math.cos(angle) * 660, vy: Math.sin(angle) * 660, r: 4, dmg: 1, color: '#ffff66', pierce: 0 });
      bullets.push({ x: x - px, y: y - py, vx: Math.cos(angle) * 660, vy: Math.sin(angle) * 660, r: 4, dmg: 1, color: '#ffff66', pierce: 0 });
    }
  }

  function getAimAndMoveInput() {
    let mx = 0, my = 0;
    if (keys.has('KeyW')) my -= 1;
    if (keys.has('KeyS')) my += 1;
    if (keys.has('KeyA')) mx -= 1;
    if (keys.has('KeyD')) mx += 1;

    let sx = 0, sy = 0;
    if (keys.has('ArrowUp') || keys.has('KeyI')) sy -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyK')) sy += 1;
    if (keys.has('ArrowLeft') || keys.has('KeyJ')) sx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyL')) sx += 1;

    let firing = sx !== 0 || sy !== 0;
    let aimAngle = firing ? Math.atan2(sy, sx) : player.aimAngle;

    // Mouse aim overrides if mouse button is held
    if (!firing && mouse.down) {
      firing = true;
      aimAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    } else if (!firing && mouse.active) {
      aimAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }

    // Gamepad support
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[0];
    if (pad) {
      if (Math.abs(pad.axes[0]) > 0.2) mx = pad.axes[0];
      if (Math.abs(pad.axes[1]) > 0.2) my = pad.axes[1];
      const rx = pad.axes[2] || 0;
      const ry = pad.axes[3] || 0;
      if (Math.hypot(rx, ry) > 0.28) {
        firing = true;
        aimAngle = Math.atan2(ry, rx);
      }
      if (pad.buttons[0]?.pressed || pad.buttons[5]?.pressed) {
        if (!pad._bombHeld) {
          pad._bombHeld = true;
          triggerBomb();
        }
      } else {
        pad._bombHeld = false;
      }
    }

    const mLen = Math.hypot(mx, my);
    if (mLen > 1) {
      mx /= mLen;
      my /= mLen;
    }

    return { mx, my, firing, aimAngle };
  }

  function update(dt) {
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) elBanner.classList.add('hidden');
    }
    if (shakeTime > 0) {
      shakeTime -= dt;
      if (shakeTime <= 0) shakeMag = 0;
    }
    if (flashAlpha > 0) {
      flashAlpha = Math.max(0, flashAlpha - dt * 1.8);
    }

    if (state !== 'PLAYING' && state !== 'ROOM_CLEAR') return;

    // Multiplier slow decay
    if (stats.multiplier > 1.0) {
      stats.multDecayTimer += dt;
      if (stats.multDecayTimer >= 7.5) {
        stats.multDecayTimer = 0;
        stats.multiplier = Math.max(1.0, Number((stats.multiplier - 0.1).toFixed(1)));
      }
    }

    // Player timers
    if (player.invuln > 0) player.invuln -= dt;
    if (player.shield > 0) player.shield -= dt;
    if (player.speedBoost > 0) player.speedBoost -= dt;
    if (player.weapon !== 'NORMAL') {
      player.weaponTimer -= dt;
      if (player.weaponTimer <= 0) {
        player.weapon = 'NORMAL';
      }
    }
    if (player.fireCooldown > 0) player.fireCooldown -= dt;

    // Input & Movement
    const inp = getAimAndMoveInput();
    const curSpeed = player.speed * (player.speedBoost > 0 ? 1.38 : 1);
    player.x = clamp(player.x + inp.mx * curSpeed * dt, ARENA.left + player.r, ARENA.right - player.r);
    player.y = clamp(player.y + inp.my * curSpeed * dt, ARENA.top + player.r, ARENA.bottom - player.r);
    player.aimAngle = inp.aimAngle;
    if (Math.hypot(inp.mx, inp.my) > 0.1) {
      player.walkPhase += dt * 14;
    }

    if (inp.firing && player.fireCooldown <= 0) {
      firePlayerWeapon(player.aimAngle);
    }

    // Gate glow timers
    gates.forEach(g => { if (g.active > 0) g.active -= dt; });

    // Wave spawning
    if (state === 'PLAYING') {
      if (waveCtrl.spawnQueue.length > 0) {
        waveCtrl.spawnTimer -= dt;
        if (waveCtrl.spawnTimer <= 0) {
          const batch = Math.min(waveCtrl.spawnQueue.length, stats.room >= 3 ? 3 : 2);
          for (let b = 0; b < batch; b++) {
            const type = waveCtrl.spawnQueue.shift();
            const g = gates[randInt(0, gates.length - 1)];
            g.active = 0.45;
            enemies.push(createEnemy(type, g.x + g.nx * 18 + rand(-14, 14), g.y + g.ny * 18 + rand(-14, 14)));
          }
          waveCtrl.spawnTimer = Math.max(0.28, 0.72 - stats.room * 0.08 - (stats.loop - 1) * 0.08);
        }
      } else if (enemies.length === 0) {
        waveCtrl.waveIndex++;
        if (waveCtrl.waveIndex < waveCtrl.totalWaves) {
          buildWave(waveCtrl.waveIndex);
          showBanner(`WAVE ${waveCtrl.waveIndex + 1} / ${waveCtrl.totalWaves}`, 1.8);
        } else {
          // Room Clear!
          state = 'ROOM_CLEAR';
          window.soundEngine.playDoorOpen();
          addScore(1000 * stats.room);
          if (stats.room === 5) {
            openExits = [{ id: 'TOP', x: W / 2, y: ARENA.top, w: 76, h: 16, bonus: true, label: `LOOP ${stats.loop + 1} ->` }];
            showBanner(`CONGRATULATIONS! ENTER EXIT FOR LOOP ${stats.loop + 1}!`, 4.0);
          } else {
            openExits = [
              { id: 'TOP', x: W / 2, y: ARENA.top, w: 76, h: 16, bonus: false, label: 'NEXT ROOM' },
              { id: 'RIGHT', x: ARENA.right, y: H / 2, w: 16, h: 76, bonus: true, label: 'PRIZE ROUTE!' }
            ];
            showBanner('ROOM CLEAR! CHOOSE YOUR EXIT!', 3.5);
          }
        }
      }
    }

    // Check Exit Doors when ROOM_CLEAR
    if (state === 'ROOM_CLEAR') {
      for (const ex of openExits) {
        if (dist(player.x, player.y, ex.x, ex.y) < 34) {
          roomBonusNext = ex.bonus;
          if (stats.room === 5) {
            stats.loop++;
            player.bombs = Math.min(9, player.bombs + 1);
            setupRoom(1);
          } else {
            setupRoom(stats.room + 1);
          }
          player.x = W / 2;
          player.y = H / 2;
          player.invuln = 1.0;
          state = 'PLAYING';
          return;
        }
      }
    }

    // Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.homing && enemies.length > 0) {
        let nearest = null;
        let bestD = 320;
        for (const e of enemies) {
          const d = dist(b.x, b.y, e.x, e.y);
          if (d < bestD) { bestD = d; nearest = e; }
        }
        if (nearest) {
          const desired = Math.atan2(nearest.y - b.y, nearest.x - b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const nextA = cur + clamp(diff, -dt * 7, dt * 7);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(nextA) * sp;
          b.vy = Math.sin(nextA) * sp;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < ARENA.left || b.x > ARENA.right || b.y < ARENA.top || b.y > ARENA.bottom) {
        spawnParticles(b.x, b.y, b.color, 3, 70, 2);
        bullets.splice(i, 1);
        continue;
      }

      let removed = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (b._hitSet && b._hitSet.has(e)) continue;
        if (dist(b.x, b.y, e.x, e.y) < b.r + e.r) {
          spawnParticles(b.x, b.y, b.color, 4, 90, 2.5);
          damageEnemy(e, b.dmg, j);
          if (b.pierce > 0) {
            b.pierce--;
            if (!b._hitSet) b._hitSet = new Set();
            b._hitSet.add(e);
          } else {
            bullets.splice(i, 1);
            removed = true;
            break;
          }
        }
      }
      if (removed) continue;
    }

    // Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (e.isBoss) {
        updateBoss(e, dt);
      } else {
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        const dToPlayer = dist(e.x, e.y, player.x, player.y);

        if (e.type === 'SHOOTER') {
          if (dToPlayer > 210) {
            e.x += Math.cos(ang) * e.speed * dt;
            e.y += Math.sin(ang) * e.speed * dt;
          } else if (dToPlayer < 140) {
            e.x -= Math.cos(ang) * e.speed * 0.6 * dt;
            e.y -= Math.sin(ang) * e.speed * 0.6 * dt;
          }
          e.shootTimer -= dt;
          if (e.shootTimer <= 0) {
            e.shootTimer = rand(1.4, 2.3);
            enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230, r: 5, color: '#ff4dff' });
          }
        } else if (e.type === 'RUNNER') {
          e.phase += dt * 7;
          const wiggle = Math.sin(e.phase) * 0.55;
          e.x += Math.cos(ang + wiggle) * e.speed * dt;
          e.y += Math.sin(ang + wiggle) * e.speed * dt;
        } else {
          e.x += Math.cos(ang) * e.speed * dt;
          e.y += Math.sin(ang) * e.speed * dt;
        }

        e.x = clamp(e.x, ARENA.left + e.r, ARENA.right - e.r);
        e.y = clamp(e.y, ARENA.top + e.r, ARENA.bottom - e.r);
      }

      // Collision with player
      if (dist(e.x, e.y, player.x, player.y) < e.r + player.r - 2) {
        if (player.shield > 0) {
          damageEnemy(e, e.isBoss ? 1 : 999, i);
        } else {
          hurtPlayer();
        }
      }
    }

    // Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.x < ARENA.left || eb.x > ARENA.right || eb.y < ARENA.top || eb.y > ARENA.bottom) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (dist(eb.x, eb.y, player.x, player.y) < eb.r + player.r - 2) {
        enemyBullets.splice(i, 1);
        hurtPlayer();
      }
    }

    // Pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.life -= dt;
      p.bob += dt * 5;
      if (p.life <= 0) {
        pickups.splice(i, 1);
        continue;
      }
      if (dist(p.x, p.y, player.x, player.y) < p.r + player.r + 6) {
        if (p.kind === 'PRIZE') {
          stats.prizes++;
          stats.multiplier = Math.min(5.0, Number((stats.multiplier + 0.2).toFixed(1)));
          stats.multDecayTimer = 0;
          const pts = addScore(p.val);
          spawnFloatingText(p.x, p.y - 10, `${p.name} +${pts.toLocaleString()}`, p.color, 14);
          window.soundEngine.playPickup(false);
          if (Math.random() < 0.28) {
            showBanner(ANNOUNCER_LINES[randInt(0, ANNOUNCER_LINES.length - 1)], 2.0);
          }
        } else {
          window.soundEngine.playPickup(true);
          addScore(500);
          if (p.kind === 'WEAPON') {
            player.weapon = p.weapon;
            player.weaponTimer = 13;
          } else if (p.kind === 'SHIELD') {
            player.shield = 7;
          } else if (p.kind === 'SPEED') {
            player.speedBoost = 9;
          } else if (p.kind === 'BOMB') {
            player.bombs = Math.min(9, player.bombs + 1);
          } else if (p.kind === '1UP') {
            player.lives = Math.min(9, player.lives + 1);
          }
          spawnFloatingText(p.x, p.y - 12, p.name, p.color, 16);
        }
        spawnParticles(p.x, p.y, p.color, 10, 120, 3);
        pickups.splice(i, 1);
      }
    }

    // Particles & Decals & Floating text
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }
    for (let i = decals.length - 1; i >= 0; i--) {
      decals[i].life -= dt;
      if (decals[i].life <= 0) decals.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function updateBoss(boss, dt) {
    boss.spinAngle += dt * 2.2;
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
    if (boss.x < ARENA.left + boss.r + 30 || boss.x > ARENA.right - boss.r - 30) boss.vx *= -1;
    if (boss.y < ARENA.top + boss.r + 20 || boss.y > H * 0.55) boss.vy *= -1;

    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      boss.patternIdx = (boss.patternIdx + 1) % 3;
      const angToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);

      if (boss.patternIdx === 0) {
        // Fan shot
        for (let k = -3; k <= 3; k++) {
          const a = angToPlayer + k * 0.18;
          enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, r: 6, color: '#ff2a85' });
        }
        boss.attackTimer = 1.25;
      } else if (boss.patternIdx === 1) {
        // 12-way ring
        for (let k = 0; k < 12; k++) {
          const a = boss.spinAngle + (Math.PI * 2 * k) / 12;
          enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 5.5, color: '#ffd500' });
        }
        boss.attackTimer = 1.1;
      } else {
        // Summon 2 helpers
        if (enemies.length < 7) {
          enemies.push(createEnemy('RUNNER', boss.x - 40, boss.y + 20));
          enemies.push(createEnemy('RUNNER', boss.x + 40, boss.y + 20));
        }
        boss.attackTimer = 1.5;
      }
    }
  }

  function drawArena() {
    ctx.fillStyle = '#090b17';
    ctx.fillRect(0, 0, W, H);

    // Outer metallic studio border
    ctx.fillStyle = '#191d36';
    ctx.fillRect(0, 0, W, ARENA.top);
    ctx.fillRect(0, ARENA.bottom, W, WALL);
    ctx.fillRect(0, 0, ARENA.left, H);
    ctx.fillRect(ARENA.right, 0, WALL, H);

    // Floor Grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    const step = 48;
    for (let x = ARENA.left; x <= ARENA.right; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, ARENA.top);
      ctx.lineTo(x, ARENA.bottom);
      ctx.stroke();
    }
    for (let y = ARENA.top; y <= ARENA.bottom; y += step) {
      ctx.beginPath();
      ctx.moveTo(ARENA.left, y);
      ctx.lineTo(ARENA.right, y);
      ctx.stroke();
    }

    // Center TV Logo Watermark
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.strokeStyle = 'rgba(255, 42, 133, 0.14)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 213, 0, 0.08)';
    ctx.font = '900 28px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SMASH T.V. 99', 0, 0);
    ctx.restore();

    // Arena Neon Wall Frame
    ctx.strokeStyle = '#3c498a';
    ctx.lineWidth = 3;
    ctx.strokeRect(ARENA.left, ARENA.top, ARENA.width, ARENA.height);

    // Spawn Gates
    for (const g of gates) {
      ctx.fillStyle = g.active > 0 ? '#ff2a85' : '#2a3159';
      ctx.fillRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
    }

    // Open Exits
    if (state === 'ROOM_CLEAR') {
      const blink = Math.floor(performance.now() / 160) % 2 === 0;
      for (const ex of openExits) {
        ctx.fillStyle = ex.bonus ? '#ffd500' : '#39ff14';
        ctx.fillRect(ex.x - ex.w / 2, ex.y - ex.h / 2, ex.w, ex.h);
        if (blink) {
          ctx.fillStyle = ex.bonus ? '#ffd500' : '#39ff14';
          ctx.font = '900 13px Courier New';
          ctx.textAlign = 'center';
          const tx = ex.id === 'RIGHT' ? ex.x - 62 : ex.x;
          const ty = ex.id === 'TOP' ? ex.y + 28 : ex.y - 12;
          ctx.fillText(ex.label, tx, ty);
        }
      }
    }
  }

  function draw() {
    ctx.save();
    if (shakeTime > 0) {
      ctx.translate(rand(-shakeMag, shakeMag), rand(-shakeMag, shakeMag));
    }

    drawArena();

    // Decals
    for (const d of decals) {
      ctx.fillStyle = `rgba(20, 24, 42, ${Math.min(0.6, d.life * 0.15)})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pickups
    for (const p of pickups) {
      if (p.life < 3 && Math.floor(p.life * 10) % 2 === 0) continue;
      const py = p.y + Math.sin(p.bob) * 3;
      ctx.save();
      ctx.translate(p.x, py);
      ctx.fillStyle = '#0e1124';
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-p.r, -p.r, p.r * 2, p.r * 2, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = p.color;
      ctx.font = '900 12px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, 0, 1);
      ctx.restore();
    }

    // Player Bullets
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      if (b.isLaser) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.fillRect(-14, -3, 28, 6);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Enemy Bullets
    for (const eb of enemyBullets) {
      ctx.fillStyle = eb.color;
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      const fill = e.hitFlash > 0 ? '#ffffff' : e.color;

      if (e.isBoss) {
        ctx.rotate(e.spinAngle * 0.3);
        ctx.fillStyle = fill;
        ctx.strokeStyle = '#ffd500';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-e.r, -e.r, e.r * 2, e.r * 2, 12);
        ctx.fill();
        ctx.stroke();

        // Boss Core
        ctx.fillStyle = '#090b17';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = fill;
        ctx.beginPath();
        if (e.type === 'TANK') {
          ctx.roundRect(-e.r, -e.r, e.r * 2, e.r * 2, 4);
        } else if (e.type === 'RUNNER') {
          ctx.moveTo(0, -e.r);
          ctx.lineTo(e.r, e.r);
          ctx.lineTo(-e.r, e.r);
          ctx.closePath();
        } else {
          ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        }
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#090b17';
        ctx.fillRect(-6, -4, 4, 4);
        ctx.fillRect(2, -4, 4, 4);
      }
      ctx.restore();

      // Boss HP Bar
      if (e.isBoss) {
        const bw = 340;
        const bx = W / 2 - bw / 2;
        const by = ARENA.top + 12;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(bx - 2, by - 2, bw + 4, 14);
        ctx.fillStyle = '#ff2a85';
        ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), 10);
        ctx.strokeStyle = '#ffd500';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - 2, by - 2, bw + 4, 14);
      }
    }

    // Player
    if (state !== 'GAMEOVER') {
      const blinkSkip = player.invuln > 0 && Math.floor(player.invuln * 16) % 2 === 0;
      if (!blinkSkip) {
        ctx.save();
        ctx.translate(player.x, player.y);

        // Shield Aura
        if (player.shield > 0) {
          ctx.strokeStyle = '#ffd500';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, player.r + 8, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Legs animation
        const legOff = Math.sin(player.walkPhase) * 4;
        ctx.fillStyle = '#1b88ff';
        ctx.fillRect(-8, 6 + legOff, 6, 8);
        ctx.fillRect(2, 6 - legOff, 6, 8);

        // Body
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(0, 0, player.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Gun Barrel
        ctx.rotate(player.aimAngle);
        ctx.fillStyle = '#ffd500';
        ctx.fillRect(4, -4, 16, 8);
        ctx.restore();
      }
    }

    // Particles
    for (const pt of particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // Floating Texts
    for (const ft of floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.font = `900 ${ft.size}px Courier New`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    // Screen Flash
    if (flashAlpha > 0) {
      ctx.fillStyle = flashColor;
      ctx.globalAlpha = flashAlpha;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function updateHUD() {
    elScore.textContent = String(stats.score).padStart(7, '0');
    elHiScore.textContent = String(highScore).padStart(7, '0');
    elRoom.textContent = `L${stats.loop} R${stats.room} - W${Math.min(waveCtrl.waveIndex + 1, waveCtrl.totalWaves)}/${waveCtrl.totalWaves}`;
    elLives.textContent = '♥'.repeat(Math.max(0, player.lives));
    elBombs.textContent = '💣'.repeat(Math.max(0, player.bombs));
    elWeapon.textContent = player.weapon === 'NORMAL'
      ? 'BLASTER'
      : `${player.weapon} (${Math.ceil(player.weaponTimer)}s)`;
    elMult.textContent = `x${stats.multiplier.toFixed(1)}`;
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTime) / 1000 || 0.016);
    lastTime = ts;
    update(dt);
    draw();
    updateHUD();
    requestAnimationFrame(loop);
  }

  // Event Listeners
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (state === 'PLAYING') {
        e.preventDefault();
        triggerBomb();
      }
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (state === 'PLAYING' || state === 'ROOM_CLEAR') {
        state = 'PAUSED';
        screenPause.classList.remove('hidden');
      } else if (state === 'PAUSED') {
        state = 'PLAYING';
        screenPause.classList.add('hidden');
      }
    }
    if (e.code === 'KeyM') {
      toggleSoundUI();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * W;
    mouse.y = ((e.clientY - rect.top) / rect.height) * H;
    mouse.active = true;
  });

  canvas.addEventListener('mousedown', (e) => {
    window.soundEngine.init();
    if (e.button === 0) mouse.down = true;
    if (e.button === 2) triggerBomb();
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function toggleSoundUI() {
    window.soundEngine.init();
    const muted = window.soundEngine.toggleMute();
    btnMute.textContent = muted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
  }

  btnStart.addEventListener('click', startNewGame);
  btnRetry.addEventListener('click', startNewGame);
  btnRestartPause.addEventListener('click', startNewGame);
  btnResume.addEventListener('click', () => {
    state = 'PLAYING';
    screenPause.classList.add('hidden');
  });
  btnMute.addEventListener('click', toggleSoundUI);

  initGates();
  updateHUD();
  requestAnimationFrame(loop);
})();

