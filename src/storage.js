const KEY_ONBOARDING = 'onboardingDone';
const KEY_PLAYER_NAME = 'playerName';

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
