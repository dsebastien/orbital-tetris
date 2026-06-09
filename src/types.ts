/** One occupied cell of the polar grid. */
export interface GridCell {
  readonly color: string;
}

/** Polar grid indexed as [ring][sector]; null = empty. Ring 0 touches the core. */
export type Grid = (GridCell | null)[][];

/** Difficulty parameters for one level. */
export interface LevelConfig {
  readonly level: number;
  readonly blockSpeed: number;
  readonly spawnIntervalMs: number;
  readonly maxConcurrent: number;
  readonly ringsToClear: number;
}

/** Data passed when activating the game scene. */
export interface GameStartData {
  readonly level: number;
  readonly score: number;
}

/** Data passed when activating the game-over scene. */
export interface GameOverData {
  readonly score: number;
  readonly level: number;
}
