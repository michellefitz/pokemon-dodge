import { inject } from '@vercel/analytics';
import { W, H } from './constants.js';
import { initTracking } from './tracking.js';
import { initHands } from './hands.js';
import { selectStarter, resetPlayer, getStarterNames, player } from './player.js';
import { resetGame, updateGame, drawGame, getScore } from './game.js';
import {
  drawTitleScreen, drawSelectScreen, getSelectIndex, moveSelect,
  drawGameOverScreen, startGameOver,
  drawInstructionsScreen,
  drawEnterNameScreen, handleNameKeydown, getPlayerName, resetName,
  drawLeaderboardScreen, resetLeaderboardScroll,
} from './screens.js';
import { submitScore, fetchLeaderboard } from './leaderboard.js';

inject();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// States: title → instructions → enterName → select → playing → gameover → leaderboard
let state = 'title';
let lastTs = 0;
let trackingInitialized = false;
let lastScore = 0;

document.addEventListener('keydown', (e) => {
  switch (state) {
    case 'title':
      if (e.key === 'Enter' || e.key === ' ') {
        state = 'instructions';
      }
      break;

    case 'instructions':
      if (e.key === 'Enter' || e.key === ' ') {
        state = 'enterName';
      }
      break;

    case 'enterName': {
      const result = handleNameKeydown(e);
      if (result === 'done') {
        state = 'select';
      }
      break;
    }

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
          initHands();
          initTracking(canvas);
          trackingInitialized = true;
        }
        state = 'playing';
      }
      break;

    case 'playing':
      break;

    case 'gameover':
      if (e.key === 'Enter' || e.key === ' ') {
        lastScore = getScore();
        submitScore(getPlayerName(), lastScore);
        fetchLeaderboard().then(() => {
          resetLeaderboardScroll();
        });
        state = 'leaderboard';
      }
      break;

    case 'leaderboard':
      if (e.key === 'Enter' || e.key === ' ') {
        resetPlayer();
        resetGame();
        state = 'select';
      } else if (e.key === 'Escape') {
        state = 'title';
        resetName();
      }
      break;
  }
});

canvas.addEventListener('click', () => {
  if (state === 'title') {
    state = 'instructions';
  }
});

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
      drawEnterNameScreen(ctx, ts, dt);
      break;
    case 'select':
      drawSelectScreen(ctx, ts, dt);
      break;
    case 'playing': {
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

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
