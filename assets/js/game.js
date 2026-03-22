
// ─── CANVAS SETUP ────────────────────────────────────────────────────────────
const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');
const W = 390, H = 700;

// ─── GAME STATE ──────────────────────────────────────────────────────────────
let state = 'idle'; // idle | running | over
let score = 0, coins = 0, combo = 0, lives = 3;
let frameId;

// ─── ASSETS (drawn procedurally to match the uploaded sprites) ───────────────
// Since we can't load the actual files in this sandbox, we recreate them
// with canvas drawing matching the exact style of the generated images.

function drawGlowCircle(ctx, x, y, r, color, rings = 4) {
  // Outer glow
  let grad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.6);
  grad.addColorStop(0, color + 'aa');
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.fill();

  // Rings
  for (let i = rings; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(x, y, r * (i / rings), 0, Math.PI * 2);
    ctx.strokeStyle = color + (i === rings ? 'ff' : '66');
    ctx.lineWidth = i === rings ? 2.5 : 1;
    ctx.stroke();
  }

  // Arc segments (matching the uploaded style)
  for (let a = 0; a < 4; a++) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, a * Math.PI / 2 + 0.2, a * Math.PI / 2 + Math.PI / 2 - 0.2);
    ctx.strokeStyle = color + 'cc';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Center core
  let coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.22);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.4, color);
  coreGrad.addColorStop(1, color + '44');
  ctx.fillStyle = coreGrad;
  ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, Math.PI * 2); ctx.fill();
}

