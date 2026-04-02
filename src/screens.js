import { W, H, COLORS, SPRITE_SCALE } from './constants.js';
import { drawSprite, STARTER_SPRITES } from './sprites.js';
import { getStarterNames, getStarterDef, player } from './player.js';
import { drawStarfield } from './renderer.js';

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

export function drawTitleScreen(ctx, ts, dt) {
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
  ctx.fillText('\u2190 \u2192 to choose  \u2022  ENTER to confirm', W / 2, H - 16);

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

  // "PRESS ENTER TO PLAY AGAIN" blinking after tally
  if (tallyDone && Math.floor(gameOverTimer / 500) % 2 === 0) {
    ctx.font = 'bold 18px monospace';
    drawTextWithOutline(ctx, 'PRESS ENTER TO PLAY AGAIN', W / 2, H / 2 + 65, '#ffffff', 2);
  }

  ctx.restore();
}
