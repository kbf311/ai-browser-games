/**
 * BARREL KONG - Retro Arcade Platformer
 * Pure HTML5 Canvas + Web Audio API (audio.js)
 */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;  // 480
const H = canvas.height; // 540

const audio = new ArcadeAudio();

// UI Controls
const muteBtn = document.getElementById("muteBtn");
const volSlider = document.getElementById("volSlider");
const pauseBtn = document.getElementById("pauseBtn");

function updateMuteUI() {
  if (audio.muted) {
    muteBtn.textContent = "🔇 MUTED";
    muteBtn.classList.add("muted");
  } else {
    muteBtn.textContent = "🔊 BGM ON";
    muteBtn.classList.remove("muted");
  }
}

muteBtn.addEventListener("click", () => {
  audio.init();
  audio.toggleMute();
  updateMuteUI();
});

volSlider.addEventListener("input", (e) => {
  audio.init();
  audio.setVolume(parseInt(e.target.value, 10) / 100);
});

pauseBtn.addEventListener("click", () => {
  if (game.state === "PLAYING") {
    game.paused = !game.paused;
    pauseBtn.textContent = game.paused ? "▶ RESUME" : "⏸ PAUSE";
  }
});

// Input Handling
const keys = {};
const justPressed = {};

window.addEventListener("keydown", (e) => {
  const code = e.code;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) {
    e.preventDefault();
  }
  if (!keys[code]) {
    justPressed[code] = true;
  }
  keys[code] = true;

  if (code === "KeyM") {
    audio.init();
    audio.toggleMute();
    updateMuteUI();
  }
  if (code === "KeyP" && game.state === "PLAYING") {
    game.paused = !game.paused;
    pauseBtn.textContent = game.paused ? "▶ RESUME" : "⏸ PAUSE";
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// Touch / Mouse buttons
document.querySelectorAll("[data-key]").forEach((btn) => {
  const code = btn.getAttribute("data-key");
  const down = (e) => {
    e.preventDefault();
    if (!keys[code]) justPressed[code] = true;
    keys[code] = true;
    btn.classList.add("active");
  };
  const up = (e) => {
    e.preventDefault();
    keys[code] = false;
    btn.classList.remove("active");
  };
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointerleave", up);
  btn.addEventListener("pointercancel", up);
});

function isLeft() { return keys["ArrowLeft"] || keys["KeyA"]; }
function isRight() { return keys["ArrowRight"] || keys["KeyD"]; }
function isUp() { return keys["ArrowUp"] || keys["KeyW"]; }
function isDown() { return keys["ArrowDown"] || keys["KeyS"]; }
function isJumpPressed() { return justPressed["Space"] || justPressed["KeyZ"]; }
function isStartPressed() { return justPressed["Space"] || justPressed["Enter"] || justPressed["KeyZ"]; }

// --- Math & Girder Helpers ---

function girderYAt(g, x) {
  const t = (x - g.x1) / (g.x2 - g.x1);
  return g.y1 + t * (g.y2 - g.y1);
}

function girderSlope(g) {
  return (g.y2 - g.y1) / (g.x2 - g.x1);
}

function findSupportingGirder(girders, x, y, prevY, tolerance = 8) {
  let best = null;
  let bestY = Infinity;
  for (const g of girders) {
    if (x < g.x1 - 4 || x > g.x2 + 4) continue;
    // Check if there is a removed rivet gap at x
    if (g.gaps && g.gaps.some((gap) => x > gap.x - 10 && x < gap.x + 10)) continue;
    const gy = girderYAt(g, Math.max(g.x1, Math.min(g.x2, x)));
    if (prevY <= gy + tolerance && y >= gy - 4 && gy < bestY) {
      best = g;
      bestY = gy;
    }
  }
  return best ? { girder: best, y: bestY } : null;
}

// --- Level Definitions ---

function createStage1(loopCount) {
  const girders = [
    { x1: 16, y1: 506, x2: 464, y2: 492 },  // 0: Bottom
    { x1: 16, y1: 416, x2: 428, y2: 432 },  // 1
    { x1: 52, y1: 356, x2: 464, y2: 338 },  // 2
    { x1: 16, y1: 266, x2: 428, y2: 282 },  // 3
    { x1: 52, y1: 204, x2: 464, y2: 186 },  // 4
    { x1: 16, y1: 124, x2: 396, y2: 124 },  // 5: Kong's tier
    { x1: 170, y1: 72, x2: 308, y2: 72 },   // 6: Princess tier
  ];

  const ladders = [
    { x: 388, topY: girderYAt(girders[1], 388), bottomY: girderYAt(girders[0], 388), broken: false },
    { x: 164, topY: girderYAt(girders[1], 164), bottomY: girderYAt(girders[0], 164), broken: true },

    { x: 86, topY: girderYAt(girders[2], 86), bottomY: girderYAt(girders[1], 86), broken: false },
    { x: 242, topY: girderYAt(girders[2], 242), bottomY: girderYAt(girders[1], 242), broken: false },

    { x: 178, topY: girderYAt(girders[3], 178), bottomY: girderYAt(girders[2], 178), broken: false },
    { x: 388, topY: girderYAt(girders[3], 388), bottomY: girderYAt(girders[2], 388), broken: false },

    { x: 86, topY: girderYAt(girders[4], 86), bottomY: girderYAt(girders[3], 86), broken: false },
    { x: 280, topY: girderYAt(girders[4], 280), bottomY: girderYAt(girders[3], 280), broken: false },

    { x: 370, topY: girderYAt(girders[5], 370), bottomY: girderYAt(girders[4], 370), broken: false },
    { x: 284, topY: girderYAt(girders[6], 284), bottomY: girderYAt(girders[5], 284), broken: false },
  ];

  const hammers = [
    { x: 118, y: girderYAt(girders[1], 118) - 24, active: true },
    { x: 344, y: girderYAt(girders[3], 344) - 24, active: true },
  ];

  const items = [
    { x: 120, y: girderYAt(girders[2], 120) - 14, type: "umbrella", pts: 300, active: true },
    { x: 146, y: girderYAt(girders[4], 146) - 14, type: "purse", pts: 500, active: true },
  ];

  return {
    type: "barrels",
    name: "25m - BARREL RAMPAGE",
    girders,
    ladders,
    hammers,
    items,
    rivets: [],
    oilDrum: { x: 40, y: girderYAt(girders[0], 40), lit: true },
    kong: { x: 64, y: 124, state: "idle", timer: 0, frame: 0 },
    princess: { x: 215, y: 72, helpTimer: 0 },
    spawn: { x: 96, y: girderYAt(girders[0], 96) },
    barrelInterval: Math.max(1.15, 2.35 - loopCount * 0.28),
    barrelSpeed: Math.min(185, 118 + loopCount * 16),
    fireballLimit: Math.min(4, 2 + loopCount),
  };
}

function createStage2(loopCount) {
  const girders = [
    { x1: 16, y1: 504, x2: 464, y2: 504, gaps: [] }, // 0: Bottom
    { x1: 36, y1: 416, x2: 444, y2: 416, gaps: [] }, // 1
    { x1: 52, y1: 328, x2: 428, y2: 328, gaps: [] }, // 2
    { x1: 36, y1: 240, x2: 444, y2: 240, gaps: [] }, // 3
    { x1: 52, y1: 152, x2: 428, y2: 152, gaps: [] }, // 4
    { x1: 170, y1: 74, x2: 310, y2: 74, gaps: [] },  // 5: Top Princess
  ];

  const ladders = [
    { x: 60,  topY: 416, bottomY: 504, broken: false },
    { x: 240, topY: 416, bottomY: 504, broken: false },
    { x: 420, topY: 416, bottomY: 504, broken: false },

    { x: 84,  topY: 328, bottomY: 416, broken: false },
    { x: 396, topY: 328, bottomY: 416, broken: false },

    { x: 64,  topY: 240, bottomY: 328, broken: false },
    { x: 240, topY: 240, bottomY: 328, broken: false },
    { x: 416, topY: 240, bottomY: 328, broken: false },

    { x: 96,  topY: 152, bottomY: 240, broken: false },
    { x: 384, topY: 152, bottomY: 240, broken: false },
  ];

  const rivets = [
    { x: 136, y: 416, girderIdx: 1, removed: false },
    { x: 344, y: 416, girderIdx: 1, removed: false },
    { x: 146, y: 328, girderIdx: 2, removed: false },
    { x: 334, y: 328, girderIdx: 2, removed: false },
    { x: 136, y: 240, girderIdx: 3, removed: false },
    { x: 344, y: 240, girderIdx: 3, removed: false },
    { x: 146, y: 152, girderIdx: 4, removed: false },
    { x: 334, y: 152, girderIdx: 4, removed: false },
  ];

  const hammers = [
    { x: 240, y: 328 - 26, active: true },
    { x: 240, y: 152 - 26, active: true },
  ];

  const items = [
    { x: 400, y: 240 - 14, type: "hat", pts: 500, active: true },
    { x: 80, y: 152 - 14, type: "purse", pts: 800, active: true },
  ];

  return {
    type: "rivets",
    name: "50m - RIVET STEELWORKS",
    girders,
    ladders,
    hammers,
    items,
    rivets,
    oilDrum: null,
    kong: { x: 240, y: 152, state: "roar", timer: 0, frame: 0 },
    princess: { x: 240, y: 74, helpTimer: 0 },
    spawn: { x: 96, y: 504 },
    barrelInterval: 999,
    barrelSpeed: 0,
    fireballLimit: Math.min(6, 3 + loopCount),
  };
}

// --- Main Game Object ---

const game = {
  state: "TITLE", // TITLE, INTRO, PLAYING, DYING, STAGE_CLEAR, GAME_OVER
  paused: false,
  score: 0,
  highScore: parseInt(localStorage.getItem("barrelKongHigh") || "5000", 10),
  lives: 3,
  stageNum: 1,
  loopCount: 0,
  bonus: 5000,
  bonusTimer: 0,
  stateTimer: 0,
  level: null,

  player: null,
  barrels: [],
  fireballs: [],
  particles: [],
  popups: [],

  barrelTimer: 1.0,
  fireballSpawnTimer: 2.0,
  stepSoundTimer: 0,
};

function addScore(pts, x, y, color = "#ffd369") {
  const prevLife = Math.floor(game.score / 10000);
  game.score += pts;
  if (Math.floor(game.score / 10000) > prevLife) {
    game.lives++;
    audio.sfxPickup();
    game.popups.push({ x, y: y - 24, text: "1UP!", color: "#08d9d6", life: 1.4 });
  }
  if (game.score > game.highScore) {
    game.highScore = game.score;
    localStorage.setItem("barrelKongHigh", String(game.highScore));
  }
  if (x !== undefined && y !== undefined) {
    game.popups.push({ x, y: y - 10, text: `+${pts}`, color, life: 0.9 });
  }
}

function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 140;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      color,
      size: 2 + Math.random() * 3,
      life: 0.35 + Math.random() * 0.3,
    });
  }
}

