import { W, H, WAVES, COLORS } from './constants.js';
import { player, updatePlayer, drawPlayer, shouldEvolve, evolve, finishEvolving, getHitboxRadius } from './player.js';
import { getObstacles, clearObstacles, spawnObstacle, updateObstacles, checkCollisions, drawObstacles, setOnDodgedCallback } from './obstacles.js';
import { clearBerries, spawnBerry, updateBerries, checkBerryCollisions, drawBerries, getActiveEffect } from './powerups.js';
import { resetEvents, trySpawnEvent, updateEvent, isControlsReversed, drawEvent, getActiveEvent, getSnorlaxBlockRect } from './events.js';
import { drawStarfield, updateAndDrawParticles, drawHUD, applyScreenEffects, triggerShake, triggerFlash, spawnParticles, drawTrackingFeedback } from './renderer.js';
import { tracking } from './tracking.js';
import { handState } from './hands.js';
import { startEvolutionCutscene, updateEvolutionCutscene, drawEvolutionCutscene } from './screens.js';
import { updateProjectiles, checkProjectileCollisions, drawProjectiles, drawEnergyBars, resetProjectiles } from './projectiles.js';
import { playEvolveSound } from './audio.js';

// ============================================================
// MODULE STATE
// ============================================================

let score = 0;
let lastSpawnTime = 0;
let gameTime = 0;
let evolving = false;

// ============================================================
// EXPORTS
// ============================================================

/** Returns the current score. */
export function getScore() {
  return score;
}

/** Resets all game state for a fresh run. */
export function resetGame() {
  score = 0;
  lastSpawnTime = 0;
  gameTime = 0;
  evolving = false;
  clearObstacles();
  clearBerries();
  resetEvents();
  resetProjectiles();
  setOnDodgedCallback(onObstacleDodged);
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Callback fired by obstacles.js whenever an obstacle exits off the bottom
 * of the screen without hitting the player.
 * @param {string} type
 */
function onObstacleDodged(type) {
  const dodgeable = [
    'pokeball', 'greatball', 'ultraball', 'masterball',
    'zubat', 'geodude', 'gastly', 'pidgey',
  ];
  if (dodgeable.includes(type)) {
    score++;
  }
}

/**
 * Returns the highest-matching wave definition for the current score.
 * @returns {object} wave
 */
function getCurrentWave() {
  for (let i = WAVES.length - 1; i >= 0; i--) {
    if (score >= WAVES[i].minScore) {
      return WAVES[i];
    }
  }
  return WAVES[0];
}

/**
 * Weighted random selection of an obstacle type from the wave's pool.
 * The pool is an object of { type: weight }.
 * @param {object} wave
 * @returns {string} obstacle type
 */
function pickObstacleType(wave) {
  const pool = wave.obstacles;
  const entries = Object.entries(pool);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * totalWeight;
  for (const [type, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

// ============================================================
// MAIN UPDATE
// ============================================================

/**
 * Update game logic for one frame.
 * @param {number} ts  — DOMHighResTimeStamp in ms
 * @param {number} dt  — milliseconds since last frame
 * @returns {null|'gameover'}
 */
export function updateGame(ts, dt) {
  gameTime += dt;

  // ── Evolution cutscene ──────────────────────────────────
  if (evolving) {
    const done = updateEvolutionCutscene(dt);
    if (done) {
      evolving = false;
      finishEvolving();
    }
    return null;
  }

  // ── Trigger evolution ───────────────────────────────────
  if (shouldEvolve(score)) {
    evolve();
    evolving = true;
    startEvolutionCutscene();
    playEvolveSound();
    triggerFlash('#ffffff', 0.8);
    return null;
  }

  // ── Wave & controls ─────────────────────────────────────
  const wave = getCurrentWave();
  const reversed = isControlsReversed();

  // ── Player ──────────────────────────────────────────────
  updatePlayer(dt, reversed, getSnorlaxBlockRect());

  // ── Spawn ────────────────────────────────────────────────
  if (ts - lastSpawnTime >= wave.spawnInterval) {
    lastSpawnTime = ts;
    if (Math.random() < wave.berryChance) {
      spawnBerry();
    } else {
      const type = pickObstacleType(wave);
      spawnObstacle(type);
    }
  }

  // ── Obstacles & berries ──────────────────────────────────
  updateObstacles(dt);
  updateBerries(dt);

  // ── Projectiles ─────────────────────────────────────────
  updateProjectiles(ts, dt);
  score += checkProjectileCollisions();

  // ── Random events ────────────────────────────────────────
  if (wave.eventsEnabled) {
    trySpawnEvent(gameTime);
  }

  // updateEvent returns a scoreBonus (e.g. legendary catch)
  const eventBonus = updateEvent(dt);
  score += eventBonus;

  // checkBerryCollisions returns a scoreBonus (oran berry, etc.)
  const berryBonus = checkBerryCollisions(score);
  score += berryBonus;

  // ── Collision detection ──────────────────────────────────
  const hits = checkCollisions();
  for (const ob of hits) {
    if (!player.invincible) {
      player.lives--;
      triggerShake(6, 200);
      triggerFlash(COLORS.hitRed, 0.5);
      spawnParticles(player.x, player.y, COLORS.hitRed, 10);

      if (player.lives <= 0) {
        return 'gameover';
      }
    }
  }

  return null;
}

// ============================================================
// MAIN DRAW
// ============================================================

/**
 * Draw one frame of the game.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ts  — DOMHighResTimeStamp in ms
 * @param {number} dt  — milliseconds since last frame
 */
export function drawGame(ctx, ts, dt) {
  // ── Background ───────────────────────────────────────────
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // ── Screen effects (shake / flash) ───────────────────────
  const { offsetX, offsetY } = applyScreenEffects(ctx, dt);

  // ── World-space drawing (affected by screen shake) ───────
  ctx.save();
  ctx.translate(offsetX, offsetY);

  drawStarfield(ctx, dt);
  drawObstacles(ctx, ts);
  drawBerries(ctx, ts);
  drawPlayer(ctx, ts);
  drawProjectiles(ctx, ts);
  drawEnergyBars(ctx);
  drawEvent(ctx, ts);

  ctx.restore();

  // ── Particles (not shaken) ───────────────────────────────
  updateAndDrawParticles(ctx, dt);

  // ── HUD ──────────────────────────────────────────────────
  const wave = getCurrentWave();
  const activeEffect = getActiveEffect();
  const effectTimer   = activeEffect ? activeEffect.timer   : 0;
  const effectMaxTime = activeEffect ? activeEffect.maxTime : 0;
  drawHUD(ctx, score, player.lives, wave.name, effectTimer, effectMaxTime);

  // ── Tracking feedback (subtle indicators) ──────────────────
  drawTrackingFeedback(ctx, ts, tracking, handState);

  // ── Evolution cutscene overlay ───────────────────────────
  if (evolving) {
    drawEvolutionCutscene(ctx, ts, dt);
  }
}
