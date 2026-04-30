import { inject } from '@vercel/analytics';
import { W, H, COLORS } from './constants.js';
import { initTracking, stopTracking, tracking } from './tracking.js';
import { initHands } from './hands.js';
import { selectStarter, resetPlayer, getStarterNames, player } from './player.js';
import { resetGame, updateGame, drawGame, getScore } from './game.js';
import {
  drawTitleScreen, drawSelectScreen, getSelectIndex, moveSelect,
  drawGameOverScreen, startGameOver,
  drawOnboarding1, drawOnboarding2, initOnboarding2, setPlayerName,
  HOW_TO_PLAY_BUTTON, isHowToPlayHit,
  drawEnterNameScreen, handleNameKeydown, getPlayerName, resetName,
  drawLeaderboardScreen, resetLeaderboardScroll,
} from './screens.js';
import { submitScore, fetchLeaderboard } from './leaderboard.js';
import { touchShoot, hasFiredSinceReset, resetProjectiles, updateProjectiles, drawProjectiles } from './projectiles.js';
import { drawStarfield } from './renderer.js';
import { hasCompletedOnboarding, markOnboardingDone, getSavedPlayerName, savePlayerName } from './storage.js';

inject();

const canvas = document.getElementById('gameCanvas');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

// States: title → onboarding1 → onboarding2 → enterName → select → waitingForCamera → playing → gameover → leaderboard
// Returning players: title → select → waitingForCamera → playing
let state = 'title';
let lastTs = 0;
let lastScore = 0;
let cameraStatusText = 'Loading camera...';

// Camera lifecycle — true while tracking is running
let cameraInitialized = false;

// Onboarding 2 state
let ob2Part = 1;    // 1 = head control, 2 = hand control
let ob2HasFired = false;

// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 'ontouchstart' in window;

// Pre-fill name for returning players
if (hasCompletedOnboarding()) {
  setPlayerName(getSavedPlayerName());
}

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (W / rect.width),
    y: (clientY - rect.top) * (H / rect.height),
  };
}

// Enter onboarding 2 — init camera + reset all detectors
function enterOnboarding2() {
  const starters = getStarterNames();
  const randomStarter = starters[Math.floor(Math.random() * starters.length)];
  selectStarter(randomStarter);
  resetProjectiles();
  initOnboarding2();
  ob2Part = 1;
  ob2HasFired = false;

  if (!cameraInitialized) {
    initHands();
    initTracking(canvas).then(() => {
      cameraInitialized = true;
    });
  }

  state = 'onboarding2';
}

// Complete onboarding — mark done and move to name entry
function advanceFromOnboarding2() {
  markOnboardingDone();
  state = 'enterName';
}

// Start camera, wait for face detection, then begin playing
function startPlaying() {
  const chosen = getStarterNames()[getSelectIndex()];
  selectStarter(chosen);
  resetGame();

  // Camera already running (initialized during onboarding) — go straight to playing
  if (cameraInitialized) {
    state = 'playing';
    return;
  }

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
        cameraInitialized = true;
        state = 'playing';
      }
    }, 500);
  });
}

function goToLeaderboard() {
  lastScore = getScore();
  // Stop camera when game ends
  stopTracking();
  cameraInitialized = false;
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
      else if (e.key === 'Escape') state = 'title';
      break;
    case 'onboarding2':
      if (e.key === 'Enter' || e.key === ' ') {
        if (ob2Part === 1) {
          ob2Part = 2;
          resetProjectiles();
        } else {
          advanceFromOnboarding2();
        }
      } else if (e.key === 'Escape') state = 'title';
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
      if (hasCompletedOnboarding() && isHowToPlayHit(pos)) {
        state = 'onboarding1';
      } else if (hasCompletedOnboarding()) {
        state = 'select';
      } else {
        state = 'onboarding1';
      }
      break;
    case 'onboarding1':
    case 'onboarding2':
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
      savePlayerName(getPlayerName());
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

  const isReturning = hasCompletedOnboarding();

  switch (state) {
    case 'title':
      drawTitleScreen(ctx, ts, dt, isReturning);
      break;
    case 'onboarding1':
      drawOnboarding1(ctx, ts, dt);
      break;
    case 'onboarding2': {
      // Keep player position synced with head tracking so projectiles originate correctly
      player.smoothX = tracking.x;
      player.smoothY = tracking.y;

      // Part 2: run projectile physics and track first fire
      if (ob2Part === 2) {
        updateProjectiles(ts, dt);
        if (hasFiredSinceReset()) ob2HasFired = true;
      }

      drawOnboarding2(ctx, ts, dt, ob2Part, ob2HasFired);

      if (ob2Part === 2) {
        drawProjectiles(ctx, ts);
      }
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

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
