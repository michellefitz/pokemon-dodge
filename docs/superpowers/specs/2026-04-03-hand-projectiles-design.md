# Hand Tracking Projectiles — Design Spec

Add hand-tracking projectiles to Pokemon Dodge. Players raise their hands to fire starter-specific projectiles that destroy obstacles. Detected via MediaPipe Hands alongside the existing Face Mesh.

## Hand Tracking

- MediaPipe Hands (CDN) runs as a second model alongside Face Mesh, sharing the same video element and camera feed
- Track both hands — wrist (landmark 0) and middle fingertip (landmark 9)
- A hand is "raised" when the wrist landmark is detected above a Y threshold (roughly above nose level)
- Hand position in screen space determines projectile aim direction
- Mouse fallback: no projectiles (hand tracking required)

## Projectile Mechanics

**Firing:**
- Auto-fire while hand is raised, 1 shot per second per hand
- Both hands up = 2 shots/sec total
- Projectile fires from player position toward where the hand is in screen space
- Direction vector = normalize(hand position - player position)

**Projectile types by starter:**
- Charmander line: fireball (orange/red, reuse ember-style sprite)
- Bulbasaur line: razor leaf (green leaf, new 8x8 sprite)
- Squirtle line: water shot (blue droplet, new 8x8 sprite)

**Speed:** ~6px per normalized frame (faster than any obstacle)

**Collision:** Projectile hits obstacle → both destroyed, particle burst. No score awarded — purely defensive survival tool.

**Despawn:** Projectiles removed when leaving canvas bounds.

## Energy System

- Starts at 100 per hand (left and right tracked independently)
- Each shot costs 10 energy
- Recharges at 15/sec when that hand is lowered
- When energy hits 0, cannot fire until it recharges to at least 20 (prevents flicker)

## Visual

**Energy bars:** Two small vertical bars flanking the player sprite — left bar for left hand, right bar for right hand. Only visible when energy < 100 (hidden when full for clean UI).

**Projectile destruction:** Particle burst on hit using the projectile's color (orange for fire, green for leaf, blue for water).

## Technical Architecture

### New files
| File | Responsibility |
|------|---------------|
| `src/hands.js` | MediaPipe Hands init, exports reactive `{ leftHand, rightHand }` state (each `{ active, x, y }`) |
| `src/projectiles.js` | Projectile spawning, movement, energy system, obstacle collision, drawing |

### Modified files
| File | Change |
|------|--------|
| `index.html` | Add MediaPipe Hands CDN script |
| `src/sprites.js` | Add razor leaf (8x8) and water droplet (8x8) sprites |
| `src/game.js` | Integrate projectile update/draw/collision into game loop |
| `src/renderer.js` | Add energy bar drawing to HUD |

### MediaPipe Hands CDN
```
https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js
```
Loaded via script tag in index.html alongside existing face_mesh and camera_utils.
