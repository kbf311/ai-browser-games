// game.js - STAR KITSUNE (スターキツネ) メインゲームエンジン

class StarKitsuneGame {
  constructor() {
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('game-canvas');
    this.hud = document.getElementById('hud');
    this.startScreen = document.getElementById('start-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    
    // UI Elements
    this.shieldBar = document.getElementById('shield-bar');
    this.shieldText = document.getElementById('shield-text');
    this.boostBar = document.getElementById('boost-bar');
    this.scoreDisplay = document.getElementById('score-display');
    this.distDisplay = document.getElementById('dist-display');
    this.crosshair = document.getElementById('crosshair');
    this.radioBox = document.getElementById('radio-box');
    this.radioMsg = document.getElementById('radio-message');

    // Game State
    this.isRunning = false;
    this.score = 0;
    this.distance = 0;
    this.kills = 0;
    this.shield = 100;
    this.boost = 100;
    this.isBoosting = false;

    // Movement & Ship State
    this.shipSpeed = 90; // Base forward speed
    this.currentSpeed = 90;
    this.shipPos = { x: 0, y: 0 };
    this.targetPos = { x: 0, y: 0 };
    this.rollAngle = 0;
    this.isRolling = false;
    this.rollDirection = 0;
    this.rollProgress = 0;
    this.invulnerableTimer = 0;

    // Bounds in 3D unit space for player ship
    this.bounds = {
      minX: -26,
      maxX: 26,
      minY: -14,
      maxY: 16
    };

    // Controls
    this.keys = {};
    this.isMouseDown = false;
    this.fireCooldown = 0;
    this.fireInterval = 0.14;
    this.aimPoint = new THREE.Vector3(0, 0, -100);
    
    // Game Objects Collections
    this.lasers = [];
    this.obstacles = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.rings = [];
    this.particles = [];

    // Spawning timers
    this.obstacleTimer = 0;
    this.enemyTimer = 0;
    this.ringTimer = 0;
    this.radioHideTimer = null;

    this.clock = new THREE.Clock();

    this.initThree();
    this.createPlayerShip();
    this.createStarfield();
    this.createGroundGrid();
    this.setupEventListeners();

    // アニメーションループ開始
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // --- Three.js 初期化 ---
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060814, 0.0035);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.5, 800);
    this.camera.position.set(0, 4, 18);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x04060d);

    // ライティング
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    sunLight.position.set(15, 30, 20);
    this.scene.add(sunLight);

    const blueLight = new THREE.PointLight(0x00f0ff, 1.5, 40);
    blueLight.position.set(-10, -5, 10);
    this.scene.add(blueLight);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // --- 自機「スターキツネ / アードフォックス」の3Dモデリング ---
  createPlayerShip() {
    this.shipGroup = new THREE.Group();

    // 質感用マテリアル
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true
    });
    const orangeMat = new THREE.MeshStandardMaterial({
      color: 0xff6600, // キツネオレンジ
      roughness: 0.4,
      metalness: 0.1,
      flatShading: true
    });
    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a20,
      roughness: 0.8,
      flatShading: true
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00e1ff,
      emissive: 0x004466,
      roughness: 0.1,
      metalness: 0.9,
      flatShading: true
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x5cf5bd
    });

    // 1. ノーズ・メインボディ（キツネの顔を想起させるシャープな錐体）
    const noseGeo = new THREE.ConeGeometry(0.9, 4.5, 4);
    noseGeo.rotateY(Math.PI / 4);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, orangeMat);
    nose.position.z = -1.5;
    this.shipGroup.add(nose);

    // ノーズ先端（黒鼻）
    const tipGeo = new THREE.ConeGeometry(0.35, 1.0, 4);
    tipGeo.rotateY(Math.PI / 4);
    tipGeo.rotateX(Math.PI / 2);
    const tip = new THREE.Mesh(tipGeo, blackMat);
    tip.position.z = -3.5;
    this.shipGroup.add(tip);

    // 2. コックピット・キャノピー
    const canopyGeo = new THREE.BoxGeometry(0.8, 0.6, 2.0);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.55, -0.6);
    canopy.rotation.x = -Math.PI / 16;
    this.shipGroup.add(canopy);

    // 3. 後部胴体（ホワイト＆オレンジ）
    const rearGeo = new THREE.BoxGeometry(1.6, 0.9, 2.6);
    const rear = new THREE.Mesh(rearGeo, whiteMat);
    rear.position.set(0, 0, 1.2);
    this.shipGroup.add(rear);

    // 4. キツネの耳風 カナードフィン (スラントした三角翼)
    const earGeo = new THREE.ConeGeometry(0.3, 1.8, 3);
    earGeo.rotateZ(Math.PI);
    // 左耳
    const leftEar = new THREE.Mesh(earGeo, orangeMat);
    leftEar.position.set(-0.7, 0.9, 0.5);
    leftEar.rotation.set(-0.3, 0, -0.45);
    this.shipGroup.add(leftEar);
    // 右耳
    const rightEar = new THREE.Mesh(earGeo, orangeMat);
    rightEar.position.set(0.7, 0.9, 0.5);
    rightEar.rotation.set(-0.3, 0, 0.45);
    this.shipGroup.add(rightEar);

    // 5. 主翼 (前進翼 デルタウィング)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(4.5, -1.8);
    wingShape.lineTo(4.2, -0.6);
    wingShape.lineTo(0, 1.5);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.12, bevelEnabled: false };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.center();

    // 左翼
    const leftWing = new THREE.Mesh(wingGeo, whiteMat);
    leftWing.position.set(-2.8, 0, 0.6);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.rotation.z = Math.PI;
    this.shipGroup.add(leftWing);

    // 右翼
    const rightWing = new THREE.Mesh(wingGeo, whiteMat);
    rightWing.position.set(2.8, 0, 0.6);
    rightWing.rotation.x = Math.PI / 2;
    this.shipGroup.add(rightWing);

    // 翼端のG-ディフューザーポッド（青く光る反重力装置）
    const podGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.2, 5);
    podGeo.rotateX(Math.PI / 2);
    const leftPod = new THREE.Mesh(podGeo, blackMat);
    leftPod.position.set(-4.6, 0, 0.3);
    this.shipGroup.add(leftPod);

    const rightPod = new THREE.Mesh(podGeo, blackMat);
    rightPod.position.set(4.6, 0, 0.3);
    this.shipGroup.add(rightPod);

    // 砲門（レーザー銃身）
    const gunGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 4);
    gunGeo.rotateX(Math.PI / 2);
    const leftGun = new THREE.Mesh(gunGeo, glowMat);
    leftGun.position.set(-4.6, 0, -0.8);
    this.shipGroup.add(leftGun);

    const rightGun = new THREE.Mesh(gunGeo, glowMat);
    rightGun.position.set(4.6, 0, -0.8);
    this.shipGroup.add(rightGun);

    // 6. バーニア・ツインエンジン
    const thrusterGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 6);
    thrusterGeo.rotateX(Math.PI / 2);
    const leftThruster = new THREE.Mesh(thrusterGeo, blackMat);
    leftThruster.position.set(-0.6, 0, 2.6);
    this.shipGroup.add(leftThruster);

    const rightThruster = new THREE.Mesh(thrusterGeo, blackMat);
    rightThruster.position.set(0.6, 0, 2.6);
    this.shipGroup.add(rightThruster);

    // ジェット噴射光
    const flameGeo = new THREE.ConeGeometry(0.3, 1.8, 6);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });

    this.leftFlame = new THREE.Mesh(flameGeo, flameMat);
    this.leftFlame.position.set(-0.6, 0, 3.4);
    this.shipGroup.add(this.leftFlame);

    this.rightFlame = new THREE.Mesh(flameGeo, flameMat);
    this.rightFlame.position.set(0.6, 0, 3.4);
    this.shipGroup.add(this.rightFlame);

    // バレルロール用シールド球（普段は非表示）
    const shieldGeo = new THREE.SphereGeometry(3.5, 16, 12);
    this.shieldMeshMat = new THREE.MeshBasicMaterial({
      color: 0x5cf5bd,
      wireframe: true,
      transparent: true,
      opacity: 0
    });
    this.barrelShieldMesh = new THREE.Mesh(shieldGeo, this.shieldMeshMat);
    this.shipGroup.add(this.barrelShieldMesh);

    this.shipGroup.position.set(0, 0, 0);
    this.scene.add(this.shipGroup);
  }

  // --- 背景：星空パーティクル（スターフィールド） ---
  createStarfield() {
    const starCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 120 + 10;
      positions[i * 3 + 2] = -Math.random() * 450;

      // 白〜シアン〜薄黄色
      const rnd = Math.random();
      if (rnd > 0.7) {
        colors[i * 3] = 0.4; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0;
      } else if (rnd > 0.4) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.5;
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  // --- 地平線ワイヤーフレームグリッド（コーネリア平原風） ---
  createGroundGrid() {
    this.gridHelper = new THREE.GridHelper(600, 60, 0x00f0ff, 0x113355);
    this.gridHelper.position.y = -18;
    this.scene.add(this.gridHelper);
  }

  // --- イベントリスナー設定 ---
  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
      }
      this.keys[e.code] = true;

      // Qで左ロール、Eで右ロール（初回押下のみ）
      if (!e.repeat) {
        if (e.code === 'KeyQ') {
          this.startBarrelRoll(-1);
        } else if (e.code === 'KeyE') {
          this.startBarrelRoll(1);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.isMouseDown = false;
    });

    // マウスクリック押下中はゲームループ側で連射
    window.addEventListener('mousedown', (e) => {
      if (this.isRunning && e.button === 0) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    // ボタン設定
    document.getElementById('start-btn').addEventListener('click', () => {
      window.soundSystem.init();
      window.soundSystem.startBGM();
      this.startGame();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      window.soundSystem.init();
      window.soundSystem.startBGM();
      this.restartGame();
    });

    // タッチデバイス・マウスポインタードラッグ対応
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTapTime = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.isRunning) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      // ダブルタップでバレルロール
      const now = Date.now();
      if (now - lastTapTime < 300) {
        this.startBarrelRoll(1);
      } else {
        // 単発タップでショット
        this.fireLaser();
      }
      lastTapTime = now;
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.isRunning) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      this.targetPos.x += dx * 0.08;
      this.targetPos.y -= dy * 0.08;
      this.targetPos.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.targetPos.x));
      this.targetPos.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.targetPos.y));
      e.preventDefault();
    }, { passive: false });
  }

  // --- ゲーム開始 ---
  startGame() {
    this.startScreen.classList.add('screen-hidden');
    this.gameoverScreen.classList.add('screen-hidden');
    this.hud.classList.remove('hud-hidden');
    this.isRunning = true;
    this.isMouseDown = false;
    this.fireCooldown = 0;
    this.score = 0;
    this.distance = 0;
    this.kills = 0;
    this.shield = 100;
    this.boost = 100;
    this.updateHUD();

    this.showRadioMessage("KITSUNE、出撃！コーネリア上空の敵を一掃せよ！Good Luck!");
  }

  restartGame() {
    // オブジェクトの破棄
    this.clearAllObjects();
    this.shipPos = { x: 0, y: 0 };
    this.targetPos = { x: 0, y: 0 };
    this.shipGroup.position.set(0, 0, 0);
    this.shipGroup.rotation.set(0, 0, 0);
    this.rollAngle = 0;
    this.isRolling = false;
    this.startGame();
  }

  clearAllObjects() {
    [...this.lasers, ...this.obstacles, ...this.enemies, ...this.enemyBullets, ...this.rings, ...this.particles].forEach(obj => {
      if (obj.mesh) this.scene.remove(obj.mesh);
    });
    this.lasers = [];
    this.obstacles = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.rings = [];
    this.particles = [];
  }

  // --- レーザー発射 ---
  fireLaser() {
    if (!this.isRunning) return;

    window.soundSystem.playLaser();

    // 左右の翼から照準点 (aimPoint) に向かって2本のレーザーを発射
    const target = this.aimPoint.clone();
    const leftOrigin = new THREE.Vector3(
      this.shipGroup.position.x - 4.6,
      this.shipGroup.position.y,
      this.shipGroup.position.z - 1.5
    );
    const rightOrigin = new THREE.Vector3(
      this.shipGroup.position.x + 4.6,
      this.shipGroup.position.y,
      this.shipGroup.position.z - 1.5
    );

    const laserGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.5, 4);
    laserGeo.rotateX(Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x5cf5bd });
    const speed = 280;

    [leftOrigin, rightOrigin].forEach(origin => {
      const mesh = new THREE.Mesh(laserGeo, laserMat);
      mesh.position.copy(origin);
      const dir = new THREE.Vector3().subVectors(target, origin).normalize();
      mesh.lookAt(target);
      this.scene.add(mesh);
      this.lasers.push({
        mesh: mesh,
        vel: dir.multiplyScalar(speed)
      });
    });
  }

  // --- バレルロール (Do a barrel roll!) ---
  startBarrelRoll(direction) {
    if (this.isRolling || !this.isRunning) return;
    this.isRolling = true;
    this.rollDirection = direction;
    this.rollProgress = 0;
    this.invulnerableTimer = 0.55; // 0.55秒間完全無敵

    window.soundSystem.playBarrelRoll();
    this.shieldMeshMat.opacity = 0.7;

    // 通信演出
    if (Math.random() < 0.3) {
      this.showRadioMessage("ローリング！敵の攻撃を弾き飛ばせ！");
    }
  }

  // --- HUD 通信メッセージ ---
  showRadioMessage(text) {
    this.radioMsg.textContent = text;
    this.radioBox.classList.remove('radio-box-hidden');
    window.soundSystem.playRadioBlip();

    if (this.radioHideTimer) clearTimeout(this.radioHideTimer);
    this.radioHideTimer = setTimeout(() => {
      this.radioBox.classList.add('radio-box-hidden');
    }, 3800);
  }

  // --- オブジェクト生成 ---
  spawnObstacle() {
    // 隕石または幾何学ブロック
    const isAsteroid = Math.random() > 0.3;
    let mesh;

    if (isAsteroid) {
      const radius = 2.2 + Math.random() * 2.5;
      const geo = new THREE.DodecahedronGeometry(radius, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x8a7a72,
        roughness: 0.9,
        flatShading: true
      });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      // 巨大サイバーピラー
      const height = 18 + Math.random() * 12;
      const geo = new THREE.BoxGeometry(3.5, height, 3.5);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x224466,
        roughness: 0.3,
        metalness: 0.5,
        flatShading: true
      });
      mesh = new THREE.Mesh(geo, mat);
    }

    const spawnX = (Math.random() - 0.5) * 54;
    const spawnY = (Math.random() - 0.5) * 26 + 1;
    const spawnZ = -300;

    mesh.position.set(spawnX, spawnY, spawnZ);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

    this.scene.add(mesh);
    this.obstacles.push({
      mesh: mesh,
      radius: 3.2,
      hp: 2,
      rotSpeed: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2
      }
    });
  }

  spawnEnemy() {
    // スターフォックス風の敵機（インベーダードローン）
    const enemyGroup = new THREE.Group();

    const bodyGeo = new THREE.ConeGeometry(1.2, 3.2, 4);
    bodyGeo.rotateX(-Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcc2233, // 敵赤
      roughness: 0.4,
      flatShading: true
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    enemyGroup.add(body);

    const wingGeo = new THREE.BoxGeometry(4.0, 0.15, 1.2);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x442222, flatShading: true });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    enemyGroup.add(wing);

    const spawnX = (Math.random() - 0.5) * 44;
    const spawnY = (Math.random() - 0.5) * 22 + 2;
    const spawnZ = -320;

    enemyGroup.position.set(spawnX, spawnY, spawnZ);
    this.scene.add(enemyGroup);

    this.enemies.push({
      mesh: enemyGroup,
      radius: 2.2,
      hp: 1,
      speed: 130,
      shootCooldown: 1.0 + Math.random() * 1.5,
      sinOffset: Math.random() * Math.PI * 2
    });
  }

  spawnRing() {
    // サプライリング（緑のトーラス）
    const ringGeo = new THREE.TorusGeometry(3.2, 0.35, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      wireframe: true
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);

    const spawnX = (Math.random() - 0.5) * 36;
    const spawnY = (Math.random() - 0.5) * 20 + 1;
    const spawnZ = -300;

    mesh.position.set(spawnX, spawnY, spawnZ);
    this.scene.add(mesh);

    this.rings.push({
      mesh: mesh,
      radius: 3.2
    });
  }

  // --- 敵の弾丸発射 ---
  enemyShoot(enemy) {
    const geo = new THREE.SphereGeometry(0.4, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const bullet = new THREE.Mesh(geo, mat);

    bullet.position.copy(enemy.mesh.position);
    this.scene.add(bullet);

    // 自機への進行ベクトル
    const dir = new THREE.Vector3().subVectors(this.shipGroup.position, enemy.mesh.position).normalize();

    this.enemyBullets.push({
      mesh: bullet,
      dir: dir,
      speed: 140
    });
  }

  // --- 爆破パーティクル生成 ---
  createExplosion(pos, color = 0xff6600, count = 20) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const mat = new THREE.MeshBasicMaterial({ color: color });
      const p = new THREE.Mesh(geo, mat);

      p.position.copy(pos);
      this.scene.add(p);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25
      );

      this.particles.push({
        mesh: p,
        vel: vel,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0
      });
    }
  }

  // --- ゲームオーバー ---
  gameOver() {
    this.isRunning = false;
    window.soundSystem.stopBGM();
    window.soundSystem.playExplosion(true);
    this.createExplosion(this.shipGroup.position, 0xff2200, 50);

    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-dist').textContent = `${Math.floor(this.distance)}m`;
    document.getElementById('final-kills').textContent = this.kills;

    setTimeout(() => {
      this.hud.classList.add('hud-hidden');
      this.gameoverScreen.classList.remove('screen-hidden');
    }, 1200);
  }

  // --- 被弾処理 ---
  takeDamage(amount) {
    if (this.invulnerableTimer > 0) return; // 無敵中

    this.shield -= amount;
    window.soundSystem.playHit();

    if (this.shield <= 0) {
      this.shield = 0;
      this.updateHUD();
      this.gameOver();
      return;
    }

    if (this.shield <= 30) {
      this.showRadioMessage("警報！シールド残量危険！リングを通過して修復せよ！");
    }

    this.updateHUD();
  }

  updateHUD() {
    this.shieldBar.style.width = `${this.shield}%`;
    this.shieldText.textContent = `${Math.round(this.shield)}%`;
    if (this.shield < 30) {
      this.shieldBar.classList.add('danger');
    } else {
      this.shieldBar.classList.remove('danger');
    }

    this.boostBar.style.width = `${this.boost}%`;
    this.scoreDisplay.textContent = this.score.toString().padStart(6, '0');
    this.distDisplay.textContent = `${Math.floor(this.distance)}m`;
  }

  // --- メイン更新ループ ---
  update(delta) {
    if (!this.isRunning) return;

    // スピード・ブースト処理
    if ((this.keys['KeyB'] || this.keys['KeyW']) && this.boost > 5) {
      this.isBoosting = true;
      this.currentSpeed = this.shipSpeed * 1.6;
      this.boost = Math.max(0, this.boost - delta * 30);
      this.leftFlame.scale.set(1.4, 2.0, 1.4);
      this.rightFlame.scale.set(1.4, 2.0, 1.4);
    } else {
      this.isBoosting = false;
      this.currentSpeed = this.shipSpeed;
      this.boost = Math.min(100, this.boost + delta * 15);
      this.leftFlame.scale.set(1, 1, 1);
      this.rightFlame.scale.set(1, 1, 1);
    }

    // 飛行距離加算
    this.distance += this.currentSpeed * delta;
    this.score += Math.floor(delta * 10);
    this.updateHUD();

    // 自機移動（WASD / 矢印キー）
    const moveSpeed = 38 * delta;
    let moveX = 0;
    let moveY = 0;

    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY -= 1;

    this.targetPos.x += moveX * moveSpeed * 1.3;
    this.targetPos.y += moveY * moveSpeed * 1.1;

    // 移動範囲制限
    this.targetPos.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.targetPos.x));
    this.targetPos.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.targetPos.y));

    // スムーズな補間移動 (Lerp)
    this.shipPos.x += (this.targetPos.x - this.shipPos.x) * 12 * delta;
    this.shipPos.y += (this.targetPos.y - this.shipPos.y) * 12 * delta;
    this.shipGroup.position.x = this.shipPos.x;
    this.shipGroup.position.y = this.shipPos.y;

    // バレルロール処理
    if (this.isRolling) {
      this.rollProgress += delta * 6.5; // 回転速度
      this.rollAngle = this.rollDirection * this.rollProgress * Math.PI * 2;
      this.shipGroup.rotation.z = this.rollAngle;

      if (this.rollProgress >= 1.0) {
        this.isRolling = false;
        this.rollAngle = 0;
        this.shipGroup.rotation.z = 0;
        this.shieldMeshMat.opacity = 0;
      }
    } else {
      // 通常時のバンク傾き（曲がると傾く）
      const targetRoll = -moveX * 0.65;
      const targetPitch = moveY * 0.35;
      this.shipGroup.rotation.z += (targetRoll - this.shipGroup.rotation.z) * 10 * delta;
      this.shipGroup.rotation.x += (targetPitch - this.shipGroup.rotation.x) * 10 * delta;
      this.shipGroup.rotation.y = -moveX * 0.2;
    }

    // 無敵タイマー更新
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      if (this.invulnerableTimer <= 0) {
        this.shieldMeshMat.opacity = 0;
      }
    }

    // カメラの追従（わずかに遅れて追従するレールシューター感）
    this.camera.position.x += (this.shipPos.x * 0.6 - this.camera.position.x) * 6 * delta;
    this.camera.position.y += ((this.shipPos.y * 0.6 + 4.0) - this.camera.position.y) * 6 * delta;
    this.camera.updateMatrixWorld();

    // 3D空間上の照準点を更新し、正確なスクリーン座標にレティクルを配置
    this.aimPoint.set(this.shipPos.x, this.shipPos.y, -100);
    const projectedAim = this.aimPoint.clone().project(this.camera);
    const crosshairX = (projectedAim.x * 0.5 + 0.5) * window.innerWidth;
    const crosshairY = (-projectedAim.y * 0.5 + 0.5) * window.innerHeight;
    this.crosshair.style.left = `${crosshairX}px`;
    this.crosshair.style.top = `${crosshairY}px`;
    this.crosshair.style.transform = 'translate(-50%, -50%)';

    // レーザー発射（ゲームループ側でクールダウン管理し、OSのキーリピートに依存しない）
    if (this.fireCooldown > 0) {
      this.fireCooldown -= delta;
    }
    if ((this.keys['Space'] || this.isMouseDown) && this.fireCooldown <= 0) {
      this.fireLaser();
      this.fireCooldown = this.fireInterval;
    }

    // 背景星空の移動（奥から手前へ）
    const starSpeed = this.currentSpeed * 2.2 * delta;
    const posAttr = this.starfield.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      let z = posAttr.getZ(i) + starSpeed;
      if (z > 20) {
        z = -450;
        posAttr.setX(i, (Math.random() - 0.5) * 200);
        posAttr.setY(i, (Math.random() - 0.5) * 120 + 10);
      }
      posAttr.setZ(i, z);
    }
    posAttr.needsUpdate = true;

    // 地面グリッドの流れるアニメーション
    this.gridHelper.position.z += this.currentSpeed * delta;
    if (this.gridHelper.position.z > 20) {
      this.gridHelper.position.z -= 40;
    }

    // --- レーザーの更新 ---
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.mesh.position.addScaledVector(laser.vel, delta);

      // 遠方到達で消去
      if (laser.mesh.position.z < -350) {
        this.scene.remove(laser.mesh);
        this.lasers.splice(i, 1);
        continue;
      }

      // 敵・障害物との当たり判定
      let hit = false;

      // 1. 障害物とのヒット
      for (let j = this.obstacles.length - 1; j >= 0; j--) {
        const obs = this.obstacles[j];
        if (laser.mesh.position.distanceTo(obs.mesh.position) < obs.radius + 1.2) {
          obs.hp--;
          this.createExplosion(laser.mesh.position, 0x00f0ff, 8);
          this.scene.remove(laser.mesh);
          this.lasers.splice(i, 1);
          hit = true;

          if (obs.hp <= 0) {
            window.soundSystem.playExplosion(false);
            this.createExplosion(obs.mesh.position, 0xaaaaaa, 20);
            this.scene.remove(obs.mesh);
            this.obstacles.splice(j, 1);
            this.score += 50;
          }
          break;
        }
      }

      if (hit) continue;

      // 2. 敵機とのヒット
      for (let k = this.enemies.length - 1; k >= 0; k--) {
        const enemy = this.enemies[k];
        if (laser.mesh.position.distanceTo(enemy.mesh.position) < enemy.radius + 1.2) {
          window.soundSystem.playExplosion(false);
          this.createExplosion(enemy.mesh.position, 0xff0055, 25);
          this.scene.remove(laser.mesh);
          this.lasers.splice(i, 1);
          this.scene.remove(enemy.mesh);
          this.enemies.splice(k, 1);
          this.kills++;
          this.score += 150;

          if (this.kills % 5 === 0) {
            this.showRadioMessage(`ナイスシュート！撃破数 ${this.kills}機！`);
          }
          break;
        }
      }
    }

    // --- 障害物の更新 ---
    this.obstacleTimer += delta;
    if (this.obstacleTimer > 0.85) {
      this.obstacleTimer = 0;
      this.spawnObstacle();
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.mesh.position.z += this.currentSpeed * delta;
      obs.mesh.rotation.x += obs.rotSpeed.x * delta;
      obs.mesh.rotation.y += obs.rotSpeed.y * delta;

      // 自機との衝突判定
      const dist = obs.mesh.position.distanceTo(this.shipGroup.position);
      if (dist < obs.radius + 1.5) {
        if (this.invulnerableTimer > 0) {
          // バレルロール中は弾き飛ばして粉砕！
          window.soundSystem.playExplosion(false);
          this.createExplosion(obs.mesh.position, 0x5cf5bd, 20);
          this.scene.remove(obs.mesh);
          this.obstacles.splice(i, 1);
          this.score += 100;
          continue;
        } else {
          this.createExplosion(obs.mesh.position, 0xff4400, 20);
          this.scene.remove(obs.mesh);
          this.obstacles.splice(i, 1);
          this.takeDamage(25);
          continue;
        }
      }

      // 通過消去
      if (obs.mesh.position.z > 25) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }

    // --- 敵ドローンの更新 ---
    this.enemyTimer += delta;
    if (this.enemyTimer > 2.2) {
      this.enemyTimer = 0;
      this.spawnEnemy();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.mesh.position.z += (this.currentSpeed + enemy.speed * 0.3) * delta;
      // サイン波で左右に揺動
      enemy.mesh.position.x += Math.sin(enemy.sinOffset + Date.now() * 0.003) * 15 * delta;

      // 射撃クールダウン
      enemy.shootCooldown -= delta;
      if (enemy.shootCooldown <= 0 && enemy.mesh.position.z < -50 && enemy.mesh.position.z > -220) {
        enemy.shootCooldown = 2.0 + Math.random();
        this.enemyShoot(enemy);
      }

      // 自機との衝突判定
      if (enemy.mesh.position.distanceTo(this.shipGroup.position) < enemy.radius + 1.5) {
        this.createExplosion(enemy.mesh.position, 0xff0055, 20);
        this.scene.remove(enemy.mesh);
        this.enemies.splice(i, 1);
        this.takeDamage(20);
        continue;
      }

      if (enemy.mesh.position.z > 25) {
        this.scene.remove(enemy.mesh);
        this.enemies.splice(i, 1);
      }
    }

    // --- 敵弾の更新 ---
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.mesh.position.addScaledVector(b.dir, b.speed * delta);
      b.mesh.position.z += this.currentSpeed * delta;

      // 自機との衝突
      if (b.mesh.position.distanceTo(this.shipGroup.position) < 2.0) {
        if (this.invulnerableTimer > 0) {
          // バレルロールで反射！
          this.createExplosion(b.mesh.position, 0x5cf5bd, 10);
        } else {
          this.takeDamage(15);
        }
        this.scene.remove(b.mesh);
        this.enemyBullets.splice(i, 1);
        continue;
      }

      if (b.mesh.position.z > 30 || b.mesh.position.z < -400) {
        this.scene.remove(b.mesh);
        this.enemyBullets.splice(i, 1);
      }
    }

    // --- サプライリングの更新 ---
    this.ringTimer += delta;
    if (this.ringTimer > 4.5) {
      this.ringTimer = 0;
      this.spawnRing();
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.mesh.position.z += this.currentSpeed * delta;
      ring.mesh.rotation.z += 2.0 * delta;

      // くぐり抜け判定
      const dist = ring.mesh.position.distanceTo(this.shipGroup.position);
      if (dist < ring.radius + 0.8 && Math.abs(ring.mesh.position.z - this.shipGroup.position.z) < 2.5) {
        window.soundSystem.playRingCollect();
        this.shield = Math.min(100, this.shield + 30);
        this.score += 200;
        this.updateHUD();
        this.showRadioMessage("サプライリング通過！シールド回復完了！");
        this.createExplosion(ring.mesh.position, 0x00ff88, 25);
        this.scene.remove(ring.mesh);
        this.rings.splice(i, 1);
        continue;
      }

      if (ring.mesh.position.z > 25) {
        this.scene.remove(ring.mesh);
        this.rings.splice(i, 1);
      }
    }

    // --- パーティクルの更新 ---
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.vel, delta);
      p.life -= delta;
      const scale = Math.max(0.01, p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  // --- 描画ループ ---
  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

// ページ読み込み完了で起動
window.addEventListener('DOMContentLoaded', () => {
  window.starKitsune = new StarKitsuneGame();
});
