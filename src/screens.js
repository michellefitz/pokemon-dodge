import { W, H, COLORS, SPRITE_SCALE } from './constants.js';
import {
  drawSprite,
  STARTER_SPRITES,
  POKEBALL_SPRITES,
  WILD_SPRITES,
  BERRY_SPRITES,
} from './sprites.js';
import { getStarterNames, getStarterDef, player } from './player.js';
import { drawStarfield } from './renderer.js';
import { getCachedScores, isLeaderboardLoading } from './leaderboard.js';
import { tracking } from './tracking.js';

// ============================================================
// HELPERS
// ============================================================

function drawTextWithOutline(ctx, text, x, y, fillColor, outlineWidth = 3) {
  ctx.lineWidth = outlineWidth * 2;
  ctx.strokeStyle = '#000000';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

// ============================================================
// 1. TITLE SCREEN
// ============================================================

let titleBlink = 0;

// Hit area for the "How to Play" link shown to returning players
export const HOW_TO_PLAY_BUTTON = { x: W / 2 - 55, y: H - 44, w: 110, h: 20 };

export function isHowToPlayHit(pos) {
  return pos.x >= HOW_TO_PLAY_BUTTON.x && pos.x <= HOW_TO_PLAY_BUTTON.x + HOW_TO_PLAY_BUTTON.w
      && pos.y >= HOW_TO_PLAY_BUTTON.y && pos.y <= HOW_TO_PLAY_BUTTON.y + HOW_TO_PLAY_BUTTON.h;
}

export function drawTitleScreen(ctx, ts, dt, isReturning = false) {
  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Starfield
  drawStarfield(ctx, dt);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "POKEMON"
  ctx.font = 'bold 48px monospace';
  drawTextWithOutline(ctx, 'POKEMON', W / 2, H / 2 - 90, COLORS.scoreYellow, 4);

  // "DODGE"
  ctx.font = 'bold 36px monospace';
  drawTextWithOutline(ctx, 'DODGE', W / 2, H / 2 - 38, '#ffffff', 3);

  // Three starter sprites bobbing
  const starterNames = getStarterNames(); // ['charmander', 'bulbasaur', 'squirtle']
  const spriteY = H / 2 + 30;
  const spacing = 120;
  const startX = W / 2 - spacing;

  for (let i = 0; i < starterNames.length; i++) {
    const name = starterNames[i];
    const stageSprites = STARTER_SPRITES[name]?.[0];
    if (!stageSprites) continue;

    const bob = Math.sin(ts / 600 + i * (Math.PI * 2 / 3)) * 5;
    const sx = startX + i * spacing;
    const sy = spriteY + bob;

    drawSprite(ctx, stageSprites.idle, stageSprites.palette, sx, sy, SPRITE_SCALE);
  }

  // "PRESS START" blinking every 500ms
  titleBlink += dt;
  if (Math.floor(titleBlink / 500) % 2 === 0) {
    ctx.font = 'bold 20px monospace';
    drawTextWithOutline(ctx, 'PRESS START', W / 2, H / 2 + 110, '#ffffff', 2);
  }

  // Subtitle
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px monospace';
  ctx.textBaseline = 'bottom';
  ctx.fillText('move your head to dodge  •  uses webcam', W / 2, H - 14);

  // "How to Play" link for returning players
  if (isReturning) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#aaddff';
    ctx.textBaseline = 'middle';
    ctx.fillText('How to Play', W / 2, HOW_TO_PLAY_BUTTON.y + HOW_TO_PLAY_BUTTON.h / 2);
  }

  ctx.restore();
}

// ============================================================
// 2. STARTER SELECT
// ============================================================

let selectIndex = 1; // start on middle
let selectBounce = 0;

const STARTER_PERKS = {
  charmander: '+5% speed',
  bulbasaur:  '+1 extra life',
  squirtle:   'berry magnet',
};

export function getSelectIndex() {
  return selectIndex;
}

export function moveSelect(dir) {
  selectIndex = Math.max(0, Math.min(2, selectIndex + dir));
}

