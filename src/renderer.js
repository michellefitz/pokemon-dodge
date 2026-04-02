import { W, H, COLORS, SPRITE_SCALE } from './constants.js';
import { drawSprite, HEART_SPRITE } from './sprites.js';

// ============================================================
// 1. PARALLAX STARFIELD
// ============================================================

const STAR_LAYERS = [
  { count: 40, speed: 0.1, size: 0.4, alpha: 0.15 },
  { count: 30, speed: 0.3, size: 0.7, alpha: 0.25 },
  { count: 15, speed: 0.6, size: 1.0, alpha: 0.4  },
];

// Initialize random star positions per layer
const starLayers = STAR_LAYERS.map(layer => ({
  ...layer,
  stars: Array.from({ length: layer.count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
  })),
}));

/**
 * Draw and scroll the parallax starfield.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} dt  — milliseconds since last frame
 */
export function drawStarfield(ctx, dt) {
  const norm = dt * 0.06; // normalize to ~60fps feel

  for (const layer of starLayers) {
    ctx.globalAlpha = layer.alpha;
    ctx.fillStyle = '#ffffff';

    for (const star of layer.stars) {
      // Scroll downward
      star.y += layer.speed * norm;
      if (star.y > H) {
        star.y -= H;
        star.x = Math.random() * W;
      }

      const half = layer.size / 2;
      ctx.fillRect(
        Math.floor(star.x - half),
        Math.floor(star.y - half),
        layer.size,
        layer.size
      );
    }
  }

  ctx.globalAlpha = 1;
}

// ============================================================
// 2. PARTICLE SYSTEM
// ============================================================

/** @type {Array<{x,y,vx,vy,life,decay,size,color}>} */
const particles = [];

/**
 * Spawn a burst of particles radiating outward in a circle.
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} [count=8]
 */
export function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 1.5 + Math.random() * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.03 + Math.random() * 0.03,
      size: 2 + Math.random() * 2,
      color,
    });
  }
}

/**
 * Spawn golden sparkle particles with a random spread.
 * @param {number} x
 * @param {number} y
 * @param {number} [count=12]
 */
export function spawnSparkles(x, y, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 3;
    particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.02 + Math.random() * 0.04,
      size: 1 + Math.random() * 3,
      color: Math.random() < 0.6 ? '#f5d020' : '#ffffff',
    });
  }
}

/**
 * Update all particles, remove dead ones, and draw survivors.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} dt  — milliseconds since last frame
 */
export function updateAndDrawParticles(ctx, dt) {
  const norm = dt * 0.06;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    // Update
    p.x += p.vx * norm;
    p.y += p.vy * norm;
    p.life -= p.decay * norm;

    // Remove dead particles
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // Draw as a square
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    const half = p.size / 2;
    ctx.fillRect(
      Math.floor(p.x - half),
      Math.floor(p.y - half),
      Math.ceil(p.size),
      Math.ceil(p.size)
    );
  }

  ctx.globalAlpha = 1;
}

// ============================================================
// 3. SCREEN EFFECTS
// ============================================================

let shakeAmount = 0;
let shakeDuration = 0;
let shakeElapsed = 0;

let flashColor = '#ffffff';
let flashAlpha = 0;

/**
 * Trigger a screen shake.
 * @param {number} [amount=4]   — pixel radius of shake
 * @param {number} [duration=150] — duration in ms
 */
export function triggerShake(amount = 4, duration = 150) {
  shakeAmount = amount;
  shakeDuration = duration;
  shakeElapsed = 0;
}

/**
 * Trigger a full-screen flash overlay.
 * @param {string} [color='#fff']
 * @param {number} [alpha=0.6]
 */
export function triggerFlash(color = '#fff', alpha = 0.6) {
  flashColor = color;
  flashAlpha = alpha;
}

/**
 * Apply shake and flash effects. Call this after ctx.save() + ctx.translate().
 * Returns the shake offset so the caller can apply ctx.translate(offsetX, offsetY).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} dt  — milliseconds since last frame
 * @returns {{ offsetX: number, offsetY: number }}
 */
