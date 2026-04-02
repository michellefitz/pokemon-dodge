import { W, H, BASE_LIVES, PLAYER_BASE_SIZE, PLAYER_SIZE_GROWTH, SMOOTHING_FACTOR, EVOLUTION_SCORES, SPRITE_SCALE } from './constants.js';
import { drawSprite, STARTER_SPRITES } from './sprites.js';
import { tracking } from './tracking.js';

const STARTERS = {
  charmander: {
    name: 'Charmander',
    evolutions: ['Charmander', 'Charmeleon', 'Charizard'],
    speedBonus: 1.05,
    livesBonus: 0,
    berryMagnet: false,
  },
  bulbasaur: {
    name: 'Bulbasaur',
    evolutions: ['Bulbasaur', 'Ivysaur', 'Venusaur'],
    speedBonus: 1.0,
    livesBonus: 1,
    berryMagnet: false,
  },
  squirtle: {
    name: 'Squirtle',
    evolutions: ['Squirtle', 'Wartortle', 'Blastoise'],
    speedBonus: 1.0,
    livesBonus: 0,
    berryMagnet: true,
  },
};

export const player = {
  starter: null,     // 'charmander' | 'bulbasaur' | 'squirtle'
  stage: 0,          // 0, 1, 2
  x: W / 2,
  y: H * 0.75,
  smoothX: W / 2,
  smoothY: H * 0.75,
  lives: BASE_LIVES,
  invincible: false,
  invincibleTimer: 0,
  evolving: false,
};

export function selectStarter(name) {
  player.starter = name;
  player.stage = 0;
  const def = STARTERS[name];
  player.lives = BASE_LIVES + (def ? def.livesBonus : 0);
  player.x = W / 2;
  player.y = H * 0.75;
  player.smoothX = W / 2;
  player.smoothY = H * 0.75;
  player.invincible = false;
  player.invincibleTimer = 0;
  player.evolving = false;
}

export function resetPlayer() {
  player.stage = 0;
  const def = getStarterDef();
  player.lives = BASE_LIVES + (def ? def.livesBonus : 0);
  player.invincible = false;
  player.invincibleTimer = 0;
  player.evolving = false;
  player.x = W / 2;
  player.y = H * 0.75;
  player.smoothX = W / 2;
  player.smoothY = H * 0.75;
}

export function getStarterDef() {
  return STARTERS[player.starter];
}

export function getStarterNames() {
  return Object.keys(STARTERS);
}

export function getHitboxRadius() {
  return PLAYER_BASE_SIZE + player.stage * PLAYER_SIZE_GROWTH;
}

export function shouldEvolve(score) {
  return player.stage < 2 && score >= EVOLUTION_SCORES[player.stage];
}

export function evolve() {
  player.stage++;
  player.evolving = true;
}

export function finishEvolving() {
  player.evolving = false;
}

export function updatePlayer(dt, controlsReversed = false) {
  const def = getStarterDef();
  const speedBonus = def ? def.speedBonus : 1.0;

  const targetX = controlsReversed ? W - tracking.x : tracking.x;
  const targetY = controlsReversed ? H - tracking.y : tracking.y;

  const smoothing = SMOOTHING_FACTOR * speedBonus;
  player.smoothX += (targetX - player.smoothX) * smoothing;
  player.smoothY += (targetY - player.smoothY) * smoothing;

  const radius = getHitboxRadius();
  player.smoothX = Math.max(radius, Math.min(W - radius, player.smoothX));
  player.smoothY = Math.max(radius, Math.min(H - radius, player.smoothY));

  player.x = player.smoothX;
  player.y = player.smoothY;

  if (player.invincible) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
      player.invincibleTimer = 0;
    }
  }
}

export function drawPlayer(ctx, ts) {
  if (!player.starter) return;

  // Flash every 100ms when invincible
  if (player.invincible && Math.floor(ts / 100) % 2 === 1) return;

  const stageSprites = STARTER_SPRITES[player.starter]?.[player.stage];
  if (!stageSprites) return;

  // Determine movement direction for pose selection
  const dx = tracking.x - player.x;
  let sprite;
  if (dx < -2) {
    sprite = stageSprites.left;
  } else if (dx > 2) {
    sprite = stageSprites.right;
  } else {
    sprite = stageSprites.idle;
  }

  drawSprite(ctx, sprite, stageSprites.palette, player.x, player.y, SPRITE_SCALE);
}