function drawGlowBlock(ctx, x, y, size, color, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const s = size / 2;

  // Outer glow
  let grad = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 1.8);
  grad.addColorStop(0, color + '55');
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.rect(-s * 1.4, -s * 1.4, s * 2.8, s * 2.8); ctx.fill();

  // Border glow box
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeRect(-s, -s, size, size);
  ctx.shadowBlur = 0;

  // Inner rings (circles inside square - matching the style)
  for (let i = 3; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(0, 0, s * (i / 3) * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = color + (i === 3 ? 'aa' : '55');
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Arc segments
  for (let a = 0; a < 4; a++) {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, a * Math.PI / 2 + 0.25, a * Math.PI / 2 + Math.PI / 2 - 0.25);
    ctx.strokeStyle = color + 'cc';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Center
  let cGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.18);
  cGrad.addColorStop(0, '#fff');
  cGrad.addColorStop(1, color);
  ctx.fillStyle = cGrad;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ─── BACKGROUND ──────────────────────────────────────────────────────────────
let bgOffset = 0;
const GRID_SIZE = 80;

function drawBackground() {
  // Dark base
  ctx.fillStyle = '#07090F';
  ctx.fillRect(0, 0, W, H);

  // Sci-fi grid (matching uploaded background)
  ctx.strokeStyle = '#00D9FF22';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= W; x += GRID_SIZE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  // Horizontal lines (scrolling)
  const offset = bgOffset % GRID_SIZE;
  for (let y = -GRID_SIZE + offset; y <= H; y += GRID_SIZE) {
    ctx.strokeStyle = '#00D9FF33';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Neon lane dividers
  ctx.strokeStyle = '#00D9FF18';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 16]);
  ctx.beginPath(); ctx.moveTo(W/3, 0); ctx.lineTo(W/3, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W*2/3, 0); ctx.lineTo(W*2/3, H); ctx.stroke();
  ctx.setLineDash([]);

  // Subtle circuit details at intersections
  for (let x = 0; x <= W; x += GRID_SIZE) {
    for (let y = -GRID_SIZE + offset; y <= H; y += GRID_SIZE) {
      ctx.fillStyle = '#00D9FF44';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
}

// ─── LANES ───────────────────────────────────────────────────────────────────
const LANES = [W/6, W/2, W*5/6];  // 3 lane X positions

// ─── PLAYER ──────────────────────────────────────────────────────────────────
const player = {
  lane: 1,
  x: LANES[1],
  targetX: LANES[1],
  y: H - 100,
  r: 30,
  rotation: 0,
  alive: true,
};

function updatePlayer(dt) {
  player.x += (player.targetX - player.x) * Math.min(dt * 22, 1);
  player.rotation += dt * 1.5;
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.rotation);
  drawGlowCircle(ctx, 0, 0, player.r, '#00D9FF');
  ctx.restore();
}

// ─── OBSTACLES ───────────────────────────────────────────────────────────────
const OBSTACLE_TYPES = [
  { color: '#00C896', hp: 1, value: 10,  coins: 1,  size: 52, speed: 1.0, bonus: false },
  { color: '#F59E0B', hp: 3, value: 25,  coins: 3,  size: 58, speed: 1.1, bonus: false },
  { color: '#FF3B5C', hp: 5, value: 50,  coins: 5,  size: 64, speed: 1.3, bonus: false },
  { color: '#FFD700', hp: 1, value: 100, coins: 20, size: 52, speed: 0.9, bonus: true  },
];

function drawCoin(x, y, size, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const r = size * 0.46;

  // Outer gold glow
  let glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.8);
  glow.addColorStop(0, '#FFD70066');
  glow.addColorStop(1, '#FFD70000');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2); ctx.fill();

  // Gold ring outer
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Gold ring inner
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFA500bb';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cyan inner glow fill
  let inner = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.55);
  inner.addColorStop(0, '#00D9FFcc');
  inner.addColorStop(1, '#00D9FF22');
  ctx.fillStyle = inner;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();

  // Diamond shape inside (like the uploaded coin)
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.38);
  ctx.lineTo(r * 0.28, 0);
  ctx.lineTo(0, r * 0.38);
  ctx.lineTo(-r * 0.28, 0);
  ctx.closePath();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#FFD70033';
  ctx.fill();

  // BONUS text
  ctx.font = `bold ${size * 0.16}px 'Orbitron', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 6;
  ctx.fillText('BONUS', 0, r * 0.62);
  ctx.shadowBlur = 0;

  ctx.restore();
}

let obstacles = [];
let spawnTimer = 0;
let spawnInterval = 130; // frames
let difficulty = 1;
let obstaclesKilled = 0;
let worldSpeed = 2.2;

function spawnObstacle() {
  const r = Math.random();
  let typeIdx = 0;

  // 15% chance de moneda bonus en cualquier momento
  if (r < 0.15) {
    typeIdx = 3; // BONUS coin
  } else if (difficulty >= 3 && r < 0.38) {
    typeIdx = 2;
  } else if (difficulty >= 2 && r < 0.55) {
    typeIdx = 1;
  }

  const t = OBSTACLE_TYPES[typeIdx];
  const lane = Math.floor(Math.random() * 3);

  obstacles.push({
    x: LANES[lane],
    y: -60,
    hp: t.hp,
    maxHp: t.hp,
    value: t.value,
    coins: t.coins,
    color: t.color,
    size: t.size,
    speed: t.speed,
    rotation: 0,
    shakeX: 0,
    shakeTimer: 0,
    lateral: typeIdx === 2,
    lateralT: Math.random() * Math.PI * 2,
    bonus: t.bonus,
    dead: false,
    scale: 1,
    dyingTimer: 0,
  });
}

function updateObstacles(dt) {
  spawnTimer++;
  if (spawnTimer >= spawnInterval) {
    spawnObstacle();
    spawnTimer = 0;
  }

  obstacles.forEach(obs => {
    if (obs.dead) {
      obs.dyingTimer += dt * 6;
      obs.scale = Math.max(0, 1 - obs.dyingTimer);
      return;
    }

    obs.y += worldSpeed * obs.speed;
    obs.rotation += dt * 0.5;

    // Imán: atrae monedas bonus hacia el jugador
    if (obs.bonus && hasMagnet()) {
      const mdx = player.x - obs.x;
      const mdy = player.y - obs.y;
      const mdist = Math.sqrt(mdx*mdx + mdy*mdy);
      if (mdist < 200) {
        obs.x += (mdx / mdist) * 3;
        obs.y += (mdy / mdist) * 3;
      }
    }

    if (obs.lateral) {
      obs.lateralT += dt * 1.2;
      obs.x = obs.x + Math.sin(obs.lateralT) * 1.2;
      obs.x = Math.max(obs.size/2 + 10, Math.min(W - obs.size/2 - 10, obs.x));
    }

    if (obs.shakeTimer > 0) {
      obs.shakeTimer -= dt;
      obs.shakeX = Math.sin(obs.shakeTimer * 40) * 6;
    } else {
      obs.shakeX = 0;
    }

    // Collision with player → pierde 1 vida
    if (!obs.dead && player.alive) {
      const dx = obs.x - player.x;
      const dy = obs.y - player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < player.r + obs.size * 0.4) {
        obs.dead = true; // destruye el bloque al chocar
        loseLife();
      }
    }
  });

  // Remove off-screen or fully dead — penalizar los que se escapan
  obstacles = obstacles.filter(o => {
    if (!o.dead && o.y > H + 40) {
      if (!o.bonus) loseLife(); // solo resta vida si NO es moneda bonus
      return false;
    }
    return o.y < H + 100 && !(o.dead && o.scale <= 0);
  });
}

function drawObstacles() {
  obstacles.forEach(obs => {
    ctx.save();
    ctx.globalAlpha = obs.dead ? obs.scale : 1;
    const s = obs.scale !== undefined ? obs.scale : 1;
    ctx.translate(obs.x + obs.shakeX, obs.y);
    ctx.scale(s, s);

    if (obs.bonus) {
      // Moneda BONUS
      drawCoin(0, 0, obs.size, obs.rotation);
    } else {
      // Bloque normal
      drawGlowBlock(ctx, 0, 0, obs.size, obs.color, obs.rotation);
      // HP label
      ctx.font = `bold ${obs.size * 0.28}px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 8;
      ctx.fillText(obs.hp, 0, 0);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  });
}