export function drawSelectScreen(ctx, ts, dt) {
  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  drawStarfield(ctx, dt);

  selectBounce += dt;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 28px monospace';
  drawTextWithOutline(ctx, 'CHOOSE YOUR POKEMON', W / 2, 50, '#ffffff', 3);

  const starterNames = getStarterNames();
  const spacing = 180;
  const startX = W / 2 - spacing;
  const spriteY = H / 2 - 20;

  for (let i = 0; i < starterNames.length; i++) {
    const name = starterNames[i];
    const stageSprites = STARTER_SPRITES[name]?.[0];
    if (!stageSprites) continue;

    const isSelected = i === selectIndex;
    const scale = isSelected ? SPRITE_SCALE + 1 : SPRITE_SCALE;
    const sx = startX + i * spacing;

    // Bounce only the selected sprite
    const bob = isSelected
      ? Math.sin(selectBounce / 400) * 6
      : 0;
    const sy = spriteY + bob;

    // Yellow border rect around selected sprite
    if (isSelected) {
      const spriteW = stageSprites.idle[0].length * scale;
      const spriteH = stageSprites.idle.length * scale;
      const padX = 6;
      const padY = 6;
      ctx.save();
      ctx.strokeStyle = COLORS.scoreYellow;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        sx - spriteW / 2 - padX,
        sy - spriteH / 2 - padY,
        spriteW + padX * 2,
        spriteH + padY * 2
      );
      ctx.restore();
    }

    drawSprite(ctx, stageSprites.idle, stageSprites.palette, sx, sy, scale);

    // Name text
    const displayName = name.toUpperCase();
    ctx.font = isSelected ? 'bold 16px monospace' : '14px monospace';
    const nameColor = isSelected ? COLORS.scoreYellow : 'rgba(255,255,255,0.55)';
    const nameY = spriteY + 60;
    drawTextWithOutline(ctx, displayName, sx, nameY, nameColor, isSelected ? 2 : 1);

    // Perk text
    const perkY = nameY + 22;
    ctx.globalAlpha = isSelected ? 0.9 : 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(STARTER_PERKS[name] || '', sx, perkY);
    ctx.globalAlpha = 1;
  }

  // Instructions
  ctx.font = '14px monospace';
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'bottom';
  const isMobile = 'ontouchstart' in window;
  if (!isMobile) {
    ctx.fillText('\u2190 \u2192 to choose  \u2022  ENTER to confirm', W / 2, H - 16);
  }
  // Mobile: instruction omitted — Start button provides the affordance

  ctx.restore();
}

// ============================================================
// 3. EVOLUTION CUTSCENE
// ============================================================

let evoTimer = 0;
let evoStage = 0; // 0=flash, 1=sparkle, 2=reveal

export function startEvolutionCutscene() {
  evoTimer = 0;
  evoStage = 0;
}

export function updateEvolutionCutscene(dt) {
  evoTimer += dt;

  if (evoTimer < 400) {
    evoStage = 0;
  } else if (evoTimer < 1400) {
    evoStage = 1;
  } else {
    evoStage = 2;
  }

  return evoTimer >= 2000;
}

export function drawEvolutionCutscene(ctx, ts, dt) {
  const def = getStarterDef();
  if (!def) return;

  const prevName = def.evolutions[Math.max(0, player.stage - 1)];
  const newName  = def.evolutions[player.stage] || prevName;

  ctx.save();

  // White overlay
  let overlayAlpha;
  if (evoStage === 0) {
    // Fade in 0–400ms
    overlayAlpha = Math.min(1, evoTimer / 400) * 0.85;
  } else if (evoStage === 1) {
    // Hold lighter
    overlayAlpha = 0.4;
  } else {
    // Fade out 1400–2000ms
    const t = (evoTimer - 1400) / 600;
    overlayAlpha = Math.max(0, (1 - t)) * 0.5;
  }

  ctx.globalAlpha = overlayAlpha;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Sparkle dots during stage 1
  if (evoStage === 1) {
    const seed = Math.floor(ts / 80);
    const rng = (n) => ((seed * 1664525 + n * 22695477 + 1013904223) & 0x7fffffff) / 0x7fffffff;
    ctx.fillStyle = COLORS.scoreYellow;
    for (let i = 0; i < 24; i++) {
      const sx = rng(i * 3)     * W;
      const sy = rng(i * 3 + 1) * H;
      const sz = 2 + rng(i * 3 + 2) * 4;
      ctx.globalAlpha = 0.6 + rng(i) * 0.4;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(sz), Math.ceil(sz));
    }
    ctx.globalAlpha = 1;
  }

  // Text
  const message = evoStage < 2
    ? `What? ${prevName} is evolving!`
    : `${prevName} evolved into ${newName}!`;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px monospace';
  drawTextWithOutline(ctx, message, W / 2, H / 2 + 90, '#ffffff', 3);

  ctx.restore();
}

