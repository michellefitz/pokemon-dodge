// Client-side leaderboard API
const API_URL = '/api/scores';

let cachedScores = [];

export async function submitScore(name, score) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });
  } catch (e) {
    console.warn('Failed to submit score:', e);
  }
}

export async function fetchLeaderboard() {
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      cachedScores = await res.json();
    }
  } catch (e) {
    console.warn('Failed to fetch leaderboard:', e);
  }
  return cachedScores;
}

export function getCachedScores() {
  return cachedScores;
}
