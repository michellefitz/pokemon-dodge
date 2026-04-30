# Pokemon Dodge

A browser-based game where you use your **face and hands** to play — no keyboard or mouse required.

Move your head to dodge incoming Pokéballs and wild Pokémon. Open your hands toward the camera to fire back. Collect berries for power-ups.

**Play it:** [pokemon-dodge.vercel.app](https://pokemon-dodge.vercel.app)

---

## How to play

- **Head** — move your head left and right to dodge obstacles
- **Hands** — raise an open hand toward the camera to fire projectiles
- **Berries** — collect them for bonuses (extra life, invincibility, score boost, clear screen)

Obstacles get faster as your score climbs. Your starter Pokémon evolves at 40 and 80 points.

## Controls (desktop fallback)

If your camera isn't available, the game falls back to mouse control.

## Tech

- Vanilla JS + Canvas API, bundled with [Vite](https://vitejs.dev)
- [MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh) for head tracking
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) for hand tracking
- [Vercel Analytics](https://vercel.com/analytics) for usage stats

## Running locally

```bash
npm install
npm run dev
```

Then open [localhost:5173](http://localhost:5173) in Chrome (recommended for camera access).

## Running tests

```bash
npm test
```

## Deployment

Deployed automatically to Vercel on every push to `main`.
