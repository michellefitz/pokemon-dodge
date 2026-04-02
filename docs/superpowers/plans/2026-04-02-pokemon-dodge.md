# Pokemon Dodge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a face-tracking Pokémon dodge game with retro pixel art, starter selection, evolution, power-ups, and random events.

**Architecture:** Vanilla JS modules bundled by Vite. HTML5 Canvas for all rendering. MediaPipe Face Mesh for head tracking with mouse fallback. Game state machine drives screens (title → select → playing → evolving → gameover). Pixel art sprites defined as code arrays — no external image assets.

**Tech Stack:** Vite, vanilla JS (ES modules), HTML5 Canvas, MediaPipe Face Mesh (CDN)

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Project metadata, vite dev dependency |
| `vite.config.js` | Dev server config |
| `index.html` | HTML shell: canvas, hidden video element, overlay containers |
| `src/constants.js` | All game constants: dimensions, wave configs, speeds, colors, timing |
| `src/sprites.js` | Pixel art data arrays + `drawSprite(ctx, spriteData, x, y, scale)` function |
| `src/renderer.js` | Canvas utilities: starfield, particles, screen shake, flash effects, HUD |
| `src/tracking.js` | MediaPipe init, mouse fallback, exports reactive `{x, y, active}` |
| `src/player.js` | Player state: selected starter, evolution stage, position smoothing, hitbox |
| `src/obstacles.js` | Obstacle types (pokeballs, wild pokemon, attacks), spawn pool, behaviors |
| `src/powerups.js` | Berry types, spawn logic, active effect timers |
| `src/events.js` | Random event system: Snorlax, Team Rocket, Legendary, Fog |
| `src/screens.js` | Title screen, starter select, evolution cutscene, game over screen |
| `src/game.js` | Core game loop: spawn, update, collide, draw. Wave progression |
| `src/main.js` | Entry point: state machine, wires everything together |

---

### Task 1: Project Scaffolding & Vite Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/constants.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "pokemon-dodge",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 2: Install Vite**

Run: `cd "/Users/michellefitzpatrick/Claude projects/Face Tracking" && npm install --save-dev vite`
Expected: `node_modules/` created, vite added to devDependencies

- [ ] **Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: { open: true },
});
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
```

- [ ] **Step 5: Create constants.js with canvas dimensions and color palette**

```js
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
export const PLAYER_BASE_SIZE = 28; // collision radius at stage 0
export const PLAYER_SIZE_GROWTH = 4; // extra radius per evolution stage
export const SMOOTHING_FACTOR = 0.18;

// Waves — each wave defines its score range and spawn pool weights
// Weights are relative (don't need to sum to 1)
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

