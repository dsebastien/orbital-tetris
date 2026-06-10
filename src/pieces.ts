import {
  PIECE_COLOR_I,
  PIECE_COLOR_J,
  PIECE_COLOR_L,
  PIECE_COLOR_O,
  PIECE_COLOR_S,
  PIECE_COLOR_T,
  PIECE_COLOR_Z,
} from './constants';
import type { PieceCell, PieceShape } from './types';

/**
 * The seven classic tetrominoes mapped onto the polar lattice:
 * sector offsets curve along the rings, ring offsets stack radially.
 */
export const TETROMINOES: readonly PieceShape[] = [
  {
    name: 'I',
    color: PIECE_COLOR_I,
    cells: [
      { s: 0, r: 0 },
      { s: 1, r: 0 },
      { s: 2, r: 0 },
      { s: 3, r: 0 },
    ],
  },
  {
    name: 'O',
    color: PIECE_COLOR_O,
    cells: [
      { s: 0, r: 0 },
      { s: 1, r: 0 },
      { s: 0, r: 1 },
      { s: 1, r: 1 },
    ],
  },
  {
    name: 'T',
    color: PIECE_COLOR_T,
    cells: [
      { s: 0, r: 0 },
      { s: 1, r: 0 },
      { s: 2, r: 0 },
      { s: 1, r: 1 },
    ],
  },
  {
    name: 'S',
    color: PIECE_COLOR_S,
    cells: [
      { s: 1, r: 0 },
      { s: 2, r: 0 },
      { s: 0, r: 1 },
      { s: 1, r: 1 },
    ],
  },
  {
    name: 'Z',
    color: PIECE_COLOR_Z,
    cells: [
      { s: 0, r: 0 },
      { s: 1, r: 0 },
      { s: 1, r: 1 },
      { s: 2, r: 1 },
    ],
  },
  {
    name: 'J',
    color: PIECE_COLOR_J,
    cells: [
      { s: 0, r: 0 },
      { s: 1, r: 0 },
      { s: 2, r: 0 },
      { s: 0, r: 1 },
    ],
  },
  {
    name: 'L',
    color: PIECE_COLOR_L,
    cells: [
      { s: 0, r: 0 },
      { s: 1, r: 0 },
      { s: 2, r: 0 },
      { s: 2, r: 1 },
    ],
  },
];

export const randomShape = (): PieceShape =>
  TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)] ?? TETROMINOES[0]!;

/** 7-bag randomizer: every tetromino appears once per bag — no droughts. */
export const createBag = (): (() => PieceShape) => {
  let bag: PieceShape[] = [];
  return () => {
    if (bag.length === 0) {
      bag = [...TETROMINOES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j]!, bag[i]!];
      }
    }
    return bag.pop() ?? TETROMINOES[0]!;
  };
};

/** Rotate a shape 90° on the lattice and normalize offsets back to >= 0. */
export const rotateCells = (cells: readonly PieceCell[]): PieceCell[] => {
  const rotated = cells.map((cell) => ({ s: cell.r, r: -cell.s }));
  const minS = Math.min(...rotated.map((cell) => cell.s));
  const minR = Math.min(...rotated.map((cell) => cell.r));
  return rotated.map((cell) => ({ s: cell.s - minS, r: cell.r - minR }));
};
