# Hand Tracking Projectiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hand-tracking projectiles that let players fire starter-specific attacks to destroy obstacles.

**Architecture:** MediaPipe Hands runs alongside existing Face Mesh on the same camera. New `hands.js` module exports reactive hand state. New `projectiles.js` manages spawning, movement, energy, collision, and drawing. Game loop integrates both.

**Tech Stack:** MediaPipe Hands (CDN), HTML5 Canvas

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `index.html` | Modify | Add Hands CDN script tag |
| `src/hands.js` | Create | MediaPipe Hands init, reactive hand state |
| `src/projectiles.js` | Create | Projectile spawning, movement, energy, collision, drawing |
| `src/sprites.js` | Modify | Add razor leaf + water droplet sprites |
| `src/game.js` | Modify | Integrate projectiles into update/draw loop |
| `src/renderer.js` | Modify | Add energy bar drawing |

---

### Task 1: Add Hands CDN + Hand Tracking Module

**Files:**
- Modify: `index.html`
- Create: `src/hands.js`

- [ ] **Step 1: Add MediaPipe Hands CDN to index.html**

Add this line after the face_mesh script tag (line 55) and before the module script:

```html
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js"></script>
```

- [ ] **Step 2: Create src/hands.js**

```js
import { W, H } from './constants.js';

// Reactive hand state — game reads these directly
export const handState = {
  left:  { active: false, x: 0, y: 0 },
  right: { active: false, x: 0, y: 0 },
};

let handsInstance = null;

export function initHands() {
  const video = document.getElementById('videoEl');
  if (!video || !video.srcObject) return; // no camera

  handsInstance = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`,
  });

  handsInstance.setOptions({
    maxNumHands: 2,
    modelComplexity: 0, // fastest
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  handsInstance.onResults(onHandResults);

  // Piggyback on the existing camera — send frames to hands too
  // We poll the video element on a timer since the Camera util
  // is already driving face mesh
  let sending = false;
  setInterval(async () => {
    if (sending || !video.srcObject || video.readyState < 2) return;
    sending = true;
    try {
      await handsInstance.send({ image: video });
    } catch (e) {
      // ignore frame drops
    }
    sending = false;
  }, 100); // ~10fps for hands (lighter than face mesh)
}

function onHandResults(results) {
  // Reset both
  handState.left.active = false;
  handState.right.active = false;

  if (!results.multiHandLandmarks || !results.multiHandedness) return;

  for (let i = 0; i < results.multiHandLandmarks.length; i++) {
    const landmarks = results.multiHandLandmarks[i];
    const handedness = results.multiHandedness[i];

    // MediaPipe labels are from camera perspective (mirrored)
    // "Right" in MediaPipe = left hand in mirrored view
    const isLeft = handedness.label === 'Right';
    const hand = isLeft ? handState.left : handState.right;

    const wrist = landmarks[0];
    const middleTip = landmarks[9]; // middle finger MCP for hand center

    // Use middle finger MCP for aiming position
    // Mirror x to match our face tracking (1 - x)
    hand.x = (1 - middleTip.x) * W;
    hand.y = middleTip.y * H;

    // Hand is "raised" if wrist is in upper 70% of frame
    hand.active = wrist.y < 0.7;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html src/hands.js
git commit -m "feat: add MediaPipe Hands tracking module"
```

---

### Task 2: Projectile Sprites

**Files:**
- Modify: `src/sprites.js`

- [ ] **Step 1: Add razor leaf and water droplet sprites to sprites.js**

Add before the closing of the file, after the EMBER_SPRITE section:

```js
// --- PROJECTILE SPRITES (8x8) ---

const RAZOR_LEAF_PALETTE = { 1: '#222', 2: '#2E7D32', 3: '#4CAF50', 4: '#81C784' };

// prettier-ignore
export const RAZOR_LEAF_SPRITE = {
  data: [
    [0,0,0,0,0,1,1,0],
    [0,0,0,0,1,3,2,1],
    [0,0,0,1,3,2,2,1],
    [0,0,1,3,2,2,1,0],
    [0,1,3,2,2,1,0,0],
    [1,4,3,2,1,0,0,0],
    [1,4,4,1,0,0,0,0],
    [0,1,1,0,0,0,0,0],
  ],
  palette: RAZOR_LEAF_PALETTE,
};

const WATER_SHOT_PALETTE = { 1: '#222', 2: '#1976D2', 3: '#42A5F5', 4: '#90CAF9' };

// prettier-ignore
export const WATER_SHOT_SPRITE = {
  data: [
    [0,0,0,1,1,0,0,0],
    [0,0,1,3,3,1,0,0],
    [0,1,3,4,4,3,1,0],
    [1,2,3,4,4,3,2,1],
    [1,2,3,4,4,3,2,1],
    [0,1,2,3,3,2,1,0],
    [0,0,1,2,2,1,0,0],
    [0,0,0,1,1,0,0,0],
  ],
  palette: WATER_SHOT_PALETTE,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/sprites.js
git commit -m "feat: add razor leaf and water shot projectile sprites"
```

---

### Task 3: Projectile System

**Files:**
- Create: `src/projectiles.js`

- [ ] **Step 1: Create src/projectiles.js**

```js
import { W, H, SPRITE_SCALE } from './constants.js';
import { drawSprite, EMBER_SPRITE, RAZOR_LEAF_SPRITE, WATER_SHOT_SPRITE } from './sprites.js';
import { player } from './player.js';
import { getObstacles } from './obstacles.js';
import { spawnParticles } from './renderer.js';
import { handState } from './hands.js';

const projectiles = [];

// Energy per hand (0-100)
const energy = { left: 100, right: 100 };
const ENERGY_MAX = 100;
const ENERGY_COST = 10;
const ENERGY_RECHARGE = 15; // per second
const ENERGY_MIN_TO_FIRE = 20;
const FIRE_INTERVAL = 1000; // ms between shots per hand
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
  if (!config) return;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    for (let j = obstacles.length - 1; j >= 0; j--) {
      const ob = obstacles[j];

      // Skip attack-type obstacles (watergun, vinewhip) — can't shoot those
      if (ob.type === 'watergun' || ob.type === 'vinewhip') continue;

      // For ember obstacles, check against each fireball
      if (ob.type === 'ember' && ob.embers) {
        let hitEmber = false;
        for (const e of ob.embers) {
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          if (Math.sqrt(dx * dx + dy * dy) < PROJECTILE_RADIUS + 8) {
            hitEmber = true;
            break;
          }
        }
        if (hitEmber) {
          spawnParticles(p.x, p.y, config.color, 8);
          projectiles.splice(i, 1);
          obstacles.splice(j, 1);
          break;
        }
        continue;
      }

      const dx = p.x - ob.x;
      const dy = p.y - ob.y;
      const hitDist = PROJECTILE_RADIUS + (ob.radius || 12);
      if (Math.sqrt(dx * dx + dy * dy) < hitDist) {
        // Hit! Destroy both
        spawnParticles(ob.x, ob.y, config.color, 10);
        projectiles.splice(i, 1);
        obstacles.splice(j, 1);
        break;
      }
    }
  }
}

export function drawProjectiles(ctx, ts) {
  const config = PROJECTILE_CONFIG[player.starter];
  if (!config) return;

  for (const p of projectiles) {
    // Rotate sprite in direction of travel
    const angle = Math.atan2(p.vy, p.vx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    drawSprite(ctx, config.sprite.data, config.sprite.palette, 0, 0, 2);
    ctx.restore();
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
```

- [ ] **Step 2: Commit**

```bash
git add src/projectiles.js
git commit -m "feat: add projectile system with energy, collision, and per-starter visuals"
```

---

### Task 4: Integrate Into Game Loop

**Files:**
- Modify: `src/game.js`
- Modify: `src/main.js` (add initHands call)

- [ ] **Step 1: Add projectile imports to game.js**

Add to the imports at top of `src/game.js`:

```js
import { updateProjectiles, checkProjectileCollisions, drawProjectiles, drawEnergyBars, resetProjectiles } from './projectiles.js';
```

- [ ] **Step 2: Add resetProjectiles() to resetGame()**

In the `resetGame()` function, add `resetProjectiles();` after `resetEvents();`.

- [ ] **Step 3: Add projectile updates to updateGame()**

In `updateGame()`, after the `updateBerries(dt);` line (line ~141), add:

```js
  // ── Projectiles ─────────────────────────────────────────
  updateProjectiles(ts, dt);
  checkProjectileCollisions();
```

- [ ] **Step 4: Add projectile drawing to drawGame()**

In `drawGame()`, after `drawPlayer(ctx, ts);` (line ~199) and before `drawEvent(ctx, ts);`, add:

```js
  drawProjectiles(ctx, ts);
  drawEnergyBars(ctx);
```

- [ ] **Step 5: Add initHands() call to main.js**

In `src/main.js`, add import at the top:

```js
import { initHands } from './hands.js';
```

Then in the select→playing keydown handler, after `initTracking(canvas);`, add:

```js
          // Init hand tracking after camera is ready (slight delay for camera to start)
          setTimeout(() => initHands(), 1000);
```

- [ ] **Step 6: Verify build passes**

Run: `cd "/Users/michellefitzpatrick/Claude projects/Face Tracking" && npx vite build`
Expected: ✓ built successfully, no errors

- [ ] **Step 7: Commit**

```bash
git add src/game.js src/main.js
git commit -m "feat: integrate hand projectiles into game loop"
```