function startNewGame() {
  audio.init();
  game.score = 0;
  game.lives = 3;
  game.stageNum = 1;
  game.loopCount = 0;
  loadStage(1, true);
}

function loadStage(num, playIntro = false) {
  game.stageNum = num;
  game.loopCount = Math.floor((num - 1) / 2);
  const isStage2 = num % 2 === 0;
  game.level = isStage2 ? createStage2(game.loopCount) : createStage1(game.loopCount);

  game.bonus = 5000;
  game.bonusTimer = 0;
  game.barrels = [];
  game.fireballs = [];
  game.particles = [];
  game.popups = [];
  game.barrelTimer = 0.8;
  game.fireballSpawnTimer = 1.5;

  resetPlayer();

  // Stage 2 starts with initial fireballs
  if (isStage2) {
    spawnFireball(380, 416);
    spawnFireball(120, 240);
  }

  if (playIntro) {
    game.state = "INTRO";
    game.stateTimer = 2.4;
    audio.playTrack("intro");
  } else {
    beginPlaying();
  }
}

function beginPlaying() {
  game.state = "PLAYING";
  game.paused = false;
  pauseBtn.textContent = "⏸ PAUSE";
  const track = game.level.type === "rivets" ? "stage2" : "stage1";
  audio.playTrack(track);
}

