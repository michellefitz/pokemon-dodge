# Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single "How to Play" screen with a two-screen interactive onboarding that teaches goal/scoring and lets players practice controls via live camera gestures; returning players skip straight to starter select.

**Architecture:** Two new states (`onboarding1`, `onboarding2`) replace the old `instructions` state. Camera init moves from `startPlaying()` into `onboarding2` entry so first-timers have a live camera during the controls tutorial. A `localStorage` helper module persists the completion flag and player name so returning players skip onboarding and name entry.

**Tech Stack:** Vanilla JS + Canvas API, MediaPipe FaceMesh + Hands, Vite, Vitest (added for unit tests)

---

## File Map

| File | Change | Responsibility |
|------|--------|----------------|
| `src/storage.js` | **Create** | localStorage helpers: onboarding flag + player name |
| `src/tracking.js` | **Modify** | Add `detectNod()` / `resetNodDetector()` |
| `src/hands.js` | **Modify** | Add `detectTwoHandWave()` / `resetWaveDetector()` |
| `src/projectiles.js` | **Modify** | Add `hasFiredSinceReset()` flag |
| `src/screens.js` | **Modify** | Add `drawOnboarding1`, `drawOnboarding2`, `initOnboarding2`, `SKIP_BUTTON`; remove `drawInstructionsScreen` |
| `src/main.js` | **Modify** | State machine, startup check, camera init timing |
| `vitest.config.js` | **Create** | Vitest config with jsdom |
| `src/storage.test.js` | **Create** | Tests for storage helpers |
| `src/tracking.nod.test.js` | **Create** | Tests for nod detection |
| `src/hands.wave.test.js` | **Create** | Tests for wave detection |

---

## Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.js`
- Modify: `package.json`
- Create: `src/smoke.test.js`

- [ ] **Step 1: Install vitest**

```bash
cd "Pokemon Dodge" && npm install -D vitest
```

- [ ] **Step 2: Create vitest.config.js**

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add `"test": "vitest run"` to the `scripts` object:

```json
{
  "name": "pokemon-dodge-transparent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "vite": "^8.0.3",
    "vitest": "latest"
  }
}
```

- [ ] **Step 4: Write a smoke test**

```js
// src/smoke.test.js
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('true is true', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
npm test
```

Expected output: `1 passed`

- [ ] **Step 6: Delete smoke test**

