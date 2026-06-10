/** One occupied cell of the polar grid. */
export interface GridCell {
  readonly color: string;
}

/** Polar grid indexed as [ring][sector]; null = empty. Ring 0 touches the core. */
export type Grid = (GridCell | null)[][];

/**
 * One cell of a tetromino on the polar lattice.
 * `s` = sector offset (tangential), `r` = ring offset (radial, outward).
 */
export interface PieceCell {
  readonly s: number;
  readonly r: number;
}

/** A tetromino shape definition. */
export interface PieceShape {
  readonly name: string;
  readonly cells: readonly PieceCell[];
  readonly color: string;
}

/** Difficulty parameters for one level. */
export interface LevelConfig {
  readonly level: number;
  readonly blockSpeed: number;
  readonly spawnIntervalMs: number;
  readonly maxConcurrent: number;
  /** Arc clears required to advance to the next level. */
  readonly clearsToAdvance: number;
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