function resetPlayer() {
  const sp = game.level.spawn;
  game.player = {
    x: sp.x,
    y: sp.y,
    vx: 0,
    vy: 0,
    dir: 1, // 1 right, -1 left
    onGround: true,
    onLadder: false,
    currentLadder: null,
    hammerTimer: 0,
    hammerSwing: 0,
    animFrame: 0,
    animTimer: 0,
    invulnTimer: 0,
  };
}

// --- Entities ---

function spawnBarrel(isBlue = false) {
  const lv = game.level;
  game.barrels.push({
    x: lv.kong.x + 28,
    y: lv.kong.y - 6,
    vx: lv.barrelSpeed * (isBlue ? 1.15 : 1),
    vy: 0,
    dir: 1,
    onGround: false,
    onLadder: false,
    ladderTargetBottom: 0,
    rot: 0,
    isBlue,
    jumpedOver: false,
  });
}

function spawnFireball(x, y) {
  game.fireballs.push({
    x,
    y,
    dir: Math.random() < 0.5 ? 1 : -1,
    vy: 0,
    onLadder: false,
    ladderDir: 0,
    ladderTargetY: 0,
    climbCooldown: 1.5,
    anim: 0,
  });
}

// --- Update Loops ---

function update(dt) {
  if (game.paused && game.state === "PLAYING") return;

  // Update particles & popups in all active states
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 280 * dt;
    p.life -= dt;
    if (p.life <= 0) game.particles.splice(i, 1);
  }
  for (let i = game.popups.length - 1; i >= 0; i--) {
    const pop = game.popups[i];
    pop.y -= 26 * dt;
    pop.life -= dt;
    if (pop.life <= 0) game.popups.splice(i, 1);
  }

  if (game.state === "TITLE") {
    if (isStartPressed()) {
      startNewGame();
    }
    return;
  }

  if (game.state === "INTRO") {
    game.stateTimer -= dt;
    if (game.stateTimer <= 0 || isStartPressed()) {
      beginPlaying();
    }
    return;
  }

  if (game.state === "DYING") {
    game.stateTimer -= dt;
    if (game.stateTimer <= 0) {
      game.lives--;
      if (game.lives <= 0) {
        game.state = "GAME_OVER";
        game.stateTimer = 3.0;
        audio.playTrack("gameover");
      } else {
        // Respawn on current stage
        game.barrels = [];
        game.fireballs = [];
        if (game.level.type === "rivets") {
          spawnFireball(380, 416);
          spawnFireball(120, 240);
        }
        resetPlayer();
        beginPlaying();
      }
    }
    return;
  }

  if (game.state === "STAGE_CLEAR") {
    game.stateTimer -= dt;
    if (game.level.type === "rivets" && game.level.kong.y < 504) {
      game.level.kong.y += 220 * dt;
    }
    if (game.stateTimer <= 0) {
      loadStage(game.stageNum + 1, false);
    }
    return;
  }

  if (game.state === "GAME_OVER") {
    game.stateTimer -= dt;
    if (game.stateTimer <= 0 && isStartPressed()) {
      startNewGame();
    }
    return;
  }

  // --- PLAYING ---
  const lv = game.level;

  // Bonus countdown
  game.bonusTimer += dt;
  if (game.bonusTimer >= 1.0) {
    game.bonusTimer -= 1.0;
    if (game.bonus > 0) game.bonus = Math.max(0, game.bonus - 100);
  }

  // Princess help animation
  lv.princess.helpTimer += dt;

  // Kong & Barrel Spawning (Stage 1)
  if (lv.type === "barrels") {
    game.barrelTimer -= dt;
    if (game.barrelTimer <= 0.45 && lv.kong.state === "idle") {
      lv.kong.state = "throwing";
      audio.sfxThrow();
    }
    if (game.barrelTimer <= 0) {
      const isBlue = Math.random() < 0.22;
      spawnBarrel(isBlue);
      lv.kong.state = "idle";
      game.barrelTimer = lv.barrelInterval * (0.85 + Math.random() * 0.35);
    }
  } else {
    // Stage 2: Kong pounds chest & fireballs spawn up to limit
    lv.kong.timer += dt;
    game.fireballSpawnTimer -= dt;
    if (game.fireballSpawnTimer <= 0 && game.fireballs.length < lv.fireballLimit) {
      const sideX = Math.random() < 0.5 ? 70 : 410;
      spawnFireball(sideX, 504);
      game.fireballSpawnTimer = 5.0;
    }
  }

  updatePlayer(dt);
  updateBarrels(dt);
  updateFireballs(dt);
  checkStageClear();
}

