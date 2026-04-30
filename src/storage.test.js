import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hasCompletedOnboarding,
  markOnboardingDone,
  getSavedPlayerName,
  savePlayerName,
} from './storage.js';

// Mock localStorage since jsdom's implementation may not be available
const store = {};
const mockLocalStorage = {
  getItem: (key) => (key in store ? store[key] : null),
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
};

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage);
  for (const key of Object.keys(store)) delete store[key];
});

describe('hasCompletedOnboarding', () => {
  it('returns false when key is absent', () => {
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it('returns true after markOnboardingDone', () => {
    markOnboardingDone();
    expect(hasCompletedOnboarding()).toBe(true);
  });
});

describe('getSavedPlayerName', () => {
  it('returns empty string when key is absent', () => {
    expect(getSavedPlayerName()).toBe('');
  });

  it('returns saved name after savePlayerName', () => {
    savePlayerName('Ash');
    expect(getSavedPlayerName()).toBe('Ash');
  });
});
