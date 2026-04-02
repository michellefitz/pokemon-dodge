# Pokemon Dodge — Design Spec

A face-tracking dodge game with a Pokemon theme, retro pixel art style with modern effects. Players pick a starter Pokemon and dodge falling Pokeballs, wild Pokemon, and attacks using their webcam (or mouse fallback). As the score climbs, the starter evolves, power-ups appear, and random events add chaos.

## Game Flow

### States
1. **Title screen** — pixel art title, animated starfield background, "Press Start" prompt
2. **Starter selection** — pick Bulbasaur, Charmander, or Squirtle (each with a gameplay perk)
3. **Gameplay** — core dodge loop with escalating difficulty waves
4. **Evolution cutscene** — 2-second celebration when Pokemon evolves mid-game
5. **Game over** — final score, stats, play again option

### Difficulty Waves
- **Wave 1 (score 0-15):** Pokeballs only, slow speed, generous spacing
- **Wave 2 (score 16-35):** Great Balls + occasional Zubat, berries start appearing
- **Wave 3 (score 36-60):** Ultra Balls, more wild Pokemon (Geodude), first evolution at score 40
- **Wave 4 (score 61-99):** Attacks mixed in (ember, water gun, vine whip), random events begin, second evolution at score 80
- **Wave 5 (score 100+):** Master Balls, Legendaries, rapid spawning, full chaos

## Player Characters

### Charmander → Charmeleon → Charizard
- **Perk:** 5% faster movement speed (head-tracking responsiveness)
- Hitbox grows slightly with each evolution (trade-off for power fantasy)

### Bulbasaur → Ivysaur → Venusaur
- **Perk:** Starts with 4 lives instead of 3
- Bulkier sprite, forgiving — fits the "tank" fantasy

### Squirtle → Wartortle → Blastoise
- **Perk:** Berry magnet — power-ups drift slightly toward player
- Mid-size hitbox, reward-focused playstyle

### Evolution
- Stage 2 triggers at score 40
- Stage 3 triggers at score 80
- 2-second cutscene: screen flashes white, pixel art animation, "What? [Pokemon] is evolving!" text
- Stage 3 more dramatic (screen shake, sparkle particles)
- Player invincible and all obstacles freeze during evolution

### Sprites
- Pixel art, 32x32 base rendered at 2-3x on canvas
- Each Pokemon: 3 frames (idle, dodge-left, dodge-right)
- 27 sprite frames total (3 starters x 3 evolutions x 3 poses)
- Drawn programmatically using pixel data arrays (no external images)

## Obstacles

### Pokeballs
| Type | Speed | Behavior | Visual |
|------|-------|----------|--------|
| Pokeball | Slow | Straight drop | Red/white, 12x12px |
| Great Ball | Medium | Slight horizontal wobble | Blue/white |
| Ultra Ball | Fast | Straight drop | Black/yellow |
| Master Ball | Very fast | Tracks slightly toward player | Purple/white, rare |

### Wild Pokemon
| Pokemon | Behavior | Hitbox |
|---------|----------|--------|
| Zubat | Zigzags side to side | Small |
| Geodude | Accelerates (gravity feel), screen shakes on ground impact | Large |
| Gastly | Fades in/out of visibility | Medium |
| Pidgey | Swoops in horizontally from sides | Medium |

### Attacks (Wave 4+)
- **Ember** — 3 small fireballs in a fan spread pattern
- **Water Gun** — narrow vertical stream sweeping left to right
- **Vine Whip** — horizontal vine crossing screen at fixed height (Y position matters)

### Spawn Rules
- Weighted pool per wave
- Top-down primary, sides for Pidgey
- Minimum horizontal distance from player position
- Max 8 obstacles on screen

## Power-ups

Berries fall from top, slower than obstacles, with float/wobble and sparkle animation. Spawn chance starts wave 2, roughly 1 in 8 spawns.

| Berry | Visual | Effect |
|-------|--------|--------|
| Oran Berry | Blue, round | +10 points |
| Sitrus Berry | Yellow, large | Restore 1 life |
| Rawst Berry | Red, spiky | 5s invincibility (sprite flashes) |
| Lum Berry | Green, rare | Clear all obstacles (flash + pop) |

## Random Events

Triggered every 30-45 seconds starting wave 4. Announced with retro text banner. One active at a time, minimum cooldown between events.

| Event | Effect | Duration |
|-------|--------|----------|
| Snorlax blocks the path | Large sprite blocks ~40% of screen | 6 seconds |
| Team Rocket appeared | Controls reverse, "R" overlay flashes | 5 seconds |
| Wild Legendary approaches | Mewtwo flies across — touch for +50 pts (risk/reward) | Pass-through |
| Fog rolled in | Visibility reduced to spotlight around player | 6 seconds |

## Visual Style

**"Game Boy meets modern arcade"**

- Pixel art sprites at 2-3x scale, nearest-neighbor rendering (crisp, no blur)
- Dark blue/purple background with subtle parallax starfield (multi-depth layers)
- Modern touches: particle effects (sparkles, pop particles), screen shake on hits, smooth tweened transitions
- Pixel font for all UI text
- Color: rich but restrained. Dark background, vibrant sprites, white/yellow UI text

### HUD
- Top-left: score (pixel font)
- Top-right: lives (pixel heart sprites)
- Top-center: wave indicator (subtle)
- Bottom-left: tracking status dot
- Bottom-center: berry effect timer bar when active

### Screen Effects
- **Hit:** red flash + screen shake (2-3 frames)
- **Evolution:** white flash → sparkle particles → new sprite fades in
- **Game over:** sprites freeze, desaturate, score tallies arcade-style
- **Random event:** retro text banner slides in from right, thick black outline

### Canvas
- 800x500, responsive scaling
- Pixel art rendered at native resolution, scaled up for crispness

### Audio
Deferred — not in initial build. Easy to layer in later.

## Tech Architecture

### Project Structure
```
Face Tracking/
├── index.html              — shell: canvas, HUD, overlays
├── vite.config.js          — dev server config
├── package.json
├── src/
│   ├── main.js             — entry point, game state machine
│   ├── game.js             — core game loop, spawn logic, collision
│   ├── player.js           — player state, evolution, movement smoothing
│   ├── obstacles.js        — obstacle types, behaviors, pools
│   ├── powerups.js         — berry spawning, effects, timers
│   ├── events.js           — random event system, triggers, UI banners
│   ├── renderer.js         — canvas drawing, particles, screen effects
│   ├── sprites.js          — pixel art data arrays, sprite drawing functions
│   ├── tracking.js         — MediaPipe face mesh + mouse fallback
│   ├── screens.js          — title, starter select, evolution cutscene, game over
│   └── constants.js        — wave configs, timing, colors, sizes
```

### Key Decisions
- **Vite** for dev server + bundling only — no framework, no TypeScript
- **Sprites drawn programmatically** — pixel data as arrays in sprites.js, rendered to canvas. No external image files
- **Game state machine** in main.js — `title → select → playing → evolving → gameover`
- **MediaPipe** loaded from CDN — tracking.js abstracts it, game reads player.x/player.y
- **requestAnimationFrame** with delta time for frame-rate-independent animation
- **Circle-circle collision detection** — simple, effective at this scale
- **Zero runtime dependencies** — only Vite (dev) and MediaPipe (CDN)
