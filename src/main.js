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

document.addEventListener('keydown', (e) => {
  switch (state) {
    case 'title':
      if (e.key === 'Enter' || e.key === ' ') {
        state = 'select';
      }
      break;

    case 'select':
      if (e.key === 'ArrowLeft') {
        moveSelect(-1);
      } else if (e.key === 'ArrowRight') {
        moveSelect(1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        const chosen = getStarterNames()[getSelectIndex()];
        selectStarter(chosen);
        resetGame();
        if (!trackingInitialized) {
          initTracking();
          trackingInitialized = true;
        }
        state = 'playing';
      }
      break;

    case 'playing':
      // no keyboard input
      break;

    case 'gameover':
      if (e.key === 'Enter' || e.key === ' ') {
        resetPlayer();
        resetGame();
        state = 'playing';
      } else if (e.key === 'Escape') {
        state = 'title';
      }
      break;
  }
});

canvas.addEventListener('click', () => {
  if (state === 'title') {
    state = 'select';
  }
});

function loop(ts) {
  const dt = lastTs ? Math.min(ts - lastTs, 50) : 16; // cap dt
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
      drawGame(ctx, ts, 0); // dt=0 freezes game
      drawGameOverScreen(ctx, ts, dt, getScore());
      break;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