// Obstacle speeds (pixels per second at 60fps baseline)
export const OBSTACLE_SPEEDS = {
  pokeball: 2.0,
  greatball: 3.0,
  ultraball: 4.5,
  masterball: 5.5,
  zubat: 3.0,
  geodude: 2.0, // accelerates
  gastly: 2.5,
  pidgey: 4.0,
  ember: 3.5,
  watergun: 0, // special: sweep behavior
  vinewhip: 0, // special: horizontal cross
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

// Max simultaneous obstacles
export const MAX_OBSTACLES = 8;

// Min horizontal distance from player when spawning
export const SPAWN_SAFE_MARGIN = 60;

// Berries
export const BERRY_SPEED = 1.5;
export const BERRY_RADIUS = 10;
export const INVINCIBILITY_DURATION = 5000; // ms

// Random events
export const EVENT_COOLDOWN = 30000; // ms minimum between events
export const EVENT_MAX_COOLDOWN = 45000;
export const SNORLAX_DURATION = 6000;
export const TEAM_ROCKET_DURATION = 5000;
export const FOG_DURATION = 6000;
export const LEGENDARY_POINTS = 50;

// Sprite scale
export const SPRITE_SCALE = 3;
```

- [ ] **Step 6: Create index.html shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pokémon Dodge</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f0f1a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
      overflow: hidden;
    }
    #app { position: relative; width: 800px; }
    #gameCanvas {
      width: 100%;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      display: block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    #videoEl { display: none; }
    #statusDot {
      position: absolute;
      bottom: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      pointer-events: none;
    }
    #dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #888;
      transition: background 0.3s;
    }
    #dot.active { background: #1D9E75; }
    #statusLabel { font-size: 12px; color: rgba(255,255,255,0.6); }
  </style>
</head>
<body>
  <div id="app">
    <canvas id="gameCanvas" width="800" height="500"></canvas>
    <video id="videoEl" autoplay playsinline width="800" height="500"></video>
    <div id="statusDot"><div id="dot"></div><span id="statusLabel">camera off</span></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js"></script>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 7: Create src/main.js with minimal state machine**

```js
import { W, H } from './constants.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game states: 'title', 'select', 'playing', 'evolving', 'gameover'
let state = 'title';

function loop(ts) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  // Placeholder — draw current state name
  ctx.fillStyle = '#fff';
  ctx.font = '24px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`state: ${state}`, W / 2, H / 2);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

- [ ] **Step 8: Verify dev server starts**

Run: `cd "/Users/michellefitzpatrick/Claude projects/Face Tracking" && npx vite --host`
Expected: Server starts, opens browser showing dark canvas with "state: title" centered

- [ ] **Step 9: Commit**

```bash
git add package.json vite.config.js .gitignore index.html src/constants.js src/main.js
git commit -m "feat: scaffold project with Vite, canvas shell, and game constants"
```

---

### Task 2: Pixel Art Sprite System

**Files:**
- Create: `src/sprites.js`

This is the visual foundation. Every Pokemon, Pokeball, berry, and wild Pokemon is drawn from pixel data arrays. Each sprite is a 2D array where each number maps to a color in a palette. `0` = transparent.

- [ ] **Step 1: Create sprites.js with drawSprite utility and Pokeball sprites**

```js
// Draw a sprite from a 2D pixel array at position (x, y) with given scale
// palette maps numbers to color strings, 0 = transparent
export function drawSprite(ctx, sprite, palette, x, y, scale) {
  const h = sprite.length;
  const w = sprite[0].length;
  const offsetX = x - (w * scale) / 2;
  const offsetY = y - (h * scale) / 2;

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const colorIdx = sprite[row][col];
      if (colorIdx === 0) continue;
      ctx.fillStyle = palette[colorIdx];
      ctx.fillRect(
        Math.floor(offsetX + col * scale),
        Math.floor(offsetY + row * scale),
        scale,
        scale
      );
    }
  }
}

// --- POKEBALL SPRITES (12x12) ---

const POKEBALL_PALETTE = { 1: '#222', 2: '#E24B4A', 3: '#fff', 4: '#ccc' };

// prettier-ignore
const POKEBALL = [
  [0,0,0,0,1,1,1,1,0,0,0,0],
  [0,0,1,1,2,2,2,2,1,1,0,0],
  [0,1,2,2,2,2,2,2,2,2,1,0],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,3,3,1,1,1,1,1],
  [1,3,3,3,1,1,1,1,3,3,3,1],
  [1,3,3,3,3,3,3,3,3,3,3,1],
  [0,1,3,3,3,3,3,3,3,3,1,0],
  [0,1,3,3,3,3,3,3,3,3,1,0],
  [0,0,1,1,3,3,3,3,1,1,0,0],
  [0,0,0,0,1,1,1,1,0,0,0,0],
];

const GREATBALL_PALETTE = { 1: '#222', 2: '#378ADD', 3: '#fff', 4: '#E24B4A' };

// prettier-ignore
const GREATBALL = [
  [0,0,0,0,1,1,1,1,0,0,0,0],
  [0,0,1,1,2,2,2,2,1,1,0,0],
  [0,1,2,2,4,2,2,4,2,2,1,0],
  [1,2,2,4,2,2,2,2,4,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,3,3,1,1,1,1,1],
  [1,3,3,3,1,1,1,1,3,3,3,1],
  [1,3,3,3,3,3,3,3,3,3,3,1],
  [0,1,3,3,3,3,3,3,3,3,1,0],
  [0,1,3,3,3,3,3,3,3,3,1,0],
  [0,0,1,1,3,3,3,3,1,1,0,0],
  [0,0,0,0,1,1,1,1,0,0,0,0],
];

const ULTRABALL_PALETTE = { 1: '#222', 2: '#111', 3: '#EF9F27', 4: '#fff' };

// prettier-ignore
const ULTRABALL = [
  [0,0,0,0,1,1,1,1,0,0,0,0],
  [0,0,1,1,2,2,2,2,1,1,0,0],
  [0,1,2,2,2,2,2,2,2,2,1,0],
  [1,2,2,3,2,2,2,2,3,2,2,1],
  [1,2,3,3,2,2,2,2,3,3,2,1],
  [1,1,1,1,1,4,4,1,1,1,1,1],
  [1,4,4,4,1,1,1,1,4,4,4,1],
  [1,4,4,4,4,4,4,4,4,4,4,1],
  [0,1,4,4,4,4,4,4,4,4,1,0],
  [0,1,4,4,4,4,4,4,4,4,1,0],
  [0,0,1,1,4,4,4,4,1,1,0,0],
  [0,0,0,0,1,1,1,1,0,0,0,0],
];

const MASTERBALL_PALETTE = { 1: '#222', 2: '#7B2D8E', 3: '#fff', 4: '#D4537E', 5: '#E8C6F0' };

// prettier-ignore
const MASTERBALL = [
  [0,0,0,0,1,1,1,1,0,0,0,0],
  [0,0,1,1,2,2,2,2,1,1,0,0],
  [0,1,2,2,4,2,5,2,2,2,1,0],
  [1,2,2,4,4,2,5,5,2,2,2,1],
  [1,2,2,4,2,2,2,5,2,2,2,1],
  [1,1,1,1,1,3,3,1,1,1,1,1],
  [1,3,3,3,1,1,1,1,3,3,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,1,0],
  [0,1,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,1,2,2,2,2,1,1,0,0],
  [0,0,0,0,1,1,1,1,0,0,0,0],
];

export const POKEBALL_SPRITES = {
  pokeball:   { data: POKEBALL,   palette: POKEBALL_PALETTE },
  greatball:  { data: GREATBALL,  palette: GREATBALL_PALETTE },
  ultraball:  { data: ULTRABALL,  palette: ULTRABALL_PALETTE },
  masterball: { data: MASTERBALL, palette: MASTERBALL_PALETTE },
};
```

- [ ] **Step 2: Add starter Pokemon sprites (Charmander line — idle pose)**

Add to `src/sprites.js`. Each starter is 16x16 pixels. We start with idle poses for all 9 evolution forms and add left/right variants after.

```js
// --- POKEMON SPRITES (16x16 base) ---
// Each sprite: { idle, left, right } — left/right added in next step

const CHARMANDER_PALETTE = { 1: '#222', 2: '#E8812A', 3: '#F5C34B', 4: '#fff', 5: '#E24B4A', 6: '#333' };

// prettier-ignore
const CHARMANDER_IDLE = [
  [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,4,2,4,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,6,2,6,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,3,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,3,3,3,2,2,1,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,0,0,0,2,1,0,0,0,0,0],
  [0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,1,5,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
];

const CHARMELEON_PALETTE = { 1: '#222', 2: '#D44A22', 3: '#F5C34B', 4: '#fff', 5: '#E24B4A', 6: '#333' };

// prettier-ignore
const CHARMELEON_IDLE = [
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,4,2,2,4,2,1,0,0,0,0,0],
  [0,0,0,1,2,6,2,2,6,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,2,3,2,1,0,0,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,3,3,3,3,2,2,1,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,0,0,2,1,0,0,0,0,0,0],
  [0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,5,5,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0],
];

const CHARIZARD_PALETTE = { 1: '#222', 2: '#D44A22', 3: '#F5C34B', 4: '#fff', 5: '#E24B4A', 6: '#333', 7: '#5DADE2' };

// prettier-ignore
const CHARIZARD_IDLE = [
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,4,2,2,4,2,1,0,0,0,0,0],
  [0,0,0,1,2,6,2,2,6,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,2,3,2,2,1,0,0,0,0,0],
  [0,1,7,0,0,1,1,1,1,1,0,0,7,1,0,0],
  [1,7,7,1,1,2,2,2,2,2,1,1,7,7,1,0],
  [0,1,7,1,2,2,3,3,3,2,2,1,7,1,0,0],
  [0,0,1,1,2,2,2,2,2,2,2,1,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,0,0,0,2,1,0,0,0,0,0],
  [0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,5,5,5,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0],
];

const BULBASAUR_PALETTE = { 1: '#222', 2: '#5DAF5D', 3: '#2E7D32', 4: '#fff', 5: '#81C784', 6: '#333' };

// prettier-ignore
const BULBASAUR_IDLE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,3,5,5,5,3,0,0,0,0,0,0],
  [0,0,0,0,3,5,5,5,5,5,3,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,4,2,2,4,2,2,2,1,0,0,0],
  [0,0,1,2,2,6,2,2,6,2,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,1,2,0,0,0,0,0,2,1,0,0,0,0],
  [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const IVYSAUR_PALETTE = { 1: '#222', 2: '#5DAF5D', 3: '#2E7D32', 4: '#fff', 5: '#E24B4A', 6: '#333', 7: '#81C784' };

// prettier-ignore
const IVYSAUR_IDLE = [
  [0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,3,7,7,7,3,0,0,0,0,0,0],
  [0,0,0,0,3,7,5,5,5,7,3,0,0,0,0,0],
  [0,0,0,0,3,7,5,5,5,7,3,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,4,2,2,4,2,2,2,1,0,0,0],
  [0,0,1,2,2,6,2,2,6,2,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,1,2,0,0,0,0,0,2,1,0,0,0,0],
  [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const VENUSAUR_PALETTE = { 1: '#222', 2: '#5DAF5D', 3: '#2E7D32', 4: '#fff', 5: '#E24B4A', 6: '#333', 7: '#81C784', 8: '#F48FB1' };

// prettier-ignore
const VENUSAUR_IDLE = [
  [0,0,0,0,0,3,8,8,8,3,0,0,0,0,0,0],
  [0,0,0,0,3,8,8,5,8,8,3,0,0,0,0,0],
  [0,0,0,3,7,7,8,8,8,7,7,3,0,0,0,0],
  [0,0,0,3,7,7,7,7,7,7,7,3,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,1,2,2,4,2,2,2,4,2,2,2,2,1,0,0],
  [0,1,2,2,6,2,2,2,6,2,2,2,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,0,0,0,0,0,0,0,2,1,0,0,0],
  [0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const SQUIRTLE_PALETTE = { 1: '#222', 2: '#5DADE2', 3: '#2980B9', 4: '#fff', 5: '#F5C34B', 6: '#333', 7: '#A0522D' };

// prettier-ignore
const SQUIRTLE_IDLE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,4,2,4,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,6,2,6,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0],
  [0,0,0,1,7,5,5,5,5,5,7,1,0,0,0,0],
  [0,0,0,1,7,5,5,5,5,5,7,1,0,0,0,0],
  [0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0],
  [0,0,0,0,1,2,0,0,0,2,1,0,0,0,0,0],
  [0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const WARTORTLE_PALETTE = { 1: '#222', 2: '#3498DB', 3: '#2471A3', 4: '#fff', 5: '#F5C34B', 6: '#333', 7: '#A0522D' };

// prettier-ignore
const WARTORTLE_IDLE = [
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,1,2,4,2,2,4,2,2,1,0,0,0,0],
  [0,0,0,1,2,6,2,2,6,2,2,1,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,5,5,5,5,5,5,5,1,0,0,0,0],
  [0,0,1,7,5,5,5,5,5,5,5,7,1,0,0,0],
  [0,0,1,7,5,5,5,5,5,5,5,7,1,0,0,0],
  [0,0,0,1,5,5,5,5,5,5,5,1,0,0,0,0],
  [0,0,0,1,2,0,0,0,0,0,2,1,0,0,0,0],
  [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0],
  [0,0,2,2,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const BLASTOISE_PALETTE = { 1: '#222', 2: '#2471A3', 3: '#1A5276', 4: '#fff', 5: '#F5C34B', 6: '#333', 7: '#A0522D', 8: '#888' };

// prettier-ignore
const BLASTOISE_IDLE = [
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,1,2,4,2,2,4,2,2,1,0,0,0,0],
  [0,0,0,1,2,6,2,2,6,2,2,1,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
  [0,8,1,0,1,1,1,1,1,1,1,0,1,8,0,0],
  [0,8,1,1,5,5,5,5,5,5,5,1,1,8,0,0],
  [0,0,1,7,5,5,5,5,5,5,5,7,1,0,0,0],
  [0,0,1,7,5,5,5,5,5,5,5,7,1,0,0,0],
  [0,0,0,1,5,5,5,5,5,5,5,1,0,0,0,0],
  [0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0],
  [0,0,0,0,1,2,0,0,0,2,1,0,0,0,0,0],
  [0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Organize starters into evolution lines
// Each entry: { idle, left, right } — left/right use idle for now, swapped in Task 2 Step 3
export const STARTER_SPRITES = {
  charmander: [
    { idle: CHARMANDER_IDLE, palette: CHARMANDER_PALETTE },
    { idle: CHARMELEON_IDLE, palette: CHARMELEON_PALETTE },
    { idle: CHARIZARD_IDLE, palette: CHARIZARD_PALETTE },
  ],
  bulbasaur: [
    { idle: BULBASAUR_IDLE, palette: BULBASAUR_PALETTE },
    { idle: IVYSAUR_IDLE, palette: IVYSAUR_PALETTE },
    { idle: VENUSAUR_IDLE, palette: VENUSAUR_PALETTE },
  ],
  squirtle: [
    { idle: SQUIRTLE_IDLE, palette: SQUIRTLE_PALETTE },
    { idle: WARTORTLE_IDLE, palette: WARTORTLE_PALETTE },
    { idle: BLASTOISE_IDLE, palette: BLASTOISE_PALETTE },
  ],
};
```

- [ ] **Step 3: Add left/right dodge poses as mirrored/shifted variants**

Add a `mirrorSprite` helper and generate left/right poses. Add to end of `src/sprites.js`:

```js
// Mirror a sprite horizontally
export function mirrorSprite(sprite) {
  return sprite.map(row => [...row].reverse());
}

// Shift sprite pixels left by 1 (dodge-left lean)
export function shiftLeft(sprite) {
  return sprite.map(row => [...row.slice(1), 0]);
}

// Shift sprite pixels right by 1 (dodge-right lean)
export function shiftRight(sprite) {
  return sprite.map(row => [0, ...row.slice(0, -1)]);
}

// Add left/right poses to all starters
for (const line of Object.values(STARTER_SPRITES)) {
  for (const stage of line) {
    stage.left = shiftLeft(stage.idle);
    stage.right = shiftRight(stage.idle);
  }
}
```

- [ ] **Step 4: Add wild Pokemon sprites (Zubat, Geodude, Gastly, Pidgey)**

Add to `src/sprites.js`:

```js
// --- WILD POKEMON SPRITES (14x14) ---

const ZUBAT_PALETTE = { 1: '#222', 2: '#7B5EAE', 3: '#9F77DD', 4: '#fff', 5: '#333' };

// prettier-ignore
const ZUBAT_SPRITE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,0,0,0,0,0,0,0,0,1,3,0],
  [3,2,2,1,0,0,0,0,0,0,1,2,2,3],
  [3,2,2,2,1,0,0,0,0,1,2,2,2,3],
  [0,3,2,2,2,1,1,1,1,2,2,2,3,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,2,4,2,2,4,2,1,0,0,0],
  [0,0,0,1,2,5,2,2,5,2,1,0,0,0],
  [0,0,0,0,1,2,1,1,2,1,0,0,0,0],
  [0,0,0,0,0,1,2,2,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const GEODUDE_PALETTE = { 1: '#222', 2: '#8D6E4C', 3: '#A0845C', 4: '#fff', 5: '#333' };

// prettier-ignore
const GEODUDE_SPRITE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,1,2,2,4,2,2,2,4,2,2,2,1,0],
  [0,1,2,2,5,2,2,2,5,2,2,2,1,0],
  [0,1,2,3,3,2,2,2,3,3,2,2,1,0],
  [0,0,1,2,2,2,3,3,2,2,2,1,0,0],
  [1,2,0,1,2,2,2,2,2,2,1,0,2,1],
  [1,3,2,0,1,1,1,1,1,1,0,2,3,1],
  [0,1,2,0,0,0,0,0,0,0,0,2,1,0],
  [0,0,1,0,0,0,0,0,0,0,0,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const GASTLY_PALETTE = { 1: '#222', 2: '#4A2B6B', 3: '#6B3FA0', 4: '#fff', 5: '#E24B4A' };

// prettier-ignore
const GASTLY_SPRITE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,0,1,1,0,1,0,0,0,0],
  [0,0,0,1,2,1,2,2,1,2,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,1,2,3,4,3,2,3,4,3,2,2,1,0],
  [0,1,2,3,1,3,2,3,1,3,2,2,1,0],
  [0,1,2,2,2,2,2,2,2,2,2,2,1,0],
  [0,1,2,2,2,5,2,5,2,2,2,2,1,0],
  [0,0,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,0,1,1,2,2,1,0,0,1,0,0],
  [0,0,0,0,0,1,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const PIDGEY_PALETTE = { 1: '#222', 2: '#A0845C', 3: '#D4A76A', 4: '#fff', 5: '#E24B4A', 6: '#F5C34B' };

// prettier-ignore
const PIDGEY_SPRITE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,3,3,1,0,0,0,0,0],
  [0,0,0,0,1,3,3,3,3,1,0,0,0,0],
  [0,0,0,1,2,4,3,3,4,2,1,0,0,0],
  [0,0,0,1,2,1,3,3,1,2,1,0,0,0],
  [0,0,0,0,1,2,6,6,2,1,0,0,0,0],
  [0,1,1,1,2,2,2,2,2,2,1,1,1,0],
  [1,3,2,2,2,2,2,2,2,2,2,2,3,1],
  [0,1,3,2,2,2,2,2,2,2,2,3,1,0],
  [0,0,1,1,2,2,2,2,2,2,1,1,0,0],
  [0,0,0,0,1,2,0,0,2,1,0,0,0,0],
  [0,0,0,0,0,1,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

export const WILD_SPRITES = {
  zubat:  { data: ZUBAT_SPRITE,  palette: ZUBAT_PALETTE },
  geodude: { data: GEODUDE_SPRITE, palette: GEODUDE_PALETTE },
  gastly: { data: GASTLY_SPRITE, palette: GASTLY_PALETTE },
  pidgey: { data: PIDGEY_SPRITE, palette: PIDGEY_PALETTE },
};
```

- [ ] **Step 5: Add berry sprites and pixel heart for lives**

Add to `src/sprites.js`:

```js
// --- BERRY SPRITES (10x10) ---

const ORAN_PALETTE = { 1: '#222', 2: '#378ADD', 3: '#5DADE2', 4: '#2E86C1' };

// prettier-ignore
const ORAN_BERRY = [
  [0,0,0,0,1,1,0,0,0,0],
  [0,0,0,1,4,4,1,0,0,0],
  [0,0,1,2,2,2,2,1,0,0],
  [0,1,2,3,2,2,2,2,1,0],
  [0,1,2,3,2,2,2,2,1,0],
  [0,1,2,2,2,2,2,2,1,0],
  [0,1,2,2,2,2,2,2,1,0],
  [0,0,1,2,2,2,2,1,0,0],
  [0,0,0,1,2,2,1,0,0,0],
  [0,0,0,0,1,1,0,0,0,0],
];

const SITRUS_PALETTE = { 1: '#222', 2: '#F5C34B', 3: '#F9E176', 4: '#D4A017' };

// prettier-ignore
const SITRUS_BERRY = [
  [0,0,0,0,1,1,0,0,0,0],
  [0,0,0,1,4,4,1,0,0,0],
  [0,0,1,2,2,2,2,1,0,0],
  [0,1,2,3,3,2,2,2,1,0],
  [0,1,2,3,2,2,2,2,1,0],
  [0,1,2,2,2,2,2,2,1,0],
  [0,1,2,2,2,2,2,2,1,0],
  [0,0,1,2,2,2,2,1,0,0],
  [0,0,0,1,2,2,1,0,0,0],
  [0,0,0,0,1,1,0,0,0,0],
];

const RAWST_PALETTE = { 1: '#222', 2: '#E24B4A', 3: '#F07070', 4: '#B71C1C' };

// prettier-ignore
const RAWST_BERRY = [
  [0,0,0,0,1,1,0,0,0,0],
  [0,0,0,1,4,4,1,0,0,0],
  [0,0,1,2,1,2,2,1,0,0],
  [0,1,2,2,2,1,2,2,1,0],
  [1,2,2,3,2,2,1,2,2,1],
  [1,2,3,2,2,2,2,1,2,1],
  [0,1,2,2,2,1,2,2,1,0],
  [0,0,1,2,1,2,2,1,0,0],
  [0,0,0,1,2,2,1,0,0,0],
  [0,0,0,0,1,1,0,0,0,0],
];

const LUM_PALETTE = { 1: '#222', 2: '#1D9E75', 3: '#27AE60', 4: '#145A3C' };

// prettier-ignore
const LUM_BERRY = [
  [0,0,0,0,1,1,0,0,0,0],
  [0,0,0,1,4,4,1,0,0,0],
  [0,0,1,2,2,2,2,1,0,0],
  [0,1,2,3,3,2,2,2,1,0],
  [0,1,3,3,2,2,2,2,1,0],
  [0,1,2,2,2,2,3,3,1,0],
  [0,1,2,2,2,3,3,2,1,0],
  [0,0,1,2,2,2,2,1,0,0],
  [0,0,0,1,2,2,1,0,0,0],
  [0,0,0,0,1,1,0,0,0,0],
];

export const BERRY_SPRITES = {
  oran:   { data: ORAN_BERRY,   palette: ORAN_PALETTE },
  sitrus: { data: SITRUS_BERRY, palette: SITRUS_PALETTE },
  rawst:  { data: RAWST_BERRY,  palette: RAWST_PALETTE },
  lum:    { data: LUM_BERRY,    palette: LUM_PALETTE },
};

// --- HUD SPRITES ---

const HEART_PALETTE = { 1: '#222', 2: '#E24B4A', 3: '#F07070' };

// prettier-ignore
export const HEART_SPRITE = {
  data: [
    [0,1,1,0,1,1,0],
    [1,2,3,1,3,2,1],
    [1,2,2,2,2,2,1],
    [0,1,2,2,2,1,0],
    [0,0,1,2,1,0,0],
    [0,0,0,1,0,0,0],
  ],
  palette: HEART_PALETTE,
};
```

- [ ] **Step 6: Add special sprites (Snorlax, Mewtwo, attack projectiles)**

Add to `src/sprites.js`:

```js
// --- SPECIAL EVENT SPRITES ---

const SNORLAX_PALETTE = { 1: '#222', 2: '#2C3E50', 3: '#D5DBDB', 4: '#fff', 5: '#F5C34B' };

// Snorlax is bigger: 20x16
// prettier-ignore
export const SNORLAX_SPRITE = {
  data: [
    [0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
    [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
    [0,0,0,1,2,2,1,1,2,2,2,1,1,2,2,2,1,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0],
    [0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0,0],
    [0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0],
    [0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0],
    [0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0],
    [0,1,3,3,3,3,3,5,5,3,3,5,5,3,3,3,3,3,1,0],
    [0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0],
    [0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0],
    [0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0,0],
    [0,0,0,1,2,0,0,0,0,0,0,0,0,0,0,2,1,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0],
  ],
  palette: SNORLAX_PALETTE,
};

const MEWTWO_PALETTE = { 1: '#222', 2: '#D5C6E0', 3: '#E8DCF0', 4: '#9B59B6', 5: '#fff', 6: '#333' };

// Mewtwo: 14x16
// prettier-ignore
export const MEWTWO_SPRITE = {
  data: [
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,2,2,2,2,1,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,1,2,5,2,2,5,2,1,0,0,0],
    [0,0,0,1,2,4,2,2,4,2,1,0,0,0],
    [0,0,0,0,1,2,2,2,2,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,3,3,3,3,1,0,0,0,0],
    [0,0,0,1,3,3,4,4,3,3,1,0,0,0],
    [0,0,0,1,3,3,3,3,3,3,1,0,0,0],
    [0,0,0,0,1,3,3,3,3,1,0,0,0,0],
    [0,0,0,0,1,3,3,3,3,1,0,0,0,0],
    [0,0,0,0,1,3,0,0,3,1,0,0,0,0],
    [0,0,0,0,1,1,0,0,1,1,0,0,0,0],
    [0,0,1,4,4,0,0,0,0,4,4,1,0,0],
    [0,0,0,1,0,0,0,0,0,0,1,0,0,0],
  ],
  palette: MEWTWO_PALETTE,
};

// Attack projectiles (8x8)
const EMBER_PALETTE = { 1: '#222', 2: '#E24B4A', 3: '#EF9F27', 4: '#F5C34B' };

// prettier-ignore
export const EMBER_SPRITE = {
  data: [
    [0,0,0,4,4,0,0,0],
    [0,0,4,3,3,4,0,0],
    [0,4,3,2,2,3,4,0],
    [0,4,2,2,2,2,4,0],
    [4,3,2,2,2,2,3,4],
    [0,4,2,2,2,2,4,0],
    [0,0,4,3,3,4,0,0],
    [0,0,0,4,4,0,0,0],
  ],
  palette: EMBER_PALETTE,
};

// Water gun is drawn procedurally (vertical stream) - no sprite needed
// Vine whip is drawn procedurally (horizontal line) - no sprite needed
```

- [ ] **Step 7: Verify sprites render correctly**

Temporarily update `src/main.js` to draw a few test sprites:

```js
import { W, H } from './constants.js';
import { drawSprite, POKEBALL_SPRITES, STARTER_SPRITES, BERRY_SPRITES, HEART_SPRITE } from './sprites.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, W, H);

// Test: draw pokeballs in a row
const balls = ['pokeball', 'greatball', 'ultraball', 'masterball'];
balls.forEach((name, i) => {
  const s = POKEBALL_SPRITES[name];
  drawSprite(ctx, s.data, s.palette, 80 + i * 60, 50, 3);
});

// Test: draw all starters at stage 0
const starters = ['charmander', 'bulbasaur', 'squirtle'];
starters.forEach((name, i) => {
  const s = STARTER_SPRITES[name][0];
  drawSprite(ctx, s.idle, s.palette, 80 + i * 80, 150, 3);
});

// Test: draw berries
const berries = ['oran', 'sitrus', 'rawst', 'lum'];
berries.forEach((name, i) => {
  const s = BERRY_SPRITES[name];
  drawSprite(ctx, s.data, s.palette, 80 + i * 50, 250, 3);
});

// Test: hearts
for (let i = 0; i < 3; i++) {
  drawSprite(ctx, HEART_SPRITE.data, HEART_SPRITE.palette, 80 + i * 30, 320, 3);
}
```

Run: `cd "/Users/michellefitzpatrick/Claude projects/Face Tracking" && npx vite`
Expected: Browser shows dark canvas with rows of pixel art: 4 pokeballs, 3 starters, 4 berries, 3 hearts — all rendered as crisp pixel art

- [ ] **Step 8: Revert main.js to minimal state machine (remove test rendering)**

Restore `src/main.js` to the version from Task 1 Step 7.

- [ ] **Step 9: Commit**

```bash
git add src/sprites.js
git commit -m "feat: add all pixel art sprites (pokeballs, starters, wilds, berries, specials)"
```

---

### Task 3: Renderer — Starfield, Particles, Screen Effects, HUD

**Files:**
- Create: `src/renderer.js`

- [ ] **Step 1: Create renderer.js with starfield (parallax layers)**

```js
import { W, H, COLORS, SPRITE_SCALE } from './constants.js';
import { drawSprite, HEART_SPRITE } from './sprites.js';

// --- STARFIELD ---
// 3 depth layers, each with fixed star positions
const STAR_LAYERS = [
  { count: 40, speed: 0.1, size: 0.4, alpha: 0.15 },
  { count: 30, speed: 0.3, size: 0.7, alpha: 0.25 },
  { count: 15, speed: 0.6, size: 1.0, alpha: 0.4 },
];

const stars = STAR_LAYERS.map(layer => {
  const positions = [];
  for (let i = 0; i < layer.count; i++) {
    positions.push({
      x: Math.random() * W,
      y: Math.random() * H,
    });
  }
  return { ...layer, positions };
});

export function drawStarfield(ctx, dt) {
  for (const layer of stars) {
    ctx.fillStyle = `rgba(255,255,255,${layer.alpha})`;
    for (const star of layer.positions) {
      star.y += layer.speed * dt * 0.06;
      if (star.y > H) {
        star.y = 0;
        star.x = Math.random() * W;
      }
      ctx.beginPath();
      ctx.arc(star.x, star.y, layer.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --- PARTICLES ---
const particles = [];

export function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * (1 + Math.random() * 2),
      vy: Math.sin(angle) * (1 + Math.random() * 2),
      life: 1.0,
      decay: 0.02 + Math.random() * 0.02,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

export function spawnSparkles(x, y, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      life: 1.0,
      decay: 0.01 + Math.random() * 0.01,
      size: 1 + Math.random() * 2,
      color: '#F5C34B',
    });
  }
}

export function updateAndDrawParticles(ctx, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt * 0.06;
    p.y += p.vy * dt * 0.06;
    p.life -= p.decay * dt * 0.06;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
  }
  ctx.globalAlpha = 1;
}

// --- SCREEN EFFECTS ---
let shakeAmount = 0;
let shakeDuration = 0;
let flashColor = null;
let flashAlpha = 0;

export function triggerShake(amount = 4, duration = 150) {
  shakeAmount = amount;
  shakeDuration = duration;
}

export function triggerFlash(color = '#fff', alpha = 0.6) {
  flashColor = color;
  flashAlpha = alpha;
}

export function applyScreenEffects(ctx, dt) {
  // Shake
  let offsetX = 0, offsetY = 0;
  if (shakeDuration > 0) {
    offsetX = (Math.random() - 0.5) * shakeAmount * 2;
    offsetY = (Math.random() - 0.5) * shakeAmount * 2;
    shakeDuration -= dt;
    if (shakeDuration <= 0) {
      shakeAmount = 0;
    }
  }

  // Flash overlay
  if (flashAlpha > 0) {
    ctx.fillStyle = flashColor;
    ctx.globalAlpha = flashAlpha;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    flashAlpha -= 0.03 * dt * 0.06;
    if (flashAlpha < 0) flashAlpha = 0;
  }

  return { offsetX, offsetY };
}

// --- HUD ---
export function drawHUD(ctx, score, lives, waveName, effectTimer, effectMaxTime) {
  ctx.save();
  ctx.font = '16px monospace';

  // Score — top left
  ctx.fillStyle = COLORS.textPrimary;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${score}`, 16, 28);

  // Lives — top right (pixel hearts)
  const heartW = HEART_SPRITE.data[0].length * 2;
  const heartGap = 4;
  const startX = W - 16 - (lives * (heartW + heartGap));
  for (let i = 0; i < lives; i++) {
    drawSprite(ctx, HEART_SPRITE.data, HEART_SPRITE.palette, startX + i * (heartW + heartGap) + heartW / 2, 22, 2);
  }

  // Wave — top center (subtle)
  ctx.fillStyle = COLORS.textSecondary;
  ctx.textAlign = 'center';
  ctx.font = '12px monospace';
  ctx.fillText(waveName, W / 2, 28);

  // Berry effect timer bar — bottom center
  if (effectTimer > 0 && effectMaxTime > 0) {
    const barW = 120;
    const barH = 6;
    const barX = (W - barW) / 2;
    const barY = H - 20;
    const pct = effectTimer / effectMaxTime;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = COLORS.scoreYellow;
    ctx.fillRect(barX, barY, barW * pct, barH);
  }

  ctx.restore();
}
```

- [ ] **Step 2: Verify starfield and particles work**

Update `src/main.js` temporarily:

```js
import { W, H } from './constants.js';
import { drawStarfield, updateAndDrawParticles, spawnParticles, drawHUD } from './renderer.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let lastTs = 0;

