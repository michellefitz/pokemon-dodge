// Canvas
export const W = 800;
export const H = 500;

// Colors
export const COLORS = {
  bg: '#1a1a2e',
  bgDark: '#0f0f1a',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  scoreYellow: '#EF9F27',
  hpGreen: '#1D9E75',
  hitRed: '#E24B4A',
};

// Player
export const BASE_LIVES = 3;
export const PLAYER_BASE_SIZE = 28;
export const PLAYER_SIZE_GROWTH = 4;
export const SMOOTHING_FACTOR = 0.18;

// Waves
export const WAVES = [
  {
    name: 'Wave 1',
    minScore: 0,
    maxScore: 15,
    spawnInterval: 1200,
    obstacles: { pokeball: 1 },
    berryChance: 0,
  },
  {
    name: 'Wave 2',
    minScore: 16,
    maxScore: 35,
    spawnInterval: 1000,
    obstacles: { pokeball: 3, greatball: 2, zubat: 1 },
    berryChance: 0.125,
  },
  {
    name: 'Wave 3',
    minScore: 36,
    maxScore: 60,
    spawnInterval: 850,
    obstacles: { pokeball: 2, greatball: 3, ultraball: 2, zubat: 2, geodude: 1 },
    berryChance: 0.125,
  },
  {
    name: 'Wave 4',
    minScore: 61,
    maxScore: 99,
    spawnInterval: 700,
    obstacles: { greatball: 2, ultraball: 3, zubat: 2, geodude: 2, gastly: 1, pidgey: 1, ember: 1, watergun: 1, vinewhip: 1 },
    berryChance: 0.15,
    eventsEnabled: true,
  },
  {
    name: 'Wave 5',
    minScore: 100,
    maxScore: Infinity,
    spawnInterval: 500,
    obstacles: { greatball: 1, ultraball: 3, masterball: 1, zubat: 2, geodude: 2, gastly: 2, pidgey: 2, ember: 2, watergun: 1, vinewhip: 1 },
    berryChance: 0.15,
    eventsEnabled: true,
  },
];

// Evolution thresholds
export const EVOLUTION_SCORES = [40, 80];

// Obstacle speeds
export const OBSTACLE_SPEEDS = {
  pokeball: 2.0,
  greatball: 3.0,
  ultraball: 4.5,
  masterball: 5.5,
  zubat: 3.0,
  geodude: 2.0,
  gastly: 2.5,
  pidgey: 4.0,
  ember: 3.5,
  watergun: 3.5,
  vinewhip: 3.0,
};

// Obstacle hitbox radii
export const OBSTACLE_RADII = {
  pokeball: 10,
  greatball: 12,
  ultraball: 11,
  masterball: 11,
  zubat: 14,
  geodude: 20,
  gastly: 16,
  pidgey: 14,
  ember: 8,
};

export const MAX_OBSTACLES = 8;
export const SPAWN_SAFE_MARGIN = 60;

// Berries
export const BERRY_SPEED = 1.5;
export const BERRY_RADIUS = 10;
export const INVINCIBILITY_DURATION = 5000;

// Random events
export const EVENT_COOLDOWN = 30000;
export const EVENT_MAX_COOLDOWN = 45000;
export const SNORLAX_DURATION = 6000;
export const TEAM_ROCKET_DURATION = 5000;
export const FOG_DURATION = 6000;
export const LEGENDARY_POINTS = 50;

// Sprite scale
export const SPRITE_SCALE = 3;
