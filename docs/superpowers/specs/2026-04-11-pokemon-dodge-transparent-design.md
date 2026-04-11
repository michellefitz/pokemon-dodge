# Pokemon Dodge Transparent -- Design Spec

## Overview

A fork of Pokemon Dodge where the live camera feed replaces the game background. The player sees themselves on screen, dodging pixel-art Pokemon items with their actual head. Hands shoot projectiles from their real hand positions. Opening their mouth triggers a starter-specific special ability.

## Core Concept

- Camera feed (mirrored) is the background -- no starfield, no player sprite
- The player IS the character -- their head on camera is what dodges
- Pixel-art items (pokeballs, zubats, berries) fall over the live video, creating an AR-style contrast
- Hands and mouth are active input channels alongside head tracking

## Rendering Pipeline

Each frame draws in this order:

1. **Mirrored camera feed** -- `ctx.drawImage(video)` with `ctx.scale(-1, 1)` horizontal flip
2. **Semi-transparent dark overlay** -- 20-30% opacity black so pixel art pops against busy backgrounds (tunable)
3. **Game elements** -- obstacles, berries, projectiles, particles (existing rendering, unchanged)
4. **Hitbox indicator** -- subtle low-opacity circle around the player's collision zone so they know where their hitbox is
5. **HUD** -- score, lives, wave name, ability cooldown bar

No player sprite is drawn. The collision hitbox is invisible except for the subtle indicator.

## Input System

### Head Tracking (existing, modified)
- MediaPipe FaceMesh nose landmark (index 1) drives player position
- All coordinates mirror-flipped for natural movement
- Smoothing filter preserved (0.35 exponential moving average)
- No mouse fallback -- camera is required. If denied, show "Camera required" message.

### Hand Shooting (existing, modified)
- MediaPipe Hands detects hand positions and "raised" state
- Projectiles fire from detected hand position on screen
- Mirror flip applied to hand coordinates
- Existing energy system: 0-100 per hand, recharges 12/sec, costs 5/shot, 250ms fire interval

### Mouth Abilities (new)
- FaceMesh landmarks 13 (upper lip inner) and 14 (lower lip inner) measure mouth openness
- Mouth open threshold: ~0.03 normalized distance (tunable)
- Each starter gets a unique ability:

| Starter | Ability | Behavior | Cooldown | Duration |
|---|---|---|---|---|
| Bulbasaur | Shield | Green bubble around hitbox, absorbs next hit | 8s | 3s or until hit |
| Squirtle | Vacuum | Blue swirl pulls all collectibles toward player | 6s | 2s |
| Charmander | Scream Blast | Red/orange radial shockwave, destroys/pushes nearby obstacles | 10s | Instant |

- Separate cooldown system from hand energy (independent timers)
- Visual feedback: cooldown bar near bottom of screen, activation particle effects in pixel-art style

## Game Scope

### Ships in v1 (streamlined)
- Waves 1-3: pokeballs, greatballs, ultraballs, zubat, geodude, berries
- All three starters with mouth abilities
- Hand shooting with energy system
- Collision detection, lives, scoring (dodge = +1)
- Screen effects (shake, flash, particles)
- HUD (score, lives, wave name, cooldown bars)
- Name entry, character select, game over screens

### Deferred (architecture supports, not implemented)
- Waves 4-5 (pidgey, ember, watergun, vinewhip, masterball)
- Random events (Snorlax, Team Rocket, Legendary, Fog)
- Evolution stages
- Leaderboard (Upstash Redis / Vercel deployment)
- Mobile touch controls

### Removed
- Player sprite rendering (replaced by camera feed)
- Starfield background (replaced by camera feed)
- Mouse fallback (camera is required)

## Project Structure

**Location:** `/Users/michellefitzpatrick/Claude projects/Pokemon Dodge Transparent/`

Fork of the original project. File changes:

| File | Change |
|---|---|
| `src/renderer.js` | Replace `drawStarfield()` with `drawCameraFeed()` -- mirrored video + dark overlay. Keep particles, HUD, screen effects. |
| `src/tracking.js` | Add mouth landmark tracking (13/14), export `tracking.mouthOpen`. Mirror flip all coordinates. Expose video element for canvas drawing. Remove mouse fallback. |
| `src/player.js` | Remove sprite rendering. Keep position smoothing, hitbox, collision state. Add subtle hitbox indicator circle. |
| `src/main.js` | Remove leaderboard imports/flow. Simplify state machine to: title → instructions → enterName → select → waitingForCamera → playing → gameover. Pass video element to renderer. |
| `src/game.js` | Wire up mouth ability triggers. Cap waves at 3. Pass video ref to draw pipeline. |
| `src/hands.js` | Mirror flip hand coordinates. |
| `src/screens.js` | Update title/instructions text. Remove leaderboard screen. |
| `src/constants.js` | Add mouth threshold, ability cooldowns/durations. |
| **New:** `src/abilities.js` | Mouth ability logic: shield, vacuum, scream blast. State, cooldowns, effects. |
| `src/obstacles.js` | No changes (waves 4-5 stay but won't trigger). |
| `src/powerups.js` | No changes. |
| `src/sprites.js` | No changes. |
| `src/projectiles.js` | No changes. |
| `src/events.js` | No changes (won't be called). |
| `package.json` | Update name. Remove upstash/redis and vercel analytics deps. |

## Tech Stack

Same as original: Vite, vanilla JS (ES modules), Canvas 2D API, MediaPipe FaceMesh + Hands. No new dependencies.