// ============================================================
// 4. GAME OVER
// ============================================================

let gameOverTimer = 0;
let displayedScore = 0;

export function startGameOver(finalScore) {
  gameOverTimer = 0;
  displayedScore = 0;
  // store finalScore so tally can reference it
  _gameOverFinalScore = finalScore;
}

let _gameOverFinalScore = 0;

export function drawGameOverScreen(ctx, ts, dt, finalScore) {
  gameOverTimer += dt;

  // Tally: increment ~1 per 30ms
  if (displayedScore < finalScore) {
    const increment = Math.ceil(finalScore / 60); // reach final in ~60 ticks at ~30ms each
    displayedScore = Math.min(finalScore, displayedScore + Math.max(1, Math.floor(dt / 30) * increment));
  }

  const tallyDone = displayedScore >= finalScore;

  ctx.save();

  // Dark overlay
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "GAME OVER"
  ctx.font = 'bold 40px monospace';
  drawTextWithOutline(ctx, 'GAME OVER', W / 2, H / 2 - 50, COLORS.hitRed, 4);

  // Score tally
  ctx.font = 'bold 28px monospace';
  drawTextWithOutline(ctx, `SCORE: ${displayedScore}`, W / 2, H / 2 + 10, COLORS.scoreYellow, 3);

  // After tally, show leaderboard prompt
  if (tallyDone && Math.floor(gameOverTimer / 500) % 2 === 0) {
    ctx.font = 'bold 16px monospace';
    drawTextWithOutline(ctx, 'PRESS ENTER FOR LEADERBOARD', W / 2, H / 2 + 65, '#ffffff', 2);
  }

  ctx.restore();
}

// ============================================================
// 5. ONBOARDING SCREEN 1 — The Goal
// ============================================================


// All obstacle sprites for the "Dodge" column
const _DODGE_SPRITES = [
  { sprite: POKEBALL_SPRITES.pokeball,   label: 'Pokéball'  },
  { sprite: POKEBALL_SPRITES.greatball,  label: 'Greatball' },
  { sprite: POKEBALL_SPRITES.ultraball,  label: 'Ultraball' },
  { sprite: POKEBALL_SPRITES.masterball, label: 'Masterball'},
  { sprite: WILD_SPRITES.zubat,          label: 'Zubat'     },
  { sprite: WILD_SPRITES.geodude,        label: 'Geodude'   },
  { sprite: WILD_SPRITES.gastly,         label: 'Gastly'    },
  { sprite: WILD_SPRITES.pidgey,         label: 'Pidgey'    },
];

const _BERRY_DEFS = [
  { key: 'oran',   effect: '+10 pts'    },
  { key: 'sitrus', effect: '+1 life'    },
  { key: 'rawst',  effect: 'invincible' },
  { key: 'lum',    effect: 'clear screen'},
];

