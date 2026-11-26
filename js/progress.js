// Saves unlocked levels and best scores in this browser (localStorage).
// Storage can be unavailable (private mode), so everything falls back to
// an in-memory copy and the game still works for the current visit.

const KEY = 'draw-the-world/progress/v1';
const fresh = () => ({ unlocked: [1], best: {}, passed: {}, attempts: {} });
let memory = null;

export function load() {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    memory = raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
  } catch {
    memory = fresh();
  }
  if (!memory.unlocked.includes(1)) memory.unlocked.push(1);
  return memory;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* keep in memory */ }
}

export const isUnlocked = (id) => load().unlocked.includes(Number(id));
export const bestScore = (id) => load().best[id] ?? null;
export const hasPassed = (id) => !!load().passed[id];

export function unlock(id) {
  const p = load();
  if (!p.unlocked.includes(Number(id))) { p.unlocked.push(Number(id)); save(); }
}

// Records an attempt. Returns { isNewBest, previousBest }.
export function recordScore(id, score, passScore) {
  const p = load();
  const previousBest = p.best[id] ?? null;
  p.attempts[id] = (p.attempts[id] ?? 0) + 1;
  const isNewBest = previousBest === null || score > previousBest;
  if (isNewBest) p.best[id] = score;
  if (score >= passScore) { p.passed[id] = true; unlock(Number(id) + 1); }
  save();
  return { isNewBest, previousBest };
}

export function starsFor(score) {
  if (score == null || score < 80) return 0;
  if (score >= 95) return 3;
  if (score >= 88) return 2;
  return 1;
}

export function totalStars() {
  return Object.values(load().best).reduce((n, s) => n + starsFor(s), 0);
}

export function reset() {
  memory = fresh();
  save();
}
