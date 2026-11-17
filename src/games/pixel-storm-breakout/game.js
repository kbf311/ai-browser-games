(() => {
  'use strict';

  const W = 1600;
  const H = 900;
  const HUD_H = 44;

  // Block grid: 390 x 128 = 49,920 max cells at 4x4 px
  const CELL = 4;
  const GRID_X = 20;
  const GRID_Y = 64;
  const COLS = 390;
  const ROWS = 128;
  const GRID_W = COLS * CELL; // 1560
  const GRID_H = ROWS * CELL; // 512

  // Ball pool (TypedArrays for 30,000 1-dot balls at 60 FPS)
  const MAX_BALLS = 30000;
  const BALL_SPEED = 6.6;
  const SUBSTEPS = 2;

  const bx = new Float32Array(MAX_BALLS);
  const by = new Float32Array(MAX_BALLS);
  const bvx = new Float32Array(MAX_BALLS);
  const bvy = new Float32Array(MAX_BALLS);
  const bpx = new Float32Array(MAX_BALLS);
  const bpy = new Float32Array(MAX_BALLS);
  const bcol = new Uint32Array(MAX_BALLS);
  let ballCount = 0;

  // Block grid state
  const gridHP = new Uint8Array(COLS * ROWS);
  const gridMaxHP = new Uint8Array(COLS * ROWS);
  const gridRGB = new Uint32Array(COLS * ROWS); // 0x00BBGGRR (without alpha)

  // Offscreen block pixel buffer (1600x900)
  const blockCanvas = document.createElement('canvas');
  blockCanvas.width = W;
  blockCanvas.height = H;
  const blockCtx = blockCanvas.getContext('2d');
  const blockImg = blockCtx.createImageData(W, H);
  const blockBuf32 = new Uint32Array(blockImg.data.buffer);
  let blockDirty = false;
  let dirtyMinX = W, dirtyMinY = H, dirtyMaxX = 0, dirtyMaxY = 0;

  // Offscreen 1-dot ball pixel buffer (1600x900)
  const ballCanvas = document.createElement('canvas');
  ballCanvas.width = W;
  ballCanvas.height = H;
  const ballCtx = ballCanvas.getContext('2d');
  const ballImg = ballCtx.createImageData(W, H);
  const ballBuf32 = new Uint32Array(ballImg.data.buffer);

  // Main canvas
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const stageFrame = document.getElementById('stage-frame');

  // UI elements
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySubtitle = document.getElementById('overlay-subtitle');
  const overlayStats = document.getElementById('overlay-stats');
  const statScore = document.getElementById('stat-score');
  const statBlocks = document.getElementById('stat-blocks');
  const statPeak = document.getElementById('stat-peak');
  const stageButtonsEl = document.getElementById('stage-buttons');
  const btnStart = document.getElementById('btn-start');
  const btnVis = document.getElementById('btn-vis');
  const btnMute = document.getElementById('btn-mute');
  const btnPause = document.getElementById('btn-pause');
  const btnMenu = document.getElementById('btn-menu');

  // Game state
  let state = 'MENU'; // MENU | READY | PLAYING | PAUSED | STAGE_CLEAR | GAME_OVER
  let currentStage = 0;
  let score = 0;
  let lives = 3;
  let totalBlocks = 0;
  let remainingBlocks = 0;
  let totalDestroyedAllStages = 0;
  let peakBalls = 1;
  let fps = 60;
  let frameCounter = 0;
  let fpsTimer = performance.now();
  let highVisMode = false; // false: 1px white core + cross-glow + trail, true: 2x2 hi-vis core + trail

  // Paddle
  const PADDLE_W = 148;
  const PADDLE_H = 12;
  const PADDLE_Y = H - 38;
  let paddleX = (W - PADDLE_W) / 2;
  let paddleFlash = 0;
  const keys = { left: false, right: false };

  // Power-ups (1..99 split items) & Floating texts
  const items = [];
  const MAX_ITEMS = 60;
  const floatTexts = [];
  let itemSpawnCooldown = 0;
  let guaranteedFirstItem = true;

  // Color helpers (Little-endian ABGR for Uint32Array ImageData)
  function packABGR(r, g, b, a = 255) {
    return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }

  function hslToABGR(h, s, l, a = 255) {
    const [r, g, b] = hslToRgb(h, s, l);
    return packABGR(r, g, b, a);
  }

  function markDirty(px, py) {
    if (px < dirtyMinX) dirtyMinX = px;
    if (py < dirtyMinY) dirtyMinY = py;
    if (px + CELL > dirtyMaxX) dirtyMaxX = px + CELL;
    if (py + CELL > dirtyMaxY) dirtyMaxY = py + CELL;
    blockDirty = true;
  }

  function drawCellToBuffer(col, row, abgr) {
    const px = GRID_X + col * CELL;
    const py = GRID_Y + row * CELL;
    // Draw 3x3 pixel core with 1px gap so each individual block is crisp
    for (let dy = 0; dy < 3; dy++) {
      const rowOff = (py + dy) * W + px;
      blockBuf32[rowOff] = abgr;
      blockBuf32[rowOff + 1] = abgr;
      blockBuf32[rowOff + 2] = abgr;
    }
    markDirty(px, py);
  }

  function eraseCellFromBuffer(col, row) {
    const px = GRID_X + col * CELL;
    const py = GRID_Y + row * CELL;
    for (let dy = 0; dy < 3; dy++) {
      const rowOff = (py + dy) * W + px;
      blockBuf32[rowOff] = 0;
      blockBuf32[rowOff + 1] = 0;
      blockBuf32[rowOff + 2] = 0;
    }
    markDirty(px, py);
  }

  // Stage definitions (each generates 26,000 - 48,000+ blocks!)
  const STAGES = [
    {
      name: '1. NEON MONOLITH',
      build(col, row) {
        // Massive fortress with vertical energy channels & reinforced core
        if (col % 39 === 19 && row > 12 && row < 116) return null;
        const hp = (row >= 48 && row <= 76 && col >= 90 && col <= 300) ? 2 : 1;
        const hue = (col * 0.65 + row * 1.4) % 360;
        const light = hp === 2 ? 52 : 42;
        return { hp, color: hslToABGR(hue, 84, light) };
      }
    },
    {
      name: '2. CYBER MANDALA',
      build(col, row) {
        const cx = COLS / 2;
        const cy = ROWS / 2;
        const dx = (col - cx) * 0.55;
        const dy = row - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        if (dist > 63) return null;
        const ring = Math.sin(dist * 0.45) + Math.cos(angle * 8) * 0.55;
        if (ring < -0.55) return null;
        const hp = dist < 16 ? 3 : dist < 34 ? 2 : 1;
        const hue = (dist * 4.5 + angle * 57.3 + 200) % 360;
        return { hp, color: hslToABGR(hue, 85, 45) };
      }
    },
    {
      name: '3. GALAXY SPIRAL',
      build(col, row) {
        const cx = COLS / 2;
        const cy = ROWS / 2;
        const dx = (col - cx) * 0.52;
        const dy = row - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 65) return null;
        const angle = Math.atan2(dy, dx);
        const spiral = Math.sin(angle * 4 - dist * 0.28);
        if (spiral < -0.35 && dist > 10) return null;
        const hp = dist < 12 ? 3 : spiral > 0.75 ? 2 : 1;
        const hue = (260 + dist * 2.5 + spiral * 40) % 360;
        return { hp, color: hslToABGR(hue, 86, 46) };
      }
    },
    {
      name: '4. PIXEL INVADERS',
      build(col, row) {
        // Classic 11x8 invader sprite tiled at giant scale + mothership
        const sprite = [
          '00100000100',
          '00010001000',
          '00111111100',
          '01101110110',
          '11111111111',
          '10111111101',
          '10100000101',
          '00011011000',
        ];
        // 5x3 grid of giant pixel invaders
        const tileW = 76;
        const tileH = 42;
        const tx = Math.floor(col / tileW);
        const ty = Math.floor(row / tileH);
        const lx = col % tileW;
        const ly = row % tileH;
        if (tx >= 5 || ty >= 3) return null;
        const sx = Math.floor((lx - 5) / 6);
        const sy = Math.floor((ly - 4) / 4);
        if (sx < 0 || sx >= 11 || sy < 0 || sy >= 8) return null;
        if (sprite[sy][sx] !== '1') return null;
        const hp = ty === 0 ? 2 : 1;
        const hue = (tx * 55 + ty * 95 + 120) % 360;
        return { hp, color: hslToABGR(hue, 85, 45) };
      }
    },
    {
      name: '5. RAINBOW WALL',
      build(col, row) {
        // Nearly 50,000 blocks!
        if ((row === 32 || row === 64 || row === 96) && col % 2 === 0) return null;
        const hp = row < 20 ? 3 : row < 55 ? 2 : 1;
        const hue = (col * 0.9 + row * 1.8) % 360;
        return { hp, color: hslToABGR(hue, 86, hp === 3 ? 52 : 43) };
      }
    }
  ];

  function buildStageButtons() {
    stageButtonsEl.innerHTML = '';
    STAGES.forEach((st, idx) => {
      const btn = document.createElement('button');
      btn.className = 'stage-btn' + (idx === currentStage ? ' active' : '');
      btn.textContent = st.name;
      btn.addEventListener('click', () => {
        currentStage = idx;
        buildStageButtons();
      });
      stageButtonsEl.appendChild(btn);
    });
  }

  function loadStage(stageIndex) {
    currentStage = stageIndex % STAGES.length;
    const stage = STAGES[currentStage];

    gridHP.fill(0);
    gridMaxHP.fill(0);
    gridRGB.fill(0);
    blockBuf32.fill(0);

    totalBlocks = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = stage.build(col, row);
        if (cell) {
          const idx = row * COLS + col;
          gridHP[idx] = cell.hp;
          gridMaxHP[idx] = cell.hp;
          gridRGB[idx] = cell.color;
          drawCellToBuffer(col, row, cell.color);
          totalBlocks++;
        }
      }
    }
    remainingBlocks = totalBlocks;
    blockCtx.putImageData(blockImg, 0, 0);
    blockDirty = false;
    dirtyMinX = W; dirtyMinY = H; dirtyMaxX = 0; dirtyMaxY = 0;

    items.length = 0;
    floatTexts.length = 0;
    resetBallOnPaddle();
  }

  function resetBallOnPaddle() {
    ballCount = 1;
    guaranteedFirstItem = true;
    itemSpawnCooldown = 0;
    bx[0] = paddleX + PADDLE_W / 2;
    by[0] = PADDLE_Y - 2;
    bpx[0] = bx[0];
    bpy[0] = by[0];
    bvx[0] = 2.2;
    bvy[0] = -BALL_SPEED;
    bcol[0] = packABGR(255, 255, 255, 255);
    state = 'READY';
  }

  function launchInitialBall() {
    if (state !== 'READY') return;
    window.soundFX.init();
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.45;
    bvx[0] = Math.cos(angle) * BALL_SPEED;
    bvy[0] = Math.sin(angle) * BALL_SPEED;
    state = 'PLAYING';
  }

  // Power-up item tier styling (1..99)
  function getItemTier(value) {
    if (value >= 80) {
      return { bg: '#9d174d', border: '#f472b6', glow: '#ec4899', text: '#ffffff' };
    }
    if (value >= 50) {
      return { bg: '#92400e', border: '#fbbf24', glow: '#f59e0b', text: '#fef3c7' };
    }
    if (value >= 20) {
      return { bg: '#065f46', border: '#34d399', glow: '#10b981', text: '#ecfdf5' };
    }
    return { bg: '#075985', border: '#38bdf8', glow: '#0ea5e9', text: '#e0f2fe' };
  }

  function maybeSpawnItem(px, py) {
    if (items.length >= MAX_ITEMS) return;

    if (guaranteedFirstItem) {
      guaranteedFirstItem = false;
    } else {
      if (itemSpawnCooldown > 0) return;
      // High drop rate so player rapidly builds a massive ball swarm
      const chance = ballCount < 20 ? 0.10 : ballCount < 200 ? 0.035 : 0.015;
      if (Math.random() > chance) return;
    }

    const value = 1 + ((Math.random() * 99) | 0); // 1 to 99!
    items.push({
      x: px,
      y: py,
      vy: 2.3 + Math.random() * 0.9,
      w: 36,
      h: 20,
      value,
      tier: getItemTier(value)
    });
    itemSpawnCooldown = ballCount < 20 ? 3 : ballCount < 200 ? 6 : 10;
  }

  function splitBallsByNumber(count) {
    if (ballCount <= 0) return;
    const sourceCount = ballCount;
    const toSpawn = Math.min(count, MAX_BALLS - ballCount);
    if (toSpawn <= 0) return;

    const hueBase = Math.random() * 360;
    for (let k = 0; k < toSpawn; k++) {
      const srcIdx = k % sourceCount;
      const sx = bx[srcIdx];
      const sy = by[srcIdx];

      let angle;
      if (sourceCount === 1) {
        // Fan out cleanly from the single ball
        angle = -Math.PI + (k / Math.max(1, toSpawn - 1)) * Math.PI * 1.85;
      } else {
        const baseAngle = Math.atan2(bvy[srcIdx], bvx[srcIdx]);
        const spread = ((k / Math.max(1, toSpawn)) - 0.5) * 1.8 + (Math.random() - 0.5) * 0.5;
        angle = baseAngle + spread;
      }

      // Avoid near-horizontal traps
      let vx = Math.cos(angle) * BALL_SPEED;
      let vy = Math.sin(angle) * BALL_SPEED;
      if (Math.abs(vy) < 1.1) {
        vy = vy >= 0 ? 1.4 : -1.4;
        const norm = BALL_SPEED / Math.hypot(vx, vy);
        vx *= norm;
        vy *= norm;
      }

      const idx = ballCount++;
      bx[idx] = sx;
      by[idx] = sy;
      bpx[idx] = sx;
      bpy[idx] = sy;
      bvx[idx] = vx;
      bvy[idx] = vy;
      bcol[idx] = hslToABGR((hueBase + k * 5) % 360, 95, 78, 255);
    }

    if (ballCount > peakBalls) {
      peakBalls = ballCount;
    }
  }

  function updatePaddle() {
    const speed = 13;
    if (keys.left) paddleX -= speed;
    if (keys.right) paddleX += speed;
    if (paddleX < 0) paddleX = 0;
    if (paddleX > W - PADDLE_W) paddleX = W - PADDLE_W;

    if (state === 'READY') {
      bx[0] = paddleX + PADDLE_W / 2;
      by[0] = PADDLE_Y - 2;
      bpx[0] = bx[0];
      bpy[0] = by[0];
    }
    if (paddleFlash > 0) paddleFlash--;
  }

  function updateBalls() {
    const dtStep = 1 / SUBSTEPS;

    for (let i = 0; i < ballCount; i++) {
      bpx[i] = bx[i];
      bpy[i] = by[i];

      let x = bx[i];
      let y = by[i];
      let vx = bvx[i];
      let vy = bvy[i];
      let alive = true;

      for (let s = 0; s < SUBSTEPS; s++) {
        const prevX = x;
        const prevY = y;
        x += vx * dtStep;
        y += vy * dtStep;

        // Wall collisions
        if (x < 0) {
          x = -x;
          vx = Math.abs(vx);
        } else if (x >= W) {
          x = W - 0.5 - (x - W);
          vx = -Math.abs(vx);
        }

        if (y < HUD_H) {
          y = HUD_H + (HUD_H - y);
          vy = Math.abs(vy);
        }

        // Paddle collision
        if (vy > 0 && y >= PADDLE_Y && y <= PADDLE_Y + PADDLE_H && x >= paddleX - 1 && x <= paddleX + PADDLE_W + 1) {
          const hitNorm = ((x - paddleX) / PADDLE_W) * 2 - 1; // -1 .. +1
          const clamped = Math.max(-0.95, Math.min(0.95, hitNorm));
          const bounceAngle = clamped * (Math.PI * 0.39); // max ~70 deg
          vx = Math.sin(bounceAngle) * BALL_SPEED;
          vy = -Math.cos(bounceAngle) * BALL_SPEED;
          y = PADDLE_Y - 0.5;
          paddleFlash = 4;
          window.soundFX.playPaddleHit();
        }

        // Block grid collision (O(1) lookup)
        if (x >= GRID_X && x < GRID_X + GRID_W && y >= GRID_Y && y < GRID_Y + GRID_H) {
          const col = ((x - GRID_X) / CELL) | 0;
          const row = ((y - GRID_Y) / CELL) | 0;
          const idx = row * COLS + col;
          const hp = gridHP[idx];

          if (hp > 0) {
            const prevCol = ((prevX - GRID_X) / CELL) | 0;
            const prevRow = ((prevY - GRID_Y) / CELL) | 0;

            if (prevCol !== col && prevRow === row) {
              vx = -vx;
            } else if (prevRow !== row && prevCol === col) {
              vy = -vy;
            } else {
              vx = -vx;
              vy = -vy;
            }

            const newHP = hp - 1;
            gridHP[idx] = newHP;
            if (newHP === 0) {
              eraseCellFromBuffer(col, row);
              remainingBlocks--;
              totalDestroyedAllStages++;
              score += 10 * gridMaxHP[idx];
              window.soundFX.playBlockBreak(1 - row / ROWS);
              maybeSpawnItem(GRID_X + col * CELL, GRID_Y + row * CELL);
            } else {
              // Dim damaged multi-HP block slightly
              const oldCol = gridRGB[idx];
              const r = Math.max(40, ((oldCol & 255) * 0.72) | 0);
              const g = Math.max(40, (((oldCol >> 8) & 255) * 0.72) | 0);
              const b = Math.max(40, (((oldCol >> 16) & 255) * 0.72) | 0);
              const dimmed = packABGR(r, g, b, 255);
              gridRGB[idx] = dimmed;
              drawCellToBuffer(col, row, dimmed);
              score += 5;
            }
          }
        }

        // Bottom out
        if (y >= H) {
          alive = false;
          break;
        }
      }

      if (!alive) {
        // Swap-remove dead ball
        const last = --ballCount;
        if (i < last) {
          bx[i] = bx[last];
          by[i] = by[last];
          bpx[i] = bpx[last];
          bpy[i] = bpy[last];
          bvx[i] = bvx[last];
          bvy[i] = bvy[last];
          bcol[i] = bcol[last];
        }
        i--;
      } else {
        bx[i] = x;
        by[i] = y;
        bvx[i] = vx;
        bvy[i] = vy;
      }
    }

    if (itemSpawnCooldown > 0) itemSpawnCooldown--;

    // Check stage clear
    if (remainingBlocks <= 0 && state === 'PLAYING') {
      state = 'STAGE_CLEAR';
      window.soundFX.playStageClear();
      showOverlay(
        'STAGE CLEAR!',
        `${STAGES[currentStage].name} を完全破壊しました！`,
        'NEXT STAGE'
      );
      return;
    }

    // Check all balls lost
    if (ballCount === 0 && state === 'PLAYING') {
      lives--;
      window.soundFX.playLifeLost();
      if (lives <= 0) {
        state = 'GAME_OVER';
        showOverlay(
          'GAME OVER',
          'すべてのボールが失われました。再挑戦しますか？',
          'RETRY'
        );
      } else {
        resetBallOnPaddle();
      }
    }
  }

  function updateItems() {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy;

      // Catch check
      if (
        it.y + it.h / 2 >= PADDLE_Y &&
        it.y - it.h / 2 <= PADDLE_Y + PADDLE_H &&
        it.x + it.w / 2 >= paddleX &&
        it.x - it.w / 2 <= paddleX + PADDLE_W
      ) {
        splitBallsByNumber(it.value);
        window.soundFX.playPowerUp(it.value);
        paddleFlash = 10;
        floatTexts.push({
          x: Math.max(60, Math.min(W - 60, it.x)),
          y: PADDLE_Y - 12,
          text: `+${it.value} SPLIT!`,
          color: it.tier.border,
          life: 50
        });
        items.splice(i, 1);
        continue;
      }

      if (it.y - it.h / 2 > H) {
        items.splice(i, 1);
      }
    }

    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const ft = floatTexts[i];
      ft.y -= 1.1;
      ft.life--;
      if (ft.life <= 0) floatTexts.splice(i, 1);
    }
  }

  function render() {
    // Clear main canvas
    ctx.fillStyle = '#050711';
    ctx.fillRect(0, 0, W, H);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx < W; gx += 80) {
      ctx.moveTo(gx, HUD_H);
      ctx.lineTo(gx, H);
    }
    for (let gy = HUD_H; gy < H; gy += 80) {
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
    }
    ctx.stroke();

    // Update & draw blocks layer
    if (blockDirty) {
      const dw = Math.max(1, dirtyMaxX - dirtyMinX);
      const dh = Math.max(1, dirtyMaxY - dirtyMinY);
      blockCtx.putImageData(blockImg, 0, 0, dirtyMinX, dirtyMinY, dw, dh);
      blockDirty = false;
      dirtyMinX = W; dirtyMinY = H; dirtyMaxX = 0; dirtyMaxY = 0;
    }
    ctx.drawImage(blockCanvas, 0, 0);

    // Render 1-dot balls with pure white core, cross-glow, and 5-step fading trail
    ballBuf32.fill(0);
    const PURE_WHITE = 0xffffffff;
    for (let i = 0; i < ballCount; i++) {
      const fx = bx[i];
      const fy = by[i];
      const x = fx | 0;
      const y = fy | 0;
      const col = bcol[i];
      const rgb = col & 0x00ffffff;

      // 5-step 1px motion trail along reverse velocity vector
      const invSpeed = 1 / BALL_SPEED;
      const ux = bvx[i] * invSpeed;
      const uy = bvy[i] * invSpeed;
      for (let t = 1; t <= 5; t++) {
        const tx = (fx - ux * t * 1.35) | 0;
        const ty = (fy - uy * t * 1.35) | 0;
        if (tx >= 0 && tx < W && ty >= HUD_H && ty < H) {
          const alpha = (210 - t * 36) << 24;
          const idx = ty * W + tx;
          if (ballBuf32[idx] === 0) {
            ballBuf32[idx] = rgb | alpha;
          }
        }
      }

      if (highVisMode) {
        // 2x2 pure white core for high-visibility mode
        for (let dy = 0; dy <= 1; dy++) {
          const py = y + dy;
          if (py < HUD_H || py >= H) continue;
          const rowOff = py * W;
          for (let dx = 0; dx <= 1; dx++) {
            const px = x + dx;
            if (px >= 0 && px < W) {
              ballBuf32[rowOff + px] = PURE_WHITE;
            }
          }
        }
      } else {
        // Subtle 1px cross-glow around the 1x1 pure white core
        const glowCol = rgb | 0x58000000;
        if (x > 0 && y >= HUD_H && y < H && ballBuf32[y * W + (x - 1)] === 0) {
          ballBuf32[y * W + (x - 1)] = glowCol;
        }
        if (x + 1 < W && y >= HUD_H && y < H && ballBuf32[y * W + (x + 1)] === 0) {
          ballBuf32[y * W + (x + 1)] = glowCol;
        }
        if (y - 1 >= HUD_H && x >= 0 && x < W && ballBuf32[(y - 1) * W + x] === 0) {
          ballBuf32[(y - 1) * W + x] = glowCol;
        }
        if (y + 1 < H && x >= 0 && x < W && ballBuf32[(y + 1) * W + x] === 0) {
          ballBuf32[(y + 1) * W + x] = glowCol;
        }
        // 1x1 pure white core
        if (x >= 0 && x < W && y >= HUD_H && y < H) {
          ballBuf32[y * W + x] = PURE_WHITE;
        }
      }
    }
    ballCtx.putImageData(ballImg, 0, 0);
    ctx.drawImage(ballCanvas, 0, 0);

    // When 10 or fewer balls are active, draw subtle locator rings so they are easy to track
    if (ballCount > 0 && ballCount <= 10) {
      ctx.strokeStyle = ballCount === 1 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(56, 189, 248, 0.42)';
      ctx.lineWidth = 1;
      for (let i = 0; i < ballCount; i++) {
        ctx.beginPath();
        ctx.arc(bx[i] + 0.5, by[i] + 0.5, ballCount === 1 ? 8 : 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw falling power-up items (1..99)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px monospace';
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const rx = it.x - it.w / 2;
      const ry = it.y - it.h / 2;

      ctx.fillStyle = it.tier.bg;
      ctx.strokeStyle = it.tier.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rx, ry, it.w, it.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = it.tier.text;
      ctx.fillText(String(it.value), it.x, it.y + 0.5);
    }

    // Draw paddle
    ctx.fillStyle = paddleFlash > 0 ? '#ffffff' : '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillRect(paddleX + 10, PADDLE_Y + 2, PADDLE_W - 20, 2);

    // Floating texts
    ctx.font = 'bold 16px sans-serif';
    for (let i = 0; i < floatTexts.length; i++) {
      const ft = floatTexts[i];
      ctx.globalAlpha = Math.min(1, ft.life / 20);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    // Ready prompt
    if (state === 'READY') {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('CLICK OR PRESS SPACE TO LAUNCH', W / 2, PADDLE_Y - 46);
    } else if (state === 'PAUSED') {
      ctx.fillStyle = 'rgba(4, 6, 16, 0.55)';
      ctx.fillRect(0, HUD_H, W, H - HUD_H);
      ctx.fillStyle = '#7dd3fc';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText('PAUSED', W / 2, H / 2);
    }

    // Top HUD bar (within 1600x900)
    ctx.fillStyle = '#090e20';
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HUD_H);
    ctx.lineTo(W, HUD_H);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';

    ctx.fillStyle = '#7dd3fc';
    ctx.fillText(`STAGE: ${STAGES[currentStage].name}`, 18, HUD_H / 2);

    const destroyed = totalBlocks - remainingBlocks;
    const pct = totalBlocks > 0 ? ((destroyed / totalBlocks) * 100).toFixed(1) : '0.0';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`BLOCKS: ${remainingBlocks.toLocaleString()} / ${totalBlocks.toLocaleString()} (${pct}%)`, 280, HUD_H / 2);

    // Progress bar
    const barX = 640, barY = 15, barW = 180, barH = 14;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(barX, barY, totalBlocks > 0 ? (barW * destroyed) / totalBlocks : 0, barH);

    ctx.fillStyle = ballCount >= 1000 ? '#f472b6' : '#34d399';
    ctx.fillText(`BALLS: ${ballCount.toLocaleString()} (PEAK: ${peakBalls.toLocaleString()})`, 845, HUD_H / 2);

    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`SCORE: ${score.toLocaleString()}`, 1140, HUD_H / 2);

    ctx.fillStyle = '#f87171';
    ctx.fillText(`LIVES: ${'♥'.repeat(Math.max(0, lives))}`, 1320, HUD_H / 2);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${fps} FPS`, 1425, HUD_H / 2);
  }

  function showOverlay(title, subtitle, buttonLabel) {
    overlayTitle.textContent = title;
    overlaySubtitle.textContent = subtitle;
    btnStart.textContent = buttonLabel;
    statScore.textContent = score.toLocaleString();
    statBlocks.textContent = totalDestroyedAllStages.toLocaleString();
    statPeak.textContent = peakBalls.toLocaleString();
    overlayStats.classList.remove('hidden');
    overlay.classList.remove('hidden');
    stageFrame.classList.add('menu-open');
    buildStageButtons();
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
    stageFrame.classList.remove('menu-open');
  }

  function startGame() {
    window.soundFX.init();
    if (state === 'STAGE_CLEAR') {
      currentStage = (currentStage + 1) % STAGES.length;
      loadStage(currentStage);
    } else {
      score = 0;
      lives = 3;
      totalDestroyedAllStages = 0;
      peakBalls = 1;
      loadStage(currentStage);
    }
    hideOverlay();
  }

  function loop(now) {
    frameCounter++;
    if (now - fpsTimer >= 500) {
      fps = Math.round((frameCounter * 1000) / (now - fpsTimer));
      frameCounter = 0;
      fpsTimer = now;
    }

    if (state === 'READY' || state === 'PLAYING') {
      updatePaddle();
    }
    if (state === 'PLAYING') {
      updateBalls();
      updateItems();
    }
    render();
    requestAnimationFrame(loop);
  }

  // Input handlers
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, mx - PADDLE_W / 2));
  });

  canvas.addEventListener('mousedown', () => {
    if (state === 'READY') {
      launchInitialBall();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.code === 'Space') {
      if (state === 'READY') {
        e.preventDefault();
        launchInitialBall();
      }
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      togglePause();
    }
    if (e.key === 'm' || e.key === 'M') {
      toggleMute();
    }
    if (e.key === 'v' || e.key === 'V') {
      toggleVisMode();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  function toggleVisMode() {
    highVisMode = !highVisMode;
    btnVis.textContent = highVisMode ? '🔆' : '👁️';
    floatTexts.push({
      x: W / 2,
      y: HUD_H + 34,
      text: highVisMode ? 'BALL: 2×2 HI-VIS MODE' : 'BALL: 1×1 GLOW MODE',
      color: '#7dd3fc',
      life: 55
    });
  }

  function togglePause() {
    if (state === 'PLAYING') state = 'PAUSED';
    else if (state === 'PAUSED') state = 'PLAYING';
  }

  function toggleMute() {
    const muted = window.soundFX.toggleMute();
    btnMute.textContent = muted ? '🔇' : '🔊';
  }

  btnStart.addEventListener('click', startGame);
  btnVis.addEventListener('click', toggleVisMode);
  btnMute.addEventListener('click', toggleMute);
  btnPause.addEventListener('click', togglePause);
  btnMenu.addEventListener('click', () => {
    if (state === 'PLAYING' || state === 'READY' || state === 'PAUSED') {
      state = 'PAUSED';
      showOverlay(
        'PIXEL STORM BREAKOUT',
        'ステージを選択して再開またはリスタートできます',
        'RESTART GAME'
      );
    }
  });

  // Initialize
  stageFrame.classList.add('menu-open');
  buildStageButtons();
  loadStage(0);
  state = 'MENU';
  requestAnimationFrame(loop);
})();
