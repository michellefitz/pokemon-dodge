import { Redis } from '@upstash/redis';
import { createHmac } from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const LEADERBOARD_KEY = 'pokemon-dodge:leaderboard';
const MAX_ENTRIES = 50;
const MAX_SCORE = 500; // no legit game exceeds this
const RATE_LIMIT_SECONDS = 30;
const SCORE_SECRET = process.env.SCORE_SECRET;

// Verify the HMAC token the client sends with each score submission
function verifyToken(name, score, token) {
  const expected = createHmac('sha256', SCORE_SECRET)
    .update(`${name}:${score}`)
    .digest('hex')
    .slice(0, 16); // short hash is fine for this use case
  return token === expected;
}

function sanitizeName(name) {
  if (typeof name !== 'string') return '';
  // Strip non-alphanumeric (except spaces), trim, limit to 12 chars
  return name.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 12);
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

export default async function handler(req, res) {
  if (!SCORE_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const scores = await redis.zrange(LEADERBOARD_KEY, 0, MAX_ENTRIES - 1, { rev: true, withScores: true });

      // Upstash SDK returns [{member, score}, ...] when withScores: true
      const leaderboard = scores.map(entry => ({ name: entry.member, score: entry.score }));

      return res.status(200).json(leaderboard);
    }

    if (req.method === 'POST') {
      const { name, score, token } = req.body;

      // --- Validation ---
      const cleanName = sanitizeName(name);
      if (!cleanName) {
        return res.status(400).json({ error: 'Valid name required' });
      }

      if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) {
        return res.status(400).json({ error: 'Score must be a non-negative integer' });
      }

      if (score > MAX_SCORE) {
        return res.status(400).json({ error: 'Score exceeds maximum' });
      }

      // --- Token verification ---
      if (!verifyToken(cleanName, score, token)) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      // --- Rate limiting (per IP) ---
      const ip = getClientIP(req);
      const rateLimitKey = `pokemon-dodge:ratelimit:${ip}`;
      const existing = await redis.get(rateLimitKey);
      if (existing) {
        return res.status(429).json({ error: 'Too many submissions, try again later' });
      }
      await redis.set(rateLimitKey, '1', { ex: RATE_LIMIT_SECONDS });

      // --- Store score ---
      const member = `${cleanName}::${Date.now()}`;
      await redis.zadd(LEADERBOARD_KEY, { score, member });

      const count = await redis.zcard(LEADERBOARD_KEY);
      if (count > MAX_ENTRIES) {
        await redis.zremrangebyrank(LEADERBOARD_KEY, 0, count - MAX_ENTRIES - 1);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
