import { W, H, EVENT_COOLDOWN, EVENT_MAX_COOLDOWN, SNORLAX_DURATION, TEAM_ROCKET_DURATION, FOG_DURATION, LEGENDARY_POINTS, SPRITE_SCALE } from './constants.js';
import { drawSprite, SNORLAX_SPRITE, MEWTWO_SPRITE } from './sprites.js';
import { player, getHitboxRadius } from './player.js';
import { spawnParticles, spawnSparkles } from './renderer.js';

// ============================================================
// Module state
// ============================================================

let activeEvent = null;
let lastEventTime = 0;
let nextEventCooldown = EVENT_COOLDOWN;

const EVENT_TYPES = ['snorlax', 'rocket', 'legendary', 'fog'];

// ============================================================
// Getters / resets
// ============================================================

/** @returns {object|null} */
export function getActiveEvent() {
  return activeEvent;
}

export function resetEvents() {
  activeEvent = null;
  lastEventTime = 0;
  nextEventCooldown = EVENT_COOLDOWN;
}

/** Returns true while the Team Rocket event is active (controls reversed). */
export function isControlsReversed() {
  return activeEvent !== null && activeEvent.type === 'rocket';
}

// ============================================================
// Spawning
// ============================================================

/**
 * Try to spawn a new random event if the cooldown has elapsed.
 * @param {number} gameTime  — current game time in ms
 */
export function trySpawnEvent(gameTime) {
  if (activeEvent !== null) return;
  if (gameTime - lastEventTime < nextEventCooldown) return;

  const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];

  switch (type) {
    case 'snorlax':
      activeEvent = {
        type,
        timer: SNORLAX_DURATION,
        maxTime: SNORLAX_DURATION,
        // Snorlax blocks from either the left or right side
        x: Math.random() < 0.5 ? W * 0.25 : W * 0.75,
        slideIn: 0,
        banner: 'SNORLAX IS BLOCKING THE PATH!',
      };
      break;

    case 'rocket':
      activeEvent = {
        type,
        timer: TEAM_ROCKET_DURATION,
        maxTime: TEAM_ROCKET_DURATION,
        banner: 'TEAM ROCKET APPEARED!',
      };
      break;

    case 'legendary':
      activeEvent = {
        type,
        timer: 8000,
        maxTime: 8000,
        x: -40,
        y: 100 + Math.random() * 200,
        collected: false,
        banner: 'A WILD LEGENDARY APPROACHES!',
      };
      break;

    case 'fog':
      activeEvent = {
        type,
        timer: FOG_DURATION,
        maxTime: FOG_DURATION,
        banner: 'FOG ROLLED IN!',
      };
      break;
  }

  lastEventTime = gameTime;
  nextEventCooldown = EVENT_COOLDOWN + Math.random() * (EVENT_MAX_COOLDOWN - EVENT_COOLDOWN);
}

// ============================================================
// Update
// ============================================================

/**
 * Update the active event each frame.
 * @param {number} dt  — milliseconds since last frame
 * @returns {number} scoreBonus awarded this frame
 */
export function updateEvent(dt) {
  if (!activeEvent) return 0;

  let scoreBonus = 0;
  const dtFactor = dt / 16; // normalized to ~60 fps

  activeEvent.timer -= dt;

  switch (activeEvent.type) {
    case 'snorlax':
      // Animate slide-in: reach 1 over ~400 ms
      if (activeEvent.slideIn < 1) {
        activeEvent.slideIn = Math.min(1, activeEvent.slideIn + dtFactor * (16 / 400));
      }
      break;

    case 'legendary': {
      // Move Mewtwo rightward across the screen
      activeEvent.x += 1.5 * dtFactor;

      // Collision check with player
      if (!activeEvent.collected) {
        const dx = activeEvent.x - player.x;
        const dy = activeEvent.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const catchRadius = getHitboxRadius() + 20;

        if (dist < catchRadius) {
          activeEvent.collected = true;
          scoreBonus = LEGENDARY_POINTS;
          spawnSparkles(activeEvent.x, activeEvent.y, 20);
          spawnParticles(activeEvent.x, activeEvent.y, '#cc88ff', 12);
        }
      }

      // Remove once off-screen
      if (activeEvent.x > W + 60) {
        activeEvent = null;
        return scoreBonus;
      }
      break;
    }

    default:
      break;
  }

  // Clear event when timer expires
  if (activeEvent && activeEvent.timer <= 0) {
    activeEvent = null;
  }

  return scoreBonus;
}

// ============================================================
// Snorlax blocking rect
// ============================================================

/**
 * Returns the blocking rectangle for a Snorlax event, or null.
 * The zone covers 40% of the canvas width centred on Snorlax's x position.
 * @returns {{ x: number, y: number, w: number, h: number }|null}
 */
