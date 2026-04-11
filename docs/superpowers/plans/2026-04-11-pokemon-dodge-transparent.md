# Pokemon Dodge Transparent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork Pokemon Dodge into a new project where the live camera feed is the background, the player sees themselves on screen, and mouth-open triggers a starter-specific special ability.

**Architecture:** Fork the existing Vite + Canvas 2D + MediaPipe project. Replace the starfield/sprite rendering with mirrored camera feed. Add mouth detection via FaceMesh landmarks. New `abilities.js` module handles shield/vacuum/scream blast per starter. Simplify state machine by removing leaderboard flow.

**Tech Stack:** Vite 8, vanilla JS (ES modules), Canvas 2D API, MediaPipe FaceMesh 0.4, MediaPipe Hands 0.4

---

### Task 1: Fork the project

**Files:**
- Create: `/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent/` (full copy)
- Modify: `package.json`

- [ ] **Step 1: Copy the project**

```bash
cp -r "/Users/michellefitzpatrick/Claude projects/Face Tracking" "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
```

- [ ] **Step 2: Clean up the copy**

Remove git history, dist, node_modules, .vercel, and .superpowers from the copy:

```bash
cd "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
rm -rf .git dist node_modules .vercel .superpowers
```

- [ ] **Step 3: Initialize fresh git repo**

```bash
cd "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
git init
```

- [ ] **Step 4: Update package.json**

Change the name and remove leaderboard/analytics dependencies. The file should become:

```json
{
  "name": "pokemon-dodge-transparent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^8.0.3"
  }
}
```

- [ ] **Step 5: Install dependencies**

```bash
cd "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
npm install
```

- [ ] **Step 6: Initial commit**

```bash
cd "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
git add -A
git commit -m "chore: fork Pokemon Dodge as base for transparent/AR version"
```

---

### Task 2: Camera feed as background

Replace the starfield with mirrored camera video drawn to canvas each frame.

**Files:**
- Modify: `src/renderer.js`
- Modify: `src/tracking.js`
- Modify: `src/game.js`

- [ ] **Step 1: Add video element reference export to tracking.js**

In `src/tracking.js`, add a `getVideoElement` export so the renderer can draw the camera feed. Add this after the existing imports and before `export const tracking`:

```js
let videoElement = null;

export function getVideoElement() {
  return videoElement;
}
```

Then in the `initTracking` function, right after `const video = document.getElementById('videoEl');`, add:

```js
videoElement = video;
```

- [ ] **Step 2: Replace drawStarfield with drawCameraFeed in renderer.js**

In `src/renderer.js`, add import for `getVideoElement`:

```js
import { getVideoElement } from './tracking.js';
```

Replace the entire starfield section (the `STAR_LAYERS` const, the `starLayers` initialization, and the `drawStarfield` function -- lines 8-54) with:

```js
// ============================================================
// 1. CAMERA FEED BACKGROUND
// ============================================================

const OVERLAY_ALPHA = 0.25; // dark overlay opacity so pixel art pops

/**
 * Draw the mirrored camera feed as the game background.
 * Falls back to solid dark background if video isn't ready.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawCameraFeed(ctx) {
  const video = getVideoElement();

  if (video && video.readyState >= 2) {
    ctx.save();
    // Mirror horizontally: translate to right edge, scale x by -1
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, W, H);
    ctx.restore();

    // Semi-transparent dark overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${OVERLAY_ALPHA})`;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Fallback: solid dark background while camera loads
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
  }
}
```

Also keep exporting the function name. The old export was `drawStarfield`, the new one is `drawCameraFeed`.

- [ ] **Step 3: Update game.js to use drawCameraFeed instead of drawStarfield**

In `src/game.js`, change the import on line 6 from:

```js
import { drawStarfield, updateAndDrawParticles, drawHUD, applyScreenEffects, triggerShake, triggerFlash, spawnParticles, drawTrackingFeedback } from './renderer.js';
```

to:

```js
import { drawCameraFeed, updateAndDrawParticles, drawHUD, applyScreenEffects, triggerShake, triggerFlash, spawnParticles, drawTrackingFeedback } from './renderer.js';
```

In the `drawGame` function, replace `drawStarfield(ctx, dt);` (line 204) with:

```js
drawCameraFeed(ctx);
```

- [ ] **Step 4: Update screens.js to use drawCameraFeed instead of drawStarfield**

In `src/screens.js`, change the import on line 4 from:

```js
import { drawStarfield } from './renderer.js';
```

to:

```js
import { drawCameraFeed } from './renderer.js';
```

Then replace every call to `drawStarfield(ctx, dt)` in the file with `drawCameraFeed(ctx)`. There are 5 occurrences:
- `drawTitleScreen` (line 31)
- `drawSelectScreen` (line 107)
- `drawInstructionsScreen` (line 334)
- `drawEnterNameScreen` (line 551)
- `drawLeaderboardScreen` (line 601)

- [ ] **Step 5: Run dev server and verify camera shows as background**

```bash
cd "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
npm run dev
```

Expected: The game loads, camera permission is requested, and the live mirrored camera feed appears as the background behind all game elements.

- [ ] **Step 6: Commit**

```bash
git add src/renderer.js src/tracking.js src/game.js src/screens.js
git commit -m "feat: replace starfield with mirrored camera feed background"
```

---

### Task 3: Remove player sprite, add hitbox indicator

The player's face on camera IS the character. Remove sprite rendering but keep the hitbox and collision logic.

**Files:**
- Modify: `src/player.js`

- [ ] **Step 1: Replace drawPlayer with hitbox indicator**

In `src/player.js`, replace the entire `drawPlayer` function (lines 137-158) with:

```js
export function drawPlayer(ctx, ts) {
  if (!player.starter) return;

  // Flash every 100ms when invincible (skip draw on odd frames)
  if (player.invincible && Math.floor(ts / 100) % 2 === 1) return;

  // Subtle hitbox indicator — thin circle so player knows their collision zone
  const radius = getHitboxRadius();
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Small center dot
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
```

- [ ] **Step 2: Remove unused sprite imports from player.js**

Change the imports at the top of `src/player.js` from:

```js
import { W, H, BASE_LIVES, PLAYER_BASE_SIZE, PLAYER_SIZE_GROWTH, SMOOTHING_FACTOR, EVOLUTION_SCORES, SPRITE_SCALE } from './constants.js';
import { drawSprite, STARTER_SPRITES } from './sprites.js';
import { tracking } from './tracking.js';
```

to:

```js
import { W, H, BASE_LIVES, PLAYER_BASE_SIZE, PLAYER_SIZE_GROWTH, SMOOTHING_FACTOR, EVOLUTION_SCORES } from './constants.js';
import { tracking } from './tracking.js';
```

`SPRITE_SCALE` and the sprites import are no longer needed since we don't draw a sprite.

- [ ] **Step 3: Verify and commit**

Run the dev server and confirm the player sprite is gone, replaced by a subtle white circle indicator. The game should still be playable -- dodging, taking damage, and losing lives all work.

```bash
git add src/player.js
git commit -m "feat: replace player sprite with subtle hitbox indicator"
```

---

### Task 4: Add mouth detection to tracking

Extend FaceMesh processing to detect mouth open/close state.

**Files:**
- Modify: `src/tracking.js`
- Modify: `src/constants.js`

- [ ] **Step 1: Add mouth constants**

In `src/constants.js`, add these at the end of the file:

```js
// Mouth detection
export const MOUTH_OPEN_THRESHOLD = 0.035; // normalized distance between upper/lower lip
```

- [ ] **Step 2: Add mouth state to tracking object**

In `src/tracking.js`, add `mouthOpen` to the tracking export. Change:

```js
export const tracking = {
  x: W / 2,
  y: H * 0.75,
  active: false,
  mode: 'none', // 'camera', 'mouse', 'none'
};
```

to:

```js
export const tracking = {
  x: W / 2,
  y: H * 0.75,
  active: false,
  mode: 'none', // 'camera', 'mouse', 'none'
  mouthOpen: false,
};
```

- [ ] **Step 3: Add mouth detection to FaceMesh onResults**

In `src/tracking.js`, add the import for the threshold at the top:

```js
import { W, H, MOUTH_OPEN_THRESHOLD } from './constants.js';
```

(Replace the existing `import { W, H } from './constants.js';`)

Then in the `faceMesh.onResults` callback, inside the `if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0)` block, after the existing y-tracking code (`tracking.y = Math.max(30, Math.min(H - 30, yAmplified * H));`), add:

```js
        // Mouth open detection: distance between upper inner lip (13) and lower inner lip (14)
        const upperLip = results.multiFaceLandmarks[0][13];
        const lowerLip = results.multiFaceLandmarks[0][14];
        const mouthDist = Math.abs(lowerLip.y - upperLip.y);
        tracking.mouthOpen = mouthDist > MOUTH_OPEN_THRESHOLD;
```

In the `else` branch (no face detected), add:

```js
        tracking.mouthOpen = false;
```

- [ ] **Step 4: Remove mouse fallback, show camera-required message**

In `src/tracking.js`, replace the `.catch` block in `initTracking` (the part that calls `enableMouseFallback`):

```js
      .catch(() => {
        enableMouseFallback(canvas);
        if (!resolved) {
          resolved = true;
          resolve('mouse');
        }
      });