// Spawn test particles on click
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  spawnParticles(x, y, '#E24B4A', 12);
});

function loop(ts) {
  const dt = lastTs ? ts - lastTs : 16;
  lastTs = ts;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  drawStarfield(ctx, dt);
  updateAndDrawParticles(ctx, dt);
  drawHUD(ctx, 42, 3, 'Wave 2', 3000, 5000);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

Run: `npx vite`
Expected: Parallax starfield scrolling down, HUD showing "SCORE 42", 3 hearts, "Wave 2", and a timer bar. Clicking spawns red particles.

- [ ] **Step 3: Revert main.js to minimal state machine**

- [ ] **Step 4: Commit**

```bash
git add src/renderer.js
git commit -m "feat: add renderer with parallax starfield, particles, screen effects, and HUD"
```

---

### Task 4: Face Tracking & Mouse Fallback

**Files:**
- Create: `src/tracking.js`

- [ ] **Step 1: Create tracking.js**

```js
import { W, H } from './constants.js';

// Reactive tracking state — game reads these directly
export const tracking = {
  x: W / 2,
  y: H * 0.75,
  active: false,
  mode: 'none', // 'camera', 'mouse', 'none'
};

let onStatusChange = null;

export function setStatusCallback(cb) {
  onStatusChange = cb;
}

function updateStatus(dotActive, label) {
  const dot = document.getElementById('dot');
  const statusLabel = document.getElementById('statusLabel');
  if (dot) {
    dot.classList.toggle('active', dotActive);
  }
  if (statusLabel) {
    statusLabel.textContent = label;
  }
  if (onStatusChange) onStatusChange(dotActive, label);
}

export function initTracking(canvas) {
  const video = document.getElementById('videoEl');

  const faceMesh = new FaceMesh({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${f}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults(results => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const nose = results.multiFaceLandmarks[0][1];
      tracking.x = (1 - nose.x) * W;
      tracking.y = nose.y * H * 0.9 + 20;
      if (!tracking.active) {
        tracking.active = true;
        tracking.mode = 'camera';
        updateStatus(true, 'tracking');
      }
    } else {
      if (tracking.mode === 'camera') {
        tracking.active = false;
        updateStatus(false, 'no face detected');
      }
    }
  });

  updateStatus(false, 'loading...');

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      updateStatus(false, 'camera on');
      const camera = new Camera(video, {
        onFrame: async () => { await faceMesh.send({ image: video }); },
        width: W,
        height: H,
      });
      camera.start();
    })
    .catch(() => {
      enableMouseFallback(canvas);
    });
}

function enableMouseFallback(canvas) {
  tracking.active = true;
  tracking.mode = 'mouse';
  updateStatus(true, 'mouse mode');
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    tracking.x = (e.clientX - rect.left) * (W / rect.width);
    tracking.y = H * 0.75;
  });
}
```

- [ ] **Step 2: Verify tracking works**

Update `src/main.js` temporarily:

```js
import { W, H, SPRITE_SCALE } from './constants.js';
import { drawStarfield, updateAndDrawParticles, drawHUD } from './renderer.js';
import { tracking, initTracking } from './tracking.js';
import { drawSprite, STARTER_SPRITES } from './sprites.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

initTracking(canvas);

let smoothX = W / 2, smoothY = H * 0.75;
let lastTs = 0;

function loop(ts) {
  const dt = lastTs ? ts - lastTs : 16;
  lastTs = ts;

  smoothX += (tracking.x - smoothX) * 0.18;
  smoothY += (tracking.y - smoothY) * 0.18;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  const s = STARTER_SPRITES.charmander[0];
  drawSprite(ctx, s.idle, s.palette, smoothX, smoothY, SPRITE_SCALE);

  drawHUD(ctx, 0, 3, 'Wave 1', 0, 0);
  updateAndDrawParticles(ctx, dt);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

Run: `npx vite`
Expected: Charmander follows mouse (or head if camera allowed) over starfield

- [ ] **Step 3: Revert main.js to minimal state machine**

- [ ] **Step 4: Commit**

```bash
git add src/tracking.js
git commit -m "feat: add face tracking with MediaPipe and mouse fallback"
```

---

### Task 5: Player Module

**Files:**
- Create: `src/player.js`

- [ ] **Step 1: Create player.js**

```js
import { W, H, BASE_LIVES, PLAYER_BASE_SIZE, PLAYER_SIZE_GROWTH, SMOOTHING_FACTOR, EVOLUTION_SCORES, SPRITE_SCALE } from './constants.js';
import { drawSprite, STARTER_SPRITES } from './sprites.js';
import { tracking } from './tracking.js';

// Starter definitions with perks
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
  player.lives = BASE_LIVES + def.livesBonus;
  player.invincible = false;
  player.invincibleTimer = 0;
  player.evolving = false;
  player.smoothX = W / 2;
  player.smoothY = H * 0.75;
}