function updatePlayer(dt) {
  const p = game.player;
  const lv = game.level;
  const MOVE_SPEED = 115;
  const CLIMB_SPEED = 78;
  const GRAVITY = 560;
  const JUMP_VEL = -238;

  // Hammer timer
  if (p.hammerTimer > 0) {
    p.hammerTimer -= dt;
    p.hammerSwing += dt * 16;
    if (p.hammerTimer <= 0) {
      p.hammerTimer = 0;
      const track = lv.type === "rivets" ? "stage2" : "stage1";
      audio.playTrack(track);
    }
  }

  const holdingHammer = p.hammerTimer > 0;

  if (p.onLadder) {
    const lad = p.currentLadder;
    p.x = lad.x;
    p.vx = 0;
    p.vy = 0;

    if (isUp()) {
      p.y -= CLIMB_SPEED * dt;
      p.animTimer += dt;
      if (p.animTimer > 0.14) {
        p.animTimer = 0;
        p.animFrame = (p.animFrame + 1) % 2;
        audio.sfxStep();
      }
      if (p.y <= lad.topY) {
        p.y = lad.topY;
        p.onLadder = false;
        p.currentLadder = null;
        p.onGround = true;
      }
    } else if (isDown()) {
      p.y += CLIMB_SPEED * dt;
      p.animTimer += dt;
      if (p.animTimer > 0.14) {
        p.animTimer = 0;
        p.animFrame = (p.animFrame + 1) % 2;
        audio.sfxStep();
      }
      if (p.y >= lad.bottomY) {
        p.y = lad.bottomY;
        p.onLadder = false;
        p.currentLadder = null;
        p.onGround = true;
      }
    }

    // Allow jumping off ladder horizontally
    if (isJumpPressed() && (isLeft() || isRight())) {
      p.onLadder = false;
      p.currentLadder = null;
      p.onGround = false;
      p.vy = JUMP_VEL * 0.85;
      p.dir = isLeft() ? -1 : 1;
      audio.sfxJump();
    }
    return;
  }

  // Horizontal movement
  let move = 0;
  if (isLeft()) { move = -1; p.dir = -1; }
  else if (isRight()) { move = 1; p.dir = 1; }
  p.vx = move * MOVE_SPEED;

  // Check ladder grab (cannot climb while holding hammer)
  if (!holdingHammer && (isUp() || isDown())) {
    for (const lad of lv.ladders) {
      if (lad.broken) continue;
      if (Math.abs(p.x - lad.x) <= 12) {
        if (isUp() && p.y <= lad.bottomY + 6 && p.y > lad.topY + 4) {
          p.onLadder = true;
          p.currentLadder = lad;
          p.onGround = false;
          p.x = lad.x;
          return;
        }
        if (isDown() && Math.abs(p.y - lad.topY) <= 10) {
          p.onLadder = true;
          p.currentLadder = lad;
          p.onGround = false;
          p.x = lad.x;
          p.y = lad.topY + 4;
          return;
        }
      }
    }
  }

  // Jump
  if (p.onGround && isJumpPressed()) {
    p.vy = JUMP_VEL;
    p.onGround = false;
    audio.sfxJump();
  }

  // Apply velocity & gravity
  const prevY = p.y;
  p.x += p.vx * dt;
  p.x = Math.max(20, Math.min(W - 20, p.x));

  if (!p.onGround) {
    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
  }

  // Ground collision / slope following
  const support = findSupportingGirder(lv.girders, p.x, p.y, prevY, p.onGround ? 12 : 6);
  if (support && p.vy >= 0) {
    p.y = support.y;
    p.vy = 0;
    p.onGround = true;
  } else {
    p.onGround = false;
  }

  // Walk animation & subtle step sound
  if (p.onGround && move !== 0) {
    p.animTimer += dt;
    if (p.animTimer > 0.11) {
      p.animTimer = 0;
      p.animFrame = (p.animFrame + 1) % 3;
      if (p.animFrame === 1) audio.sfxStep();
    }
  } else if (p.onGround) {
    p.animFrame = 0;
  }

  // Fall off bottom of screen
  if (p.y > H + 20) {
    triggerPlayerDeath();
    return;
  }

  // Collect Hammers
  for (const h of lv.hammers) {
    if (h.active && Math.hypot(p.x - h.x, (p.y - 12) - h.y) < 20) {
      h.active = false;
      p.hammerTimer = 8.5;
      p.hammerSwing = 0;
      audio.sfxPickup();
      audio.playTrack("hammer");
      spawnParticles(h.x, h.y, "#ffd369", 10);
    }
  }

  // Collect Bonus Items
  for (const it of lv.items) {
    if (it.active && Math.hypot(p.x - it.x, (p.y - 10) - it.y) < 18) {
      it.active = false;
      addScore(it.pts, it.x, it.y);
      audio.sfxPickup();
      spawnParticles(it.x, it.y, "#08d9d6", 10);
    }
  }

  // Stage 2: Remove Rivets by walking over them
  if (lv.type === "rivets" && p.onGround) {
    for (const r of lv.rivets) {
      if (!r.removed && Math.abs(p.x - r.x) < 11 && Math.abs(p.y - r.y) < 10) {
        r.removed = true;
        lv.girders[r.girderIdx].gaps.push({ x: r.x });
        addScore(100, r.x, r.y - 10, "#08d9d6");
        audio.sfxRivet();
        spawnParticles(r.x, r.y, "#ffd369", 8);
      }
    }
  }
}