// ─── PROJECTILES ─────────────────────────────────────────────────────────────
let projectiles = [];

function fireProjectile(dx, dy) {
  const len = Math.sqrt(dx*dx + dy*dy);
  const spd = getProjectileSpeed();
  projectiles.push({
    x: player.x,
    y: player.y - player.r - 5,
    vx: (dx / len) * spd,
    vy: (dy / len) * spd,
    r: 10,
    trail: [],
    rotation: 0,
    damage: getProjectileDamage(),
  });
}

function updateProjectiles() {
  projectiles.forEach(p => {
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 10) p.trail.shift();

    p.x += p.vx;
    p.y += p.vy;
    p.rotation += 0.15;

    // Hit obstacles
    obstacles.forEach(obs => {
      if (obs.dead) return;
      const dx = p.x - obs.x;
      const dy = p.y - obs.y;
      if (Math.abs(dx) < obs.size * 0.5 && Math.abs(dy) < obs.size * 0.5) {
        obs.hp -= (p.damage || 1);
        obs.shakeTimer = 0.15;
        p.x = -999; // mark for removal

        if (obs.hp <= 0) {
          obs.dead = true;
          score += obs.value;
          coins += obs.coins;
          obstaclesKilled++;
          combo++;
          showCombo();
          updateHUD();

          // Difficulty scaling
          if (obstaclesKilled % 8 === 0) {
            difficulty = Math.min(difficulty + 1, 5);
            spawnInterval = Math.max(70, spawnInterval - 10);
            worldSpeed = Math.min(5, worldSpeed + 0.15);
          }
        } else {
          combo = 0;
        }
      }
    });
  });

  projectiles = projectiles.filter(p => p.x > -100 && p.x < W + 100 && p.y > -100 && p.y < H + 100);
}

