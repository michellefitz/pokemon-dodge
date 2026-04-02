import { W, H } from './constants.js';

// Reactive hand state — game reads these directly
export const handState = {
  left:  { active: false, x: 0, y: 0 },
  right: { active: false, x: 0, y: 0 },
};

let handsInstance = null;

export function initHands() {
  const video = document.getElementById('videoEl');
  if (!video || !video.srcObject) return; // no camera

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

  // Piggyback on the existing camera — send frames to hands too
  // We poll the video element on a timer since the Camera util
  // is already driving face mesh
  let sending = false;
  setInterval(async () => {
    if (sending || !video.srcObject || video.readyState < 2) return;
    sending = true;
    try {
      await handsInstance.send({ image: video });
    } catch (e) {
      // ignore frame drops
    }
    sending = false;
  }, 100); // ~10fps for hands (lighter than face mesh)
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

    const wrist = landmarks[0];
    const middleMCP = landmarks[9]; // middle finger MCP for hand center

    // Use middle finger MCP for aiming position
    // Mirror x to match our face tracking (1 - x)
    hand.x = (1 - middleMCP.x) * W;
    hand.y = middleMCP.y * H;

    // Hand is "raised" if wrist is in upper 70% of frame
    hand.active = wrist.y < 0.7;
  }
}