function updateBarrels(dt) {
  const lv = game.level;
  const p = game.player;
  const GRAVITY = 520;

  for (let i = game.barrels.length - 1; i >= 0; i--) {
    const b = game.barrels[i];

    if (b.onLadder) {
      b.y += 120 * dt;
      if (b.y >= b.ladderTargetBottom) {
        b.y = b.ladderTargetBottom;
        b.onLadder = false;
        b.onGround = true;
        // Reverse direction on new tier
        b.dir *= -1;
        b.vx = Math.abs(b.vx) * b.dir;
      }
    } else {
      const prevY = b.y;
      b.x += b.vx * dt;
      b.rot += b.vx * dt * 0.14;

      if (!b.onGround) {
        b.vy += GRAVITY * dt;
        b.y += b.vy * dt;
      }

      const support = findSupportingGirder(lv.girders, b.x, b.y, prevY, 10);
      if (support && b.vy >= 0) {
        b.y = support.y;
        b.vy = 0;
        b.onGround = true;
        // Adjust direction to follow downward slope!
        const slope = girderSlope(support.girder);
        if (Math.abs(slope) > 0.01) {
          b.dir = slope > 0 ? 1 : -1;
          b.vx = lv.barrelSpeed * (b.isBlue ? 1.15 : 1) * b.dir;
        }

        // Chance to take a ladder down
        for (const lad of lv.ladders) {
          if (Math.abs(b.x - lad.x) < 4 && Math.abs(b.y - lad.topY) < 6) {
            const chance = b.isBlue ? 0.55 : 0.25;
            if (Math.random() < chance) {
              b.onLadder = true;
              b.x = lad.x;
              b.ladderTargetBottom = lad.bottomY;
              break;
            }
          }
        }
      } else {
        b.onGround = false;
      }

      // Bounce off screen edges on upper tiers, or disappear into oil drum
      if (b.x < 18) {
        if (b.y > 470 && lv.oilDrum) {
          // Hit oil drum!
          if (game.fireballs.length < lv.fireballLimit && (b.isBlue || Math.random() < 0.35)) {
            spawnFireball(lv.oilDrum.x + 14, lv.oilDrum.y);
          }
          spawnParticles(lv.oilDrum.x, lv.oilDrum.y - 16, "#ff6b35", 8);
          game.barrels.splice(i, 1);
          continue;
        }
        b.x = 18;
        b.dir = 1;
        b.vx = Math.abs(b.vx);
      } else if (b.x > W - 18) {
        b.x = W - 18;
        b.dir = -1;
        b.vx = -Math.abs(b.vx);
      }

      if (b.y > H + 20) {
        game.barrels.splice(i, 1);
        continue;
      }
    }

    // --- Player vs Barrel Interaction ---
    const dx = Math.abs(p.x - b.x);
    const dy = (p.y - 10) - (b.y - 7);

    // Hammer smash check
    if (p.hammerTimer > 0) {
      const hammerX = p.x + p.dir * 16;
      const hammerY = p.y - 16;
      if (Math.hypot(hammerX - b.x, hammerY - (b.y - 7)) < 24 || (dx < 20 && Math.abs(dy) < 20)) {
        addScore(300, b.x, b.y - 10);
        audio.sfxSmash();
        spawnParticles(b.x, b.y - 7, "#ff9f1c", 14);
        game.barrels.splice(i, 1);
        continue;
      }
    }

    // Jump-over bonus check
    if (!b.jumpedOver && !p.onGround && !p.onLadder && dx < 16 && b.y - p.y > 6 && b.y - p.y < 54) {
      b.jumpedOver = true;
      addScore(100, p.x, p.y - 26);
      audio.sfxScore();
    }

    // Collision check
    if (dx < 11 && Math.abs(dy) < 11) {
      triggerPlayerDeath();
      return;
    }
  }
}

function updateFireballs(dt) {
  const lv = game.level;
  const p = game.player;
  const FB_SPEED = 58 + game.loopCount * 8;

  for (let i = game.fireballs.length - 1; i >= 0; i--) {
    const f = game.fireballs[i];
    f.anim += dt * 10;
    f.climbCooldown = Math.max(0, f.climbCooldown - dt);

    if (f.onLadder) {
      f.y += f.ladderDir * 52 * dt;
      if ((f.ladderDir < 0 && f.y <= f.ladderTargetY) || (f.ladderDir > 0 && f.y >= f.ladderTargetY)) {
        f.y = f.ladderTargetY;
        f.onLadder = false;
        f.climbCooldown = 2.0;
        f.dir = p.x > f.x ? 1 : -1;
      }
    } else {
      const prevX = f.x;
      f.x += f.dir * FB_SPEED * dt;

      const support = findSupportingGirder(lv.girders, f.x, f.y, f.y, 10);
      if (support) {
        f.y = support.y;
        // Turn around at girder edges or rivet gaps
        if (f.x <= support.girder.x1 + 10 || f.x >= support.girder.x2 - 10) {
          f.dir *= -1;
          f.x = prevX;
        }
      } else {
        // Hit a gap -> turn around!
        f.dir *= -1;
        f.x = prevX;
      }

      // Climb ladders occasionally toward player's Y
      if (f.climbCooldown <= 0) {
        for (const lad of lv.ladders) {
          if (lad.broken) continue;
          if (Math.abs(f.x - lad.x) < 4) {
            if (Math.abs(f.y - lad.bottomY) < 6 && p.y < f.y - 10 && Math.random() < 0.65) {
              f.onLadder = true;
              f.ladderDir = -1;
              f.ladderTargetY = lad.topY;
              f.x = lad.x;
              break;
            } else if (Math.abs(f.y - lad.topY) < 6 && p.y > f.y + 10 && Math.random() < 0.55) {
              f.onLadder = true;
              f.ladderDir = 1;
              f.ladderTargetY = lad.bottomY;
              f.x = lad.x;
              break;
            }
          }
        }
      }
    }

    // Player vs Fireball
    const dx = Math.abs(p.x - f.x);
    const dy = Math.abs((p.y - 10) - (f.y - 8));

    if (p.hammerTimer > 0) {
      const hammerX = p.x + p.dir * 16;
      const hammerY = p.y - 16;
      if (Math.hypot(hammerX - f.x, hammerY - (f.y - 8)) < 24 || (dx < 18 && dy < 18)) {
        addScore(500, f.x, f.y - 12);
        audio.sfxSmash();
        spawnParticles(f.x, f.y - 8, "#ff2e63", 16);
        game.fireballs.splice(i, 1);
        continue;
      }
    }

    if (dx < 10 && dy < 11) {
      triggerPlayerDeath();
      return;
    }
  }
}

