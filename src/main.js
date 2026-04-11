import { inject } from '@vercel/analytics';
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
  drawLeaderboardScreen, resetLeaderboardScroll,
} from './screens.js';
import { submitScore, fetchLeaderboard } from './leaderboard.js';
import { touchShoot } from './projectiles.js';
import { drawStarfield } from './renderer.js';

inject();

const canvas = document.getElementById('gameCanvas');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

// States: title → instructions → enterName → select → waitingForCamera → playing → gameover → leaderboard
let state = 'title';
let lastTs = 0;
let lastScore = 0;
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
    // Small delay so user sees "face detected" before game starts
    setTimeout(() => {
      if (state === 'waitingForCamera') {
        state = 'playing';
      }
    }, 500);
  });
}

function goToLeaderboard() {
  lastScore = getScore();
  // Stop camera when game ends
  stopTracking();
  state = 'leaderboard';
  submitScore(getPlayerName(), lastScore).then(() => {
    return fetchLeaderboard();
  }).then(() => {
    resetLeaderboardScroll();
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
      break; // can't skip
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
      goToLeaderboard();
      break;
    case 'leaderboard':
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
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

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
