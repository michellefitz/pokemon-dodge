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
import { touchShoot } from './projectiles.js';

inject();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// States: title → instructions → enterName → select → playing → gameover → leaderboard
let state = 'title';
let lastTs = 0;
let trackingInitialized = false;
let lastScore = 0;

// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 'ontouchstart' in window;

// Helper: get canvas-relative coordinates from touch/click event
function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (W / rect.width),
    y: (clientY - rect.top) * (H / rect.height),
  };
}

// Helper: start game with selected starter
function startPlaying() {
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

// Helper: go to leaderboard
function goToLeaderboard() {
  lastScore = getScore();
  state = 'leaderboard';
  submitScore(getPlayerName(), lastScore).then(() => {
    return fetchLeaderboard();
  }).then(() => {
    resetLeaderboardScroll();
  });
}

// ── Keyboard input (desktop) ──────────────────────────────────
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

// ── Touch/click input (mobile + desktop click) ────────────────
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
      // Tap left third / middle third / right third to select starter
      const third = W / 3;
      if (pos.y > H * 0.7) {
        // Tapped bottom area — confirm selection
        startPlaying();
      } else {
        if (pos.x < third) moveSelect(-1);
        else if (pos.x > third * 2) moveSelect(1);
        else startPlaying(); // tap middle = confirm
      }
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

// ── Touch shooting during gameplay ────────────────────────────
// Touch left half = shoot left, touch right half = shoot right
// This gives mobile players a way to shoot without hand tracking
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

// ── Mobile name entry ─────────────────────────────────────────
// On mobile, show a prompt for name entry instead of keyboard capture
function mobileNameEntry() {
  const name = prompt('Enter your name (max 12 characters):');
  if (name && name.trim()) {
    // Simulate keydowns for each character
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

// ── Game loop ─────────────────────────────────────────────────
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
      // On mobile, use prompt instead of canvas keyboard
      if (isMobile && getPlayerName().length === 0) {
        mobileNameEntry();
      }
      drawEnterNameScreen(ctx, ts, dt);
      break;
    case 'select':
      drawSelectScreen(ctx, ts, dt);
      break;
    case 'playing': {
      // Continuous touch shooting — fire every frame while touching
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

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
