import { Actor, Vector, vec } from 'excalibur';
import { CENTER_X, CENTER_Y, RING_HEIGHT, SECTOR_ANGLE } from '../constants';
import { applyWedge, ringIndexForDistance } from './wedge';
import type { PieceCell, PieceShape } from '../types';

/**
 * A tetromino in flight toward the core. Every cell is rendered in the true
 * field polar frame — exactly in the lane it will lock into, at its true
 * radius, with the wedge sized for that radius. The piece arrives as a ring
 * chunk that shrinks as it converges, and attaches with zero visual snap.
 */
export interface FallingPiece {
  cells: PieceCell[];
  readonly color: string;
  /** Golden pieces score a multiplied lock bonus; bombs blast a patch instead of binding. */
  special?: 'golden' | 'bomb';
  /** World-space angle of the s=0 cell column (fixed — the core rotates, not the piece). */
  readonly anchorAngle: number;
  /**
   * Angle the piece is drawn at: tracks the center of its current landing
   * lane so the visual always matches where the piece will lock.
   */
  displayAngle: number;
  /** Distance of the r=0 cells from the field center. */
  anchorDist: number;
  readonly speed: number;
  /** Container at the field center; wedge cells are its children. */
  readonly root: Actor;
  /** Translucent preview of the exact cells the piece will lock into. */
  ghostActors: Actor[];
  /** Cache key of the current ghost placement — rebuild only when it changes. */
  ghostKey: string;
  /** Time spent resting on the surface — locks when it exceeds the grace window. */
  lockTimer: number;
  /** Hard drop requested: slam to the rest position and lock immediately. */
  hardDropped: boolean;
  trailTimer: number;
}

/** (Re)build one wedge child per cell — used on spawn and spin. */
export const rebuildPieceCells = (piece: FallingPiece): void => {
  for (const child of [...piece.root.children]) {
    piece.root.removeChild(child);
  }
  for (let i = 0; i < piece.cells.length; i++) {
    piece.root.addChild(new Actor({ z: 12 }));
  }
  positionPiece(piece);
};

/** Sync every wedge cell to its lane angle and current radius. */
export const positionPiece = (piece: FallingPiece): void => {
  piece.cells.forEach((cell, i) => {
    const child = piece.root.children[i];
    if (!(child instanceof Actor)) {
      return;
    }
    const dist = piece.anchorDist + cell.r * RING_HEIGHT;
    const angle = piece.displayAngle + cell.s * SECTOR_ANGLE;
    applyWedge(child, ringIndexForDistance(dist), angle, piece.color);
  });
};

/** Uniform opacity across the piece's wedge cells — lock-delay telegraph. */
export const setPieceOpacity = (piece: FallingPiece, opacity: number): void => {
  for (const child of piece.root.children) {
    if (child instanceof Actor) {
      child.graphics.opacity = opacity;
    }
  }
};

/** World positions of every cell — used for trails and lock effects. */
export const pieceCellWorldPositions = (piece: FallingPiece): Vector[] =>
  piece.root.children
    .filter((child): child is Actor => child instanceof Actor)
    .map((child) => child.globalPos.clone());

export const createFallingPiece = (
  shape: PieceShape,
  anchorAngle: number,
  anchorDist: number,
  speed: number
): FallingPiece => {
  const piece: FallingPiece = {
    cells: shape.cells.map((cell) => ({ ...cell })),
    color: shape.color,
    anchorAngle,
    displayAngle: anchorAngle,
    anchorDist,
    speed,
    root: new Actor({ pos: vec(CENTER_X, CENTER_Y), z: 12 }),
    ghostActors: [],
    ghostKey: '',
    lockTimer: 0,
    hardDropped: false,
    trailTimer: 0,
  };
  rebuildPieceCells(piece);
  return piece;
};
