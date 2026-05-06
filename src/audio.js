// ── Audio module ─────────────────────────────────────────────
// Call initAudio() on first user interaction.
// All sound functions are safe to call before init (they no-op).

let ctx = null;
let musicEl = null;
let muted = false;

export function initAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    musicEl = new Audio('/audio/background.mp3');
    musicEl.loop = true;
    musicEl.volume = 0.45;

    const source = ctx.createMediaElementSource(musicEl);
    source.connect(ctx.destination);

    musicEl.play().catch(() => {});
  }

  // iOS suspends AudioContext after native dialogs (e.g. prompt()) — always resume
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      if (musicEl && musicEl.paused && !muted) musicEl.play().catch(() => {});
    });
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (musicEl) musicEl.volume = muted ? 0 : 0.45;
  return muted;
}

// Short downward frequency sweep — fired every shot
export function playFireSound() {
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

  osc.start(now);
  osc.stop(now + 0.14);
}

// Low sawtooth thud — plays when player takes a hit
export function playHitSound() {
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(130, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
  gain.gain.setValueAtTime(0.32, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.start(now);
  osc.stop(now + 0.24);
}

// Short high pop — plays when a projectile destroys an enemy
export function playEnemyHitSound() {
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(380, now + 0.07);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.start(now);
  osc.stop(now + 0.1);
}

// Ascending 3-note arpeggio — plays on evolution
export function playEvolveSound() {
  if (!ctx || muted) return;
  const notes = [330, 415, 523]; // E4 → G#4 → C5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime + i * 0.18;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.start(t);
    osc.stop(t + 0.3);
  });
}
