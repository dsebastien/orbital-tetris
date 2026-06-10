import {
  BASE_BLOCK_SPEED,
  BASE_SPAWN_INTERVAL_MS,
  MAX_BLOCK_SPEED,
  MAX_LEVEL,
  MIN_SPAWN_INTERVAL_MS,
  SPAWN_INTERVAL_DECREMENT_MS,
  SPEED_INCREMENT_PER_LEVEL,
} from './constants';
import type { LevelConfig } from './types';

/**
 * Difficulty curve for the 100 levels: faster blocks, shorter spawn intervals,
 * more concurrent blocks, and more rings required as levels go up.
 * Speed is fixed within a level — it only increments when a new level starts.
 */
export const getLevelConfig = (level: number): LevelConfig => {
  const clamped = Math.min(Math.max(Math.floor(level), 1), MAX_LEVEL);
  return {
    level: clamped,
    blockSpeed: Math.min(
      BASE_BLOCK_SPEED + (clamped - 1) * SPEED_INCREMENT_PER_LEVEL,
      MAX_BLOCK_SPEED
    ),
    spawnIntervalMs: Math.max(
      BASE_SPAWN_INTERVAL_MS - (clamped - 1) * SPAWN_INTERVAL_DECREMENT_MS,
      MIN_SPAWN_INTERVAL_MS
    ),
    maxConcurrent: Math.min(1 + Math.floor(clamped / 12), 4),
    ringsToClear: Math.min(1 + Math.ceil(clamped / 10), 8),
  };
};
