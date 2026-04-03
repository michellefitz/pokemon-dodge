import { kv } from '@vercel/kv';

const LEADERBOARD_KEY = 'pokemon-dodge:leaderboard';
const MAX_ENTRIES = 50;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get top scores (highest first)
      const scores = await kv.zrange(LEADERBOARD_KEY, 0, MAX_ENTRIES - 1, { rev: true, withScores: true });

      // scores comes as [member, score, member, score, ...]
      const leaderboard = [];
      for (let i = 0; i < scores.length; i += 2) {
        leaderboard.push({ name: scores[i], score: scores[i + 1] });
      }

      return res.status(200).json(leaderboard);
    }

    if (req.method === 'POST') {
      const { name, score } = req.body;

      if (!name || typeof score !== 'number') {
        return res.status(400).json({ error: 'name and score required' });
      }

      // Use name + timestamp as member to allow duplicate names with different scores
      const member = `${name}::${Date.now()}`;
      await kv.zadd(LEADERBOARD_KEY, { score, member });

      // Trim to keep only top entries
      const count = await kv.zcard(LEADERBOARD_KEY);
      if (count > MAX_ENTRIES) {
        await kv.zremrangebyrank(LEADERBOARD_KEY, 0, count - MAX_ENTRIES - 1);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
