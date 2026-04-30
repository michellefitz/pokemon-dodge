import { W, H } from './constants.js';
import { drawSprite, EMBER_SPRITE, RAZOR_LEAF_SPRITE, WATER_SHOT_SPRITE } from './sprites.js';
import { player } from './player.js';
import { getObstacles } from './obstacles.js';
import { spawnParticles } from './renderer.js';
import { handState } from './hands.js';

const projectiles = [];

// Energy per hand (0-100)
const energy = { left: 100, right: 100 };
const ENERGY_MAX = 100;
const ENERGY_COST = 5;
const ENERGY_RECHARGE = 12; // per second
const ENERGY_MIN_TO_FIRE = 10;
const FIRE_INTERVAL = 250; // ms between shots per hand — continuous stream
const PROJECTILE_SPEED = 6;
const PROJECTILE_RADIUS = 6;

let lastFireTime = { left: 0, right: 0 };
let canFire = { left: true, right: true }; // false when energy drained to 0

// Projectile appearance per starter
const PROJECTILE_CONFIG = {
  charmander: { sprite: EMBER_SPRITE, color: '#EF9F27', name: 'fire' },
  bulbasaur:  { sprite: RAZOR_LEAF_SPRITE, color: '#4CAF50', name: 'leaf' },
  squirtle:   { sprite: WATER_SHOT_SPRITE, color: '#42A5F5', name: 'water' },
};

export function getEnergy() {
  return energy;
}

export function resetProjectiles() {
  projectiles.length = 0;
  energy.left = ENERGY_MAX;
  energy.right = ENERGY_MAX;
  lastFireTime.left = 0;
  lastFireTime.right = 0;
  canFire.left = true;
  canFire.right = true;
  lastTouchFire = 0;
  _hasFired = false;
}

let lastTouchFire = 0;

// ── Fire detection for onboarding ──────────────────────────────────────────
let _hasFired = false;

/** Returns true if any projectile has been fired since the last reset. */
export function hasFiredSinceReset() {
  return _hasFired;
}

// Touch-to-shoot for mobile — fires toward the tapped position
export function touchShoot(tapX, tapY) {
  const now = performance.now();
  if (now - lastTouchFire < FIRE_INTERVAL) return;

  // Use left energy for left-side taps, right for right-side
  const side = tapX < player.smoothX ? 'left' : 'right';
  if (energy[side] < ENERGY_COST || !canFire[side]) return;

  let dx = tapX - player.smoothX;
  let dy = tapY - player.smoothY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 10) return;

  dx /= dist;
  dy /= dist;

  projectiles.push({
    x: player.smoothX,
    y: player.smoothY,
    vx: dx * PROJECTILE_SPEED,
    vy: dy * PROJECTILE_SPEED,
  });
  _hasFired = true;

  energy[side] -= ENERGY_COST;
  lastTouchFire = now;

  if (energy[side] <= 0) {
    energy[side] = 0;
    canFire[side] = false;
  }
}

function tryFire(hand, side, ts) {
  if (!hand.active) return;
  if (energy[side] < ENERGY_COST) return;
  if (!canFire[side]) return;
  if (ts - lastFireTime[side] < FIRE_INTERVAL) return;

  // Direction from player to hand position
  let dx = hand.x - player.smoothX;
  let dy = hand.y - player.smoothY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 10) return; // hand too close to player, skip

  dx /= dist;
  dy /= dist;

  projectiles.push({
    x: player.smoothX,
    y: player.smoothY,
    vx: dx * PROJECTILE_SPEED,
    vy: dy * PROJECTILE_SPEED,
  });
  _hasFired = true;

  energy[side] -= ENERGY_COST;
  lastFireTime[side] = ts;

  if (energy[side] <= 0) {
    energy[side] = 0;
    canFire[side] = false;
  }
}

export function updateProjectiles(ts, dt) {
  const dtFactor = dt * 0.06;

  // Try firing from each hand
  tryFire(handState.left, 'left', ts);
  tryFire(handState.right, 'right', ts);

  // Recharge energy when hand is down
  const rechargeDt = (ENERGY_RECHARGE * dt) / 1000;
  if (!handState.left.active && energy.left < ENERGY_MAX) {
    energy.left = Math.min(ENERGY_MAX, energy.left + rechargeDt);
    if (!canFire.left && energy.left >= ENERGY_MIN_TO_FIRE) {
      canFire.left = true;
    }
  }
  if (!handState.right.active && energy.right < ENERGY_MAX) {
    energy.right = Math.min(ENERGY_MAX, energy.right + rechargeDt);
    if (!canFire.right && energy.right >= ENERGY_MIN_TO_FIRE) {
      canFire.right = true;
    }
  }

  // Move projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dtFactor;
    p.y += p.vy * dtFactor;

    // Remove off-screen
    if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
      projectiles.splice(i, 1);
    }
  }
}

export function checkProjectileCollisions() {
  const obstacles = getObstacles();
  const config = PROJECTILE_CONFIG[player.starter];
  if (!config) return 0;
  let scoreBonus = 0;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    let hit = false;

    for (let j = obstacles.length - 1; j >= 0; j--) {
      const ob = obstacles[j];

      // For ember obstacles, check against each fireball
      if (ob.type === 'ember' && ob.embers) {
        for (const e of ob.embers) {
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          if (Math.sqrt(dx * dx + dy * dy) < PROJECTILE_RADIUS + 8) {
            spawnParticles(p.x, p.y, config.color, 8);
            obstacles.splice(j, 1);
            hit = true;
            break;
          }
        }
        if (hit) break;
        continue;
      }

      const dx = p.x - ob.x;
      const dy = p.y - ob.y;
      const hitDist = PROJECTILE_RADIUS + (ob.radius || 12);
      if (Math.sqrt(dx * dx + dy * dy) < hitDist) {
        // Hit! Destroy both
        spawnParticles(ob.x, ob.y, config.color, 10);
        obstacles.splice(j, 1);
        hit = true;
        break;
      }
    }

    if (hit) {
      projectiles.splice(i, 1);
      scoreBonus += 2;
    }
  }
  return scoreBonus;
}

export function drawProjectiles(ctx, ts) {
  const config = PROJECTILE_CONFIG[player.starter];
  if (!config) return;

  for (const p of projectiles) {
    drawSprite(ctx, config.sprite.data, config.sprite.palette, p.x, p.y, 2);
  }
}

export function drawEnergyBars(ctx) {
  // Only show when energy < max
  const barW = 4;
  const barH = 30;
  const px = player.smoothX;
  const py = player.smoothY;
  const offset = 35; // distance from player center

  if (energy.left < ENERGY_MAX) {
    const x = px - offset;
    const y = py - barH / 2;
    const pct = energy.left / ENERGY_MAX;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = canFire.left ? '#4CAF50' : '#E24B4A';
    ctx.fillRect(x, y + barH * (1 - pct), barW, barH * pct);
  }

  if (energy.right < ENERGY_MAX) {
    const x = px + offset;
    const y = py - barH / 2;
    const pct = energy.right / ENERGY_MAX;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = canFire.right ? '#4CAF50' : '#E24B4A';
    ctx.fillRect(x, y + barH * (1 - pct), barW, barH * pct);
  }
}
