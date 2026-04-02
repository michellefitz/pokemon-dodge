import { W, H, MAX_OBSTACLES, SPAWN_SAFE_MARGIN, OBSTACLE_SPEEDS, OBSTACLE_RADII, SPRITE_SCALE } from './constants.js';
import { drawSprite, POKEBALL_SPRITES, WILD_SPRITES, EMBER_SPRITE } from './sprites.js';
import { player, getHitboxRadius } from './player.js';
import { triggerShake } from './renderer.js';

// ============================================================
// MODULE STATE
// ============================================================

const obstacles = [];
let onDodgedCallback = null;

// ============================================================
// CALLBACK
// ============================================================

/**
 * Store a callback invoked whenever an obstacle exits the bottom (for scoring).
 * @param {Function} cb  — called with (type) string
 */
export function setOnDodgedCallback(cb) {
  onDodgedCallback = cb;
}

// ============================================================
// ACCESSORS
// ============================================================

/** Returns the live obstacles array. */
export function getObstacles() {
  return obstacles;
}

/** Removes all obstacles. */
export function clearObstacles() {
  obstacles.length = 0;
}

// ============================================================
// SPAWN
// ============================================================

/**
 * Spawn an obstacle of the given type and push it to the array.
 * Does nothing if obstacles.length >= MAX_OBSTACLES.
 * @param {string} type
 */
export function spawnObstacle(type) {
  if (obstacles.length >= MAX_OBSTACLES) return;

  const speed = OBSTACLE_SPEEDS[type] ?? 3;
  const radius = OBSTACLE_RADII[type] ?? 10;

  // Base obstacle template
  const ob = {
    type,
    x: 0,
    y: 0,
    radius,
    speed,
    alive: true,
    age: 0,
    wobbleOffset: Math.random() * Math.PI * 2,
    zigzagPhase: Math.random() * Math.PI * 2,
    gastlyAlpha: 1,
    fromRight: false,
    accel: 0,
    embers: null,
    sweepX: null,
    vineY: null,
  };

  if (type === 'pidgey') {
    // Spawn from left or right side, random y in upper half
    ob.fromRight = Math.random() < 0.5;
    ob.x = ob.fromRight ? W + radius : -radius;
    ob.y = Math.random() * (H * 0.5) + 50;

  } else if (type === 'watergun') {
    // Starts at left edge, random y in upper portion
    ob.x = -10;
    ob.y = Math.random() * (H * 0.55) + 60;
    ob.speed = 3;

  } else if (type === 'vinewhip') {
    // Starts at right edge, horizontal line at random y between 200–400
    ob.x = W + 20;
    ob.vineY = 200 + Math.random() * 200;
    ob.y = ob.vineY;

  } else if (type === 'ember') {
    // Fan of 3 fireballs spawned from a random top position
    const ex = SPAWN_SAFE_MARGIN + Math.random() * (W - SPAWN_SAFE_MARGIN * 2);
    const ey = -10;
    const angles = [-0.3, 0, 0.3];
    ob.x = ex;
    ob.y = ey;
    ob.embers = angles.map(angle => {
      const spd = OBSTACLE_SPEEDS.ember ?? 3.5;
      return {
        x: ex,
        y: ey,
        vx: Math.sin(angle) * spd,
        vy: Math.cos(angle) * spd,
      };
    });

  } else {
    // All other types: spawn from top, x away from player
    ob.y = -radius;
    let chosen = SPAWN_SAFE_MARGIN + Math.random() * (W - SPAWN_SAFE_MARGIN * 2);
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = SPAWN_SAFE_MARGIN + Math.random() * (W - SPAWN_SAFE_MARGIN * 2);
      if (Math.abs(candidate - player.smoothX) > SPAWN_SAFE_MARGIN) {
        chosen = candidate;
        break;
      }
    }
    ob.x = chosen;
  }

  obstacles.push(ob);
}

// ============================================================
// UPDATE
// ============================================================