export function resetPlayer() {
  player.stage = 0;
  const def = STARTERS[player.starter];
  player.lives = BASE_LIVES + def.livesBonus;
  player.invincible = false;
  player.invincibleTimer = 0;
  player.evolving = false;
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

// Returns true if player should evolve at this score
export function shouldEvolve(score) {
  if (player.stage >= 2) return false;
  const threshold = EVOLUTION_SCORES[player.stage];
  return score >= threshold;
}

export function evolve() {
  if (player.stage < 2) {
    player.stage++;
    player.evolving = true;
  }
}

export function finishEvolving() {
  player.evolving = false;
}

export function updatePlayer(dt, controlsReversed = false) {
  const def = STARTERS[player.starter];
  const factor = SMOOTHING_FACTOR * def.speedBonus;

  let targetX = tracking.x;
  if (controlsReversed) {
    targetX = W - tracking.x;
  }

  player.smoothX += (targetX - player.smoothX) * factor;
  player.smoothY += (tracking.y - player.smoothY) * factor;

  // Clamp to canvas
  const r = getHitboxRadius();
  player.smoothX = Math.max(r, Math.min(W - r, player.smoothX));
  player.smoothY = Math.max(r, Math.min(H - r, player.smoothY));

  // Invincibility timer
  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
      player.invincibleTimer = 0;
    }
  }
}