function checkStageClear() {
  const lv = game.level;
  const p = game.player;

  let cleared = false;
  if (lv.type === "barrels") {
    // Reach Princess platform
    if (p.onGround && p.y <= 78 && Math.abs(p.x - lv.princess.x) < 60) {
      cleared = true;
    }
  } else if (lv.type === "rivets") {
    // All 8 rivets removed
    if (lv.rivets.every((r) => r.removed)) {
      cleared = true;
    }
  }

  if (cleared) {
    game.state = "STAGE_CLEAR";
    game.stateTimer = 2.8;
    addScore(game.bonus, p.x, p.y - 20, "#08d9d6");
    audio.playTrack("clear");
    spawnParticles(lv.princess.x, lv.princess.y - 20, "#ff2e63", 20);
  }
}

function triggerPlayerDeath() {
  if (game.state !== "PLAYING") return;
  game.state = "DYING";
  game.stateTimer = 1.6;
  audio.stopMusic();
  audio.sfxDeath();
  spawnParticles(game.player.x, game.player.y - 10, "#ff2e63", 22);
}

// --- Rendering ---

function draw() {
  ctx.fillStyle = "#05060b";
  ctx.fillRect(0, 0, W, H);

  if (game.state === "TITLE") {
    drawTitleScreen();
    return;
  }

  drawHUD();
  drawLevel();
  drawEntities();
  drawEffects();

  if (game.state === "INTRO") {
    drawBanner("READY!", `STAGE ${game.stageNum}: ${game.level.name}`, "#ffd369");
  } else if (game.state === "STAGE_CLEAR") {
    drawBanner("STAGE CLEAR!", `BONUS +${game.bonus}`, "#08d9d6");
  } else if (game.state === "GAME_OVER") {
    drawBanner("GAME OVER", "PRESS SPACE / ENTER TO RETRY", "#ff2e63");
  } else if (game.paused) {
    drawBanner("PAUSED", "PRESS P TO RESUME", "#eaeaea");
  }
}

function drawHUD() {
  ctx.fillStyle = "#0c0f1d";
  ctx.fillRect(0, 0, W, 50);
  ctx.strokeStyle = "#2b3252";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 50);
  ctx.lineTo(W, 50);
  ctx.stroke();

  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ff2e63";
  ctx.fillText("1UP", 16, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(game.score).padStart(6, "0"), 16, 36);

  ctx.textAlign = "center";
  ctx.fillStyle = "#08d9d6";
  ctx.fillText("HIGH SCORE", W / 2, 18);
  ctx.fillStyle = "#ffd369";
  ctx.fillText(String(game.highScore).padStart(6, "0"), W / 2, 36);

  ctx.textAlign = "right";
  ctx.fillStyle = "#08d9d6";
  ctx.fillText(`STG ${game.stageNum}`, W - 16, 18);
  ctx.fillStyle = "#ffd369";
  ctx.fillText(`BNS ${String(game.bonus).padStart(4, "0")}`, W - 16, 36);

  // Lives icons under STG
  for (let i = 0; i < Math.min(game.lives, 5); i++) {
    const lx = W - 110 - i * 14;
    ctx.fillStyle = "#ff2e63";
    ctx.fillRect(lx, 26, 8, 8);
    ctx.fillStyle = "#ffd369";
    ctx.fillRect(lx + 1, 22, 6, 4);
  }
}

