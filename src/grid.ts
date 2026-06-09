import { MAX_RINGS, SECTOR_ANGLE, SECTOR_COUNT } from './constants';
import type { Grid, GridCell } from './types';

export interface BindOutcome {
  /** Ring index the block landed on (== stack height before binding). */
  readonly ring: number;
  /** True when the block would land beyond the field limit: the run is lost. */
  readonly overflow: boolean;
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

/** Number of contiguous occupied rings in a sector, counted from the core outward. */
export const stackHeight = (grid: Grid, sector: number): number => {
  let height = 0;
  while (height < MAX_RINGS && cellAt(grid, height, sector) !== null) {
    height++;
  }
  return height;
};

/** Bind a block on top of a sector's stack. Reports overflow instead of writing past the limit. */
export const bindBlock = (grid: Grid, sector: number, color: string): BindOutcome => {
  const ring = stackHeight(grid, sector);
  if (ring >= MAX_RINGS) {
    return { ring, overflow: true };
  }
  setCell(grid, ring, sector, { color });
  return { ring, overflow: false };
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

/** Remove the given rings and collapse outer rings inward (classic line-clear gravity). */
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

/** Sector a world-space angle falls into, given the current core rotation. */
export const sectorAtAngle = (worldAngle: number, coreAngle: number): number =>
  Math.floor(normalizeAngle(worldAngle - coreAngle) / SECTOR_ANGLE) % SECTOR_COUNT;
