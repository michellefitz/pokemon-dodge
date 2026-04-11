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
