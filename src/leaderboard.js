// Client-side leaderboard API
const API_URL = '/api/scores';

let cachedScores = [];

// Generate HMAC-like token using Web Crypto API
// This matches the server's HMAC verification
async function generateToken(name, score) {
  const secret = 'pokemon-dodge-default-secret';
  const message = `${name}:${score}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 16);
}

export async function submitScore(name, score) {
  try {
    const roundedScore = Math.round(score);
    const token = await generateToken(name, roundedScore);
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: roundedScore, token }),
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
