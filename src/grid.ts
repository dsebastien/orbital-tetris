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

/** A contiguous occupied arc within one ring, long enough to clear. */
export interface ClearableRun {
  readonly ring: number;
  readonly sectors: readonly number[];
  /** True when the run wraps the entire ring. */
  readonly fullRing: boolean;
}

/** Remove a single cell — bomb detonations. Holes are allowed by design. */
export const clearCell = (grid: Grid, ring: number, sector: number): void => {
  setCell(grid, ring, sector, null);
};

/**
 * Find every contiguous occupied arc of at least CLEAR_RUN_LENGTH cells —
 * the "correctly assembled" condition. Runs wrap around the circle; a fully
 * occupied ring counts as one full-ring run.
 */
export const findClearableRuns = (grid: Grid, minLength: number): ClearableRun[] => {
  const runs: ClearableRun[] = [];
  for (let ring = 0; ring < MAX_RINGS; ring++) {
    const occupied = (sector: number): boolean =>
      cellAt(grid, ring, ((sector % SECTOR_COUNT) + SECTOR_COUNT) % SECTOR_COUNT) !== null;

    let fullRing = true;
    for (let sector = 0; sector < SECTOR_COUNT; sector++) {
      if (!occupied(sector)) {
        fullRing = false;
        break;
      }
    }
    if (fullRing) {
      runs.push({
        ring,
        sectors: Array.from({ length: SECTOR_COUNT }, (_, sector) => sector),
        fullRing: true,
      });
      continue;
    }

    // Walk each maximal run exactly once: start only right after a gap.
    for (let start = 0; start < SECTOR_COUNT; start++) {
      if (!occupied(start) || occupied(start - 1)) {
        continue;
      }
      const sectors: number[] = [];
      let sector = start;
      while (occupied(sector) && sectors.length < SECTOR_COUNT) {
        sectors.push(((sector % SECTOR_COUNT) + SECTOR_COUNT) % SECTOR_COUNT);
        sector++;
      }
      if (sectors.length >= minLength) {
        runs.push({ ring, sectors, fullRing: false });
      }
    }
  }
  return runs;
};

/**
 * Remove the cells of the given runs and apply per-sector gravity: every cell
 * outward of a removed cell slides one ring inward (holes are preserved).
 */
export const clearRuns = (grid: Grid, runs: readonly ClearableRun[]): void => {
  const ringsBySector = new Map<number, Set<number>>();
  for (const run of runs) {
    for (const sector of run.sectors) {
      const rings = ringsBySector.get(sector) ?? new Set<number>();
      rings.add(run.ring);
      ringsBySector.set(sector, rings);
    }
  }
  for (const [sector, rings] of ringsBySector) {
    const remaining: (GridCell | null)[] = [];
    for (let ring = 0; ring < MAX_RINGS; ring++) {
      if (!rings.has(ring)) {
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