export function drawPlayer(ctx, ts) {
  const sprites = STARTER_SPRITES[player.starter][player.stage];

  // Choose pose based on movement direction
  const dx = tracking.x - player.smoothX;
  let pose = sprites.idle;
  if (dx < -15) pose = sprites.left;
  else if (dx > 15) pose = sprites.right;

  // Invincibility flash — blink every 100ms
  if (player.invincible && Math.floor(ts / 100) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  drawSprite(ctx, pose, sprites.palette, player.smoothX, player.smoothY, SPRITE_SCALE);
  ctx.globalAlpha = 1;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/player.js
git commit -m "feat: add player module with starter selection, evolution, and perks"
```

---

### Task 6: Obstacles Module

**Files:**
- Create: `src/obstacles.js`

- [ ] **Step 1: Create obstacles.js**

```js
import { W, H, MAX_OBSTACLES, SPAWN_SAFE_MARGIN, OBSTACLE_SPEEDS, OBSTACLE_RADII, SPRITE_SCALE } from './constants.js';
import { drawSprite, POKEBALL_SPRITES, WILD_SPRITES, EMBER_SPRITE } from './sprites.js';
import { player, getHitboxRadius } from './player.js';
import { triggerShake } from './renderer.js';

const obstacles = [];

export function getObstacles() {
  return obstacles;
}

export function clearObstacles() {
  obstacles.length = 0;
}

export function spawnObstacle(type) {
  if (obstacles.length >= MAX_OBSTACLES) return;

  const ob = {
    type,
    x: 0,
    y: -30,
    radius: OBSTACLE_RADII[type] || 10,
    speed: OBSTACLE_SPEEDS[type] || 2,
    alive: true,
    age: 0,
    // Type-specific state
    wobbleOffset: Math.random() * Math.PI * 2,
    zigzagPhase: Math.random() * Math.PI * 2,
    gastlyAlpha: 1,
    fromRight: Math.random() > 0.5, // for pidgey
    accel: 0, // for geodude
    embers: null, // for ember fan
    sweepX: 0, // for watergun
    vineY: 0, // for vinewhip
  };

  // Position
  if (type === 'pidgey') {
    ob.x = ob.fromRight ? W + 20 : -20;
    ob.y = 60 + Math.random() * (H * 0.5);
  } else if (type === 'watergun') {
    ob.x = -10;
    ob.y = 50 + Math.random() * (H * 0.4);
    ob.speed = 3;
  } else if (type === 'vinewhip') {
    ob.x = W + 20;
    ob.vineY = 200 + Math.random() * 200;
    ob.y = ob.vineY;
    ob.speed = 4;
  } else if (type === 'ember') {
    // Fan of 3 fireballs
    const baseX = 80 + Math.random() * (W - 160);
    ob.embers = [-0.3, 0, 0.3].map(angle => ({
      x: baseX,
      y: -20,
      vx: Math.sin(angle) * 1.5,
      vy: ob.speed,
    }));
    ob.x = baseX;
  } else {
    // Default: spawn from top, avoid player
    let x;
    let tries = 0;
    do {
      x = 40 + Math.random() * (W - 80);
      tries++;
    } while (Math.abs(x - player.smoothX) < SPAWN_SAFE_MARGIN && tries < 10);
    ob.x = x;
  }

  obstacles.push(ob);
}

export function updateObstacles(dt) {
  const dtFactor = dt * 0.06; // normalize to ~60fps

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.age += dt;

    switch (ob.type) {
      case 'pokeball':
      case 'ultraball':
        ob.y += ob.speed * dtFactor;
        break;

      case 'greatball':
        ob.y += ob.speed * dtFactor;
        ob.x += Math.sin(ob.age * 0.003 + ob.wobbleOffset) * 0.8 * dtFactor;
        break;

      case 'masterball':
        ob.y += ob.speed * dtFactor;
        // Track slightly toward player
        const trackDx = player.smoothX - ob.x;
        ob.x += Math.sign(trackDx) * 0.4 * dtFactor;
        break;

      case 'zubat':
        ob.y += ob.speed * dtFactor;
        ob.x += Math.sin(ob.age * 0.005 + ob.zigzagPhase) * 2.5 * dtFactor;
        break;

      case 'geodude':
        ob.accel += 0.08 * dtFactor;
        ob.y += (ob.speed + ob.accel) * dtFactor;
        if (ob.y > H + 30) {
          triggerShake(3, 100);
        }
        break;

      case 'gastly':
        ob.y += ob.speed * dtFactor;
        ob.gastlyAlpha = 0.3 + 0.7 * Math.abs(Math.sin(ob.age * 0.003));
        break;

      case 'pidgey':
        if (ob.fromRight) {
          ob.x -= ob.speed * dtFactor;
        } else {
          ob.x += ob.speed * dtFactor;
        }
        ob.y += Math.sin(ob.age * 0.004) * 0.3 * dtFactor;
        break;

      case 'ember':
        if (ob.embers) {
          for (const e of ob.embers) {
            e.x += e.vx * dtFactor;
            e.y += e.vy * dtFactor;
          }
        }
        break;

      case 'watergun':
        ob.x += ob.speed * dtFactor;
        break;

      case 'vinewhip':
        ob.x -= ob.speed * dtFactor;
        break;
    }

    // Remove off-screen obstacles
    const isOffScreen = (
      ob.y > H + 50 ||
      ob.x < -60 ||
      ob.x > W + 60 ||
      (ob.type === 'ember' && ob.embers && ob.embers.every(e => e.y > H + 30))
    );

    if (isOffScreen) {
      obstacles.splice(i, 1);
    }
  }
}

export function checkCollisions() {
  const px = player.smoothX;
  const py = player.smoothY;
  const pr = getHitboxRadius();
  const hits = [];

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];

    if (ob.type === 'ember' && ob.embers) {
      for (const e of ob.embers) {
        const dx = e.x - px;
        const dy = e.y - py;
        if (Math.sqrt(dx * dx + dy * dy) < pr + 8) {
          obstacles.splice(i, 1);
          hits.push(ob);
          break;
        }
      }
      continue;
    }

    if (ob.type === 'watergun') {
      // Stream collision: thin vertical rect
      if (Math.abs(ob.x - px) < pr + 4 && Math.abs(ob.y - py) < pr + 30) {
        obstacles.splice(i, 1);
        hits.push(ob);
      }
      continue;
    }

    if (ob.type === 'vinewhip') {
      // Horizontal line collision
      if (Math.abs(ob.vineY - py) < pr + 4 && ob.x < px + pr && ob.x + W * 0.6 > px - pr) {
        obstacles.splice(i, 1);
        hits.push(ob);
      }
      continue;
    }

    const dx = ob.x - px;
    const dy = ob.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < pr + ob.radius) {
      obstacles.splice(i, 1);
      hits.push(ob);
    }
  }

  return hits;
}

