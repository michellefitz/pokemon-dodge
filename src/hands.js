import { W, H } from './constants.js';
import { addFrameHandler } from './tracking.js';

// Reactive hand state — game reads these directly
export const handState = {
  left:  { active: false, x: 0, y: 0 },
  right: { active: false, x: 0, y: 0 },
};

let handsInstance = null;
let frameCount = 0;

export function initHands() {
  handsInstance = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`,
  });

  handsInstance.setOptions({
    maxNumHands: 2,
    modelComplexity: 0, // fastest
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  handsInstance.onResults(onHandResults);

  // Register with the Camera's frame loop via tracking.js
  // Process every 2nd frame (~15fps) for responsive hand tracking
  let sending = false;
  addFrameHandler(async (video) => {
    frameCount++;
    if (frameCount % 2 !== 0) return; // skip every other frame
    if (sending) return;
    sending = true;
    try {
      await handsInstance.send({ image: video });
    } catch (e) {
      // ignore frame drops
    }
    sending = false;
  });
}

// Check if a finger is extended by comparing tip to PIP joint (knuckle).
// Fingertip landmarks: index=8, middle=12, ring=16, pinky=20
// PIP joint landmarks: index=6, middle=10, ring=14, pinky=18
// A finger is extended when its tip is further from the wrist than its PIP.
function countExtendedFingers(landmarks) {
  const tipIds  = [8, 12, 16, 20];
  const pipIds  = [6, 10, 14, 18];
  const wrist = landmarks[0];
  let count = 0;

  for (let f = 0; f < 4; f++) {
    const tip = landmarks[tipIds[f]];
    const pip = landmarks[pipIds[f]];
    // Compare distance from wrist — extended finger's tip is further out
    const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const pipDist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
    if (tipDist > pipDist * 1.1) count++; // 10% margin to avoid flicker
  }
  return count;
}

// ── Two-hand wave detection ─────────────────────────────────────────────────
// Accumulates total X travel for each hand over a rolling time window.
// Returns true when both hands have moved at least WAVE_MIN_TRAVEL_PX in the window.

const WAVE_WINDOW_MS = 1000;
const WAVE_MIN_TRAVEL_PX = 50;

let _waveLeftSamples = [];  // [{t, x}, ...]
let _waveRightSamples = [];
let _waveLastLeftX = null;
let _waveLastRightX = null;

/**
 * Call once per frame with the current timestamp (ms).
 * Returns true when both hands have each travelled ≥ WAVE_MIN_TRAVEL_PX
 * within the last WAVE_WINDOW_MS.
 */
export function detectTwoHandWave(t) {
  const cutoff = t - WAVE_WINDOW_MS;

  // Record samples for each active hand
  if (handState.left.active) {
    const x = handState.left.x;
    if (_waveLastLeftX !== null) {
      const travel = Math.abs(x - _waveLastLeftX);
      _waveLeftSamples.push({ t, travel });
    }
    _waveLastLeftX = x;
  } else {
    _waveLastLeftX = null;
  }

  if (handState.right.active) {
    const x = handState.right.x;
    if (_waveLastRightX !== null) {
      const travel = Math.abs(x - _waveLastRightX);
      _waveRightSamples.push({ t, travel });
    }
    _waveLastRightX = x;
  } else {
    _waveLastRightX = null;
  }

  // Evict old samples
  _waveLeftSamples  = _waveLeftSamples.filter(s => s.t > cutoff);
  _waveRightSamples = _waveRightSamples.filter(s => s.t > cutoff);

  const leftTravel  = _waveLeftSamples.reduce((sum, s) => sum + s.travel, 0);
  const rightTravel = _waveRightSamples.reduce((sum, s) => sum + s.travel, 0);

  return leftTravel >= WAVE_MIN_TRAVEL_PX && rightTravel >= WAVE_MIN_TRAVEL_PX;
}

/** Reset wave detector state (call when entering onboarding2). */
export function resetWaveDetector() {
  _waveLeftSamples = [];
  _waveRightSamples = [];
  _waveLastLeftX = null;
  _waveLastRightX = null;
}

function onHandResults(results) {
  // Reset both
  handState.left.active = false;
  handState.right.active = false;

  if (!results.multiHandLandmarks || !results.multiHandedness) return;

  for (let i = 0; i < results.multiHandLandmarks.length; i++) {
    const landmarks = results.multiHandLandmarks[i];
    const handedness = results.multiHandedness[i];

    // MediaPipe labels are from camera perspective (mirrored)
    // "Right" in MediaPipe = left hand in mirrored view
    const isLeft = handedness.label === 'Right';
    const hand = isLeft ? handState.left : handState.right;

    const middleMCP = landmarks[9]; // middle finger MCP for hand center

    // Always update position so the tracking indicator shows
    hand.x = (1 - middleMCP.x) * W;
    hand.y = middleMCP.y * H;

    // Open hand (3+ fingers extended) = fire, fist = don't fire
    hand.active = countExtendedFingers(landmarks) >= 3;
  }
}