export function drawOnboarding1(ctx, ts, dt) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // ── Title ──────────────────────────────────────────────────
  ctx.font = 'bold 22px monospace';
  drawTextWithOutline(ctx, 'HOW TO PLAY', W / 2, 28, COLORS.scoreYellow, 3);

  // Three column centres
  const col1X = Math.floor(W * 0.18);
  const col2X = Math.floor(W * 0.50);
  const col3X = Math.floor(W * 0.82);
  const colHeaderY = 60;

  // ── Column headers ─────────────────────────────────────────
  ctx.font = 'bold 14px monospace';
  drawTextWithOutline(ctx, 'DODGE', col1X, colHeaderY, '#ff6060', 2);
  drawTextWithOutline(ctx, 'SHOOT', col2X, colHeaderY, '#60c0ff', 2);
  drawTextWithOutline(ctx, 'BERRIES', col3X, colHeaderY, '#80e080', 2);

  // Divider lines between columns
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  const lineTop = 48;
  const lineBot = H - 55;
  ctx.beginPath();
  ctx.moveTo(Math.floor(W * 0.34), lineTop);
  ctx.lineTo(Math.floor(W * 0.34), lineBot);
  ctx.moveTo(Math.floor(W * 0.66), lineTop);
  ctx.lineTo(Math.floor(W * 0.66), lineBot);
  ctx.stroke();

  // Shared vertical centre for all three columns
  const contentMidY = Math.floor((colHeaderY + lineBot) / 2);

  // ── Column 1: Obstacle grid ────────────────────────────────
  const cellSize   = 38;
  const gridStartY = contentMidY - 19; // centres 2-row block around contentMidY
  const cols       = 4;
  const gridW      = cols * cellSize;
  const gridLeft   = col1X - gridW / 2 + cellSize / 2;

  for (let i = 0; i < _DODGE_SPRITES.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx  = gridLeft + col * cellSize;
    const sy  = gridStartY + row * cellSize;
    const s   = _DODGE_SPRITES[i].sprite;
    drawSprite(ctx, s.data, s.palette, sx, sy, 2);
  }

  // ── Column 2: Player shoots enemy ─────────────────────────
  const shootMidY = contentMidY;

  // Player starter (charmander idle as default)
  const starterSprites = STARTER_SPRITES['charmander']?.[0];
  if (starterSprites) {
    drawSprite(ctx, starterSprites.idle, starterSprites.palette, col2X - 48, shootMidY, SPRITE_SCALE);
  }

  // Arrow (projectile) going right
  ctx.strokeStyle = '#EF9F27';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;
  drawArrow(ctx, col2X - 20, shootMidY, col2X + 20, shootMidY);
  ctx.globalAlpha = 1;

  // Enemy (geodude)
  const enemySprite = WILD_SPRITES.geodude;
  drawSprite(ctx, enemySprite.data, enemySprite.palette, col2X + 50, shootMidY, SPRITE_SCALE);

  // ── Column 3: Berries ──────────────────────────────────────
  const berryRowH   = 52;
  const berryStartY = contentMidY - 92; // centres 4-item block around contentMidY

  for (let i = 0; i < _BERRY_DEFS.length; i++) {
    const def = _BERRY_DEFS[i];
    const by  = berryStartY + i * berryRowH + 14;
    const s   = BERRY_SPRITES[def.key];
    drawSprite(ctx, s.data, s.palette, col3X - 28, by, 3);

    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(def.effect, col3X - 10, by);
  }

  // ── Column captions — just below the content ──────────────
  const captionY = contentMidY + 110;
  ctx.textAlign = 'center';
  ctx.font = '12px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.fillText('Dodge obstacles', col1X, captionY);
  ctx.fillText('Shoot enemies (2 points each)', col2X, captionY);
  ctx.fillText('Collect berries', col3X, captionY);
  ctx.globalAlpha = 1;

  // ── Scoring disclaimer ─────────────────────────────────────
  ctx.font = 'italic 11px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText('(scoring subject to change)', W / 2, captionY + 18);

  // ── Blinking PRESS ENTER prompt ────────────────────────────
  if (Math.floor(ts / 500) % 2 === 0) {
    ctx.font = 'bold 15px monospace';
    drawTextWithOutline(ctx, 'PRESS ENTER TO CONTINUE', W / 2, H - 22, '#ffffff', 2);
  }

  ctx.restore();
}

// ============================================================
// 5c. ONBOARDING SCREEN 2 — Controls Practice
// ============================================================

// Internal state — reset by initOnboarding2()
let _ob2Part = 1;            // 1 = head control, 2 = hand control
let _ob2FadeAlpha = 0;       // fade-in alpha for part 2 (0→1)

/** Call when entering onboarding2 state. */
export function initOnboarding2() {
  _ob2Part = 1;
  _ob2FadeAlpha = 0;
}

/**
 * Draw onboarding screen 2.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ts   - timestamp ms
 * @param {number} dt   - frame delta ms
 * @param {number} part - 1 (head control) or 2 (hand control)
 * @param {boolean} hasFired - true once player has fired a projectile
 */
