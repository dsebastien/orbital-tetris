import { Actor, Vector, vec } from 'excalibur';
import { CENTER_X, CENTER_Y } from '../constants';
import { createPieceCellWedge, PIECE_VIRTUAL_MID } from './wedge';
import type { PieceCell, PieceShape } from '../types';

/**
 * A tetromino in flight toward the core. Rendered as a rigid chunk of wedge
 * cells (same look as the bound construction) curving with the circle, so the
 * exact shape is visible from the moment it spawns.
 */
export interface FallingPiece {
  cells: PieceCell[];
  readonly color: string;
  /** World-space angle of the s=0 cell column (fixed — the core rotates, not the piece). */
  readonly anchorAngle: number;
  /** Distance of the r=0 cells from the field center. */
  anchorDist: number;
  readonly speed: number;
  /** Sits at the piece's virtual circle center; wedge cells are its children. */
  readonly root: Actor;
  trailTimer: number;
}

/** (Re)build the wedge children from the current cell layout — used on spawn and spin. */
export const rebuildPieceCells = (piece: FallingPiece): void => {
  for (const child of [...piece.root.children]) {
    piece.root.removeChild(child);
  }
  for (const cell of piece.cells) {
    piece.root.addChild(createPieceCellWedge(cell, piece.color));
  }
};

/**
 * Place the piece: the root sits PIECE_VIRTUAL_MID behind the r=0 cells along
 * the radial path, so the wedge children (positioned on the virtual circle)
 * appear exactly at anchorDist, curving the same way the field does.
 */
export const positionPiece = (piece: FallingPiece): void => {
  const rootDist = piece.anchorDist - PIECE_VIRTUAL_MID;
  piece.root.pos = vec(
    CENTER_X + Math.cos(piece.anchorAngle) * rootDist,
    CENTER_Y + Math.sin(piece.anchorAngle) * rootDist
  );
  piece.root.rotation = piece.anchorAngle;
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
    anchorDist,
    speed,
    root: new Actor({ z: 12 }),
    trailTimer: 0,
  };
  rebuildPieceCells(piece);
  positionPiece(piece);
  return piece;
};