```

with:

```js
      .catch(() => {
        updateStatus(false, 'camera required');
        // Don't resolve — game stays on waiting screen
      });
```

And remove the entire `enableMouseFallback` function at the bottom of the file.

- [ ] **Step 5: Commit**

```bash
git add src/tracking.js src/constants.js
git commit -m "feat: add mouth open/close detection via FaceMesh landmarks"
```

---

### Task 5: Create abilities module

New file for the three mouth abilities: shield (Bulbasaur), vacuum (Squirtle), scream blast (Charmander).

**Files:**
- Create: `src/abilities.js`
- Modify: `src/constants.js`

- [ ] **Step 1: Add ability constants**

In `src/constants.js`, add after the mouth detection constant:

```js
// Mouth abilities
export const ABILITY_CONFIG = {
  bulbasaur: {
    name: 'Shield',
    cooldown: 8000,
    duration: 3000,
    color: '#4CAF50',
  },
  squirtle: {
    name: 'Vacuum',
    cooldown: 6000,
    duration: 2000,
    color: '#42A5F5',
  },
  charmander: {
    name: 'Scream Blast',
    cooldown: 10000,
    duration: 0, // instant
    color: '#EF9F27',
  },
};

export const SCREAM_BLAST_RADIUS = 120;
export const VACUUM_PULL_STRENGTH = 0.08;
```

- [ ] **Step 2: Create abilities.js**

Create `src/abilities.js`:

```js
import { ABILITY_CONFIG, SCREAM_BLAST_RADIUS, VACUUM_PULL_STRENGTH } from './constants.js';
import { player, getHitboxRadius } from './player.js';
import { tracking } from './tracking.js';
import { getObstacles } from './obstacles.js';
import { spawnParticles, triggerShake } from './renderer.js';

// ============================================================
// State
// ============================================================

let cooldownRemaining = 0; // ms until ability can be used again
let activeAbility = null;  // { type, timer } or null
let shieldActive = false;
let vacuumActive = false;
let mouthWasOpen = false;  // edge detection: trigger on open, not hold

// Scream blast expanding ring for visual effect
let screamRing = null; // { x, y, radius, maxRadius, alpha }

// ============================================================
// Reset
// ============================================================

export function resetAbilities() {
  cooldownRemaining = 0;
  activeAbility = null;
  shieldActive = false;
  vacuumActive = false;
  mouthWasOpen = false;
  screamRing = null;
}

// ============================================================
// Getters
// ============================================================

export function isShieldActive() {
  return shieldActive;
}

export function isVacuumActive() {
  return vacuumActive;
}

export function getAbilityCooldownInfo() {
  if (!player.starter) return null;
  const config = ABILITY_CONFIG[player.starter];
  if (!config) return null;
  return {
    name: config.name,
    cooldownRemaining,
    cooldownMax: config.cooldown,
    isActive: activeAbility !== null,
    color: config.color,
  };
}

// ============================================================
// Shield: absorb one hit
// ============================================================

/** Called by game.js when player would take damage. Returns true if shield absorbed it. */
export function tryAbsorbHit() {
  if (shieldActive) {
    shieldActive = false;
    activeAbility = null;
    spawnParticles(player.x, player.y, '#4CAF50', 12);
    return true;
  }
  return false;
}

// ============================================================
// Update
// ============================================================

export function updateAbilities(dt) {
  if (!player.starter) return;

  // Tick cooldown
  if (cooldownRemaining > 0) {
    cooldownRemaining = Math.max(0, cooldownRemaining - dt);
  }

  // Tick active ability duration
  if (activeAbility) {
    activeAbility.timer -= dt;
    if (activeAbility.timer <= 0) {
      // Ability expired
      if (activeAbility.type === 'shield') shieldActive = false;
      if (activeAbility.type === 'vacuum') vacuumActive = false;
      activeAbility = null;
    }
  }

  // Vacuum effect: pull collectibles toward player
  if (vacuumActive) {
    applyVacuumPull();
  }

  // Scream ring animation
  if (screamRing) {
    const norm = dt * 0.06;
    screamRing.radius += 6 * norm;
    screamRing.alpha -= 0.03 * norm;
    if (screamRing.alpha <= 0 || screamRing.radius > screamRing.maxRadius) {
      screamRing = null;
    }
  }

  // Edge-detect mouth open → trigger ability
  const mouthOpen = tracking.mouthOpen;
  if (mouthOpen && !mouthWasOpen && cooldownRemaining <= 0 && !activeAbility) {
    activateAbility();
  }
  mouthWasOpen = mouthOpen;
}