export function drawOnboarding2(ctx, ts, dt, part, hasFired) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  // Transition: fade part 1 out / part 2 in
  if (part === 2) {
    _ob2FadeAlpha = Math.min(1, _ob2FadeAlpha + dt / 300);
  }

  if (part === 1) {
    _drawOb2Part1(ctx, ts, dt);
  } else {
    // Cross-fade: part1 fades to 0, part2 fades in
    const p1Alpha = Math.max(0, 1 - _ob2FadeAlpha * 2);
    const p2Alpha = _ob2FadeAlpha;

    if (p1Alpha > 0) {
      ctx.globalAlpha = p1Alpha;
      _drawOb2Part1(ctx, ts, dt);
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = p2Alpha;
    _drawOb2Part2(ctx, ts, dt, hasFired);
    ctx.globalAlpha = 1;
  }

}

function _drawOb2Part1(ctx, ts, dt) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Player Pokemon following head position
  const px = tracking.x;
  const py = tracking.y;

  // Use the player's current starter sprite
  const starterSprites = STARTER_SPRITES[player.starter]?.[0];
  if (starterSprites) {
    drawSprite(ctx, starterSprites.idle, starterSprites.palette, px, py, SPRITE_SCALE);
  }

  // Instructions
  ctx.font = 'bold 20px monospace';
  drawTextWithOutline(ctx, 'Move your head to control your Pokémon', W / 2, H * 0.18, '#ffffff', 2);

  ctx.font = '15px monospace';
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Press Enter when ready', W / 2, H * 0.26);
  ctx.globalAlpha = 1;

  ctx.restore();
}

function _drawOb2Part2(ctx, ts, dt, hasFired) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Live Pokemon at head position — same as real gameplay
  const px = tracking.x;
  const py = tracking.y;
  const starterSprites = STARTER_SPRITES[player.starter]?.[0];
  if (starterSprites) {
    drawSprite(ctx, starterSprites.idle, starterSprites.palette, px, py, SPRITE_SCALE);
  }

  // Main instruction
  ctx.font = 'bold 20px monospace';
  drawTextWithOutline(ctx, 'Open your hands to fire', W / 2, H * 0.10, '#ffffff', 2);

  // Prompt changes after first shot
  const prompt = hasFired
    ? 'Press Enter to start playing!'
    : 'Raise an open hand toward the camera';

  ctx.font = '15px monospace';
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = hasFired ? COLORS.scoreYellow : '#ffffff';
  ctx.fillText(prompt, W / 2, H * 0.18);
  ctx.globalAlpha = 1;

  // Blinking Enter prompt once they've fired
  if (hasFired && Math.floor(ts / 500) % 2 === 0) {
    ctx.font = 'bold 15px monospace';
    drawTextWithOutline(ctx, 'PRESS ENTER TO CONTINUE', W / 2, H - 22, '#ffffff', 2);
  }

  // Draw any live projectiles so the player sees the effect
  // (projectiles are drawn by main.js calling drawProjectiles separately)

  ctx.restore();
}

// ============================================================
// 5b. INSTRUCTIONS SCREEN (legacy — replaced by onboarding)
// ============================================================

