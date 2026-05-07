import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./player.js', () => {
  const player = { x: 400, y: 250, smoothX: 400, smoothY: 250, invincible: false };
  return { player, getHitboxRadius: vi.fn(() => 28) };
});

vi.mock('./renderer.js', () => ({
  triggerShake: vi.fn(),
}));

vi.mock('./sprites.js', () => ({
  drawSprite: vi.fn(),
  POKEBALL_SPRITES: {},
  WILD_SPRITES: {},
  EMBER_SPRITE: { data: [], palette: {} },
}));

import {
  getObstacles,
  clearObstacles,
  spawnObstacle,
  updateObstacles,
  checkCollisions,
  setOnDodgedCallback,
} from './obstacles.js';
import { player, getHitboxRadius } from './player.js';
import { triggerShake } from './renderer.js';
import { OBSTACLE_SPEEDS, OBSTACLE_RADII, MAX_OBSTACLES, H, W } from './constants.js';

beforeEach(() => {
  vi.clearAllMocks();
  clearObstacles();
  player.smoothX = 400;
  player.smoothY = 250;
  player.invincible = false;
  getHitboxRadius.mockReturnValue(28);
  setOnDodgedCallback(null);
});

describe('getObstacles / clearObstacles', () => {
  it('starts empty', () => {
    expect(getObstacles()).toHaveLength(0);
  });

  it('clearObstacles empties the array', () => {
    spawnObstacle('pokeball');
    clearObstacles();
    expect(getObstacles()).toHaveLength(0);
  });
});

describe('spawnObstacle', () => {
  it('adds an obstacle with correct type, speed, and radius', () => {
    spawnObstacle('pokeball');
    const obs = getObstacles();
    expect(obs).toHaveLength(1);
    expect(obs[0].type).toBe('pokeball');
    expect(obs[0].speed).toBe(OBSTACLE_SPEEDS.pokeball);
    expect(obs[0].radius).toBe(OBSTACLE_RADII.pokeball);
  });

  it('does not spawn beyond MAX_OBSTACLES', () => {
    for (let i = 0; i < MAX_OBSTACLES + 5; i++) {
      spawnObstacle('pokeball');
    }
    expect(getObstacles()).toHaveLength(MAX_OBSTACLES);
  });

  it('spawns standard obstacles above the canvas', () => {
    spawnObstacle('zubat');
    expect(getObstacles()[0].y).toBeLessThan(0);
  });

  it('spawns pidgey from a horizontal edge', () => {
    spawnObstacle('pidgey');
    const [ob] = getObstacles();
    const radius = OBSTACLE_RADII.pidgey;
    expect(ob.x === W + radius || ob.x === -radius).toBe(true);
  });

  it('spawns ember with 3 fireballs', () => {
    spawnObstacle('ember');
    const [ob] = getObstacles();
    expect(ob.embers).toHaveLength(3);
  });

  it('spawns each fireball with distinct vx', () => {
    spawnObstacle('ember');
    const { embers } = getObstacles()[0];
    expect(embers[0].vx).not.toBe(embers[1].vx);
    expect(embers[2].vx).not.toBe(embers[1].vx);
  });
});

describe('updateObstacles', () => {
  it('moves pokeball straight down each frame', () => {
    spawnObstacle('pokeball');
    const [ob] = getObstacles();
    const startX = ob.x;
    const startY = ob.y;
    updateObstacles(100);
    expect(ob.y).toBeGreaterThan(startY);
    expect(ob.x).toBeCloseTo(startX);
  });

  it('removes a pokeball that exits the bottom', () => {
    spawnObstacle('pokeball');
    getObstacles()[0].y = H + 31;
    updateObstacles(1);
    expect(getObstacles()).toHaveLength(0);
  });

  it('calls onDodgedCallback when a falling obstacle exits the bottom', () => {
    const cb = vi.fn();
    setOnDodgedCallback(cb);
    spawnObstacle('pokeball');
    getObstacles()[0].y = H + 31;
    updateObstacles(1);
    expect(cb).toHaveBeenCalledWith('pokeball');
  });

  it('does not call onDodgedCallback for pidgey exiting the side', () => {
    const cb = vi.fn();
    setOnDodgedCallback(cb);
    spawnObstacle('pidgey');
    const [ob] = getObstacles();
    ob.fromRight = true;
    ob.x = -ob.radius - 21;
    updateObstacles(1);
    expect(getObstacles()).toHaveLength(0);
    expect(cb).not.toHaveBeenCalled();
  });

  it('removes pidgey when it exits on its travel side', () => {
    spawnObstacle('pidgey');
    const [ob] = getObstacles();
    ob.fromRight = false;
    ob.x = W + ob.radius + 21;
    updateObstacles(1);
    expect(getObstacles()).toHaveLength(0);
  });

  it('masterball drifts toward player.smoothX', () => {
    player.smoothX = 600;
    spawnObstacle('masterball');
    const [ob] = getObstacles();
    ob.x = 400;
    updateObstacles(100);
    expect(ob.x).toBeGreaterThan(400);
  });

  it('triggers screen shake when geodude exits the bottom', () => {
    spawnObstacle('geodude');
    getObstacles()[0].y = H + 29;
    updateObstacles(100);
    expect(triggerShake).toHaveBeenCalledWith(5, 180);
  });
});