// ============================================================
// Activation
// ============================================================

function activateAbility() {
  const config = ABILITY_CONFIG[player.starter];
  if (!config) return;

  cooldownRemaining = config.cooldown;

  switch (player.starter) {
    case 'bulbasaur':
      shieldActive = true;
      activeAbility = { type: 'shield', timer: config.duration };
      spawnParticles(player.x, player.y, config.color, 8);
      break;

    case 'squirtle':
      vacuumActive = true;
      activeAbility = { type: 'vacuum', timer: config.duration };
      spawnParticles(player.x, player.y, config.color, 8);
      break;

    case 'charmander':
      doScreamBlast();
      // No activeAbility — scream blast is instant
      break;
  }
}

// ============================================================
// Scream Blast: destroy/push nearby obstacles
// ============================================================

function doScreamBlast() {
  const obstacles = getObstacles();
  const config = ABILITY_CONFIG.charmander;
  let destroyed = 0;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    const dx = ob.x - player.x;
    const dy = ob.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < SCREAM_BLAST_RADIUS) {
      spawnParticles(ob.x, ob.y, config.color, 6);
      obstacles.splice(i, 1);
      destroyed++;
    }
  }

  // Visual: expanding ring
  screamRing = {
    x: player.x,
    y: player.y,
    radius: 20,
    maxRadius: SCREAM_BLAST_RADIUS + 20,
    alpha: 0.7,
  };

  triggerShake(4, 200);
  spawnParticles(player.x, player.y, config.color, 16);
}

// ============================================================
// Vacuum: pull berries and pokeballs toward player
// ============================================================

function applyVacuumPull() {
  // Import dynamically would create circular deps, so we use getObstacles
  // Berries are managed in powerups.js — we'll need to export them
  // For now, vacuum pulls obstacles that are collectible (pokeballs)
  const obstacles = getObstacles();

  for (const ob of obstacles) {
    const dx = player.x - ob.x;
    const dy = player.y - ob.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 200) {
      ob.x += dx * VACUUM_PULL_STRENGTH;
      ob.y += dy * VACUUM_PULL_STRENGTH;
    }
  }
}

// ============================================================
// Drawing
// ============================================================

