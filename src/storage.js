const KEY_ONBOARDING = 'onboardingDone';
const KEY_PLAYER_NAME = 'playerName';
const KEY_BEST_SCORE = 'bestScore';

export function hasCompletedOnboarding() {
  return localStorage.getItem(KEY_ONBOARDING) === 'true';
}

export function markOnboardingDone() {
  localStorage.setItem(KEY_ONBOARDING, 'true');
}

export function getSavedPlayerName() {
  return localStorage.getItem(KEY_PLAYER_NAME) || '';
}

export function savePlayerName(name) {
  localStorage.setItem(KEY_PLAYER_NAME, name);
}

export function getBestScore() {
  return parseInt(localStorage.getItem(KEY_BEST_SCORE) || '0', 10);
}

/** Saves score if it beats the existing best. Returns true if a new record. */
export function saveBestScore(score) {
  const current = getBestScore();
  if (score > current) {
    localStorage.setItem(KEY_BEST_SCORE, String(score));
    return true;
  }
  return false;
}