/**
 * Update all obstacles for one frame.
 * @param {number} dt  — milliseconds since last frame
 */
export function updateObstacles(dt) {
  const dtFactor = dt * 0.06;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.age += dt;

    switch (ob.type) {

      case 'pokeball':
      case 'ultraball':
        // Straight down
        ob.y += ob.speed * dtFactor;
        break;

      case 'greatball':
        // Down + sinusoidal x wobble
        ob.y += ob.speed * dtFactor;
        ob.x += Math.sin(ob.age * 0.004 + ob.wobbleOffset) * 1.5 * dtFactor;
        break;

      case 'masterball':
        // Down + slight tracking toward player
        ob.y += ob.speed * dtFactor;
        ob.x += (player.smoothX - ob.x) * 0.4 * dtFactor * 0.04;
        break;

      case 'zubat':
        // Down + larger sinusoidal zigzag
        ob.y += ob.speed * dtFactor;
        ob.x += Math.sin(ob.age * 0.005 + ob.zigzagPhase) * 3 * dtFactor;
        break;

      case 'geodude':
        // Down with accelerating speed; triggers shake when passing H+30
        ob.accel += 0.08 * dtFactor;
        ob.y += (ob.speed + ob.accel) * dtFactor;
        if (ob.y >= H + 30 && ob.alive) {
          triggerShake(5, 180);
        }
        break;

      case 'gastly':
        // Down + fading/pulsing alpha
        ob.y += ob.speed * dtFactor;
        ob.gastlyAlpha = 0.3 + 0.7 * Math.abs(Math.sin(ob.age * 0.003));
        break;

      case 'pidgey':
        // Horizontal movement, slight y oscillation
        ob.x += (ob.fromRight ? -ob.speed : ob.speed) * dtFactor;
        ob.y += Math.sin(ob.age * 0.005 + ob.wobbleOffset) * 0.6 * dtFactor;
        break;

      case 'ember':
        // Each fireball moves by its own vx/vy
        if (ob.embers) {
          for (const fb of ob.embers) {
            fb.x += fb.vx * dtFactor;
            fb.y += fb.vy * dtFactor;
          }
          // Use the lead fireball y to track obstacle position for off-screen checks
          ob.y = ob.embers[1].y; // center fireball
          ob.x = ob.embers[1].x;
        }
        break;

      case 'watergun':
        // Moves right
        ob.x += ob.speed * dtFactor;
        break;

      case 'vinewhip':
        // Moves left
        ob.x -= ob.speed * dtFactor;
        ob.y = ob.vineY;
        break;
    }

    // ── Off-screen removal ──────────────────────────────────
    let offScreen = false;

    if (ob.type === 'pidgey') {
      offScreen = ob.fromRight ? ob.x < -ob.radius - 20 : ob.x > W + ob.radius + 20;
    } else if (ob.type === 'watergun') {
      offScreen = ob.x > W + 120;
    } else if (ob.type === 'vinewhip') {
      offScreen = ob.x < -W - 20;
    } else if (ob.type === 'ember') {
      // Off-screen when center fireball leaves bottom or sides
      const fb = ob.embers ? ob.embers[1] : ob;
      offScreen = fb.y > H + 20 || fb.x < -20 || fb.x > W + 20;
    } else {
      offScreen = ob.y > H + 30;
    }

    if (offScreen) {
      // Only reward dodges for downward-falling types that exit the bottom
      if (
        onDodgedCallback &&
        ob.type !== 'pidgey' &&
        ob.type !== 'watergun' &&
        ob.type !== 'vinewhip' &&
        ob.y > H + 30
      ) {
        onDodgedCallback(ob.type);
      }
      obstacles.splice(i, 1);
    }
  }
}

// ============================================================
// COLLISION DETECTION
// ============================================================

/**
 * Check all obstacles against the player.
 * Returns an array of obstacles that were hit, removing them from the array.
 * @returns {Array} hit obstacles
 */
