/** Best-run persistence in localStorage. */

const STORAGE_KEY = 'orbital-tetris.best';

export interface BestScore {
  readonly score: number;
  readonly level: number;
}

export const loadBest = (): BestScore | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<BestScore>;
    if (typeof parsed.score !== 'number' || typeof parsed.level !== 'number') {
      return null;
    }
    return { score: parsed.score, level: parsed.level };
  } catch {
    return null;
  }
};

/** Persist the run when it beats the record. Returns true on a new best. */
export const submitScore = (score: number, level: number): boolean => {
  if (score <= 0) {
    return false;
  }
  const best = loadBest();
  if (best && best.score >= score) {
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ score, level }));
  } catch {
    // Storage unavailable (private mode etc.) — still celebrate the best.
  }
  return true;
};
