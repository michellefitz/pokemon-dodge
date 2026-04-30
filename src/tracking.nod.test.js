import { describe, it, expect, beforeEach } from 'vitest';
import { detectNod, resetNodDetector } from './tracking.js';

beforeEach(() => {
  resetNodDetector();
});

describe('detectNod', () => {
  it('returns false when head is stationary', () => {
    for (let i = 0; i < 10; i++) {
      expect(detectNod(250)).toBe(false);
    }
  });

  it('returns false when head dips but has not returned', () => {
    // Establish baseline at 250
    for (let i = 0; i < 5; i++) detectNod(250);
    // Head dips down (larger Y = lower on screen)
    expect(detectNod(275)).toBe(false); // dip registered, not returned yet
  });

  it('returns true when head dips and returns', () => {
    // Establish baseline at 250
    for (let i = 0; i < 5; i++) detectNod(250);
    // Dip
    detectNod(275);
    // Return above dip point by NOD_RETURN_PX (15px) → 275 - 15 = 260, but must be < dip-15
    const result = detectNod(255); // 255 < 275 - 15 = 260 ✓
    expect(result).toBe(true);
  });

  it('does not fire on a tiny dip below threshold', () => {
    for (let i = 0; i < 5; i++) detectNod(250);
    // Dip only 10px — below NOD_DIP_PX=20 threshold, so stays in watching state
    detectNod(258);
    // Return
    const result = detectNod(250);
    expect(result).toBe(false);
  });

  it('resets correctly after resetNodDetector', () => {
    for (let i = 0; i < 5; i++) detectNod(250);
    detectNod(275);
    resetNodDetector();
    // After reset, no nod should fire on same sequence until baseline re-established
    for (let i = 0; i < 5; i++) detectNod(250);
    detectNod(275);
    const result = detectNod(255);
    expect(result).toBe(true); // still works after reset
  });
});
