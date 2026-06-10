import { MAX_RINGS, SECTOR_ANGLE, SECTOR_COUNT } from './constants';
import type { Grid, GridCell } from './types';

/** One cell of a piece resolved to absolute grid coordinates, ready to lock. */
export interface LockCell {
  readonly sector: number;
  readonly ring: number;
  readonly color: string;
}

export const createGrid = (): Grid =>
  Array.from({ length: MAX_RINGS }, () => Array<GridCell | null>(SECTOR_COUNT).fill(null));

export const cellAt = (grid: Grid, ring: number, sector: number): GridCell | null =>
  grid[ring]?.[sector] ?? null;

const setCell = (grid: Grid, ring: number, sector: number, cell: GridCell | null): void => {
  const row = grid[ring];
  if (row) {
    row[sector] = cell;
  }
};

/**
 * First free ring above the topmost occupied cell of a sector.
 * Unlike a contiguous stack height, this respects holes left by overhangs:
 * a falling piece always rests on TOP of whatever a sector already holds.
 */
export const surfaceRing = (grid: Grid, sector: number): number => {
  let top = -1;
  for (let ring = 0; ring < MAX_RINGS; ring++) {
    if (cellAt(grid, ring, sector) !== null) {
      top = ring;
    }
  }
  return top + 1;
};

/**
 * Write a whole piece into the grid. Returns false (writing nothing) when any
 * cell would land beyond the field limit — that is the game-over condition.
 */
export const lockCells = (grid: Grid, cells: readonly LockCell[]): boolean => {
  if (cells.some((cell) => cell.ring >= MAX_RINGS)) {
    return false;
  }
  for (const cell of cells) {
    setCell(grid, cell.ring, cell.sector, { color: cell.color });
  }
  return true;
};

/** Rings fully occupied across every sector — the "correctly assembled" condition. */
export const findFullRings = (grid: Grid): number[] => {
  const full: number[] = [];
  for (let ring = 0; ring < MAX_RINGS; ring++) {
    let isFull = true;
    for (let sector = 0; sector < SECTOR_COUNT; sector++) {
      if (cellAt(grid, ring, sector) === null) {
        isFull = false;
        break;
      }
    }
    if (isFull) {
      full.push(ring);
    }
  }
  return full;
};

/** Remove the given rings and collapse outer rings inward, preserving holes. */
export const clearRings = (grid: Grid, rings: readonly number[]): void => {
  const toClear = new Set(rings);
  for (let sector = 0; sector < SECTOR_COUNT; sector++) {
    const remaining: (GridCell | null)[] = [];
    for (let ring = 0; ring < MAX_RINGS; ring++) {
      if (!toClear.has(ring)) {
        remaining.push(cellAt(grid, ring, sector));
      }
    }
    for (let ring = 0; ring < MAX_RINGS; ring++) {
      setCell(grid, ring, sector, remaining[ring] ?? null);
    }
  }
};

export const normalizeAngle = (angle: number): number => {
  const tau = Math.PI * 2;
  return ((angle % tau) + tau) % tau;
};

/** Signed shortest rotation from one angle to another, in (-PI, PI]. */
export const shortestAngleDelta = (from: number, to: number): number => {
  const tau = Math.PI * 2;
  return ((to - from + Math.PI) % tau + tau) % tau - Math.PI;
};

/** Sector a world-space angle falls into, given the current core rotation. */
export const sectorAtAngle = (worldAngle: number, coreAngle: number): number =>
  Math.floor(normalizeAngle(worldAngle - coreAngle) / SECTOR_ANGLE) % SECTOR_COUNT;