export function drawAbilities(ctx, ts) {
  // Shield bubble
  if (shieldActive) {
    const radius = getHitboxRadius() + 12;
    const pulse = Math.sin(ts * 0.006) * 4;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Vacuum swirl
  if (vacuumActive) {
    ctx.save();
    const numDots = 8;
    const baseRadius = getHitboxRadius() + 20;
    const speed = ts * 0.005;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#42A5F5';
    for (let i = 0; i < numDots; i++) {
      const angle = speed + (Math.PI * 2 * i) / numDots;
      const r = baseRadius + Math.sin(ts * 0.008 + i) * 8;
      const dx = Math.cos(angle) * r;
      const dy = Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(player.x + dx, player.y + dy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Scream blast ring
  if (screamRing) {
    ctx.save();
    ctx.globalAlpha = screamRing.alpha;
    ctx.strokeStyle = '#EF9F27';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screamRing.x, screamRing.y, screamRing.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
```

- [ ] **Step 3: Export berries array from powerups.js for vacuum pull**

In `src/powerups.js`, add this export after the existing `clearBerries` function:

```js
/** Returns the berries array (for vacuum ability). */
export function getBerries() {
  return berries;
}
```

- [ ] **Step 4: Update vacuum to also pull berries**

In `src/abilities.js`, add import for berries at the top:

```js
import { getBerries } from './powerups.js';
```

Then update the `applyVacuumPull` function to also pull berries:

```js
function applyVacuumPull() {
  const obstacles = getObstacles();

  for (const ob of obstacles) {
    const dx = player.x - ob.x;
    const dy = player.y - ob.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 200) {
      ob.x += dx * VACUUM_PULL_STRENGTH;
      ob.y += dy * VACUUM_PULL_STRENGTH;
    }
  }

  // Also pull berries
  const berries = getBerries();
  for (const b of berries) {
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 250) {
      b.x += dx * VACUUM_PULL_STRENGTH * 1.5;
      b.y += dy * VACUUM_PULL_STRENGTH * 1.5;
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/abilities.js src/constants.js src/powerups.js
git commit -m "feat: add mouth abilities — shield, vacuum, scream blast"
```

---

### Task 6: Wire abilities into game loop

Connect the abilities module to the game update/draw cycle, including shield hit absorption.

**Files:**
- Modify: `src/game.js`

- [ ] **Step 1: Import abilities in game.js**

Add to the imports at the top of `src/game.js`:

```js
import { resetAbilities, updateAbilities, drawAbilities, tryAbsorbHit, getAbilityCooldownInfo } from './abilities.js';
```

- [ ] **Step 2: Wire resetAbilities into resetGame**

In the `resetGame` function, add `resetAbilities();` after `resetProjectiles();`:

```js
export function resetGame() {
  score = 0;
  lastSpawnTime = 0;
  gameTime = 0;
  evolving = false;
  clearObstacles();
  clearBerries();
  resetEvents();
  resetProjectiles();
  resetAbilities();
  setOnDodgedCallback(onObstacleDodged);
}
```

- [ ] **Step 3: Call updateAbilities in updateGame**

In `updateGame`, add `updateAbilities(dt);` after the player update line (`updatePlayer(dt, reversed, getSnorlaxBlockRect());`):

```js
  updatePlayer(dt, reversed, getSnorlaxBlockRect());
  updateAbilities(dt);
```

- [ ] **Step 4: Use shield absorption in collision handling**

In `updateGame`, replace the collision handling block:

```js
  const hits = checkCollisions();
  for (const ob of hits) {
    if (!player.invincible) {
      player.lives--;
      triggerShake(6, 200);
      triggerFlash(COLORS.hitRed, 0.5);
      spawnParticles(player.x, player.y, COLORS.hitRed, 10);

      if (player.lives <= 0) {
        return 'gameover';
      }
    }
  }
```

with:

```js
  const hits = checkCollisions();
  for (const ob of hits) {
    if (!player.invincible) {
      // Check if shield absorbs the hit
      if (tryAbsorbHit()) {
        triggerShake(3, 150);
        continue;
      }

      player.lives--;
      triggerShake(6, 200);
      triggerFlash(COLORS.hitRed, 0.5);
      spawnParticles(player.x, player.y, COLORS.hitRed, 10);

      if (player.lives <= 0) {
        return 'gameover';
      }
    }
  }
```

- [ ] **Step 5: Draw abilities and cooldown bar in drawGame**

In `drawGame`, add `drawAbilities(ctx, ts);` after `drawProjectiles(ctx, ts);` inside the ctx.save/restore block:

```js
  drawProjectiles(ctx, ts);
  drawAbilities(ctx, ts);
  drawEnergyBars(ctx);
```

Also update the HUD call to pass ability cooldown info. Replace:

```js
  drawHUD(ctx, score, player.lives, wave.name, effectTimer, effectMaxTime);
```

with:

```js
  const abilityCooldown = getAbilityCooldownInfo();
  drawHUD(ctx, score, player.lives, wave.name, effectTimer, effectMaxTime, abilityCooldown);
```

- [ ] **Step 6: Update drawHUD to show ability cooldown**

In `src/renderer.js`, update the `drawHUD` function signature and add ability cooldown rendering. Change the function signature from:

```js
export function drawHUD(ctx, score, lives, waveName, effectTimer, effectMaxTime) {
```

to:

```js
export function drawHUD(ctx, score, lives, waveName, effectTimer, effectMaxTime, abilityCooldown) {
```

Then add this block at the end of `drawHUD`, before `ctx.restore();`:

```js
  // ── Bottom-left: ability cooldown indicator ─────────────
  if (abilityCooldown) {
    const abX = 12;
    const abY = H - 40;

    if (abilityCooldown.isActive) {
      // Ability is active — show name with glow
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = abilityCooldown.color;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${abilityCooldown.name} ACTIVE`, abX, abY);
    } else if (abilityCooldown.cooldownRemaining > 0) {
      // On cooldown — show bar
      const barW = 100;
      const barH = 6;
      const fill = 1 - (abilityCooldown.cooldownRemaining / abilityCooldown.cooldownMax);

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#333';
      ctx.fillRect(abX, abY - barH, barW, barH);

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = abilityCooldown.color;
      ctx.fillRect(abX, abY - barH, Math.floor(barW * fill), barH);

      ctx.globalAlpha = 0.5;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(abilityCooldown.name, abX, abY - barH - 3);
    } else {
      // Ready — show "OPEN MOUTH" hint
      ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.004) * 0.15;
      ctx.fillStyle = abilityCooldown.color;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${abilityCooldown.name} READY`, abX, abY);
    }
  }
```

- [ ] **Step 7: Commit**

```bash
git add src/game.js src/renderer.js
git commit -m "feat: wire abilities into game loop with shield absorption and HUD"
```

---

### Task 7: Simplify state machine (remove leaderboard, cap waves)

Remove the leaderboard flow and cap the game at wave 3 for the streamlined v1.

**Files:**
- Modify: `src/main.js`
- Modify: `src/screens.js`
- Delete: `src/leaderboard.js`
- Delete: `api/` directory

- [ ] **Step 1: Simplify main.js imports and state machine**

Rewrite `src/main.js` to remove leaderboard, simplify game over flow:

```js
import { W, H, COLORS } from './constants.js';
import { initTracking, stopTracking } from './tracking.js';
import { initHands } from './hands.js';
import { selectStarter, resetPlayer, getStarterNames, player } from './player.js';
import { resetGame, updateGame, drawGame, getScore } from './game.js';
import {
  drawTitleScreen, drawSelectScreen, getSelectIndex, moveSelect,
  drawGameOverScreen, startGameOver,
  drawInstructionsScreen,
  drawEnterNameScreen, handleNameKeydown, getPlayerName, resetName,
} from './screens.js';
import { drawCameraFeed } from './renderer.js';
import { touchShoot } from './projectiles.js';

const canvas = document.getElementById('gameCanvas');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

// States: title → instructions → enterName → select → waitingForCamera → playing → gameover
let state = 'title';
let lastTs = 0;
let cameraStatusText = 'Loading camera...';

// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 'ontouchstart' in window;

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (W / rect.width),
    y: (clientY - rect.top) * (H / rect.height),
  };
}

// Start camera, wait for face detection, then begin playing
function startPlaying() {
  const chosen = getStarterNames()[getSelectIndex()];
  selectStarter(chosen);
  resetGame();

  state = 'waitingForCamera';
  cameraStatusText = 'Loading camera...';

  initHands();
  initTracking(canvas).then((mode) => {
    if (mode === 'mouse') {
      cameraStatusText = 'Mouse mode — starting...';
    }
    setTimeout(() => {
      if (state === 'waitingForCamera') {
        state = 'playing';
      }
    }, 500);
  });
}

// ── Keyboard input ──────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  switch (state) {
    case 'title':
      if (e.key === 'Enter' || e.key === ' ') state = 'instructions';
      break;
    case 'instructions':
      if (e.key === 'Enter' || e.key === ' ') state = 'enterName';
      break;
    case 'enterName': {
      const result = handleNameKeydown(e);
      if (result === 'done') state = 'select';
      break;
    }
    case 'select':
      if (e.key === 'ArrowLeft') moveSelect(-1);
      else if (e.key === 'ArrowRight') moveSelect(1);
      else if (e.key === 'Enter' || e.key === ' ') startPlaying();
      break;
    case 'waitingForCamera':
      break;
    case 'playing':
      break;
    case 'gameover':
      if (e.key === 'Enter' || e.key === ' ') {
        stopTracking();
        resetPlayer();
        resetGame();
        state = 'select';
      }
      break;
  }
});

// ── Touch/click input ────────────────────────────────────────
canvas.addEventListener('click', (e) => {
  const pos = canvasCoords(e);
  switch (state) {
    case 'title':
      state = 'instructions';
      break;
    case 'instructions':
      state = 'enterName';
      break;
    case 'select': {
      const third = W / 3;
      if (pos.y > H * 0.7) startPlaying();
      else if (pos.x < third) moveSelect(-1);
      else if (pos.x > third * 2) moveSelect(1);
      else startPlaying();
      break;
    }
    case 'gameover':
      stopTracking();
      resetPlayer();
      resetGame();
      state = 'select';
      break;
  }
});

// ── Touch shooting ──────────────────────────────────────────
let activeTouches = {};

canvas.addEventListener('touchstart', (e) => {
  if (state !== 'playing') return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const pos = canvasCoords({ touches: [touch] });
    activeTouches[touch.identifier] = pos;
    touchShoot(pos.x, pos.y);
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (state !== 'playing') return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const pos = canvasCoords({ touches: [touch] });
    activeTouches[touch.identifier] = pos;
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  for (const touch of e.changedTouches) {
    delete activeTouches[touch.identifier];
  }
});

// ── Mobile name entry ───────────────────────────────────────
function mobileNameEntry() {
  const name = prompt('Enter your name (max 12 characters):');
  if (name && name.trim()) {
    const clean = name.trim().replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 12);
    for (const ch of clean) {
      handleNameKeydown({ key: ch });
    }
    if (clean.length > 0) {
      handleNameKeydown({ key: 'Enter' });
      state = 'select';
    }
  }
}

// ── "Waiting for camera" screen ─────────────────────────────
function drawWaitingScreen(ctx, ts, dt) {
  drawCameraFeed(ctx);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Animated dots
  const dots = '.'.repeat(Math.floor(ts / 400) % 4);

  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${cameraStatusText}${dots}`, W / 2, H * 0.4);

  // Pulsing circle animation
  ctx.globalAlpha = 0.3 + Math.sin(ts * 0.004) * 0.2;
  ctx.strokeStyle = COLORS.scoreYellow;
  ctx.lineWidth = 3;
  const radius = 30 + Math.sin(ts * 0.003) * 8;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.55, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Position your face in front of the camera', W / 2, H * 0.7);

  ctx.restore();
}

// ── Game loop ───────────────────────────────────────────────
function loop(ts) {
  const dt = lastTs ? Math.min(ts - lastTs, 50) : 16;
  lastTs = ts;

  switch (state) {
    case 'title':
      drawTitleScreen(ctx, ts, dt);
      break;
    case 'instructions':
      drawInstructionsScreen(ctx, ts, dt);
      break;
    case 'enterName':
      if (isMobile && getPlayerName().length === 0) {
        mobileNameEntry();
      }
      drawEnterNameScreen(ctx, ts, dt);
      break;
    case 'select':
      drawSelectScreen(ctx, ts, dt);
      break;
    case 'waitingForCamera':
      drawWaitingScreen(ctx, ts, dt);
      break;
    case 'playing': {
      for (const id in activeTouches) {
        touchShoot(activeTouches[id].x, activeTouches[id].y);
      }
      const result = updateGame(ts, dt);
      drawGame(ctx, ts, dt);
      if (result === 'gameover') {
        startGameOver(getScore());
        state = 'gameover';
      }
      break;
    }
    case 'gameover':
      drawGame(ctx, ts, 0);
      drawGameOverScreen(ctx, ts, dt, getScore());
      break;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

- [ ] **Step 2: Remove leaderboard from screens.js**

In `src/screens.js`, remove the leaderboard import on line 5:

```js
import { getCachedScores } from './leaderboard.js';
```

Remove the entire leaderboard screen section (section 7: `resetLeaderboardScroll` and `drawLeaderboardScreen` functions, plus the `leaderboardScrollY` variable).

Remove `drawLeaderboardScreen` and `resetLeaderboardScroll` from the exports used in the original main.js (they're already removed from the new main.js imports).

- [ ] **Step 3: Update game over screen text**

In `src/screens.js`, in the `drawGameOverScreen` function, change the prompt text from:

```js
    drawTextWithOutline(ctx, 'PRESS ENTER FOR LEADERBOARD', W / 2, H / 2 + 65, '#ffffff', 2);
```

to:

```js
    drawTextWithOutline(ctx, 'PRESS ENTER TO PLAY AGAIN', W / 2, H / 2 + 65, '#ffffff', 2);
```

- [ ] **Step 4: Delete leaderboard.js and api directory**

```bash
cd "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
rm src/leaderboard.js
rm -rf api
```

- [ ] **Step 5: Cap waves at 3 in constants.js**

In `src/constants.js`, remove waves 4 and 5 from the `WAVES` array. Change `maxScore` of wave 3 from `60` to `Infinity`:

Replace the WAVES array with:

```js
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
    maxScore: Infinity,
    spawnInterval: 850,
    obstacles: { pokeball: 2, greatball: 3, ultraball: 2, zubat: 2, geodude: 1 },
    berryChance: 0.125,
  },
];
```

- [ ] **Step 6: Remove evolution from game.js**

In `src/game.js`, remove the evolution-related code:

1. Remove this import line entirely:
```js
import { startEvolutionCutscene, updateEvolutionCutscene, drawEvolutionCutscene } from './screens.js';
```

2. From the player import, remove `shouldEvolve, evolve, finishEvolving` so it becomes:
```js
import { player, updatePlayer, drawPlayer, getHitboxRadius } from './player.js';
```

3. Remove the `let evolving = false;` variable declaration from module state.

4. In `resetGame`, remove the line `evolving = false;`.

5. In `updateGame`, remove the "Evolution cutscene" block (the `if (evolving)` check that calls `updateEvolutionCutscene`) and the "Trigger evolution" block (the `if (shouldEvolve(score))` check).

6. In `drawGame`, remove the evolution cutscene overlay block at the bottom:
```js
  // ── Evolution cutscene overlay ───────────────────────────
  if (evolving) {
    drawEvolutionCutscene(ctx, ts, dt);
  }
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: simplify state machine — remove leaderboard, cap at wave 3, remove evolution"
```

---

### Task 8: Update title and instructions screens

Update screen text and visuals to reflect the new AR game concept.

**Files:**
- Modify: `src/screens.js`

- [ ] **Step 1: Update title screen**

In `src/screens.js`, in `drawTitleScreen`, change the title text:

Replace:
```js
  drawTextWithOutline(ctx, 'POKEMON', W / 2, H / 2 - 90, COLORS.scoreYellow, 4);

  // "DODGE"
  ctx.font = 'bold 36px monospace';
  drawTextWithOutline(ctx, 'DODGE', W / 2, H / 2 - 38, '#ffffff', 3);
```

with:

```js
  drawTextWithOutline(ctx, 'POKEMON', W / 2, H / 2 - 90, COLORS.scoreYellow, 4);

  // "DODGE"
  ctx.font = 'bold 36px monospace';
  drawTextWithOutline(ctx, 'DODGE', W / 2, H / 2 - 38, '#ffffff', 3);

  // "AR"
  ctx.font = 'bold 20px monospace';
  drawTextWithOutline(ctx, 'AR MODE', W / 2, H / 2 - 6, COLORS.scoreYellow, 2);
```

Update the subtitle at the bottom:

Replace:
```js
  ctx.fillText('move your head to dodge  •  uses webcam', W / 2, H - 14);
```

with:
```js
  ctx.fillText('you are the player  •  dodge with your body', W / 2, H - 14);
```

- [ ] **Step 2: Update select screen perks**

In `src/screens.js`, update the `STARTER_PERKS` object to show mouth abilities:

Replace:
```js
const STARTER_PERKS = {
  charmander: '+5% speed',
  bulbasaur:  '+1 extra life',
  squirtle:   'berry magnet',
};
```

with:
```js
const STARTER_PERKS = {
  charmander: 'scream blast',
  bulbasaur:  'shield  •  +1 life',
  squirtle:   'vacuum  •  berry magnet',
};
```

- [ ] **Step 3: Update instructions screen**

In `src/screens.js`, in `drawInstructionsScreen`, add a mouth ability section. After the hand shooting text section and before the "Goal section", add:

```js
  // --- Mouth ability illustration (center below) ---
  const mouthX = W / 2;
  const mouthY = 300;

  // Simple mouth icon
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = COLORS.scoreYellow;
  ctx.lineWidth = 2.5;

  // Closed mouth (left)
  ctx.beginPath();
  ctx.moveTo(mouthX - 80, mouthY);
  ctx.quadraticCurveTo(mouthX - 65, mouthY + 5, mouthX - 50, mouthY);
  ctx.stroke();

  // Arrow
  ctx.globalAlpha = 0.8;
  drawArrow(ctx, mouthX - 35, mouthY, mouthX + 35, mouthY);

  // Open mouth (right)
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(mouthX + 65, mouthY, 15, 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.font = '14px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('Open your mouth for special ability!', mouthX, mouthY + 35);
```

Also update the goal section text. Replace:

```js
  ctx.fillText('Dodge obstacles  •  Collect berries  •  Shoot enemies', W / 2, 370);
  ctx.fillText('Your Pokemon evolves as you score higher!', W / 2, 390);
```

with:

```js
  ctx.fillText('Dodge obstacles  •  Collect berries  •  Shoot enemies', W / 2, 400);
  ctx.fillText('Open mouth for special power!', W / 2, 420);
```

And move the goal heading down to match:

Replace:
```js
  drawTextWithOutline(ctx, 'GOAL: Score the highest points!', W / 2, 340, '#fff', 2);
```

with:
```js
  drawTextWithOutline(ctx, 'GOAL: Score the highest points!', W / 2, 370, '#fff', 2);
```

- [ ] **Step 4: Commit**

```bash
git add src/screens.js
git commit -m "feat: update title, select, and instructions screens for AR mode"
```

---

### Task 9: Update index.html and final cleanup

Update the page title and make the video element visible enough for canvas drawing without showing it directly.

**Files:**
- Modify: `index.html`
- Delete: `docs/` directory (original game's specs/plans)

- [ ] **Step 1: Update index.html title**

In `index.html`, change:

```html
  <title>Pokémon Dodge</title>
```

to:

```html
  <title>Pokémon Dodge AR</title>
```

- [ ] **Step 2: Delete docs directory from the fork**

These are the original game's design specs and plans, not relevant to the new project:

```bash
cd "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
rm -rf docs
```

- [ ] **Step 3: Delete unused files**

Remove files that are no longer needed:

```bash
cd "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
rm -f head_dodge_game_1.html
```

- [ ] **Step 4: Final test**

```bash
cd "/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent"
npm run dev
```

Verify:
- Title screen shows "POKEMON DODGE AR MODE"
- Camera feed appears as background on all screens
- Character select shows ability names as perks
- Playing the game: camera background, no player sprite, hitbox indicator visible
- Opening mouth triggers the selected starter's ability
- Hand shooting still works
- Game over goes back to select (no leaderboard)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: update page title and clean up unused files"
```
