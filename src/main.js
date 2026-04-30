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
import { initAudio, toggleMute, isMuted } from './audio.js';
import { initMobileControls, getJoystickVector, getRightJoystickVector, showMobileControls, hideMobileControls } from './mobileControls.js';

inject();

const canvas = document.getElementById('gameCanvas');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

// States: title → onboarding1 → onboarding2 → enterName → select → waitingForCamera → playing → gameover → leaderboard
// Mobile flow: title → enterName → select → playing (no camera, no onboarding)
let state = 'title';
let lastTs = 0;
let lastScore = 0;
let cameraStatusText = 'Loading camera...';

// Camera lifecycle — true while tracking is running
let cameraInitialized = false;

// Onboarding 2 state
let ob2Part = 1;
let ob2HasFired = false;

// Detect mobile (touch device)
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 'ontouchstart' in window;

// Mobile setup — no camera on mobile
if (isMobile) {
  document.body.classList.add('mobile-mode');
  initMobileControls();
  markOnboardingDone(); // onboarding teaches camera controls — not relevant on mobile
  // Hide camera status indicator and remove video element so no permission is requested
  const statusDot = document.getElementById('statusDot');
  if (statusDot) statusDot.style.display = 'none';
  const videoEl = document.getElementById('videoEl');
  if (videoEl) videoEl.remove();
}

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

// Start playing — skip camera init on mobile
function startPlaying() {
  const chosen = getStarterNames()[getSelectIndex()];
  selectStarter(chosen);
  resetGame();

  if (isMobile) {
    // Reset player to centre for d-pad control
    player.smoothX = W / 2;
    player.smoothY = H / 2;
    tracking.x = W / 2;
    tracking.y = H / 2;
    state = 'playing';
    return;
  }

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
  if (!isMobile) {
    stopTracking();
    cameraInitialized = false;
  }
  state = 'leaderboard';
  submitScore(getPlayerName(), lastScore).then(() => {
    return fetchLeaderboard();
  }).then(() => {
    resetLeaderboardScroll();
  });
}

// ── Keyboard input ──────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  initAudio();

  if (e.key === 'm' || e.key === 'M') {
    toggleMute();
    return;
  }

  switch (state) {
    case 'title':
      if (e.key === 'Enter' || e.key === ' ') {
        if (isMobile || hasCompletedOnboarding()) {
          state = (isMobile && !getSavedPlayerName()) ? 'enterName' : 'select';
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

// ── Touch/click input ────────────────────────────────────────
canvas.addEventListener('click', (e) => {
  initAudio();
  const pos = canvasCoords(e);
  switch (state) {
    case 'title':
      if (!isMobile && hasCompletedOnboarding() && isHowToPlayHit(pos)) {
        state = 'onboarding1';
      } else if (isMobile || hasCompletedOnboarding()) {
        state = (isMobile && !getSavedPlayerName()) ? 'enterName' : 'select';
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

// ── Touch shooting (desktop/fallback only — mobile uses buttons) ────
let activeTouches = {};

canvas.addEventListener('touchstart', (e) => {
  if (state !== 'playing' || isMobile) return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const pos = canvasCoords({ touches: [touch] });
    activeTouches[touch.identifier] = pos;
    touchShoot(pos.x, pos.y);
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (state !== 'playing' || isMobile) return;
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
  const name = prompt('Enter your name for the leaderboard (max 12 characters):');
  if (name && name.trim()) {
    const clean = name.trim().replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 12);
    for (const ch of clean) {
      handleNameKeydown({ key: ch });
    }
    if (clean.length > 0) {
      handleNameKeydown({ key: 'Enter' });
      savePlayerName(getPlayerName());
      state = 'select';
      return;
    }
  }
  // Cancelled or no valid name — back to title
  state = 'title';
}

// ── Cross-platform nudge (shown on game over) ───────────────
function drawCrossPlatformNudge(ctx, ts) {
  const msg = isMobile
    ? 'Try this on desktop — control your Pokémon with face tracking!'
    : 'Try this on mobile with the joystick — can you beat your score?';

  ctx.save();
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255,255,255,${0.38 + Math.sin(ts * 0.0018) * 0.12})`;
  ctx.fillText(msg, W / 2, H - 28);
  ctx.restore();
}

// ── "Waiting for camera" screen ─────────────────────────────
function drawWaitingScreen(ctx, ts, dt) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStarfield(ctx, dt);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const dots = '.'.repeat(Math.floor(ts / 400) % 4);

  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${cameraStatusText}${dots}`, W / 2, H * 0.4);

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

  // Show/hide mobile controls based on state
  if (isMobile) {
    if (state === 'playing') showMobileControls();
    else hideMobileControls();
  }

  const isReturning = hasCompletedOnboarding();

  switch (state) {
    case 'title':
      drawTitleScreen(ctx, ts, dt, isReturning && !isMobile);
      break;
    case 'onboarding1':
      drawOnboarding1(ctx, ts, dt);
      break;
    case 'onboarding2': {
      player.smoothX = tracking.x;
      player.smoothY = tracking.y;

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
      if (isMobile) {
        // Analog joystick drives player position
        const joy = getJoystickVector();
        const speed = 8 * (dt / 16);
        const r = 22;
        const dead = 0.12;
        if (Math.abs(joy.x) > dead || Math.abs(joy.y) > dead) {
          player.smoothX = Math.max(r, Math.min(W - r, player.smoothX + joy.x * speed));
          player.smoothY = Math.max(r, Math.min(H - r, player.smoothY + joy.y * speed));
          tracking.x = player.smoothX;
          tracking.y = player.smoothY;
        }

        // Right joystick fires in the direction it's pushed
        const rJoy = getRightJoystickVector();
        const fireDead = 0.2;
        if (Math.abs(rJoy.x) > fireDead || Math.abs(rJoy.y) > fireDead) {
          touchShoot(player.smoothX + rJoy.x * 500, player.smoothY + rJoy.y * 500);
        }
      } else {
        // Desktop: touch-drag shooting
        for (const id in activeTouches) {
          touchShoot(activeTouches[id].x, activeTouches[id].y);
        }
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
      drawCrossPlatformNudge(ctx, ts);
      break;
    case 'leaderboard':
      drawLeaderboardScreen(ctx, ts, dt, lastScore, getPlayerName());
      break;
  }

  // Mute indicator
  if (isMuted()) {
    ctx.save();
    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('🔇 M', W - 10, 10);
    ctx.restore();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