export function applyScreenEffects(ctx, dt) {
  const norm = dt * 0.06;

  // --- Shake ---
  let offsetX = 0;
  let offsetY = 0;

  if (shakeElapsed < shakeDuration) {
    shakeElapsed += dt;
    const progress = shakeElapsed / shakeDuration;
    const remaining = 1 - progress;
    offsetX = (Math.random() - 0.5) * 2 * shakeAmount * remaining;
    offsetY = (Math.random() - 0.5) * 2 * shakeAmount * remaining;
  }

  // --- Flash overlay ---
  if (flashAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Fade out (~1 unit of alpha per ~16 frames at 60fps)
    flashAlpha -= 0.04 * norm;
    if (flashAlpha < 0) flashAlpha = 0;
  }

  return { offsetX, offsetY };
}

// ============================================================
// 4. HUD
// ============================================================

/**
 * Draw the heads-up display.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} score
 * @param {number} lives
 * @param {string} waveName
 * @param {number} effectTimer      — remaining ms of berry effect (0 = inactive)
 * @param {number} effectMaxTime    — total duration ms of berry effect
 */
export function drawHUD(ctx, score, lives, waveName, effectTimer, effectMaxTime) {
  ctx.save();

  // ── Top-left: score ─────────────────────────────────────
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`SCORE ${score}`, 12, 12);

  // ── Top-right: lives (pixel hearts) ─────────────────────
  const heartScale = 2;
  const heartW = HEART_SPRITE.data[0].length * heartScale;
  const heartH = HEART_SPRITE.data.length * heartScale;
  const heartPad = 4;
  const heartsStartX = W - 12 - (heartW + heartPad) * lives + heartPad;
  const heartsY = 12 + heartH / 2;

  for (let i = 0; i < lives; i++) {
    const hx = heartsStartX + i * (heartW + heartPad) + heartW / 2;
    drawSprite(ctx, HEART_SPRITE.data, HEART_SPRITE.palette, hx, heartsY, heartScale);
  }

  // ── Top-center: wave name ────────────────────────────────
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(waveName, W / 2, 14);

  // ── Bottom-center: berry effect timer bar ────────────────
  if (effectTimer > 0 && effectMaxTime > 0) {
    const barW = 160;
    const barH = 8;
    const barX = W / 2 - barW / 2;
    const barY = H - 20;
    const fill = Math.max(0, Math.min(1, effectTimer / effectMaxTime));

    // Dark background
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#111';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // Yellow fill
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.scoreYellow;
    ctx.fillRect(barX, barY, Math.floor(barW * fill), barH);
  }

  ctx.restore();
}

// ── Tracking feedback overlay ───────────────────────────────
/**
 * Draw subtle indicators showing raw tracked positions.
 * Helps the player understand what the camera is detecting.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ts
 * @param {{ x: number, y: number, active: boolean, mode: string }} headTracking
 * @param {{ left: { active: boolean, x: number, y: number }, right: { active: boolean, x: number, y: number } }} hands
 */
export function drawTrackingFeedback(ctx, ts, headTracking, hands) {
  ctx.save();

  // ── Head tracking crosshair (raw position before smoothing) ──
  if (headTracking.active) {
    const hx = headTracking.x;
    const hy = headTracking.y;
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    // Small crosshair
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy);
    ctx.lineTo(hx + 8, hy);
    ctx.moveTo(hx, hy - 8);
    ctx.lineTo(hx, hy + 8);
    ctx.stroke();
    // Tiny dot
    ctx.beginPath();
    ctx.arc(hx, hy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  // ── Hand indicators ──────────────────────────────────────────
  const drawHand = (hand, label) => {
    if (!hand.active && hand.x === 0 && hand.y === 0) return; // never detected

    const hx = hand.x;
    const hy = hand.y;

    if (hand.active) {
      // Active hand — bright indicator with pulsing ring
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#EF9F27';
      ctx.lineWidth = 2;
      const pulse = 8 + Math.sin(ts * 0.008) * 3;
      ctx.beginPath();
      ctx.arc(hx, hy, pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Filled dot
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#EF9F27';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.globalAlpha = 0.4;
      ctx.font = '10px monospace';
      ctx.fillStyle = '#EF9F27';
      ctx.textAlign = 'center';
      ctx.fillText(label, hx, hy - 16);
    } else {
      // Detected but not raised — dim indicator
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx, hy, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.12;
      ctx.font = '9px monospace';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center';
      ctx.fillText(label + ' (low)', hx, hy - 12);
    }
  };

  drawHand(hands.left, 'L');
  drawHand(hands.right, 'R');

  ctx.restore();
}