export function drawObstacles(ctx, ts) {
  for (const ob of obstacles) {
    switch (ob.type) {
      case 'pokeball':
      case 'greatball':
      case 'ultraball':
      case 'masterball': {
        const sprite = POKEBALL_SPRITES[ob.type];
        drawSprite(ctx, sprite.data, sprite.palette, ob.x, ob.y, SPRITE_SCALE);
        break;
      }

      case 'zubat':
      case 'geodude':
      case 'pidgey': {
        const sprite = WILD_SPRITES[ob.type];
        drawSprite(ctx, sprite.data, sprite.palette, ob.x, ob.y, SPRITE_SCALE);
        break;
      }

      case 'gastly': {
        const sprite = WILD_SPRITES.gastly;
        ctx.globalAlpha = ob.gastlyAlpha;
        drawSprite(ctx, sprite.data, sprite.palette, ob.x, ob.y, SPRITE_SCALE);
        ctx.globalAlpha = 1;
        break;
      }

      case 'ember': {
        if (ob.embers) {
          for (const e of ob.embers) {
            drawSprite(ctx, EMBER_SPRITE.data, EMBER_SPRITE.palette, e.x, e.y, 2);
          }
        }
        break;
      }

      case 'watergun': {
        // Draw as animated blue stream
        ctx.fillStyle = '#5DADE2';
        ctx.globalAlpha = 0.7 + Math.sin(ts * 0.01) * 0.2;
        ctx.fillRect(ob.x - 3, ob.y - 40, 6, 80);
        ctx.globalAlpha = 1;
        break;
      }

      case 'vinewhip': {
        // Draw as green horizontal line
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 6;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(ob.x, ob.vineY);
        ctx.lineTo(ob.x + W * 0.6, ob.vineY + Math.sin(ob.age * 0.005) * 8);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
    }
  }
}

// Scored when obstacle leaves bottom (non-attack obstacles only)
export function countDodged() {
  // Called before removing off-screen. Not needed — scoring happens in game.js
}
```

- [ ] **Step 2: Commit**

```bash
git add src/obstacles.js
git commit -m "feat: add obstacles module with all pokeball, wild pokemon, and attack types"
```

---

### Task 7: Power-ups Module

**Files:**
- Create: `src/powerups.js`

- [ ] **Step 1: Create powerups.js**

```js
import { W, H, BERRY_SPEED, BERRY_RADIUS, INVINCIBILITY_DURATION, SPRITE_SCALE } from './constants.js';
import { drawSprite, BERRY_SPRITES } from './sprites.js';
import { player, getHitboxRadius, getStarterDef } from './player.js';
import { clearObstacles } from './obstacles.js';
import { spawnParticles, spawnSparkles, triggerFlash } from './renderer.js';

const berries = [];
let activeEffect = null; // { type, timer, maxTime }

export function getActiveEffect() {
  return activeEffect;
}

export function clearBerries() {
  berries.length = 0;
  activeEffect = null;
}

export function spawnBerry() {
  const types = ['oran', 'oran', 'oran', 'sitrus', 'sitrus', 'rawst', 'lum'];
  // Lum is rarer (1/7 base chance from pool)
  const type = types[Math.floor(Math.random() * types.length)];

  berries.push({
    type,
    x: 40 + Math.random() * (W - 80),
    y: -20,
    age: 0,
    wobbleOffset: Math.random() * Math.PI * 2,
  });
}

export function updateBerries(dt) {
  const dtFactor = dt * 0.06;
  const def = getStarterDef();
  const magnetActive = def && def.berryMagnet;
  const px = player.smoothX;

  for (let i = berries.length - 1; i >= 0; i--) {
    const b = berries[i];
    b.age += dt;
    b.y += BERRY_SPEED * dtFactor;
    b.x += Math.sin(b.age * 0.003 + b.wobbleOffset) * 0.5 * dtFactor;

    // Berry magnet for Squirtle line
    if (magnetActive) {
      const dx = px - b.x;
      b.x += Math.sign(dx) * 0.5 * dtFactor;
    }

    // Off-screen
    if (b.y > H + 30) {
      berries.splice(i, 1);
    }
  }

  // Update active effect timer
  if (activeEffect) {
    activeEffect.timer -= dt;
    if (activeEffect.timer <= 0) {
      if (activeEffect.type === 'rawst') {
        player.invincible = false;
        player.invincibleTimer = 0;
      }
      activeEffect = null;
    }
  }
}

export function checkBerryCollisions(score) {
  const px = player.smoothX;
  const py = player.smoothY;
  const pr = getHitboxRadius();
  let scoreBonus = 0;

  for (let i = berries.length - 1; i >= 0; i--) {
    const b = berries[i];
    const dx = b.x - px;
    const dy = b.y - py;
    if (Math.sqrt(dx * dx + dy * dy) < pr + BERRY_RADIUS) {
      // Collect!
      spawnSparkles(b.x, b.y, 8);

      switch (b.type) {
        case 'oran':
          scoreBonus += 10;
          spawnParticles(b.x, b.y, '#378ADD', 6);
          break;

        case 'sitrus':
          player.lives++;
          spawnParticles(b.x, b.y, '#F5C34B', 6);
          break;

        case 'rawst':
          player.invincible = true;
          player.invincibleTimer = INVINCIBILITY_DURATION;
          activeEffect = { type: 'rawst', timer: INVINCIBILITY_DURATION, maxTime: INVINCIBILITY_DURATION };
          spawnParticles(b.x, b.y, '#E24B4A', 8);
          break;

        case 'lum':
          clearObstacles();
          triggerFlash('#1D9E75', 0.4);
          spawnParticles(b.x, b.y, '#1D9E75', 16);
          break;
      }

      berries.splice(i, 1);
    }
  }

  return scoreBonus;
}

export function drawBerries(ctx, ts) {
  for (const b of berries) {
    const sprite = BERRY_SPRITES[b.type];

    // Subtle sparkle effect
    const sparkle = Math.sin(ts * 0.005 + b.wobbleOffset) * 0.15;
    ctx.globalAlpha = 0.85 + sparkle;

    drawSprite(ctx, sprite.data, sprite.palette, b.x, b.y, SPRITE_SCALE);
    ctx.globalAlpha = 1;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/powerups.js
git commit -m "feat: add power-ups module with berry spawning, collection, and effects"
```

---

### Task 8: Random Events Module

**Files:**
- Create: `src/events.js`

- [ ] **Step 1: Create events.js**

```js
import { W, H, EVENT_COOLDOWN, EVENT_MAX_COOLDOWN, SNORLAX_DURATION, TEAM_ROCKET_DURATION, FOG_DURATION, LEGENDARY_POINTS, SPRITE_SCALE } from './constants.js';
import { drawSprite, SNORLAX_SPRITE, MEWTWO_SPRITE } from './sprites.js';
import { player, getHitboxRadius } from './player.js';
import { spawnParticles, spawnSparkles } from './renderer.js';

let activeEvent = null;
let lastEventTime = 0;
let nextEventCooldown = EVENT_COOLDOWN;

export function getActiveEvent() {
  return activeEvent;
}

export function resetEvents() {
  activeEvent = null;
  lastEventTime = 0;
  nextEventCooldown = EVENT_COOLDOWN;
}

// Check if controls should be reversed
export function isControlsReversed() {
  return activeEvent && activeEvent.type === 'rocket';
}

const EVENT_TYPES = ['snorlax', 'rocket', 'legendary', 'fog'];

export function trySpawnEvent(gameTime) {
  if (activeEvent) return;
  if (gameTime - lastEventTime < nextEventCooldown) return;

  const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];

  switch (type) {
    case 'snorlax':
      activeEvent = {
        type: 'snorlax',
        timer: SNORLAX_DURATION,
        maxTime: SNORLAX_DURATION,
        x: Math.random() > 0.5 ? W * 0.25 : W * 0.75,
        slideIn: 0, // animation progress 0-1
        banner: 'SNORLAX IS BLOCKING THE PATH!',
      };
      break;

    case 'rocket':
      activeEvent = {
        type: 'rocket',
        timer: TEAM_ROCKET_DURATION,
        maxTime: TEAM_ROCKET_DURATION,
        banner: 'TEAM ROCKET APPEARED!',
      };
      break;

    case 'legendary':
      activeEvent = {
        type: 'legendary',
        timer: 8000, // time to cross screen
        maxTime: 8000,
        x: -40,
        y: 100 + Math.random() * 200,
        collected: false,
        banner: 'A WILD LEGENDARY APPROACHES!',
      };
      break;

    case 'fog':
      activeEvent = {
        type: 'fog',
        timer: FOG_DURATION,
        maxTime: FOG_DURATION,
        banner: 'FOG ROLLED IN!',
      };
      break;
  }

  lastEventTime = gameTime;
  nextEventCooldown = EVENT_COOLDOWN + Math.random() * (EVENT_MAX_COOLDOWN - EVENT_COOLDOWN);
}

export function updateEvent(dt) {
  if (!activeEvent) return 0;
  let scoreBonus = 0;

  activeEvent.timer -= dt;

  switch (activeEvent.type) {
    case 'snorlax':
      activeEvent.slideIn = Math.min(1, activeEvent.slideIn + 0.02 * dt * 0.06);
      break;

    case 'legendary':
      activeEvent.x += 1.5 * dt * 0.06;
      // Check if player touches Mewtwo for bonus points
      if (!activeEvent.collected) {
        const dx = activeEvent.x - player.smoothX;
        const dy = activeEvent.y - player.smoothY;
        if (Math.sqrt(dx * dx + dy * dy) < getHitboxRadius() + 20) {
          activeEvent.collected = true;
          scoreBonus = LEGENDARY_POINTS;
          spawnSparkles(activeEvent.x, activeEvent.y, 20);
          spawnParticles(activeEvent.x, activeEvent.y, '#9B59B6', 12);
        }
      }
      if (activeEvent.x > W + 60) {
        activeEvent.timer = 0;
      }
      break;
  }

  if (activeEvent.timer <= 0) {
    activeEvent = null;
  }

  return scoreBonus;
}

// Returns collision rect for Snorlax blocking area
export function getSnorlaxBlockRect() {
  if (!activeEvent || activeEvent.type !== 'snorlax') return null;
  const snorlaxW = 20 * SPRITE_SCALE; // sprite width
  const blockW = W * 0.4;
  const centerX = activeEvent.x;
  return {
    x: centerX - blockW / 2,
    y: 0,
    w: blockW,
    h: H,
  };
}

export function drawEvent(ctx, ts) {
  if (!activeEvent) return;

  switch (activeEvent.type) {
    case 'snorlax': {
      const targetX = activeEvent.x;
      const slideX = targetX * activeEvent.slideIn + (activeEvent.x > W / 2 ? W + 40 : -40) * (1 - activeEvent.slideIn);
      drawSprite(ctx, SNORLAX_SPRITE.data, SNORLAX_SPRITE.palette, slideX, H * 0.5, SPRITE_SCALE + 1);
      // Semi-transparent blocking zone
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      const blockW = W * 0.4;
      ctx.fillRect(slideX - blockW / 2, 0, blockW, H);
      break;
    }

    case 'rocket': {
      // Flashing "R" indicator
      if (Math.floor(ts / 200) % 2 === 0) {
        ctx.save();
        ctx.font = 'bold 36px monospace';
        ctx.fillStyle = '#E24B4A';
        ctx.textAlign = 'right';
        ctx.fillText('R', W - 20, H - 20);
        ctx.restore();
      }
      break;
    }

    case 'legendary': {
      const alpha = activeEvent.collected ? 0.4 : 1;
      ctx.globalAlpha = alpha;
      drawSprite(ctx, MEWTWO_SPRITE.data, MEWTWO_SPRITE.palette, activeEvent.x, activeEvent.y, SPRITE_SCALE);
      ctx.globalAlpha = 1;
      // Glow aura
      if (!activeEvent.collected) {
        ctx.beginPath();
        ctx.arc(activeEvent.x, activeEvent.y, 30 + Math.sin(ts * 0.005) * 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(155, 89, 182, 0.15)';
        ctx.fill();
      }
      break;
    }

    case 'fog': {
      // Dark overlay with spotlight cutout around player
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      // Cut out a spotlight circle
      ctx.globalCompositeOperation = 'destination-out';
      const gradient = ctx.createRadialGradient(
        player.smoothX, player.smoothY, 20,
        player.smoothX, player.smoothY, 100
      );
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      break;
    }
  }

  // Event banner (slides in from right, stays for 2 seconds)
  if (activeEvent && activeEvent.banner) {
    const bannerAge = activeEvent.maxTime - activeEvent.timer;
    if (bannerAge < 2000) {
      const slideProgress = Math.min(1, bannerAge / 300);
      const bannerX = W * (1 - slideProgress) + W / 2 * slideProgress;

      ctx.save();
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';

      // Black outline
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(activeEvent.banner, bannerX, H * 0.15);

      // White fill
      ctx.fillStyle = '#fff';
      ctx.fillText(activeEvent.banner, bannerX, H * 0.15);
      ctx.restore();
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/events.js
git commit -m "feat: add random events (Snorlax, Team Rocket, Legendary, Fog)"
```

---

### Task 9: Screens — Title, Starter Select, Evolution, Game Over

**Files:**
- Create: `src/screens.js`

- [ ] **Step 1: Create screens.js**

```js
import { W, H, COLORS, SPRITE_SCALE } from './constants.js';
import { drawSprite, STARTER_SPRITES } from './sprites.js';
import { getStarterNames, getStarterDef, player } from './player.js';
import { drawStarfield } from './renderer.js';

// --- TITLE SCREEN ---
let titleBlink = 0;

export function drawTitleScreen(ctx, ts, dt) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  // Title
  ctx.save();
  ctx.textAlign = 'center';

  // "POKEMON" in large pixel font
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = COLORS.scoreYellow;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText('POKEMON', W / 2, H * 0.3);
  ctx.fillText('POKEMON', W / 2, H * 0.3);

  // "DODGE" below
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = COLORS.textPrimary;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText('DODGE', W / 2, H * 0.3 + 48);
  ctx.fillText('DODGE', W / 2, H * 0.3 + 48);

  // Draw three starters as decoration
  const starters = getStarterNames();
  starters.forEach((name, i) => {
    const sprites = STARTER_SPRITES[name][0];
    const x = W / 2 + (i - 1) * 80;
    const bob = Math.sin(ts * 0.002 + i * 1.5) * 4;
    drawSprite(ctx, sprites.idle, sprites.palette, x, H * 0.55 + bob, SPRITE_SCALE);
  });

  // "PRESS START" blinking
  titleBlink += dt;
  if (Math.floor(titleBlink / 500) % 2 === 0) {
    ctx.font = '16px monospace';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText('PRESS START', W / 2, H * 0.78);
  }

  // Subtitle
  ctx.font = '12px monospace';
  ctx.fillStyle = COLORS.textSecondary;
  ctx.fillText('move your head to dodge \u2022 uses webcam', W / 2, H * 0.88);

  ctx.restore();
}

// --- STARTER SELECT ---
let selectIndex = 1; // start in middle (Bulbasaur)
let selectBounce = 0;

export function getSelectIndex() {
  return selectIndex;
}

export function moveSelect(dir) {
  selectIndex = Math.max(0, Math.min(2, selectIndex + dir));
  selectBounce = 0;
}

export function drawSelectScreen(ctx, ts, dt) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);
  selectBounce += dt;

  ctx.save();
  ctx.textAlign = 'center';

  // Title
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText('CHOOSE YOUR POKEMON', W / 2, 60);

  const starters = getStarterNames();
  const NAMES = { charmander: 'CHARMANDER', bulbasaur: 'BULBASAUR', squirtle: 'SQUIRTLE' };
  const PERKS = { charmander: 'Speed +5%', bulbasaur: 'Extra life', squirtle: 'Berry magnet' };

  starters.forEach((name, i) => {
    const sprites = STARTER_SPRITES[name][0];
    const x = W / 2 + (i - 1) * 180;
    const y = H * 0.42;
    const isSelected = i === selectIndex;
    const scale = isSelected ? SPRITE_SCALE + 1 : SPRITE_SCALE;
    const bob = isSelected ? Math.sin(selectBounce * 0.005) * 6 : 0;

    // Selection highlight
    if (isSelected) {
      ctx.strokeStyle = COLORS.scoreYellow;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 50, y - 45 + bob, 100, 120);
    }

    drawSprite(ctx, sprites.idle, sprites.palette, x, y + bob, scale);

    // Name
    ctx.font = isSelected ? 'bold 14px monospace' : '12px monospace';
    ctx.fillStyle = isSelected ? COLORS.scoreYellow : COLORS.textSecondary;
    ctx.fillText(NAMES[name], x, y + 55 + bob);

    // Perk
    ctx.font = '11px monospace';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(PERKS[name], x, y + 72 + bob);
  });

  // Instructions
  ctx.font = '14px monospace';
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText('\u2190 \u2192 to choose \u2022 ENTER to confirm', W / 2, H * 0.85);

  ctx.restore();
}

// --- EVOLUTION CUTSCENE ---
let evoTimer = 0;
let evoStage = 0; // 0 = flash, 1 = sparkle, 2 = reveal
const EVO_DURATION = 2000;

export function startEvolutionCutscene() {
  evoTimer = 0;
  evoStage = 0;
}

export function updateEvolutionCutscene(dt) {
  evoTimer += dt;
  if (evoTimer < 400) evoStage = 0;       // white flash
  else if (evoTimer < 1400) evoStage = 1;  // sparkles
  else if (evoTimer < EVO_DURATION) evoStage = 2; // reveal
  return evoTimer >= EVO_DURATION;
}

export function drawEvolutionCutscene(ctx, ts, dt) {
  // The game is still visible underneath — we draw on top

  if (evoStage === 0) {
    // White flash
    const alpha = Math.min(1, evoTimer / 200);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
    ctx.fillRect(0, 0, W, H);
  } else if (evoStage === 1) {
    // Sparkles around player
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(0, 0, W, H);
    // Sparkle particles drawn by renderer's particle system
  } else if (evoStage === 2) {
    // Reveal — fade from white
    const revealProgress = (evoTimer - 1400) / 600;
    const alpha = Math.max(0, 0.5 * (1 - revealProgress));
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // "What? POKEMON is evolving!" text
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px monospace';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.fillStyle = COLORS.textPrimary;

  const def = getStarterDef();
  const prevName = def.evolutions[player.stage - 1] || def.evolutions[0];
  const newName = def.evolutions[player.stage];

  if (evoTimer < 1400) {
    const text = `What? ${prevName} is evolving!`;
    ctx.strokeText(text, W / 2, H * 0.25);
    ctx.fillText(text, W / 2, H * 0.25);
  } else {
    const text = `${prevName} evolved into ${newName}!`;
    ctx.strokeText(text, W / 2, H * 0.25);
    ctx.fillText(text, W / 2, H * 0.25);
  }

  ctx.restore();
}

// --- GAME OVER SCREEN ---
let gameOverTimer = 0;
let displayedScore = 0;

export function startGameOver(finalScore) {
  gameOverTimer = 0;
  displayedScore = 0;
}

export function drawGameOverScreen(ctx, ts, dt, finalScore) {
  gameOverTimer += dt;

  // Darken background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  // Arcade-style score tally
  displayedScore = Math.min(finalScore, Math.floor(gameOverTimer / 30));

  ctx.save();
  ctx.textAlign = 'center';

  // "GAME OVER"
  ctx.font = 'bold 40px monospace';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.fillStyle = COLORS.hitRed;
  ctx.strokeText('GAME OVER', W / 2, H * 0.3);
  ctx.fillText('GAME OVER', W / 2, H * 0.3);

  // Score
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = COLORS.scoreYellow;
  ctx.fillText(`SCORE: ${displayedScore}`, W / 2, H * 0.45);

  // Play again prompt (after tally completes)
  if (displayedScore >= finalScore && Math.floor(gameOverTimer / 500) % 2 === 0) {
    ctx.font = '16px monospace';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText('PRESS ENTER TO PLAY AGAIN', W / 2, H * 0.65);
  }

  ctx.restore();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens.js
git commit -m "feat: add game screens (title, starter select, evolution cutscene, game over)"
```

---

### Task 10: Core Game Loop

**Files:**
- Create: `src/game.js`

- [ ] **Step 1: Create game.js**

```js
import { W, H, WAVES, COLORS } from './constants.js';
import { player, updatePlayer, drawPlayer, shouldEvolve, evolve, finishEvolving, getHitboxRadius } from './player.js';
import { getObstacles, clearObstacles, spawnObstacle, updateObstacles, checkCollisions, drawObstacles } from './obstacles.js';
import { clearBerries, spawnBerry, updateBerries, checkBerryCollisions, drawBerries, getActiveEffect } from './powerups.js';
import { resetEvents, trySpawnEvent, updateEvent, isControlsReversed, drawEvent, getActiveEvent } from './events.js';
import { drawStarfield, updateAndDrawParticles, drawHUD, applyScreenEffects, triggerShake, triggerFlash, spawnParticles } from './renderer.js';
import { startEvolutionCutscene, updateEvolutionCutscene, drawEvolutionCutscene } from './screens.js';

let score = 0;
let lastSpawnTime = 0;
let gameTime = 0;
let evolving = false;

export function getScore() {
  return score;
}

export function resetGame() {
  score = 0;
  lastSpawnTime = 0;
  gameTime = 0;
  evolving = false;
  clearObstacles();
  clearBerries();
  resetEvents();
}

function getCurrentWave() {
  for (let i = WAVES.length - 1; i >= 0; i--) {
    if (score >= WAVES[i].minScore) return WAVES[i];
  }
  return WAVES[0];
}

function pickObstacleType(wave) {
  const pool = wave.obstacles;
  const entries = Object.entries(pool);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return entries[0][0];
}

export function updateGame(ts, dt) {
  gameTime += dt;

  // Evolution cutscene
  if (evolving) {
    const done = updateEvolutionCutscene(dt);
    if (done) {
      evolving = false;
      finishEvolving();
    }
    return; // freeze gameplay during evolution
  }

  // Check for evolution
  if (shouldEvolve(score)) {
    evolve();
    evolving = true;
    startEvolutionCutscene();
    triggerFlash('#fff', 0.8);
    return;
  }

  const wave = getCurrentWave();
  const reversed = isControlsReversed();

  // Update player
  updatePlayer(dt, reversed);

  // Spawn obstacles
  if (gameTime - lastSpawnTime > wave.spawnInterval) {
    // Maybe spawn berry instead
    if (wave.berryChance > 0 && Math.random() < wave.berryChance) {
      spawnBerry();
    } else {
      const type = pickObstacleType(wave);
      spawnObstacle(type);
    }
    lastSpawnTime = gameTime;
  }

  // Update systems
  updateObstacles(dt);
  updateBerries(dt);

  // Random events
  if (wave.eventsEnabled) {
    trySpawnEvent(gameTime);
  }
  const eventBonus = updateEvent(dt);
  score += eventBonus;

  // Berry collisions
  const berryBonus = checkBerryCollisions(score);
  score += berryBonus;

  // Obstacle collisions
  const hits = checkCollisions();
  for (const hit of hits) {
    if (!player.invincible) {
      player.lives--;
      triggerShake(5, 200);
      triggerFlash('#E24B4A', 0.3);
      spawnParticles(player.smoothX, player.smoothY, '#E24B4A', 8);
      if (player.lives <= 0) {
        return 'gameover';
      }
    }
  }

  // Score from obstacles leaving bottom (only standard fallers)
  // This is handled by the obstacle removal — count obstacles that exit bottom
  const obs = getObstacles();
  // Scoring: obstacles removed by off-screen bottom in updateObstacles
  // We handle scoring differently: track pre/post count
  // Actually, let's just count dodged per frame
  // Simplification: score +1 per spawn-interval that passes without dying
  // Better: score when obstacles leave bottom. We'll add a callback.
  // For now: increment score for each obstacle that passes below screen.
  // updateObstacles already removes them — we need to count before removal.

  return null;
}

// Called by updateObstacles when obstacle exits bottom
export function onObstacleDodged(type) {
  // Only score for dodge-able types
  const scoreTypes = ['pokeball', 'greatball', 'ultraball', 'masterball', 'zubat', 'geodude', 'gastly', 'pidgey'];
  if (scoreTypes.includes(type)) {
    score++;
  }
}

export function drawGame(ctx, ts, dt) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  const { offsetX, offsetY } = applyScreenEffects(ctx, dt);
  ctx.save();
  ctx.translate(offsetX, offsetY);

  drawStarfield(ctx, dt);
  drawObstacles(ctx, ts);
  drawBerries(ctx, ts);
  drawPlayer(ctx, ts);
  drawEvent(ctx, ts);

  ctx.restore();

  updateAndDrawParticles(ctx, dt);

  // HUD
  const wave = getCurrentWave();
  const effect = getActiveEffect();
  drawHUD(ctx, score, player.lives, wave.name, effect ? effect.timer : 0, effect ? effect.maxTime : 0);

  // Evolution cutscene overlay
  if (evolving) {
    drawEvolutionCutscene(ctx, ts, dt);
  }
}
```

- [ ] **Step 2: Wire up score-on-dodge in obstacles.js**

Edit `src/obstacles.js` — add scoring callback when obstacles leave the bottom. Update the off-screen removal section of `updateObstacles`:

Find the off-screen removal block and update it to call the scoring callback. Add at the top of obstacles.js:

```js
let onDodgedCallback = null;

export function setOnDodgedCallback(cb) {
  onDodgedCallback = cb;
}
```

Then in the `updateObstacles` function, where obstacles are removed for being off-screen, change the splice to also fire the callback:

```js
    if (isOffScreen) {
      // Score if it left through the bottom
      if (ob.y > H + 30 && onDodgedCallback) {
        onDodgedCallback(ob.type);
      }
      obstacles.splice(i, 1);
    }
```

Then in `src/game.js`, at the top after imports, add:

```js
import { setOnDodgedCallback } from './obstacles.js';
```

And in `resetGame`, add:

```js
  setOnDodgedCallback(onObstacleDodged);
```

- [ ] **Step 3: Commit**

```bash
git add src/game.js src/obstacles.js
git commit -m "feat: add core game loop with wave progression, scoring, and collision"
```

---

### Task 11: Main Entry Point — Wire Everything Together

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Rewrite main.js as the state machine**

```js
import { W, H } from './constants.js';
import { initTracking } from './tracking.js';
import { selectStarter, resetPlayer, getStarterNames, player } from './player.js';
import { resetGame, updateGame, drawGame, getScore } from './game.js';
import { drawTitleScreen, drawSelectScreen, getSelectIndex, moveSelect, drawGameOverScreen, startGameOver } from './screens.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let state = 'title'; // 'title' | 'select' | 'playing' | 'gameover'
let lastTs = 0;
let trackingInitialized = false;

// Keyboard input
document.addEventListener('keydown', (e) => {
  switch (state) {
    case 'title':
      if (e.key === 'Enter' || e.key === ' ') {
        state = 'select';
      }
      break;

    case 'select':
      if (e.key === 'ArrowLeft') moveSelect(-1);
      else if (e.key === 'ArrowRight') moveSelect(1);
      else if (e.key === 'Enter' || e.key === ' ') {
        const starters = getStarterNames();
        const chosen = starters[getSelectIndex()];
        selectStarter(chosen);
        resetGame();

        if (!trackingInitialized) {
          initTracking(canvas);
          trackingInitialized = true;
        }

        state = 'playing';
      }
      break;

    case 'playing':
      // No keyboard input during gameplay (head/mouse controls)
      break;

    case 'gameover':
      if (e.key === 'Enter' || e.key === ' ') {
        resetPlayer();
        resetGame();
        state = 'playing';
      }
      if (e.key === 'Escape') {
        state = 'title';
      }
      break;
  }
});

// Also support click/tap on title and game over
canvas.addEventListener('click', () => {
  if (state === 'title') {
    state = 'select';
  }
});

function loop(ts) {
  const dt = lastTs ? Math.min(ts - lastTs, 50) : 16; // cap dt to prevent spiral
  lastTs = ts;

  switch (state) {
    case 'title':
      drawTitleScreen(ctx, ts, dt);
      break;

    case 'select':
      drawSelectScreen(ctx, ts, dt);
      break;

    case 'playing': {
      const result = updateGame(ts, dt);
      drawGame(ctx, ts, dt);
      if (result === 'gameover') {
        startGameOver(getScore());
        state = 'gameover';
      }
      break;
    }

    case 'gameover':
      // Draw frozen game underneath
      drawGame(ctx, ts, 0); // dt=0 to freeze
      drawGameOverScreen(ctx, ts, dt, getScore());
      break;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

- [ ] **Step 2: Test the full game flow**

Run: `cd "/Users/michellefitzpatrick/Claude projects/Face Tracking" && npx vite`
Expected:
1. Title screen with "POKEMON DODGE", three bobbing starters, blinking "PRESS START"
2. Press Enter → starter select screen with left/right navigation
3. Select starter, press Enter → game starts, face tracking initializes
4. Pokeballs fall, score increments, lives decrease on hit
5. Game over screen with score tally and "PRESS ENTER TO PLAY AGAIN"

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: wire up state machine and complete game loop"
```

---

### Task 12: Polish & Bug Fixes

**Files:**
- Modify: `src/renderer.js` (if HUD or effects need tweaks)
- Modify: `src/game.js` (if gameplay tuning needed)
- Modify: `src/obstacles.js` (if collision feels off)

- [ ] **Step 1: Playtest and fix obvious issues**

Run the game end-to-end. Common things to check and fix:
- Obstacle spawn rate feels right (not too fast wave 1, chaotic enough wave 5)
- Collision hitboxes feel fair (not too punishing)
- Evolution cutscene triggers at correct scores (40, 80)
- Berries are collectible and effects work (invincibility flashing, Lum clears screen)
- Random events trigger in wave 4+ and don't stack
- Fog spotlight follows player correctly
- Team Rocket controls reversal feels disorienting but playable
- Snorlax blocks correct portion of screen
- Legendary Mewtwo gives +50 on touch
- Score tallies correctly on game over
- Player can restart and play again cleanly

Fix any issues found during playtest.

- [ ] **Step 2: Commit fixes**

```bash
git add -u
git commit -m "fix: polish and tune gameplay after playtesting"
```

- [ ] **Step 3: Final commit — remove test files and clean up**

Make sure `head_dodge_game_1.html` stays as reference. Verify no temp/test code remains in any source file.

```bash
git add -A
git commit -m "chore: clean up project for initial release"
```