function drawLevel() {
  const lv = game.level;

  // Ladders
  for (const lad of lv.ladders) {
    ctx.strokeStyle = "#08d9d6";
    ctx.lineWidth = 2;
    const lx1 = lad.x - 6;
    const lx2 = lad.x + 6;

    if (lad.broken) {
      // Draw broken top and bottom stubs
      ctx.beginPath();
      ctx.moveTo(lx1, lad.topY); ctx.lineTo(lx1, lad.topY + 18);
      ctx.moveTo(lx2, lad.topY); ctx.lineTo(lx2, lad.topY + 18);
      ctx.moveTo(lx1, lad.bottomY - 18); ctx.lineTo(lx1, lad.bottomY);
      ctx.moveTo(lx2, lad.bottomY - 18); ctx.lineTo(lx2, lad.bottomY);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(lx1, lad.topY); ctx.lineTo(lx1, lad.bottomY);
      ctx.moveTo(lx2, lad.topY); ctx.lineTo(lx2, lad.bottomY);
      for (let ry = lad.topY + 6; ry < lad.bottomY - 2; ry += 8) {
        ctx.moveTo(lx1, ry);
        ctx.lineTo(lx2, ry);
      }
      ctx.stroke();
    }
  }

  // Girders (with truss pattern & rivet gaps)
  for (const g of lv.girders) {
    const segs = [];
    if (!g.gaps || g.gaps.length === 0) {
      segs.push({ x1: g.x1, x2: g.x2 });
    } else {
      const sorted = [...g.gaps].sort((a, b) => a.x - b.x);
      let cur = g.x1;
      for (const gap of sorted) {
        if (gap.x - 10 > cur) segs.push({ x1: cur, x2: gap.x - 10 });
        cur = gap.x + 10;
      }
      if (cur < g.x2) segs.push({ x1: cur, x2: g.x2 });
    }

    for (const s of segs) {
      const y1 = girderYAt(g, s.x1);
      const y2 = girderYAt(g, s.x2);

      // Top & bottom rails
      ctx.strokeStyle = "#e63946";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x1, y1 + 1.5);
      ctx.lineTo(s.x2, y2 + 1.5);
      ctx.moveTo(s.x1, y1 + 9.5);
      ctx.lineTo(s.x2, y2 + 9.5);
      ctx.stroke();

      // Zig-zag truss
      ctx.strokeStyle = "#9b1d2c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = s.x1; x < s.x2 - 8; x += 10) {
        const ya = girderYAt(g, x);
        const yb = girderYAt(g, x + 10);
        ctx.moveTo(x, ya + 2);
        ctx.lineTo(x + 5, yb + 9);
        ctx.lineTo(x + 10, yb + 2);
      }
      ctx.stroke();
    }
  }

  // Rivets (Stage 2)
  for (const r of lv.rivets) {
    if (r.removed) continue;
    ctx.fillStyle = "#ffd369";
    ctx.fillRect(r.x - 6, r.y - 2, 12, 12);
    ctx.fillStyle = "#ff9f1c";
    ctx.fillRect(r.x - 4, r.y, 8, 8);
  }

  // Oil Drum (Stage 1)
  if (lv.oilDrum) {
    const od = lv.oilDrum;
    ctx.fillStyle = "#1d3557";
    ctx.fillRect(od.x - 12, od.y - 26, 24, 26);
    ctx.fillStyle = "#457b9d";
    ctx.fillRect(od.x - 12, od.y - 20, 24, 3);
    ctx.fillRect(od.x - 12, od.y - 9, 24, 3);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("OIL", od.x, od.y - 11);

    // Animated flame
    const flicker = Math.sin(performance.now() * 0.02) * 3;
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.moveTo(od.x - 8, od.y - 26);
    ctx.lineTo(od.x, od.y - 40 - flicker);
    ctx.lineTo(od.x + 8, od.y - 26);
    ctx.fill();
    ctx.fillStyle = "#ffd369";
    ctx.beginPath();
    ctx.moveTo(od.x - 4, od.y - 26);
    ctx.lineTo(od.x, od.y - 34 - flicker * 0.5);
    ctx.lineTo(od.x + 4, od.y - 26);
    ctx.fill();
  }

  // Hammers
  for (const h of lv.hammers) {
    if (!h.active) continue;
    const bob = Math.sin(performance.now() * 0.006) * 2;
    ctx.fillStyle = "#c97b3e";
    ctx.fillRect(h.x - 2, h.y - 2 + bob, 4, 14);
    ctx.fillStyle = "#ffd369";
    ctx.fillRect(h.x - 8, h.y - 8 + bob, 16, 8);
  }

  // Bonus Items
  for (const it of lv.items) {
    if (!it.active) continue;
    ctx.fillStyle = it.type === "umbrella" ? "#ff2e63" : it.type === "hat" ? "#ffd369" : "#f72585";
    ctx.fillRect(it.x - 7, it.y - 7, 14, 12);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(it.x - 3, it.y - 10, 6, 3);
  }
}