export function getSnorlaxBlockRect() {
  if (!activeEvent || activeEvent.type !== 'snorlax') return null;

  const blockW = W * 0.4;
  return {
    x: activeEvent.x - blockW / 2,
    y: 0,
    w: blockW,
    h: H,
  };
}

// ============================================================
// Drawing
// ============================================================

/**
 * Draw the current active event overlay.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ts  — timestamp in ms (for animation)
 */
export function drawEvent(ctx, ts) {
  if (!activeEvent) return;

  ctx.save();

  switch (activeEvent.type) {
    case 'snorlax':
      _drawSnorlax(ctx, ts);
      break;
    case 'rocket':
      _drawRocket(ctx, ts);
      break;
    case 'legendary':
      _drawLegendary(ctx, ts);
      break;
    case 'fog':
      _drawFog(ctx, ts);
      break;
  }

  _drawBanner(ctx, ts);

  ctx.restore();
}

// ── Snorlax ─────────────────────────────────────────────────

function _drawSnorlax(ctx, _ts) {
  const ev = activeEvent;
  const scale = SPRITE_SCALE + 1; // slightly larger than normal sprites
  const spriteH = SNORLAX_SPRITE.data.length * scale;
  const spriteW = SNORLAX_SPRITE.data[0].length * scale;

  // Slide in from the bottom
  const visibleY = H - spriteH * 0.6; // resting position (partially below edge)
  const startY = H + spriteH;
  const drawY = startY + (visibleY - startY) * ev.slideIn;

  // Semi-transparent blocking zone
  const blockW = W * 0.4;
  const blockX = ev.x - blockW / 2;
  ctx.globalAlpha = 0.18 * ev.slideIn;
  ctx.fillStyle = '#5060a0';
  ctx.fillRect(blockX, 0, blockW, H);

  // Vertical stripe hint
  ctx.globalAlpha = 0.08 * ev.slideIn;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(blockX, 0, 3, H);
  ctx.fillRect(blockX + blockW - 3, 0, 3, H);

  ctx.globalAlpha = 1;
  drawSprite(ctx, SNORLAX_SPRITE.data, SNORLAX_SPRITE.palette, ev.x, drawY, scale);
}

// ── Team Rocket ─────────────────────────────────────────────

function _drawRocket(ctx, ts) {
  // Flashing red "R" in the top-left corner, blinking every 200 ms
  const visible = Math.floor(ts / 200) % 2 === 0;
  if (!visible) return;

  const size = 48;
  const pad = 16;

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#cc0000';
  ctx.beginPath();
  ctx.arc(pad + size / 2, pad + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(size * 0.6)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R', pad + size / 2, pad + size / 2 + 1);
}

// ── Legendary (Mewtwo) ───────────────────────────────────────

function _drawLegendary(ctx, ts) {
  const ev = activeEvent;
  const scale = SPRITE_SCALE;

  // Pulsing purple circle behind Mewtwo
  const pulse = 0.5 + 0.5 * Math.sin(ts / 300);
  const auraRadius = 28 + pulse * 10;

  ctx.globalAlpha = ev.collected ? 0.1 : 0.35 * (0.7 + 0.3 * pulse);
  ctx.fillStyle = '#aa44ff';
  ctx.beginPath();
  ctx.arc(ev.x, ev.y, auraRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw Mewtwo sprite (faded if already collected)
  ctx.globalAlpha = ev.collected ? 0.3 : 1;
  drawSprite(ctx, MEWTWO_SPRITE.data, MEWTWO_SPRITE.palette, ev.x, ev.y, scale);

  ctx.globalAlpha = 1;
}

// ── Fog ─────────────────────────────────────────────────────

function _drawFog(ctx, _ts) {
  // Full-screen dark overlay
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Radial gradient "spotlight" cut-out around the player using destination-out
  const spotRadius = 80;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  const grad = ctx.createRadialGradient(
    player.x, player.y, 0,
    player.x, player.y, spotRadius
  );
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.85)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(player.x, player.y, spotRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Banner ───────────────────────────────────────────────────

/**
 * Render the event banner text sliding in from the right for the first 2 seconds.
 */
function _drawBanner(ctx, _ts) {
  if (!activeEvent || !activeEvent.banner) return;

  const elapsed = activeEvent.maxTime - activeEvent.timer;
  const slideDuration = 2000; // ms

  // Slide in from right: 0 = fully off-screen right, 1 = fully on-screen
  let progress = Math.min(1, elapsed / slideDuration);
  // Ease-out cubic
  progress = 1 - Math.pow(1 - progress, 3);

  const bannerY = H * 0.15;
  const textOffX = (1 - progress) * (W + 200);

  ctx.save();
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const text = activeEvent.banner;
  const drawX = W / 2 + textOffX;

  // Black outline / stroke
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.strokeText(text, drawX, bannerY);

  // White fill
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, drawX, bannerY);

  ctx.restore();
}
