import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./sprites.js', () => ({
  drawSprite: vi.fn(),
  STARTER_SPRITES: {},
}));

vi.mock('./tracking.js', () => ({
  tracking: { x: 400, y: 375 },
}));

import {
  player,
  selectStarter,
  resetPlayer,
  getStarterDef,
  getStarterNames,
  getHitboxRadius,
  shouldEvolve,
  evolve,
  finishEvolving,
  updatePlayer,
} from './player.js';
import { tracking } from './tracking.js';
import { W, H, BASE_LIVES, PLAYER_BASE_SIZE, PLAYER_SIZE_GROWTH, EVOLUTION_SCORES } from './constants.js';

beforeEach(() => {
  selectStarter('charmander');
  tracking.x = W / 2;
  tracking.y = H * 0.75;
});

describe('selectStarter', () => {
  it('sets starter name and resets stage to 0', () => {
    player.stage = 2;
    selectStarter('bulbasaur');
    expect(player.starter).toBe('bulbasaur');
    expect(player.stage).toBe(0);
  });

  it('gives charmander base lives with no bonus', () => {
    selectStarter('charmander');
    expect(player.lives).toBe(BASE_LIVES);
  });

  it('gives bulbasaur one extra life', () => {
    selectStarter('bulbasaur');
    expect(player.lives).toBe(BASE_LIVES + 1);
  });

  it('gives squirtle base lives with no bonus', () => {
    selectStarter('squirtle');
    expect(player.lives).toBe(BASE_LIVES);
  });

  it('places player at canvas center', () => {
    selectStarter('squirtle');
    expect(player.x).toBe(W / 2);
    expect(player.y).toBe(H * 0.75);
    expect(player.smoothX).toBe(W / 2);
    expect(player.smoothY).toBe(H * 0.75);
  });

  it('clears invincibility and evolving flags', () => {
    player.invincible = true;
    player.invincibleTimer = 999;
    player.evolving = true;
    selectStarter('charmander');
    expect(player.invincible).toBe(false);
    expect(player.invincibleTimer).toBe(0);
    expect(player.evolving).toBe(false);
  });
});

describe('resetPlayer', () => {
  it('resets stage and position', () => {
    player.stage = 2;
    player.x = 100;
    resetPlayer();
    expect(player.stage).toBe(0);
    expect(player.x).toBe(W / 2);
  });

  it('restores lives according to selected starter bonus', () => {
    selectStarter('bulbasaur');
    player.lives = 0;
    resetPlayer();
    expect(player.lives).toBe(BASE_LIVES + 1);
  });

  it('clears invincibility and evolving flags', () => {
    player.invincible = true;
    player.evolving = true;
    resetPlayer();
    expect(player.invincible).toBe(false);
    expect(player.evolving).toBe(false);
  });
});

describe('getStarterDef', () => {
  it('returns squirtle definition with berry magnet', () => {
    selectStarter('squirtle');
    expect(getStarterDef().berryMagnet).toBe(true);
  });

  it('returns charmander definition with fast fire', () => {
    selectStarter('charmander');
    expect(getStarterDef().fastFire).toBe(true);
  });

  it('returns bulbasaur definition with lives bonus', () => {
    selectStarter('bulbasaur');
    expect(getStarterDef().livesBonus).toBe(1);
  });
});

describe('getStarterNames', () => {
  it('returns all three starter names', () => {
    expect(getStarterNames()).toEqual(['charmander', 'bulbasaur', 'squirtle']);
  });
});

describe('getHitboxRadius', () => {
  it('returns base size at stage 0', () => {
    player.stage = 0;
    expect(getHitboxRadius()).toBe(PLAYER_BASE_SIZE);
  });

  it('grows by PLAYER_SIZE_GROWTH at stage 1', () => {
    player.stage = 1;
    expect(getHitboxRadius()).toBe(PLAYER_BASE_SIZE + PLAYER_SIZE_GROWTH);
  });

  it('grows by 2x PLAYER_SIZE_GROWTH at stage 2', () => {
    player.stage = 2;
    expect(getHitboxRadius()).toBe(PLAYER_BASE_SIZE + PLAYER_SIZE_GROWTH * 2);
  });
});