Delete `src/smoke.test.js` — it was only needed to verify setup.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.js package.json package-lock.json
git commit -m "chore: add vitest with jsdom environment"
```

---

## Task 2: src/storage.js — localStorage persistence helpers

**Files:**
- Create: `src/storage.js`
- Create: `src/storage.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/storage.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { hasCompletedOnboarding, markOnboardingDone, getSavedPlayerName, savePlayerName } from './storage.js';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hasCompletedOnboarding returns false by default', () => {
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it('markOnboardingDone makes hasCompletedOnboarding return true', () => {
    markOnboardingDone();
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it('getSavedPlayerName returns empty string by default', () => {
    expect(getSavedPlayerName()).toBe('');
  });

  it('savePlayerName persists the name across reads', () => {
    savePlayerName('Ash');
    expect(getSavedPlayerName()).toBe('Ash');
  });

  it('savePlayerName overwrites previous name', () => {
    savePlayerName('Ash');
    savePlayerName('Misty');
    expect(getSavedPlayerName()).toBe('Misty');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: `Cannot find module './storage.js'`

- [ ] **Step 3: Implement storage.js**

```js
// src/storage.js
const KEY_DONE = 'pokemonDodge_onboardingDone';
const KEY_NAME = 'pokemonDodge_playerName';

export function hasCompletedOnboarding() {
  return localStorage.getItem(KEY_DONE) === 'true';
}

export function markOnboardingDone() {
  localStorage.setItem(KEY_DONE, 'true');
}

export function getSavedPlayerName() {
  return localStorage.getItem(KEY_NAME) || '';
}

export function savePlayerName(name) {
  localStorage.setItem(KEY_NAME, name);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add src/storage.js src/storage.test.js
git commit -m "feat: add localStorage persistence helpers for onboarding state"
```

---

## Task 3: Nod detection in tracking.js

**Files:**
- Modify: `src/tracking.js`
- Create: `src/tracking.nod.test.js`

A nod is detected by a two-phase state machine: the head Y (canvas coords) dips below a slowly-adapting baseline by `NOD_DIP_PX`, then returns. The baseline adapts slowly so detection works at any camera height.

- [ ] **Step 1: Write the failing tests**

```js
// src/tracking.nod.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { detectNod, resetNodDetector } from './tracking.js';

describe('detectNod', () => {
  beforeEach(() => resetNodDetector());

  it('returns false on first call (no baseline yet)', () => {
    expect(detectNod(250)).toBe(false);
  });

  it('returns false when head dips but not far enough', () => {
    // Stabilise baseline at y=250
    for (let i = 0; i < 40; i++) detectNod(250);
    // Only 8px dip — below the 20px threshold
    expect(detectNod(258)).toBe(false);
  });

  it('returns true after a complete dip-and-return (nod)', () => {
    // Stabilise baseline at y=250
    for (let i = 0; i < 40; i++) detectNod(250);
    // Dip 25px below baseline (triggers 'dipped' phase)
    for (let i = 0; i < 5; i++) detectNod(275);
    // Return — should fire
    expect(detectNod(250)).toBe(true);
  });

  it('returns false immediately after a nod (no double-count)', () => {
    for (let i = 0; i < 40; i++) detectNod(250);
    for (let i = 0; i < 5; i++) detectNod(275);
    detectNod(250); // first nod fires
    // Still at baseline — not dipping — should not fire again
    expect(detectNod(250)).toBe(false);
  });

  it('returns false if head never returns after dipping', () => {
    for (let i = 0; i < 40; i++) detectNod(250);
    for (let i = 0; i < 5; i++) detectNod(275);
    // Still dipped — not returned yet
    expect(detectNod(270)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: `detectNod is not a function` (not exported yet)

- [ ] **Step 3: Add nod detection to tracking.js**

Append the following block to the **end** of `src/tracking.js` (after the existing `stopTracking` / `addFrameHandler` exports):

```js
// ── Nod detection ────────────────────────────────────────────

const NOD_DIP_PX = 20;    // canvas-px head must dip below baseline
const NOD_RETURN_PX = 15; // canvas-px head must return after a dip

let _nodBaseline = null;   // slowly-adapting resting Y
let _nodPhase = 'watching'; // 'watching' | 'dipped'

/**
 * Call once per frame with the current tracked head Y (canvas coords).
 * Returns true the moment a complete nod (down + back up) is confirmed.
 */
export function detectNod(y) {
  if (_nodBaseline === null) {
    _nodBaseline = y;
    return false;
  }

  // Slowly adapt baseline so any camera height works
  _nodBaseline = _nodBaseline * 0.97 + y * 0.03;

  const delta = y - _nodBaseline; // positive = head tilted down

  if (_nodPhase === 'watching' && delta > NOD_DIP_PX) {
    _nodPhase = 'dipped';
    return false;
  }

  if (_nodPhase === 'dipped' && delta < NOD_DIP_PX - NOD_RETURN_PX) {
    _nodPhase = 'watching';
    return true; // ✓ completed one nod
  }

  return false;
}

export function resetNodDetector() {
  _nodBaseline = null;
  _nodPhase = 'watching';
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: `5 passed` (storage) + `5 passed` (nod) = `10 passed`

- [ ] **Step 5: Commit**

```bash
git add src/tracking.js src/tracking.nod.test.js
git commit -m "feat: add nod detection to tracking.js"
```

---

## Task 4: Two-hand wave detection in hands.js

**Files:**
- Modify: `src/hands.js`
- Create: `src/hands.wave.test.js`

Wave detection tracks each hand's X position over a rolling window and returns true when both hands are active (3+ fingers extended) and have each traveled ≥ `WAVE_MIN_TRAVEL_PX` within the window.

- [ ] **Step 1: Write the failing tests**

```js
// src/hands.wave.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { detectTwoHandWave, resetWaveDetector, handState } from './hands.js';

describe('detectTwoHandWave', () => {
  beforeEach(() => {
    resetWaveDetector();
    handState.left.active = false;
    handState.right.active = false;
    handState.left.x = 0;
    handState.right.x = 0;
  });

  it('returns false when no hands are active', () => {
    expect(detectTwoHandWave(1000)).toBe(false);
  });

  it('returns false when only one hand is active with enough travel', () => {
    let t = 0;
    handState.left.active = true;
    handState.right.active = false;
    for (let i = 0; i < 10; i++) {
      handState.left.x = 100 + i * 10; // 90px travel
      detectTwoHandWave(t);
      t += 80;
    }
    expect(detectTwoHandWave(t)).toBe(false);
  });

  it('returns false when both hands active but travel is too small', () => {
    let t = 0;
    handState.left.active = true;
    handState.right.active = true;
    for (let i = 0; i < 5; i++) {
      handState.left.x = 200 + i * 2;  // only 8px travel
      handState.right.x = 600 - i * 2; // only 8px travel
      detectTwoHandWave(t);
      t += 80;
    }
    expect(detectTwoHandWave(t)).toBe(false);
  });

  it('returns true when both hands wave with sufficient travel', () => {
    let t = 0;
    handState.left.active = true;
    handState.right.active = true;
    for (let i = 0; i < 10; i++) {
      handState.left.x = 100 + i * 8;  // 72px travel — above threshold
      handState.right.x = 600 - i * 8; // 72px travel — above threshold
      detectTwoHandWave(t);
      t += 80;
    }
    expect(detectTwoHandWave(t)).toBe(true);
  });

  it('ignores travel older than the window', () => {
    let t = 0;
    // Old wave that expires
    handState.left.active = true;
    handState.right.active = true;
    for (let i = 0; i < 10; i++) {
      handState.left.x = 100 + i * 8;
      handState.right.x = 600 - i * 8;
      detectTwoHandWave(t);
      t += 80;
    }
    // Jump time far forward so window expires
    t += 2000;
    handState.left.x = 200;
    handState.right.x = 500;
    expect(detectTwoHandWave(t)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: `detectTwoHandWave is not a function`

- [ ] **Step 3: Add wave detection to hands.js**

Append to the **end** of `src/hands.js` (after `onHandResults`):

```js
// ── Two-hand wave detection ───────────────────────────────────

const WAVE_WINDOW_MS = 1000;
const WAVE_MIN_TRAVEL_PX = 50;

const _waveHist = {
  left:  /** @type {{ x: number, t: number }[]} */ ([]),
  right: /** @type {{ x: number, t: number }[]} */ ([]),
};

/**
 * Call once per frame with the current timestamp (ms).
 * Returns true when both hands have each waved (≥50px travel) within 1 second.
 */
export function detectTwoHandWave(t) {
  const cutoff = t - WAVE_WINDOW_MS;

  for (const side of ['left', 'right']) {
    const hand = handState[side];
    const hist = _waveHist[side];

    if (hand.active) {
      hist.push({ x: hand.x, t });
    }

    // Trim entries outside the rolling window
    while (hist.length && hist[0].t < cutoff) hist.shift();

    if (hist.length < 3) return false;
    const xs = hist.map(e => e.x);
    const travel = Math.max(...xs) - Math.min(...xs);
    if (travel < WAVE_MIN_TRAVEL_PX) return false;
  }

  return true;
}

export function resetWaveDetector() {
  _waveHist.left = [];
  _waveHist.right = [];
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test
```

Expected: `20 passed` (10 existing + 5 wave tests + the new ones)

- [ ] **Step 5: Commit**

```bash
git add src/hands.js src/hands.wave.test.js
git commit -m "feat: add two-hand wave detection to hands.js"
```

---

## Task 5: Fire detection hook in projectiles.js

**Files:**
- Modify: `src/projectiles.js`

Adds a `_hasFired` flag that gets set whenever a projectile is pushed, so onboarding2 can detect the first successful shot.

- [ ] **Step 1: Add the flag variable**

In `src/projectiles.js`, after `let lastTouchFire = 0;` (line ~45), add:

```js
let _hasFired = false;
```

- [ ] **Step 2: Export the reader**

Add this export anywhere in the file (e.g. after `resetProjectiles`):

```js
export function hasFiredSinceReset() {
  return _hasFired;
}
```

- [ ] **Step 3: Set the flag when a projectile is pushed**

There are two `projectiles.push(` calls — at line 64 (in `touchShoot`) and line 95 (in `tryFire`). Add `_hasFired = true;` immediately after **each** push:

Line 64 area — `touchShoot`:
```js
  projectiles.push({
    x: player.smoothX,
    y: player.smoothY,
    vx: dx * PROJECTILE_SPEED,
    vy: dy * PROJECTILE_SPEED,
  });
  _hasFired = true;  // ← add this line
```

Line 95 area — `tryFire`:
```js
  projectiles.push({
    x: player.smoothX,
    y: player.smoothY,
    vx: dx * PROJECTILE_SPEED,
    vy: dy * PROJECTILE_SPEED,
  });
  _hasFired = true;  // ← add this line
```

- [ ] **Step 4: Reset the flag in resetProjectiles**

`resetProjectiles` is the existing function. Add `_hasFired = false;` at the end of it:

```js
export function resetProjectiles() {
  projectiles.length = 0;
  energy.left = ENERGY_MAX;
  energy.right = ENERGY_MAX;
  lastFireTime.left = 0;
  lastFireTime.right = 0;
  canFire.left = true;
  canFire.right = true;
  lastTouchFire = 0;
  _hasFired = false;  // ← add this line
}
```

- [ ] **Step 5: Verify the dev server still runs**

```bash
npm run dev
```

Open http://localhost:5173, click through to the game, confirm it still loads and plays.

- [ ] **Step 6: Commit**

```bash
git add src/projectiles.js
git commit -m "feat: add hasFiredSinceReset flag to projectiles"
```

---

## Task 6: Build drawOnboarding1 in screens.js

**Files:**
- Modify: `src/screens.js`

Adds the goal screen (three-column layout) and shared Skip button helper. Removes the old `drawInstructionsScreen`.

- [ ] **Step 1: Update imports at the top of screens.js**

Replace the existing sprites import line:
```js
import { drawSprite, STARTER_SPRITES } from './sprites.js';
```
with:
```js
import { drawSprite, STARTER_SPRITES, POKEBALL_SPRITES, WILD_SPRITES, BERRY_SPRITES } from './sprites.js';
```

- [ ] **Step 2: Add SKIP_BUTTON constant and _drawSkipButton helper**

Add this block immediately after the existing `drawTextWithOutline` helper function (around line 18 of screens.js):

```js
// ── Skip button (shared across onboarding screens) ──────────

export const SKIP_BUTTON = { x: W - 110, y: H - 36, w: 100, h: 28 };

function _drawSkipButton(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(SKIP_BUTTON.x, SKIP_BUTTON.y, SKIP_BUTTON.w, SKIP_BUTTON.h);
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Skip \u2192', SKIP_BUTTON.x + SKIP_BUTTON.w / 2, SKIP_BUTTON.y + SKIP_BUTTON.h / 2);
  ctx.restore();
}
```

- [ ] **Step 3: Add drawOnboarding1**

Add this function after `_drawSkipButton` (before the existing `// 1. TITLE SCREEN` section):

```js
// ============================================================
// ONBOARDING SCREEN 1 — THE GOAL
// ============================================================

export function drawOnboarding1(ctx, ts, dt) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 28px monospace';
  drawTextWithOutline(ctx, 'THE GOAL', W / 2, 45, COLORS.scoreYellow, 3);

  const colW = W / 3;

  // ── Column 1: Dodge ─────────────────────────────────────
  const col1X = colW * 0.5;

  ctx.font = 'bold 15px monospace';
  drawTextWithOutline(ctx, 'DODGE', col1X, 88, '#fff', 2);

  const dodgeTypes = ['pokeball', 'greatball', 'zubat', 'geodude', 'gastly', 'pidgey'];
  const gridCols = 3;
  const cellW = 46;
  const cellH = 46;
  const gridStartX = col1X - ((gridCols * cellW) / 2) + cellW / 2;
  const gridStartY = 125;

  for (let i = 0; i < dodgeTypes.length; i++) {
    const gx = gridStartX + (i % gridCols) * cellW;
    const gy = gridStartY + Math.floor(i / gridCols) * cellH;
    const type = dodgeTypes[i];
    const spr = POKEBALL_SPRITES[type] || WILD_SPRITES[type];
    if (spr) drawSprite(ctx, spr.data, spr.palette, gx, gy, 2);
  }

  ctx.font = '12px monospace';
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.8;
  ctx.fillText('Dodge obstacles', col1X, 238);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.scoreYellow;
  ctx.fillText('+1 point each', col1X, 256);

  // ── Column 2: Shoot ──────────────────────────────────────
  const col2X = colW * 1.5;

  ctx.font = 'bold 15px monospace';
  drawTextWithOutline(ctx, 'SHOOT', col2X, 88, '#fff', 2);

  // Starter on the left shooting at an enemy on the right
  const shooterName = getStarterNames()[0]; // charmander
  const shooterSprites = STARTER_SPRITES[shooterName]?.[0];
  if (shooterSprites) {
    drawSprite(ctx, shooterSprites.idle, shooterSprites.palette, col2X - 55, 175, SPRITE_SCALE);
  }

  // Projectile dots
  ctx.fillStyle = '#EF9F27';
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(col2X - 16 + i * 14, 175, 4 - i * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Target enemy (zubat)
  const enemySpr = WILD_SPRITES['zubat'];
  if (enemySpr) drawSprite(ctx, enemySpr.data, enemySpr.palette, col2X + 45, 175, SPRITE_SCALE);

  ctx.font = '12px monospace';
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.8;
  ctx.fillText('Shoot enemies', col2X, 238);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.scoreYellow;
  ctx.fillText('+2 points each', col2X, 256);

  // ── Column 3: Berries ────────────────────────────────────
  const col3X = colW * 2.5;

  ctx.font = 'bold 15px monospace';
  drawTextWithOutline(ctx, 'BERRIES', col3X, 88, '#fff', 2);

  const berryTypes  = ['oran', 'sitrus', 'rawst', 'lum'];
  const berryLabels = ['+10 pts', '+1 life', 'invincible', 'clear screen'];

  for (let i = 0; i < berryTypes.length; i++) {
    const by = 118 + i * 40;
    const spr = BERRY_SPRITES[berryTypes[i]];
    if (spr) drawSprite(ctx, spr.data, spr.palette, col3X - 38, by, 2);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'left';
    ctx.fillText(berryLabels[i], col3X - 14, by);
    ctx.textAlign = 'center';
    ctx.globalAlpha = 1;
  }

  ctx.font = '12px monospace';
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.8;
  ctx.fillText('Collect berries', col3X, 290);
  ctx.globalAlpha = 1;

  // ── Disclaimer ───────────────────────────────────────────
  ctx.font = '11px monospace';
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#fff';
  ctx.fillText('* scoring subject to change', W / 2, H - 65);
  ctx.globalAlpha = 1;

  // ── Continue prompt ──────────────────────────────────────
  if (Math.floor(ts / 500) % 2 === 0) {
    ctx.font = 'bold 15px monospace';
    drawTextWithOutline(ctx, 'PRESS ENTER TO CONTINUE', W / 2, H - 42, '#fff', 2);
  }

  _drawSkipButton(ctx);

  ctx.restore();
}
```

- [ ] **Step 4: Delete drawInstructionsScreen**

Remove the entire `// 5. INSTRUCTIONS SCREEN` section (the `drawInstructionsScreen` function and the `drawArrow`, `drawFist`, `drawOpenHand` helpers below it).

**Keep** `drawArrow`, `drawFist`, `drawOpenHand` — they are reused by `drawOnboarding2` in the next task. Only delete `drawInstructionsScreen`.

- [ ] **Step 5: Verify dev server still starts**

```bash
npm run dev
```

The game should load without console errors. The old instructions screen is now unreachable (state machine not wired yet).

- [ ] **Step 6: Commit**

```bash
git add src/screens.js
git commit -m "feat: add drawOnboarding1 goal screen, remove old instructions screen"
```

---

## Task 7: Build drawOnboarding2 in screens.js

**Files:**
- Modify: `src/screens.js`

Adds the controls-practice screen. Part 1 shows a Pokemon following the player's head; part 2 shows the hand gesture and detects firing + waving. Drawing is purely based on parameters passed from main.js.

- [ ] **Step 1: Add tracking import to screens.js**

Add to the top of `src/screens.js`:

```js
import { tracking } from './tracking.js';
```

- [ ] **Step 2: Add module state and initOnboarding2**

Add this block immediately after the `SKIP_BUTTON` constant you added in Task 6:

```js
// ── Onboarding 2 module state ────────────────────────────────

let _ob2StarterName = 'charmander';

/** Call before entering onboarding2 state to set which starter follows the head. */
export function initOnboarding2(starterName) {
  _ob2StarterName = starterName;
}
```

- [ ] **Step 3: Add drawOnboarding2 and its part helpers**

Add the following block immediately after `drawOnboarding1` (before the `// 1. TITLE SCREEN` section):

```js
// ============================================================
// ONBOARDING SCREEN 2 — CONTROLS PRACTICE
// ============================================================

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ts
 * @param {number} dt
 * @param {1|2} part           — which sub-screen to show
 * @param {boolean} cameraReady — whether tracking is active
 * @param {boolean} hasFired   — whether player has fired a shot (part 2 only)
 */
export function drawOnboarding2(ctx, ts, dt, part, cameraReady, hasFired) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 28px monospace';
  drawTextWithOutline(ctx, 'CONTROLS', W / 2, 45, COLORS.scoreYellow, 3);

  if (part === 1) {
    _drawOb2Part1(ctx, ts, cameraReady);
  } else {
    _drawOb2Part2(ctx, ts, hasFired);
  }

  _drawSkipButton(ctx);
  ctx.restore();
}

function _drawOb2Part1(ctx, ts, cameraReady) {
  if (!cameraReady) {
    // Camera still initialising
    const dots = '.'.repeat(Math.floor(ts / 400) % 4);
    ctx.font = '18px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`Starting camera${dots}`, W / 2, H / 2);
    return;
  }

  // Pokemon follows the head
  const stageSprites = STARTER_SPRITES[_ob2StarterName]?.[0];
  if (stageSprites) {
    drawSprite(ctx, stageSprites.idle, stageSprites.palette, tracking.x, tracking.y, SPRITE_SCALE);
  }

  ctx.font = '16px monospace';
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.9;
  ctx.textBaseline = 'bottom';
  ctx.fillText('Move your head to control your Pok\u00e9mon', W / 2, H - 68);

  ctx.font = 'bold 14px monospace';
  ctx.globalAlpha = 1;
  drawTextWithOutline(ctx, 'When you\'re ready, nod to continue', W / 2, H - 48, COLORS.scoreYellow, 2);
}

function _drawOb2Part2(ctx, ts, hasFired) {
  const leftHandX  = W / 2 - 80;
  const rightHandX = W / 2 + 80;
  const handY = H / 2 - 30;

  ctx.globalAlpha = 0.9;
  drawOpenHand(ctx, leftHandX, handY);
  drawOpenHand(ctx, rightHandX, handY);
  ctx.globalAlpha = 1;

  ctx.textBaseline = 'bottom';

  if (!hasFired) {
    ctx.font = '16px monospace';
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.9;
    ctx.fillText('Lift and open your hands to fire', W / 2, H - 48);
    ctx.globalAlpha = 1;
  } else {
    ctx.font = 'bold 18px monospace';
    drawTextWithOutline(ctx, 'Now wave both hands to start!', W / 2, H - 48, COLORS.scoreYellow, 2);
  }
}
```

- [ ] **Step 4: Verify dev server still starts cleanly**

```bash
npm run dev
```

No console errors expected.

- [ ] **Step 5: Commit**

```bash
git add src/screens.js
git commit -m "feat: add drawOnboarding2 controls-practice screen"
```

---

## Task 8: Wire up the state machine in main.js

**Files:**
- Modify: `src/main.js`

This is the largest task. It updates imports, adds new state variables, refactors `startPlaying`/`goToLeaderboard`, adds `enterOnboarding2`/`advanceFromOnboarding2` helpers, updates both input handlers, and updates the game loop.

- [ ] **Step 1: Update imports at the top of main.js**

Replace the existing import block with the expanded version below. Changes: add `drawOnboarding1`, `drawOnboarding2`, `initOnboarding2`, `SKIP_BUTTON`, `HOW_TO_PLAY_BOUNDS` from screens; add `detectNod`, `resetNodDetector` from tracking; add `detectTwoHandWave`, `resetWaveDetector` from hands; add `hasFiredSinceReset` from projectiles; add `hasCompletedOnboarding`, `markOnboardingDone`, `getSavedPlayerName`, `savePlayerName` from storage; add `setPlayerName` from screens.

```js
import { inject } from '@vercel/analytics';
import { W, H, COLORS } from './constants.js';
import { initTracking, stopTracking, tracking } from './tracking.js';
import { initHands } from './hands.js';
import { selectStarter, resetPlayer, getStarterNames, player } from './player.js';
import { resetGame, updateGame, drawGame, getScore } from './game.js';
import {
  drawTitleScreen, drawSelectScreen, getSelectIndex, moveSelect,
  drawGameOverScreen, startGameOver,
  drawOnboarding1, drawOnboarding2, initOnboarding2, SKIP_BUTTON,
  drawEnterNameScreen, handleNameKeydown, getPlayerName, resetName, setPlayerName,
  drawLeaderboardScreen, resetLeaderboardScroll,
} from './screens.js';
import { submitScore, fetchLeaderboard } from './leaderboard.js';
import { touchShoot, updateProjectiles, drawProjectiles, resetProjectiles, hasFiredSinceReset } from './projectiles.js';
import { drawStarfield } from './renderer.js';
import { detectNod, resetNodDetector } from './tracking.js';
import { detectTwoHandWave, resetWaveDetector } from './hands.js';
import { hasCompletedOnboarding, markOnboardingDone, getSavedPlayerName, savePlayerName } from './storage.js';
```

> **Note:** `tracking` is now imported for direct use in the onboarding2 loop. `detectNod` and `resetNodDetector` are re-imports from the same module — JavaScript modules are singletons so this is safe.

- [ ] **Step 2: Add a setPlayerName export to screens.js**

Before wiring main.js, add this small export to `src/screens.js` (near the existing `resetName` function):

```js
export function setPlayerName(name) {
  playerName = name;
}
```

- [ ] **Step 3: Add new state variables to main.js**

Replace the existing state variable declarations (currently `let state = 'title'; let lastTs = 0; ...`) with:

```js
let state = 'title';
let lastTs = 0;
let lastScore = 0;
let cameraStatusText = 'Loading camera...';
let cameraInitialized = false;

// Onboarding 2 sub-state (managed here, passed into draw functions)
let ob2Part = 1;
let ob2NodCount = 0;
let ob2HasFired = false;
```

- [ ] **Step 4: Add localStorage startup check**

Add this block immediately after the `const isMobile = ...` line:

```js
// Pre-fill saved name for returning players
if (hasCompletedOnboarding()) {
  const saved = getSavedPlayerName();
  if (saved) setPlayerName(saved);
}
```

- [ ] **Step 5: Add HOW_TO_PLAY_BOUNDS constant and a bounds-check helper**

Add immediately after the startup check:

```js
// Bounds for "How to Play" link on the title screen
const HOW_TO_PLAY_BOUNDS = { x: W - 130, y: H - 28, w: 120, h: 20 };

function isInsideBounds(pos, bounds) {
  return pos.x >= bounds.x && pos.x <= bounds.x + bounds.w &&
         pos.y >= bounds.y && pos.y <= bounds.y + bounds.h;
}
```

- [ ] **Step 6: Add the "How to Play" link to drawTitleScreen**

In `src/screens.js`, at the very end of `drawTitleScreen` (just before `ctx.restore()`), add:

```js
  // "How to Play" link — bottom right
  ctx.globalAlpha = 0.38;
  ctx.font = '12px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('How to Play', W - 16, H - 14);
```

- [ ] **Step 7: Refactor enterOnboarding2 helper in main.js**

Add this helper function (before `startPlaying`):

```js
function enterOnboarding2() {
  const starterNames = getStarterNames();
  const randomStarter = starterNames[Math.floor(Math.random() * starterNames.length)];
  selectStarter(randomStarter);    // needed so projectiles fire correctly in tutorial
  resetProjectiles();
  initOnboarding2(randomStarter);
  ob2Part = 1;
  ob2NodCount = 0;
  ob2HasFired = false;
  resetNodDetector();
  resetWaveDetector();
  if (!cameraInitialized) {
    initHands();
    initTracking(canvas).then(() => { cameraInitialized = true; });
  }
  state = 'onboarding2';
}
```

- [ ] **Step 8: Add advanceFromOnboarding2 helper**

```js
function advanceFromOnboarding2() {
  markOnboardingDone();
  resetProjectiles();
  if (getSavedPlayerName()) {
    // Returning player replaying tutorial — skip name entry
    state = 'select';
  } else {
    state = 'enterName';
  }
}
```

- [ ] **Step 9: Refactor startPlaying to skip camera init when already running**

Replace the existing `startPlaying` function with:

```js
function startPlaying() {
  const chosen = getStarterNames()[getSelectIndex()];
  selectStarter(chosen);
  resetGame();

  if (cameraInitialized) {
    // Camera already running from onboarding — go straight to playing
    state = 'playing';
  } else {
    state = 'waitingForCamera';
    cameraStatusText = 'Loading camera...';
    initHands();
    initTracking(canvas).then((mode) => {
      cameraInitialized = true;
      if (mode === 'mouse') {
        cameraStatusText = 'Mouse mode — starting...';
      }
      setTimeout(() => {
        if (state === 'waitingForCamera') state = 'playing';
      }, 500);
    });
  }
}
```

- [ ] **Step 10: Reset cameraInitialized in goToLeaderboard**

Replace the existing `goToLeaderboard` function with:

```js
function goToLeaderboard() {
  lastScore = getScore();
  stopTracking();
  cameraInitialized = false; // camera stopped — must re-init on next play
  state = 'leaderboard';
  submitScore(getPlayerName(), lastScore).then(() => {
    return fetchLeaderboard();
  }).then(() => {
    resetLeaderboardScroll();
  });
}
```

- [ ] **Step 11: Update the keydown handler**

Replace the entire `document.addEventListener('keydown', ...)` block with:

```js
document.addEventListener('keydown', (e) => {
  switch (state) {
    case 'title':
      if (e.key === 'Enter' || e.key === ' ') {
        if (hasCompletedOnboarding()) {
          state = 'select';
        } else {
          state = 'onboarding1';
        }
      }
      break;
    case 'onboarding1':
      if (e.key === 'Enter' || e.key === ' ') enterOnboarding2();
      break;
    case 'onboarding2':
      // No keyboard shortcut — use gestures or the on-screen Skip button
      break;
    case 'enterName': {
      const result = handleNameKeydown(e);
      if (result === 'done') {
        savePlayerName(getPlayerName());
        state = 'select';
      }
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
      if (e.key === 'Enter' || e.key === ' ') goToLeaderboard();
      break;
    case 'leaderboard':
      if (e.key === 'Enter' || e.key === ' ') { resetPlayer(); resetGame(); state = 'select'; }
      else if (e.key === 'Escape') { state = 'title'; resetName(); }
      break;
  }
});
```

- [ ] **Step 12: Update the click handler**

Replace the entire `canvas.addEventListener('click', ...)` block with:

```js
canvas.addEventListener('click', (e) => {
  const pos = canvasCoords(e);
  switch (state) {
    case 'title':
      if (isInsideBounds(pos, HOW_TO_PLAY_BOUNDS)) {
        state = 'onboarding1';
      } else if (hasCompletedOnboarding()) {
        state = 'select';
      } else {
        state = 'onboarding1';
      }
      break;
    case 'onboarding1':
      enterOnboarding2(); // click anywhere advances
      break;
    case 'onboarding2':
      if (isInsideBounds(pos, SKIP_BUTTON)) advanceFromOnboarding2();
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
      goToLeaderboard();
      break;
    case 'leaderboard':
      resetPlayer();
      resetGame();
      state = 'select';
      break;
  }
});
```

- [ ] **Step 13: Update the game loop**

Replace the entire `switch (state)` block inside `function loop(ts)` with:

```js
  switch (state) {
    case 'title':
      drawTitleScreen(ctx, ts, dt);
      break;

    case 'onboarding1':
      drawOnboarding1(ctx, ts, dt);
      break;

    case 'onboarding2': {
      // Part 1: count nods internally (3 required, not shown to player)
      if (ob2Part === 1 && cameraInitialized && tracking.active) {
        if (detectNod(tracking.y)) {
          ob2NodCount++;
          if (ob2NodCount >= 3) {
            ob2Part = 2;
            resetProjectiles();
            resetWaveDetector();
          }
        }
      }

      // Part 2: run projectile system so hand shooting works
      if (ob2Part === 2) {
        player.smoothX = tracking.x;
        player.smoothY = tracking.y;
        updateProjectiles(ts, dt);
        if (!ob2HasFired && hasFiredSinceReset()) ob2HasFired = true;
        if (ob2HasFired && detectTwoHandWave(ts)) advanceFromOnboarding2();
      }

      drawOnboarding2(ctx, ts, dt, ob2Part, cameraInitialized && tracking.active, ob2HasFired);

      if (ob2Part === 2) drawProjectiles(ctx, ts);
      break;
    }

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
        lastScore = getScore();
        state = 'gameover';
      }
      break;
    }

    case 'gameover':
      drawGame(ctx, ts, 0);
      drawGameOverScreen(ctx, ts, dt, getScore());
      break;

    case 'leaderboard':
      drawLeaderboardScreen(ctx, ts, dt, lastScore, getPlayerName());
      break;
  }
```

- [ ] **Step 14: Test the full first-time flow**

Open http://localhost:5173 in a fresh browser tab (no localStorage):
1. Title screen shows — pressing Enter goes to onboarding1 ✓
2. Onboarding1 shows three columns (dodge/shoot/berries) with sprites ✓
3. Press Enter → onboarding2 part 1 — camera starts, Pokemon follows head ✓
4. Nod three times → part 2 — open hands illustration appears ✓
5. Open hand → projectile fires ✓
6. Wave both hands → advances to Enter Name ✓
7. Type name + Enter → starter select ✓
8. Choose starter + Enter → game plays ✓

- [ ] **Step 15: Test the returning player flow**

After completing onboarding once, refresh the page:
1. Title screen → pressing Enter goes straight to starter select (skips onboarding and name entry) ✓
2. "How to Play" text is visible bottom-right of title screen ✓
3. Clicking "How to Play" → goes to onboarding1 ✓
4. Skip button on onboarding2 → advances to select (since name already saved) ✓

- [ ] **Step 16: Commit**

```bash
git add src/main.js src/screens.js
git commit -m "feat: wire up two-screen onboarding with persistence and gesture gates"
```

---

## Self-Review Checklist

| Spec requirement | Covered by |
|-----------------|-----------|
| Onboarding screen 1: goal + obstacle sprites + scoring | Task 6 (drawOnboarding1) |
| Onboarding screen 2 part 1: camera, Pokemon follows head, nod to advance | Task 7 + Task 8 game loop |
| Onboarding screen 2 part 2: open hands to fire, wave to start | Task 7 + Task 8 game loop |
| 3 nods required internally, no counter shown to player | Task 3 + Task 8 (`ob2NodCount`, no render) |
| Skip button always visible on screen 2 | Task 6 (`_drawSkipButton`) + Task 8 click handler |
| localStorage persists completion + name | Task 2 (storage.js) |
| Returning players skip onboarding + name entry | Task 8 startup check + keydown/click handlers |
| "How to Play" link on title for returning players | Task 8 step 6 + step 12 |
| Scoring disclaimer "(subject to change)" | Task 6 (drawOnboarding1) |
| Camera init moves to onboarding2 entry | Task 8 (enterOnboarding2) |
| waitingForCamera still works for returning players | Task 8 (startPlaying checks cameraInitialized) |
