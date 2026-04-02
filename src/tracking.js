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
// to receive frames from the same Camera instance
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

export function initTracking(canvas) {
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

  faceMesh.onResults(results => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const lm = results.multiFaceLandmarks[0];
      const nose = lm[1];        // nose tip
      const forehead = lm[10];   // top of forehead
      const chin = lm[152];      // bottom of chin

      // ── X: side-to-side head movement (amplified) ──
      const sensitivity = 2.5;
      const centered = (1 - nose.x) - 0.5;
      const amplified = centered * sensitivity + 0.5;
      tracking.x = Math.max(0, Math.min(W, amplified * W));

      // ── Y: head tilt (pitch) instead of actual Y position ──
      // Measure where nose sits between forehead and chin.
      // Neutral ≈ 0.35 (nose is closer to forehead than chin).
      // Tilt forward → ratio increases → move down.
      // Tilt back → ratio decreases → move up.
      const faceHeight = chin.y - forehead.y;
      const noseRatio = faceHeight > 0.01 ? (nose.y - forehead.y) / faceHeight : 0.35;
      const neutralRatio = 0.35;
      const tiltSensitivity = 5.0;
      const tiltOffset = (noseRatio - neutralRatio) * tiltSensitivity;
      // Map tilt to full vertical range
      const baseY = H * 0.5;
      tracking.y = Math.max(30, Math.min(H - 30, baseY + tiltOffset * H));
      if (!tracking.active) {
        tracking.active = true;
        tracking.mode = 'camera';
        updateStatus(true, 'tracking');
      }
    } else {
      if (tracking.mode === 'camera') {
        tracking.active = false;
        updateStatus(false, 'no face detected');
      }
    }
  });

  updateStatus(false, 'loading...');

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      updateStatus(false, 'camera on');
      const camera = new Camera(video, {
        onFrame: async () => {
          await faceMesh.send({ image: video });
          for (const handler of extraFrameHandlers) {
            handler(video);
          }
        },
        width: W,
        height: H,
      });
      camera.start();
    })
    .catch(() => {
      enableMouseFallback(canvas);
    });
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