export function drawInstructionsScreen(ctx, ts, dt) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 28px monospace';
  drawTextWithOutline(ctx, 'HOW TO PLAY', W / 2, 50, COLORS.scoreYellow, 3);

  // --- Head movement illustration (left side) ---
  const headX = W * 0.28;
  const headY = 175;

  // Draw a simple head circle with arrows
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.arc(headX, headY, 22, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(headX - 7, headY - 4, 4, 0, Math.PI * 2);
  ctx.arc(headX + 7, headY - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(headX - 7, headY - 4, 2, 0, Math.PI * 2);
  ctx.arc(headX + 7, headY - 4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Arrows around head (left, right, up, down)
  ctx.strokeStyle = COLORS.scoreYellow;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.9;
  const arrowLen = 20;
  const arrowGap = 32;

  // Left arrow
  drawArrow(ctx, headX - arrowGap, headY, headX - arrowGap - arrowLen, headY);
  // Right arrow
  drawArrow(ctx, headX + arrowGap, headY, headX + arrowGap + arrowLen, headY);
  // Up arrow
  drawArrow(ctx, headX, headY - arrowGap, headX, headY - arrowGap - arrowLen);
  // Down arrow
  drawArrow(ctx, headX, headY + arrowGap, headX, headY + arrowGap + arrowLen);

  ctx.globalAlpha = 1;

  // Head movement text
  ctx.font = '14px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('Move your head left & right', headX, headY + 70);
  ctx.fillText('Tilt up & down to dodge', headX, headY + 90);

  // --- Hand shooting illustration (right side) ---
  const handX = W * 0.72;
  const handY = 175;

  // Closed fist (left)
  ctx.globalAlpha = 0.5;
  drawFist(ctx, handX - 50, handY);

  // Arrow between
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = COLORS.scoreYellow;
  ctx.lineWidth = 2;
  drawArrow(ctx, handX - 22, handY, handX + 22, handY);

  // Open hand (right)
  ctx.globalAlpha = 0.9;
  drawOpenHand(ctx, handX + 50, handY);

  // Projectile coming from open hand
  ctx.fillStyle = '#EF9F27';
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(handX + 90 + i * 18, handY, 4 - i, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  // Hand text
  ctx.font = '14px monospace';
  ctx.fillStyle = '#fff';
  const isMobileInstr = 'ontouchstart' in window;
  if (isMobileInstr) {
    ctx.fillText('Tap the screen to shoot', handX, handY + 70);
    ctx.fillText('toward where you tap!', handX, handY + 90);
  } else {
    ctx.fillText('Open your hand to shoot', handX, handY + 70);
    ctx.fillText('Close fist to stop firing', handX, handY + 90);
  }

  // Goal section
  ctx.font = 'bold 18px monospace';
  drawTextWithOutline(ctx, 'GOAL: Score the highest points!', W / 2, 340, '#fff', 2);

  ctx.font = '13px monospace';
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#fff';
  ctx.fillText('Dodge obstacles  •  Collect berries  •  Shoot enemies', W / 2, 370);
  ctx.fillText('Your Pokemon evolves as you score higher!', W / 2, 390);
  ctx.globalAlpha = 1;

  // Continue prompt
  if (Math.floor(ts / 500) % 2 === 0) {
    ctx.font = 'bold 16px monospace';
    drawTextWithOutline(ctx, 'PRESS ENTER TO CONTINUE', W / 2, H - 40, '#fff', 2);
  }

  ctx.restore();
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = 8;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - 0.4), toY - headLen * Math.sin(angle - 0.4));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle + 0.4), toY - headLen * Math.sin(angle + 0.4));
  ctx.stroke();
}

function drawFist(ctx, x, y) {
  // Simple fist: rounded rectangle
  ctx.fillStyle = '#c4956a';
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Knuckle lines
  ctx.strokeStyle = '#a07850';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 4);
  ctx.lineTo(x + 8, y - 4);
  ctx.moveTo(x - 6, y + 2);
  ctx.lineTo(x + 6, y + 2);
  ctx.stroke();
}

function drawOpenHand(ctx, x, y) {
  // Palm
  ctx.fillStyle = '#c4956a';
  ctx.beginPath();
  ctx.arc(x, y + 4, 14, 0, Math.PI * 2);
  ctx.fill();

  // Fingers (5 lines going up)
  ctx.strokeStyle = '#c4956a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const fingers = [-12, -6, 0, 6, 12];
  const lengths = [14, 20, 22, 20, 14];
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + fingers[i], y - 2);
    ctx.lineTo(x + fingers[i], y - 2 - lengths[i]);
    ctx.stroke();
  }

  // Outline
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(x, y + 4, 14, 0, Math.PI * 2);
  ctx.stroke();
}

// ============================================================
// 6. ENTER NAME SCREEN
// ============================================================

let playerName = '';

export function getPlayerName() {
  return playerName;
}

export function handleNameKeydown(e) {
  if (e.key === 'Backspace') {
    playerName = playerName.slice(0, -1);
    return 'typing';
  }
  if (e.key === 'Enter' && playerName.length > 0) {
    return 'done';
  }
  // Accept letters, numbers, spaces — max 12 chars
  if (playerName.length < 12 && /^[a-zA-Z0-9 ]$/.test(e.key)) {
    playerName += e.key;
    return 'typing';
  }
  return 'typing';
}