function drawEntities() {
  const lv = game.level;

  // Princess
  const pr = lv.princess;
  ctx.fillStyle = "#ff758f"; // dress
  ctx.fillRect(pr.x - 7, pr.y - 16, 14, 16);
  ctx.fillStyle = "#ffe5d9"; // face
  ctx.fillRect(pr.x - 5, pr.y - 24, 10, 8);
  ctx.fillStyle = "#ffd369"; // hair/crown
  ctx.fillRect(pr.x - 6, pr.y - 27, 12, 4);

  if (game.state === "PLAYING" && Math.sin(pr.helpTimer * 2.5) > 0.35) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(pr.x + 10, pr.y - 38, 42, 15);
    ctx.fillStyle = "#08090f";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HELP!", pr.x + 31, pr.y - 27);
  }

  if (game.state === "STAGE_CLEAR") {
    // Heart between player & princess
    ctx.fillStyle = "#ff2e63";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("❤", (game.player.x + pr.x) / 2, pr.y - 30);
  }

  // Kong
  const k = lv.kong;
  const chestPound = Math.sin(performance.now() * 0.01) > 0;
  ctx.save();
  ctx.translate(k.x, k.y);
  // Body
  ctx.fillStyle = "#6d3b1a";
  ctx.fillRect(-20, -34, 40, 28);
  // Chest
  ctx.fillStyle = "#d49b6a";
  ctx.fillRect(-12, -28, 24, 16);
  // Head
  ctx.fillStyle = "#6d3b1a";
  ctx.fillRect(-12, -46, 24, 14);
  ctx.fillStyle = "#d49b6a";
  ctx.fillRect(-8, -42, 16, 8);
  // Eyes
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-6, -41, 4, 3);
  ctx.fillRect(2, -41, 4, 3);
  ctx.fillStyle = "#000000";
  ctx.fillRect(-5, -40, 2, 2);
  ctx.fillRect(3, -40, 2, 2);
  // Arms
  ctx.fillStyle = "#6d3b1a";
  if (k.state === "throwing") {
    ctx.fillRect(-26, -42, 8, 20);
    ctx.fillRect(18, -32, 12, 10);
  } else {
    ctx.fillRect(-26, chestPound ? -32 : -24, 8, 18);
    ctx.fillRect(18, chestPound ? -24 : -32, 8, 18);
  }
  // Legs
  ctx.fillRect(-16, -8, 12, 8);
  ctx.fillRect(4, -8, 12, 8);
  ctx.restore();

  // Barrels
  for (const b of game.barrels) {
    ctx.save();
    ctx.translate(b.x, b.y - 7);
    ctx.rotate(b.rot);
    ctx.fillStyle = b.isBlue ? "#08d9d6" : "#c97b3e";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = b.isBlue ? "#045b5a" : "#6d3b1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.stroke();
    ctx.restore();
  }

  // Fireballs
  for (const f of game.fireballs) {
    const flick = Math.floor(f.anim) % 2 === 0;
    ctx.fillStyle = flick ? "#ff2e63" : "#ff9f1c";
    ctx.beginPath();
    ctx.arc(f.x, f.y - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd369";
    ctx.beginPath();
    ctx.arc(f.x, f.y - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#000";
    ctx.fillRect(f.x - 4, f.y - 10, 2, 2);
    ctx.fillRect(f.x + 2, f.y - 10, 2, 2);
  }

  // Player
  if (game.state !== "DYING" && game.state !== "GAME_OVER") {
    drawPlayer();
  }
}

function drawPlayer() {
  const p = game.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.dir, 1);

  // Overalls (blue)
  ctx.fillStyle = "#1e90ff";
  ctx.fillRect(-6, -12, 12, 8);
  // Shirt (red)
  ctx.fillStyle = "#ff2e63";
  ctx.fillRect(-6, -18, 12, 7);
  // Head
  ctx.fillStyle = "#ffcdb2";
  ctx.fillRect(-5, -25, 10, 7);
  // Cap
  ctx.fillStyle = "#ff2e63";
  ctx.fillRect(-6, -28, 12, 4);
  ctx.fillRect(2, -26, 6, 2);
  // Eye
  ctx.fillStyle = "#000";
  ctx.fillRect(2, -23, 2, 2);

  // Legs animation
  ctx.fillStyle = "#1e90ff";
  if (!p.onGround) {
    ctx.fillRect(-6, -4, 5, 4);
    ctx.fillRect(2, -6, 5, 4);
  } else if (p.animFrame === 1) {
    ctx.fillRect(-7, -4, 5, 4);
    ctx.fillRect(2, -5, 5, 4);
  } else {
    ctx.fillRect(-5, -4, 4, 4);
    ctx.fillRect(1, -4, 4, 4);
  }

  // Hammer swing
  if (p.hammerTimer > 0) {
    const up = Math.sin(p.hammerSwing) > 0;
    ctx.fillStyle = "#c97b3e";
    if (up) {
      ctx.fillRect(2, -34, 4, 16);
      ctx.fillStyle = "#ffd369";
      ctx.fillRect(-4, -40, 16, 8);
    } else {
      ctx.fillRect(6, -18, 16, 4);
      ctx.fillStyle = "#ffd369";
      ctx.fillRect(16, -24, 8, 16);
    }
  }

  ctx.restore();
}

function drawEffects() {
  for (const pt of game.particles) {
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = "center";
  for (const pop of game.popups) {
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
  }
}

function drawBanner(title, subtitle, color) {
  ctx.fillStyle = "rgba(5, 6, 11, 0.78)";
  ctx.fillRect(50, H / 2 - 48, W - 100, 96);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(50, H / 2 - 48, W - 100, 96);

  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.font = "bold 28px 'Courier New', monospace";
  ctx.fillText(title, W / 2, H / 2 - 6);

  ctx.fillStyle = "#eaeaea";
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillText(subtitle, W / 2, H / 2 + 24);
}

function drawTitleScreen() {
  ctx.textAlign = "center";

  // Decorative girder
  ctx.strokeStyle = "#e63946";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(40, 195);
  ctx.lineTo(W - 40, 195);
  ctx.stroke();

  ctx.fillStyle = "#ff2e63";
  ctx.font = "bold 44px 'Courier New', monospace";
  ctx.fillText("BARREL", W / 2, 120);
  ctx.fillStyle = "#ffd369";
  ctx.fillText("KONG", W / 2, 168);

  ctx.fillStyle = "#08d9d6";
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.fillText(`HIGH SCORE: ${String(game.highScore).padStart(6, "0")}`, W / 2, 236);

  // Blinking start prompt
  if (Math.floor(performance.now() / 450) % 2 === 0) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.fillText("PRESS SPACE OR ENTER", W / 2, 310);
  }

  ctx.fillStyle = "#8a94b8";
  ctx.font = "13px 'Courier New', monospace";
  ctx.fillText("STAGE 1: 25m BARREL RAMPAGE", W / 2, 375);
  ctx.fillText("STAGE 2: 50m RIVET STEELWORKS", W / 2, 398);

  ctx.fillStyle = "#ffd369";
  ctx.font = "12px 'Courier New', monospace";
  ctx.fillText("♪ 100% Web Audio Chiptune BGM & SFX ♪", W / 2, 455);
}

// --- Main Loop ---

let lastTime = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  draw();

  // Clear single-frame key presses
  for (const k in justPressed) {
    delete justPressed[k];
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