export function checkCollisions() {
  if (player.invincible) return [];

  const px = player.smoothX;
  const py = player.smoothY;
  const pr = getHitboxRadius();
  const hits = [];

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    let hit = false;

    if (ob.type === 'ember' && ob.embers) {
      // Check each fireball individually
      const fbRadius = 8;
      for (const fb of ob.embers) {
        const dx = fb.x - px;
        const dy = fb.y - py;
        if (dx * dx + dy * dy < (pr + fbRadius) * (pr + fbRadius)) {
          hit = true;
          break;
        }
      }

    } else if (ob.type === 'watergun') {
      // Thin rectangle collision
      hit =
        Math.abs(ob.x - px) < pr + 4 &&
        Math.abs(ob.y - py) < pr + 30;

    } else if (ob.type === 'vinewhip') {
      // Horizontal line: check y proximity and horizontal overlap
      const vineLeft = ob.x - 60;  // vine extends 60px to the left of head
      const vineRight = ob.x + 20; // and 20px to the right
      hit =
        Math.abs(ob.vineY - py) < pr + 4 &&
        px > vineLeft &&
        px < vineRight;

    } else {
      // Standard circle-circle
      const dx = ob.x - px;
      const dy = ob.y - py;
      hit = dx * dx + dy * dy < (pr + ob.radius) * (pr + ob.radius);
    }

    if (hit) {
      hits.push(ob);
      obstacles.splice(i, 1);
    }
  }

  return hits;
}

// ============================================================
// DRAWING
// ============================================================

/**
 * Draw all obstacles.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ts  — timestamp (ms), used for animation
 */
export function drawObstacles(ctx, ts) {
  for (const ob of obstacles) {
    ctx.save();

    switch (ob.type) {

      // ── Pokeball variants ──────────────────────────────────
      case 'pokeball':
      case 'greatball':
      case 'ultraball':
      case 'masterball': {
        const spr = POKEBALL_SPRITES[ob.type];
        if (spr) {
          ctx.globalAlpha = 1;
          drawSprite(ctx, spr.data, spr.palette, ob.x, ob.y, SPRITE_SCALE);
        }
        break;
      }

      // ── Wild Pokémon ───────────────────────────────────────
      case 'zubat':
      case 'geodude':
      case 'pidgey': {
        const spr = WILD_SPRITES[ob.type];
        if (spr) {
          ctx.globalAlpha = 1;
          drawSprite(ctx, spr.data, spr.palette, ob.x, ob.y, SPRITE_SCALE);
        }
        break;
      }

      case 'gastly': {
        const spr = WILD_SPRITES.gastly;
        if (spr) {
          ctx.globalAlpha = ob.gastlyAlpha;
          drawSprite(ctx, spr.data, spr.palette, ob.x, ob.y, SPRITE_SCALE);
        }
        break;
      }

      // ── Ember (fan of fireballs) ───────────────────────────
      case 'ember': {
        if (ob.embers) {
          ctx.globalAlpha = 1;
          for (const fb of ob.embers) {
            drawSprite(ctx, EMBER_SPRITE.data, EMBER_SPRITE.palette, fb.x, fb.y, 2);
          }
        }
        break;
      }

      // ── Water Gun (blue rectangle, pulsing) ───────────────
      case 'watergun': {
        const pulse = 0.6 + 0.4 * Math.sin(ts * 0.01);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(ob.x - 3, ob.y - 40, 6, 80);
        break;
      }

      // ── Vine Whip (green horizontal wave line) ────────────
      case 'vinewhip': {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#33cc44';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const vineLength = W + 40;
        const segments = 20;
        const segW = vineLength / segments;
        ctx.moveTo(ob.x, ob.vineY);
        for (let s = 1; s <= segments; s++) {
          const sx = ob.x + s * segW;
          const sy = ob.vineY + Math.sin((s / segments) * Math.PI * 4 + ts * 0.005) * 6;
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }
}