export function resetName() {
  playerName = '';
}

export function setPlayerName(name) {
  playerName = name;
}

export function drawEnterNameScreen(ctx, ts, dt) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 28px monospace';
  drawTextWithOutline(ctx, 'ENTER YOUR NAME', W / 2, H * 0.3, COLORS.scoreYellow, 3);

  // Name input box
  const boxW = 280;
  const boxH = 50;
  const boxX = W / 2 - boxW / 2;
  const boxY = H * 0.45 - boxH / 2;

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Name text
  ctx.font = 'bold 24px monospace';
  const displayName = playerName + (Math.floor(ts / 400) % 2 === 0 ? '_' : '');
  ctx.fillStyle = '#fff';
  ctx.fillText(displayName || '_', W / 2, H * 0.45);

  // Instruction
  ctx.font = '14px monospace';
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#fff';
  ctx.fillText('Type your name and press ENTER', W / 2, H * 0.6);
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ============================================================
// 7. LEADERBOARD SCREEN
// ============================================================

let leaderboardScrollY = 0;

export function resetLeaderboardScroll() {
  leaderboardScrollY = 0;
}

export function drawLeaderboardScreen(ctx, ts, dt, playerScore, playerNameStr) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 28px monospace';
  drawTextWithOutline(ctx, 'LEADERBOARD', W / 2, 45, COLORS.scoreYellow, 3);

  const scores = getCachedScores();

  if (scores.length === 0) {
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const emptyMsg = isLeaderboardLoading() ? 'Loading...' : 'No scores yet — you could be first!';
    ctx.fillText(emptyMsg, W / 2, H / 2);
  } else {
    // Table header
    const tableTop = 85;
    const rowH = 28;
    const rankX = W / 2 - 200;
    const nameX = W / 2 - 80;
    const scoreX = W / 2 + 180;

    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('RANK', rankX, tableTop);
    ctx.fillText('NAME', nameX, tableTop);
    ctx.textAlign = 'right';
    ctx.fillText('SCORE', scoreX, tableTop);

    // Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rankX, tableTop + 12);
    ctx.lineTo(scoreX, tableTop + 12);
    ctx.stroke();

    // Scores — show top 10 that fit on screen
    const maxVisible = 10;
    const visibleScores = scores.slice(0, maxVisible);

    for (let i = 0; i < visibleScores.length; i++) {
      const entry = visibleScores[i];
      const y = tableTop + 30 + i * rowH;
      const rank = i + 1;

      // Parse name (remove the ::timestamp suffix)
      const name = entry.name.split('::')[0];

      // Highlight if this is the player's score
      const isPlayer = name === playerNameStr && entry.score === playerScore;

      if (isPlayer) {
        // Highlight row
        ctx.fillStyle = 'rgba(239, 159, 39, 0.15)';
        ctx.fillRect(rankX - 10, y - 10, scoreX - rankX + 20, rowH);
      }

      // Rank
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = rank <= 3 ? COLORS.scoreYellow : '#fff';
      ctx.fillText(`${rank}.`, rankX, y);

      // Rank emoji for top 3
      if (rank === 1) ctx.fillText(' 👑', rankX + 20, y);

      // Name
      ctx.textAlign = 'left';
      ctx.font = isPlayer ? 'bold 15px monospace' : '15px monospace';
      ctx.fillStyle = isPlayer ? COLORS.scoreYellow : '#fff';
      ctx.fillText(name, nameX, y);

      // Score
      ctx.textAlign = 'right';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`${entry.score}`, scoreX, y);
    }

    if (scores.length > maxVisible) {
      ctx.textAlign = 'center';
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`+ ${scores.length - maxVisible} more`, W / 2, tableTop + 30 + maxVisible * rowH + 10);
    }
  }

  // Your score summary
  ctx.textAlign = 'center';
  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`Your score: ${playerScore}`, W / 2, H - 70);

  // Play again prompt
  if (Math.floor(ts / 500) % 2 === 0) {
    ctx.font = 'bold 16px monospace';
    drawTextWithOutline(ctx, 'PRESS ENTER TO PLAY AGAIN', W / 2, H - 35, '#fff', 2);
  }

  ctx.restore();
}