describe('checkCollisions', () => {
  it('returns empty array when player is invincible', () => {
    player.invincible = true;
    spawnObstacle('pokeball');
    const [ob] = getObstacles();
    ob.x = player.smoothX;
    ob.y = player.smoothY;
    expect(checkCollisions()).toEqual([]);
    expect(getObstacles()).toHaveLength(1);
  });

  it('detects circle-circle hit and removes the obstacle', () => {
    spawnObstacle('pokeball');
    const [ob] = getObstacles();
    ob.x = player.smoothX + 5;
    ob.y = player.smoothY;
    const hits = checkCollisions();
    expect(hits).toHaveLength(1);
    expect(hits[0].type).toBe('pokeball');
    expect(getObstacles()).toHaveLength(0);
  });

  it('misses when obstacle is far from player', () => {
    spawnObstacle('pokeball');
    const [ob] = getObstacles();
    ob.x = player.smoothX + 200;
    ob.y = player.smoothY;
    expect(checkCollisions()).toHaveLength(0);
    expect(getObstacles()).toHaveLength(1);
  });

  it('detects ember hit on any individual fireball', () => {
    spawnObstacle('ember');
    const [ob] = getObstacles();
    ob.embers[0].x = player.smoothX + 5;
    ob.embers[0].y = player.smoothY;
    ob.embers[1].x = player.smoothX + 500;
    ob.embers[1].y = player.smoothY;
    ob.embers[2].x = player.smoothX + 500;
    ob.embers[2].y = player.smoothY;
    expect(checkCollisions()).toHaveLength(1);
  });

  it('misses ember when all fireballs are far from player', () => {
    spawnObstacle('ember');
    const [ob] = getObstacles();
    ob.embers.forEach(fb => { fb.x = player.smoothX + 500; fb.y = player.smoothY; });
    expect(checkCollisions()).toHaveLength(0);
  });

  it('detects watergun hit within rectangle bounds', () => {
    spawnObstacle('watergun');
    const [ob] = getObstacles();
    ob.x = player.smoothX + 10; // |10| < pr+4=32
    ob.y = player.smoothY + 10; // |10| < pr+30=58
    expect(checkCollisions()).toHaveLength(1);
  });

  it('misses watergun outside horizontal bounds', () => {
    spawnObstacle('watergun');
    const [ob] = getObstacles();
    ob.x = player.smoothX + 100; // |100| > 32
    ob.y = player.smoothY;
    expect(checkCollisions()).toHaveLength(0);
  });

  it('detects vinewhip hit when player is within vine range', () => {
    spawnObstacle('vinewhip');
    const [ob] = getObstacles();
    // vineLeft = ob.x-60, vineRight = ob.x+20; player at smoothX must be between them
    ob.x = player.smoothX + 10; // vineLeft=smoothX-50, vineRight=smoothX+30
    ob.vineY = player.smoothY + 5; // |5| < pr+4=32
    expect(checkCollisions()).toHaveLength(1);
  });

  it('misses vinewhip when player is outside vine horizontal range', () => {
    spawnObstacle('vinewhip');
    const [ob] = getObstacles();
    ob.x = player.smoothX + 200; // vineLeft=smoothX+140, player < vineLeft
    ob.vineY = player.smoothY;
    expect(checkCollisions()).toHaveLength(0);
  });
});