describe('shouldEvolve', () => {
  it('returns true at first evolution threshold from stage 0', () => {
    player.stage = 0;
    expect(shouldEvolve(EVOLUTION_SCORES[0])).toBe(true);
  });

  it('returns false one below first evolution threshold', () => {
    player.stage = 0;
    expect(shouldEvolve(EVOLUTION_SCORES[0] - 1)).toBe(false);
  });

  it('returns true at second evolution threshold from stage 1', () => {
    player.stage = 1;
    expect(shouldEvolve(EVOLUTION_SCORES[1])).toBe(true);
  });

  it('returns false at max stage regardless of score', () => {
    player.stage = 2;
    expect(shouldEvolve(9999)).toBe(false);
  });
});

describe('evolve / finishEvolving', () => {
  it('increments stage and sets evolving flag', () => {
    player.stage = 0;
    evolve();
    expect(player.stage).toBe(1);
    expect(player.evolving).toBe(true);
  });

  it('finishEvolving clears the evolving flag', () => {
    player.evolving = true;
    finishEvolving();
    expect(player.evolving).toBe(false);
  });
});

describe('updatePlayer', () => {
  it('moves smoothX/Y toward tracking position', () => {
    player.smoothX = 400;
    player.smoothY = 300;
    tracking.x = 600;
    tracking.y = 200;
    updatePlayer(16);
    expect(player.smoothX).toBeCloseTo(400 + (600 - 400) * 0.35);
    expect(player.smoothY).toBeCloseTo(300 + (200 - 300) * 0.35);
    expect(player.x).toBe(player.smoothX);
    expect(player.y).toBe(player.smoothY);
  });

  it('clamps position to canvas boundaries', () => {
    player.smoothX = 0;
    player.smoothY = 0;
    tracking.x = 0;
    tracking.y = 0;
    updatePlayer(16);
    const radius = getHitboxRadius();
    expect(player.x).toBeGreaterThanOrEqual(radius);
    expect(player.y).toBeGreaterThanOrEqual(radius);
    tracking.x = W;
    tracking.y = H;
    player.smoothX = W;
    player.smoothY = H;
    updatePlayer(16);
    expect(player.x).toBeLessThanOrEqual(W - radius);
    expect(player.y).toBeLessThanOrEqual(H - radius);
  });

  it('inverts target coordinates when controlsReversed', () => {
    player.smoothX = W / 2;
    player.smoothY = H / 2;
    tracking.x = 200;
    tracking.y = 100;
    updatePlayer(16, true);
    // reversed target: (W-200, H-100) = (600, 400), both beyond canvas center
    expect(player.x).toBeGreaterThan(W / 2);
    expect(player.y).toBeGreaterThan(H / 2);
  });

  it('pushes player to left edge of blockRect when closer to left side', () => {
    player.smoothX = 350;
    player.smoothY = H / 2;
    tracking.x = 350;
    tracking.y = H / 2;
    updatePlayer(16, false, { x: 300, y: 0, w: 200, h: H });
    // distLeft=50 < distRight=150 → pushed to x=300
    expect(player.x).toBe(300);
  });

  it('pushes player to right edge of blockRect when closer to right side', () => {
    player.smoothX = 450;
    player.smoothY = H / 2;
    tracking.x = 450;
    tracking.y = H / 2;
    updatePlayer(16, false, { x: 300, y: 0, w: 200, h: H });
    // distLeft=150 > distRight=50 → pushed to right edge x+w=500
    expect(player.x).toBe(500);
  });

  it('decrements invincibleTimer and clears invincibility when expired', () => {
    player.invincible = true;
    player.invincibleTimer = 100;
    updatePlayer(200);
    expect(player.invincible).toBe(false);
    expect(player.invincibleTimer).toBe(0);
  });

  it('keeps invincibility active while timer has not expired', () => {
    player.invincible = true;
    player.invincibleTimer = 1000;
    updatePlayer(100);
    expect(player.invincible).toBe(true);
    expect(player.invincibleTimer).toBe(900);
  });
});
