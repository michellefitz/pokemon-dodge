import { W, H, BERRY_SPEED, BERRY_RADIUS, INVINCIBILITY_DURATION, SPRITE_SCALE } from './constants.js';
import { drawSprite, BERRY_SPRITES } from './sprites.js';
import { player, getHitboxRadius, getStarterDef } from './player.js';
import { clearObstacles } from './obstacles.js';
import { spawnParticles, spawnSparkles, triggerFlash } from './renderer.js';

// ============================================================
// Module state
// ============================================================

const berries = [];

/** @type {{ type: string, timer: number, maxTime: number } | null} */
let activeEffect = null;

// ============================================================
// Getters / resetters
// ============================================================

/** Returns the currently active berry effect (or null if none). */
export function getActiveEffect() {
  return activeEffect;
}

/** Clears all berries and cancels any active effect. */
export function clearBerries() {
  berries.length = 0;
  activeEffect = null;
}

// ============================================================
// Spawning
// ============================================================

const BERRY_POOL = ['oran', 'oran', 'oran', 'sitrus', 'sitrus', 'rawst', 'lum'];

/**
 * Spawn a single berry of a randomly-weighted type at the top of the screen.
 */
export function spawnBerry() {
  const type = BERRY_POOL[Math.floor(Math.random() * BERRY_POOL.length)];
  berries.push({
    type,
    x: BERRY_RADIUS + Math.random() * (W - BERRY_RADIUS * 2),
    y: -20,
    age: 0,
    wobbleOffset: Math.random() * Math.PI * 2,
  });
}

// ============================================================
// Update
// ============================================================

/**
 * Move berries downward, apply wobble / magnet drift, remove off-screen ones.
 * Also ticks down activeEffect and cleans it up when it expires.
 * @param {number} dt — milliseconds since last frame
 */
export function updateBerries(dt) {
  const norm = dt * 0.06; // normalize to ~60 fps feel
  const def = getStarterDef();
  const hasMagnet = def && def.berryMagnet;

  for (let i = berries.length - 1; i >= 0; i--) {
    const b = berries[i];

    b.age += dt;

    // Downward movement
    b.y += BERRY_SPEED * norm;

    // Sinusoidal horizontal wobble
    b.x += Math.sin(b.age * 0.003 + b.wobbleOffset) * 0.4;

    // Squirtle-line magnet: drift toward the player's smoothed X
    if (hasMagnet) {
      const dx = player.smoothX - b.x;
      b.x += dx * 0.01;
    }

    // Remove if scrolled off the bottom
    if (b.y > H + BERRY_RADIUS * 2) {
      berries.splice(i, 1);
    }
  }

  // Tick active effect timer
  if (activeEffect) {
    activeEffect.timer -= dt;
    if (activeEffect.timer <= 0) {
      if (activeEffect.type === 'rawst') {
        player.invincible = false;
        player.invincibleTimer = 0;
      }
      activeEffect = null;
    }
  }
}

// ============================================================
// Collision detection
// ============================================================

/**
 * Check each berry against the player hitbox. Applies the berry effect and
 * removes collected berries.
 * @param {number} score — current score (unused by effects but passed for context)
 * @returns {number} scoreBonus to add
 */
export function checkBerryCollisions(score) {
  let scoreBonus = 0;
  const playerRadius = getHitboxRadius();
  const collectRange = playerRadius + BERRY_RADIUS;

  for (let i = berries.length - 1; i >= 0; i--) {
    const b = berries[i];
    const dx = player.smoothX - b.x;
    const dy = player.smoothY - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > collectRange) continue;

    // --- Apply effect ---
    switch (b.type) {
      case 'oran':
        scoreBonus += 10;
        spawnParticles(b.x, b.y, '#6090ff', 8);
        break;

      case 'sitrus':
        player.lives++;
        spawnParticles(b.x, b.y, '#f5d020', 8);
        break;

      case 'rawst':
        player.invincible = true;
        player.invincibleTimer = INVINCIBILITY_DURATION;
        activeEffect = { type: 'rawst', timer: INVINCIBILITY_DURATION, maxTime: INVINCIBILITY_DURATION };
        spawnParticles(b.x, b.y, '#e04030', 8);
        break;

      case 'lum':
        clearObstacles();
        triggerFlash('#40e060', 0.5);
        spawnParticles(b.x, b.y, '#40e060', 12);
        break;
    }

    // Sparkles on every collect
    spawnSparkles(b.x, b.y, 12);

    berries.splice(i, 1);
  }

  return scoreBonus;
}

// ============================================================
// Drawing
// ============================================================

/**
 * Draw all berries using their pixel-art sprite with a subtle sparkle alpha pulse.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ts — DOMHighResTimeStamp (for animation)
 */
export function drawBerries(ctx, ts) {
  for (const b of berries) {
    const sprite = BERRY_SPRITES[b.type];
    if (!sprite) continue;

    // Gentle alpha pulse to hint at collectability
    const pulse = 0.85 + 0.15 * Math.sin(ts * 0.004 + b.wobbleOffset);
    ctx.globalAlpha = pulse;

    drawSprite(ctx, sprite.data, sprite.palette, b.x, b.y, SPRITE_SCALE);
  }

  ctx.globalAlpha = 1;
}
