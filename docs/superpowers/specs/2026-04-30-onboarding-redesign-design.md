# Onboarding Redesign — Design Spec
Date: 2026-04-30

## Overview

Replace the single "How to Play" instructions screen with a two-screen interactive onboarding that teaches the goal and controls through practice. Returning players skip onboarding entirely.

---

## Flow

**First-time player:**
`title → onboarding1 → onboarding2 → enterName → select → waitingForCamera → playing`

**Returning player:**
`title → select → waitingForCamera → playing`

A "How to Play" option on the title screen lets returning players replay onboarding if they want.

---

## Persistence

On completing onboarding for the first time, write to `localStorage`:
- `onboardingDone: "true"`
- `playerName: "<name>"` (saved after enterName)

On load, if `onboardingDone` is set, skip `onboarding1`, `onboarding2`, and `enterName`. Pre-fill `playerName` from localStorage so the leaderboard still works.

---

## Screen 1 — The Goal (`onboarding1`)

Three-column layout on the existing dark starfield background.

### Columns

| Column | Content | Caption |
|--------|---------|---------|
| Dodge | Grid of obstacle sprites (pokeball, greatball, ultraball, masterball, zubat, geodude, gastly, pidgey + attack types ember/watergun/vinewhip) drawn using existing pixel-art sprites | "Dodge obstacles — +1 point each" |
| Shoot | Existing player Pokemon sprite firing at a wild enemy sprite | "Shoot enemies — +2 points each" |
| Berries | Four berry sprites (oran, sitrus, rawst, lum) with labels: +10 pts / +1 life / invincible / clear screen | "Collect berries" |

**Note:** A small italic disclaimer below the scoring: "*(scoring subject to change)*" — scoring values are confirmed as TBD.

### Navigation
- Blinking "PRESS ENTER TO CONTINUE" prompt
- Visible "Skip →" button drawn on canvas (bottom-right)
- Click/tap on either the ENTER prompt or the Skip button advances to `onboarding2`

---

## Screen 2 — Controls Practice (`onboarding2`)

Camera initialises as soon as this screen opens (calls `initTracking` here instead of in `startPlaying`). Two sequential parts on the same screen.

### Part 1 — Head Control

**Displayed:**
- A Pokemon character (random starter sprite from the existing three) that mirrors the player's tracked head position in real time
- Text: "Move your head to control your Pokémon"
- Prompt: "When you're ready, nod to continue"
- "Skip →" button (bottom-right)

**Nod detection:**
- Track head Y position over time
- A nod = head Y drops below a threshold then returns above it within ~600ms
- Require 3 successful nods to advance (counter is internal only — not shown to player)
- On 3 nods detected, fade/transition to Part 2

### Part 2 — Hand Control

**Displayed (same screen, Part 1 fades out):**
- Illustration of open hands (reuse existing `drawOpenHand` helper from screens.js)
- Text: "Lift and open your hands to fire"
- Once a projectile fires successfully, prompt changes to: "Now wave both hands to start!"
- "Skip →" button (bottom-right)

**Gesture detection:**
- Fire detection: hook into existing projectile fire event — any projectile fired counts
- Wave detection: both hands visible and in motion (use existing hand tracking data from hands.js)
- On wave detected → advance to `enterName`

---

## State Machine Changes

Add two new states to `main.js`:
- `'onboarding1'` — draws screen 1, advances on Enter/click/skip
- `'onboarding2'` — draws screen 2 with part 1 then part 2, camera active, advances on wave/skip

Remove old `'instructions'` state (replaced entirely).

Camera init moves from `startPlaying()` to the `onboarding2` state entry. `waitingForCamera` state remains as a fallback if camera isn't ready by the time the player reaches `select`.

---

## New Code

All new drawing functions go in `screens.js` following existing patterns:
- `drawOnboarding1(ctx, ts, dt)` 
- `drawOnboarding2(ctx, ts, dt)` — manages internal part1/part2 state

Nod detection logic goes in `tracking.js` as a small helper:
- `detectNod()` — returns true when a nod event is confirmed; caller tracks count

Two-hand wave detection goes in `hands.js`:
- `detectTwoHandWave()` — returns true when both hands are visible and moving

---

## Out of Scope

- Changing scoring values (flagged as TBD, shown with disclaimer)
- Redesigning starter select or enter name screens
- Mobile-specific gesture alternatives (existing touch fallbacks remain)
