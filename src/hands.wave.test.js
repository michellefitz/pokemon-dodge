import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectTwoHandWave, resetWaveDetector, handState } from './hands.js';

beforeEach(() => {
  resetWaveDetector();
  handState.left.active = false;
  handState.right.active = false;
  handState.left.x = 0;
  handState.right.x = 0;
});

describe('detectTwoHandWave', () => {
  it('returns false when neither hand is active', () => {
    expect(detectTwoHandWave(1000)).toBe(false);
  });

  it('returns false when only one hand is active', () => {
    handState.left.active = true;
    handState.left.x = 100;
    detectTwoHandWave(1000);
    handState.left.x = 200;
    detectTwoHandWave(1100);
    expect(detectTwoHandWave(1200)).toBe(false);
  });

  it('returns false when both hands move but not enough', () => {
    handState.left.active = true;
    handState.right.active = true;
    handState.left.x = 100;
    handState.right.x = 400;
    detectTwoHandWave(1000);
    // Move each hand only 20px — below WAVE_MIN_TRAVEL_PX=50
    handState.left.x = 120;
    handState.right.x = 420;
    detectTwoHandWave(1100);
    expect(detectTwoHandWave(1200)).toBe(false);
  });

  it('returns true when both hands travel >= 50px within the window', () => {
    handState.left.active = true;
    handState.right.active = true;
    handState.left.x = 100;
    handState.right.x = 400;
    detectTwoHandWave(1000);
    handState.left.x = 200;  // +100px
    handState.right.x = 300; // +100px (negative direction, abs)
    detectTwoHandWave(1100);
    expect(detectTwoHandWave(1200)).toBe(true);
  });

  it('returns false when movement is outside the time window', () => {
    handState.left.active = true;
    handState.right.active = true;
    handState.left.x = 100;
    handState.right.x = 400;
    detectTwoHandWave(0);
    handState.left.x = 200;
    handState.right.x = 300;
    detectTwoHandWave(100);
    // Now call well past the 1000ms window
    expect(detectTwoHandWave(2000)).toBe(false);
  });

  it('resets correctly after resetWaveDetector', () => {
    handState.left.active = true;
    handState.right.active = true;
    handState.left.x = 100;
    handState.right.x = 400;
    detectTwoHandWave(1000);
    handState.left.x = 200;
    handState.right.x = 300;
    detectTwoHandWave(1100);
    resetWaveDetector();
    // After reset accumulated travel is cleared — next call starts fresh
    expect(detectTwoHandWave(1200)).toBe(false);
  });
});