function drawProjectiles() {
  projectiles.forEach(p => {
    // Trail
    p.trail.forEach((t, i) => {
      const alpha = (i / p.trail.length) * 0.5;
      const r = (i / p.trail.length) * 6;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 217, 255, ${alpha})`;
      ctx.fill();
    });

    // Projectile body
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    drawGlowCircle(ctx, 0, 0, p.r, '#00D9FF', 2);
    ctx.restore();
  });
}

// ─── PARTICLES ───────────────────────────────────────────────────────────────
let particles = [];

function spawnParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 2 + Math.random() * 3,
      life: 1,
      color,
    });
  }
}

function updateParticles(dt) {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= dt * 2;
  });
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });
}

// ─── INPUT STATE ─────────────────────────────────────────────────────────────
let touchStart    = null;
let isHolding     = false;
let holdPos       = null;
let holdFireTimer = 0;
let holdStartTime = 0;
const HOLD_DETECT_MS = 180; // ms before hold is treated as auto-fire, not tap

// ─── COMBO DISPLAY ───────────────────────────────────────────────────────────
let comboTimeout;
function showCombo() {
  const el = document.getElementById('combo');
  if (combo >= 2) {
    el.textContent = `COMBO x${combo}! +${combo * 5}`;
    el.style.opacity = '1';
    clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => { el.style.opacity = '0'; }, 1200);
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('scoreVal').textContent = score;
  document.getElementById('coinsNum').textContent = coins;
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────
let lastTime = 0;

function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  bgOffset += worldSpeed * 0.8;

  drawBackground();
  updateObstacles(dt);
  drawObstacles();
  updatePlayer(dt);
  drawPlayer();
  updateHoldFire(dt);
  updateProjectiles();
  drawProjectiles();
  updateParticles(dt);
  drawParticles();
  updateDrawTapRings(dt);

  frameId = requestAnimationFrame(gameLoop);
}

// ─── GAME FLOW ────────────────────────────────────────────────────────────────
function startGame() {
  score = 0; coins = 0; combo = 0;
  lives = getStartLives();
  obstacles = []; projectiles = []; particles = [];
  spawnTimer = 0; spawnInterval = 130;
  difficulty = 1; obstaclesKilled = 0;
  worldSpeed = 2.2;
  isHolding = false; holdPos = null; holdFireTimer = 0;
  player.lane = 1;
  player.x = LANES[1];
  player.targetX = LANES[1];
  player.alive = true;
  player.rotation = 0;
  updateHUD();
  updateLivesHUD();

  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('overScreen').classList.add('hidden');
  state = 'running';
  lastTime = performance.now();
  frameId = requestAnimationFrame(gameLoop);
}

function loseLife() {
  if (state !== 'running') return;
  lives--;
  combo = 0;
  updateLivesHUD();
  flashScreen();
  if (lives <= 0) {
    triggerGameOver();
  }
}

function updateLivesHUD() {
  const maxLives = getStartLives();
  const hudEl = document.getElementById('livesHud');

  // Rebuild shields dynamically based on max lives
  hudEl.innerHTML = '';
  for (let i = 1; i <= maxLives; i++) {
    const active = i <= lives;
    const div = document.createElement('div');
    div.className = 'shield' + (active ? '' : ' lost');
    div.id = 'heart' + i;
    div.innerHTML = `<svg viewBox="0 0 36 36" fill="none">
      <polygon points="18,2 34,10 34,22 18,34 2,22 2,10" stroke="#00D9FF" stroke-width="2" fill="#00D9FF11"/>
      <polygon points="18,7 29,13 29,21 18,29 7,21 7,13" stroke="#00D9FF" stroke-width="1" fill="#00D9FF08"/>
      <circle cx="18" cy="18" r="4" fill="#00D9FF" opacity="0.9"/>
      <circle cx="18" cy="18" r="6" stroke="#00D9FF" stroke-width="1" fill="none" opacity="0.5"/>
    </svg>`;
    hudEl.appendChild(div);
  }
}

function flashScreen() {
  const flash = document.getElementById('flash');
  flash.style.opacity = '0.35';
  setTimeout(() => { flash.style.opacity = '0'; }, 120);
}

function triggerGameOver() {
  if (state === 'over') return;
  state = 'over';
  player.alive = false;
  totalCoins += coins; // acumular coins ganadas esta partida
  cancelAnimationFrame(frameId);
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalCoins').textContent = coins + ' monedas (+' + coins + ')';
  document.getElementById('overScreen').classList.remove('hidden');
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
// TAP anywhere → shoot toward that point
// SWIPE left/right (horizontal drag) → change lane
const SWIPE_THRESHOLD = 35;

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const touch = e.touches ? e.touches[0] || e.changedTouches[0] : e;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top)  * scaleY,
  };
}

canvas.addEventListener('mousedown',  e => handleStart(getPos(e)));
canvas.addEventListener('mousemove',  e => { if (touchStart) handleMove(getPos(e)); });
canvas.addEventListener('mouseup',    e => handleEnd(getPos(e)));
canvas.addEventListener('touchstart', e => { e.preventDefault(); handleStart(getPos(e)); }, { passive: false });
canvas.addEventListener('touchmove',  e => { e.preventDefault(); handleMove(getPos(e)); }, { passive: false });
canvas.addEventListener('touchend',   e => { e.preventDefault(); handleEnd(getPos(e)); }, { passive: false });



function handleStart(pos) {
  if (state !== 'running') return;
  touchStart     = pos;
  holdPos        = pos;
  holdStartTime  = performance.now();
  isHolding      = true;
  holdFireTimer  = getAutoFireRate(); // first auto-shot fires after one interval
}

function handleMove(pos) {
  if (!touchStart) return;
  holdPos = pos; // keep aim updated while holding
}

function handleEnd(pos) {
  isHolding = false;
  holdPos   = null;
  if (!touchStart || state !== 'running') { touchStart = null; return; }

  const dx = pos.x - touchStart.x;
  const dy = pos.y - touchStart.y;
  const isHorizontalSwipe = Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.4;
  const wasQuickTap = (performance.now() - holdStartTime) < HOLD_DETECT_MS;

  if (isHorizontalSwipe) {
    // CAMBIO DE CARRIL
    if (dx < 0) {
      player.lane = Math.max(0, player.lane - 1);
    } else {
      player.lane = Math.min(2, player.lane + 1);
    }
    player.targetX = LANES[player.lane];
  } else if (wasQuickTap || !hasAutoFire()) {
    // DISPARO único — tap rápido, o no tiene auto-fire desbloqueado
    const fromX = player.x;
    const fromY = player.y - player.r;
    fireProjectile(pos.x - fromX, pos.y - fromY);
    spawnTapRing(pos.x, pos.y);
  }
  // Si tenía auto-fire activo y fue un hold largo → auto-fire ya disparó, nada extra

  touchStart = null;
}

// ─── AUTO-FIRE HOLD ───────────────────────────────────────────────────────────
function updateHoldFire(dt) {
  if (!isHolding || !holdPos || !hasAutoFire() || state !== 'running') return;
  holdFireTimer -= dt;
  if (holdFireTimer <= 0) {
    holdFireTimer = getAutoFireRate();
    fireProjectile(holdPos.x - player.x, holdPos.y - (player.y - player.r));
    spawnTapRing(holdPos.x, holdPos.y);
  }
}

// ─── TAP RING EFFECT ─────────────────────────────────────────────────────────
let tapRings = [];

function spawnTapRing(x, y) {
  tapRings.push({ x, y, r: 5, life: 1 });
}

function updateDrawTapRings(dt) {
  tapRings.forEach(ring => {
    ring.r  += dt * 120;
    ring.life -= dt * 4;
    if (ring.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = ring.life * 0.8;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.strokeStyle = '#00D9FF';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00D9FF';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  });
  tapRings = tapRings.filter(r => r.life > 0);
}

// ─── UPGRADES SYSTEM ─────────────────────────────────────────────────────────
const UPGRADES = {
  damage: {
    levels: [
      { desc: '1 HP por disparo',   cost: 50  },
      { desc: '2 HP por disparo',   cost: 100 },
      { desc: '3 HP por disparo',   cost: 200 },
    ],
    current: 0, max: 3,
  },
  speed: {
    levels: [
      { desc: 'Proyectil normal',   cost: 50  },
      { desc: 'Proyectil rápido',   cost: 100 },
      { desc: 'Proyectil ultra',    cost: 200 },
    ],
    current: 0, max: 3,
  },
  shield: {
    levels: [
      { desc: 'Empieza con 3 vidas', cost: 100 },
      { desc: 'Empieza con 4 vidas', cost: 200 },
    ],
    current: 0, max: 2,
  },
  magnet: {
    levels: [
      { desc: 'Sin imán',           cost: 75  },
      { desc: 'Atrae monedas bonus', cost: 150 },
    ],
    current: 0, max: 2,
  },
  autofire: {
    levels: [
      { desc: 'Mantén presionado para disparar', cost: 150 },
      { desc: 'Cadencia doble al mantener',      cost: 300 },
    ],
    current: 0, max: 2,
  },
};

// Monedas persistentes (acumuladas entre partidas)
let totalCoins = 0;

function getUpgradeValue(key) {
  return UPGRADES[key].current;
}

function getProjectileDamage() { return 1 + UPGRADES.damage.current; }
function getProjectileSpeed()  { return 3 + UPGRADES.speed.current * 4; }
function getStartLives()       { return 3 + UPGRADES.shield.current; }
function hasMagnet()           { return UPGRADES.magnet.current > 0; }
function hasAutoFire()         { return UPGRADES.autofire.current > 0; }
function getAutoFireRate()     { return UPGRADES.autofire.current >= 2 ? 0.18 : 0.35; }

function renderShop() {
  document.getElementById('shopCoins').textContent = totalCoins;

  Object.keys(UPGRADES).forEach(key => {
    const upg = UPGRADES[key];
    const isMax = upg.current >= upg.max;
    const nextCost = isMax ? 0 : upg.levels[upg.current].cost;
    const currentDesc = upg.current > 0
      ? upg.levels[upg.current - 1].desc
      : upg.levels[0].desc;

    // Desc actual
    document.getElementById('desc-' + key).textContent =
      upg.current === 0 ? upg.levels[0].desc : upg.levels[upg.current - 1].desc;

    // Cost label
    const costEl = document.getElementById('cost-' + key);
    if (costEl) costEl.textContent = isMax ? '' : nextCost + ' 🟡';

    // Button state
    const btn = document.getElementById('btn-' + key);
    if (isMax) {
      btn.textContent = 'MAX';
      btn.disabled = true;
      btn.classList.add('maxed');
    } else {
      btn.innerHTML = `<span>MEJORAR</span><span class="cost">${nextCost} 🟡</span>`;
      btn.disabled = totalCoins < nextCost;
      btn.classList.remove('maxed');
    }

    // Level dots
    const dotsEl = document.getElementById('dots-' + key);
    dotsEl.innerHTML = '';
    for (let i = 0; i < upg.max; i++) {
      const dot = document.createElement('div');
      dot.className = 'lvl-dot' + (i < upg.current ? ' active' : '');
      dotsEl.appendChild(dot);
    }
  });
}

function buyUpgrade(key) {
  const upg = UPGRADES[key];
  if (upg.current >= upg.max) return;
  const cost = upg.levels[upg.current].cost;
  if (totalCoins < cost) return;
  totalCoins -= cost;
  upg.current++;
  renderShop();
}

function openShop(returnTo) {
  document.getElementById('shopScreen').classList.remove('hidden');
  document.getElementById('shopScreen').dataset.returnTo = returnTo;
  renderShop();
}

function closeShop() {
  const returnTo = document.getElementById('shopScreen').dataset.returnTo;
  document.getElementById('shopScreen').classList.add('hidden');
  if (returnTo === 'start') {
    document.getElementById('startScreen').classList.remove('hidden');
  } else {
    document.getElementById('overScreen').classList.remove('hidden');
  }
}

// Shop buttons
document.getElementById('btnShopStart').addEventListener('click', () => {
  document.getElementById('startScreen').classList.add('hidden');
  openShop('start');
});
document.getElementById('btnShopOver').addEventListener('click', () => {
  document.getElementById('overScreen').classList.add('hidden');
  openShop('over');
});
document.getElementById('btnCloseShop').addEventListener('click', closeShop);
Object.keys(UPGRADES).forEach(key => {
  document.getElementById('btn-' + key).addEventListener('click', () => buyUpgrade(key));
});
document.getElementById('btnStart').addEventListener('click', startGame);
document.getElementById('btnRestart').addEventListener('click', startGame);

// ─── IDLE ANIMATION ──────────────────────────────────────────────────────────
function idleLoop(ts) {
  if (state !== 'idle') return;
  bgOffset += 1.5;
  drawBackground();
  // Draw player preview
  player.rotation = ts * 0.001;
  ctx.save();
  ctx.translate(W/2, H - 120);
  ctx.rotate(player.rotation);
  drawGlowCircle(ctx, 0, 0, 32, '#00D9FF');
  ctx.restore();

  // Draw some preview blocks
  const t = ts * 0.0008;
  [
    { x: LANES[0], y: 200 + Math.sin(t) * 10, color: '#00C896', hp: 1 },
    { x: LANES[1], y: 340 + Math.sin(t + 1) * 10, color: '#F59E0B', hp: 3 },
    { x: LANES[2], y: 250 + Math.sin(t + 2) * 10, color: '#FF3B5C', hp: 5 },
  ].forEach(b => {
    drawGlowBlock(ctx, b.x, b.y, 54, b.color, t * 0.3);
    ctx.font = "bold 15px 'Orbitron', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(b.hp, b.x, b.y);
  });

  requestAnimationFrame(idleLoop);
}
requestAnimationFrame(idleLoop);
