import { W, H } from './constants.js';

// Reactive tracking state — game reads these directly
export const tracking = {
  x: W / 2,
  y: H * 0.75,
  active: false,
  mode: 'none', // 'camera', 'mouse', 'none'
};

let onStatusChange = null;

// Additional frame handlers — other models (e.g. Hands) register here
const extraFrameHandlers = [];

export function addFrameHandler(fn) {
  extraFrameHandlers.push(fn);
}

export function setStatusCallback(cb) {
  onStatusChange = cb;
}

function updateStatus(dotActive, label) {
  const dot = document.getElementById('dot');
  const statusLabel = document.getElementById('statusLabel');
  if (dot) {
    dot.classList.toggle('active', dotActive);
  }
  if (statusLabel) {
    statusLabel.textContent = label;
  }
  if (onStatusChange) onStatusChange(dotActive, label);
}

let cameraInstance = null;
let activeStream = null;

// Returns a promise that resolves when tracking is active (face detected or mouse fallback)
export function initTracking(canvas) {
  return new Promise((resolve) => {
    const video = document.getElementById('videoEl');

    const faceMesh = new FaceMesh({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${f}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    let resolved = false;

    faceMesh.onResults(results => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const nose = results.multiFaceLandmarks[0][1];

        const xSensitivity = 2.5;
        const xCentered = (1 - nose.x) - 0.5;
        const xAmplified = xCentered * xSensitivity + 0.5;
        tracking.x = Math.max(0, Math.min(W, xAmplified * W));

        const ySensitivity = 2.5;
        const yCentered = nose.y - 0.5;
        const yAmplified = yCentered * ySensitivity + 0.5;
        tracking.y = Math.max(30, Math.min(H - 30, yAmplified * H));

        if (!tracking.active) {
          tracking.active = true;
          tracking.mode = 'camera';
          updateStatus(true, 'tracking');
        }

        // Resolve on first face detection
        if (!resolved) {
          resolved = true;
          resolve('camera');
        }
      } else {
        if (tracking.mode === 'camera') {
          tracking.active = false;
          updateStatus(false, 'no face detected');
        }
      }
    });

    updateStatus(false, 'loading camera...');

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        activeStream = stream;
        video.srcObject = stream;
        updateStatus(false, 'finding your face...');
        cameraInstance = new Camera(video, {
          onFrame: async () => {
            await faceMesh.send({ image: video });
            for (const handler of extraFrameHandlers) {
              handler(video);
            }
          },
          width: W,
          height: H,
        });
        cameraInstance.start();
      })
      .catch(() => {
        enableMouseFallback(canvas);
        if (!resolved) {
          resolved = true;
          resolve('mouse');
        }
      });
  });
}

// Stop the camera and release the stream
export function stopTracking() {
  if (cameraInstance) {
    try { cameraInstance.stop(); } catch (e) { /* ignore */ }
    cameraInstance = null;
  }
  if (activeStream) {
    for (const track of activeStream.getTracks()) {
      track.stop();
    }
    activeStream = null;
  }
  const video = document.getElementById('videoEl');
  if (video) {
    video.srcObject = null;
  }
  tracking.active = false;
  tracking.mode = 'none';
  updateStatus(false, 'camera off');
}

// ── Nod detection ──────────────────────────────────────────────────────────
// Two-phase state machine: 'watching' → head dips below baseline → 'dipped'
// → head returns above baseline → fires nod event, resets to 'watching'.
// Baseline adapts slowly toward the current Y so it self-calibrates.

const NOD_DIP_PX = 20;    // Y must drop this many px below baseline to count as dip
const NOD_RETURN_PX = 15; // Y must rise this many px above dip point to confirm nod
const BASELINE_ALPHA = 0.02; // slow adaptation rate

let _nodState = 'watching'; // 'watching' | 'dipped'
let _nodBaseline = null;    // null until first call
let _nodDipY = 0;           // Y value at deepest dip

/**
 * Call once per frame with the current head Y pixel value.
 * Returns true on the frame a nod is confirmed, false otherwise.
 * Y increases downward (canvas coordinates).
 */
export function detectNod(y) {
  if (_nodBaseline === null) {
    _nodBaseline = y;
  }

  let fired = false;

  if (_nodState === 'watching') {
    if (y > _nodBaseline + NOD_DIP_PX) {
      _nodState = 'dipped';
      _nodDipY = y;
    } else {
      // Slowly adapt baseline toward current Y
      _nodBaseline += (_nodBaseline - _nodBaseline) || 0;
      _nodBaseline = _nodBaseline * (1 - BASELINE_ALPHA) + y * BASELINE_ALPHA;
    }
  } else if (_nodState === 'dipped') {
    if (y > _nodDipY) _nodDipY = y; // track lowest point
    if (y < _nodDipY - NOD_RETURN_PX) {
      // Head has risen back up — nod confirmed
      fired = true;
      _nodState = 'watching';
      _nodBaseline = y;
    }
  }

  return fired;
}

/** Reset nod detector state (call when entering onboarding2). */
export function resetNodDetector() {
  _nodState = 'watching';
  _nodBaseline = null;
  _nodDipY = 0;
}

function enableMouseFallback(canvas) {
  tracking.active = true;
  tracking.mode = 'mouse';
  updateStatus(true, 'mouse mode');
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    tracking.x = (e.clientX - rect.left) * (W / rect.width);
    tracking.y = H * 0.75;
  });
}
