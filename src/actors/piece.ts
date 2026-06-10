import { Actor, Canvas, Circle, Color, Vector, vec } from 'excalibur';
import {
  BLOCK_RADIUS,
  CENTER_X,
  CENTER_Y,
  LINK_DOT_RADIUS,
  RING_HEIGHT,
  SECTOR_ANGLE,
} from '../constants';
import { shade, withAlpha } from '../fx/palette';
import { computeEdges } from '../pieces';
import type { PieceCell, PieceShape } from '../types';

/** A tetromino in flight toward the core. */
export interface FallingPiece {
  cells: PieceCell[];
  edges: [number, number][];
  readonly color: string;
  /** World-space angle of the s=0 cell column (fixed — the core rotates, not the piece). */
  readonly anchorAngle: number;
  /** Distance of the r=0 cells from the field center. */
  anchorDist: number;
  readonly speed: number;
  readonly cellActors: Actor[];
  readonly linkActors: Actor[];
  trailTimer: number;
}

// Orb bitmaps only depend on the color: cache and share them.
const orbCache = new Map<string, Canvas>();

const orbGraphic = (colorHex: string): Canvas => {
  const cached = orbCache.get(colorHex);
  if (cached) {
    return cached;
  }
  const glowRadius = BLOCK_RADIUS * 2.4;
  const size = Math.ceil(glowRadius * 2) + 2;
  const canvas = new Canvas({
    width: size,
    height: size,
    cache: true,
    draw: (ctx) => {
      ctx.save();
      ctx.translate(size / 2, size / 2);

      const glow = ctx.createRadialGradient(0, 0, BLOCK_RADIUS * 0.4, 0, 0, glowRadius);
      glow.addColorStop(0, withAlpha(colorHex, 0.4));
      glow.addColorStop(1, withAlpha(colorHex, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      const body = ctx.createRadialGradient(
        -BLOCK_RADIUS * 0.35,
        -BLOCK_RADIUS * 0.35,
        BLOCK_RADIUS * 0.15,
        0,
        0,
        BLOCK_RADIUS
      );
      body.addColorStop(0, shade(colorHex, 0.75));
      body.addColorStop(0.4, colorHex);
      body.addColorStop(1, shade(colorHex, -0.35));
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, BLOCK_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = withAlpha('#ffffff', 0.6);
      ctx.stroke();
      ctx.restore();
    },
  });
  orbCache.set(colorHex, canvas);
  return canvas;
};

export const cellWorldPos = (anchorAngle: number, anchorDist: number, cell: PieceCell): Vector => {
  const angle = anchorAngle + cell.s * SECTOR_ANGLE;
  const dist = anchorDist + cell.r * RING_HEIGHT;
  return vec(CENTER_X + Math.cos(angle) * dist, CENTER_Y + Math.sin(angle) * dist);
};

/** Sync every cell orb and link dot to the piece's current anchor. */
export const positionPiece = (piece: FallingPiece): void => {
  piece.cells.forEach((cell, i) => {
    const actor = piece.cellActors[i];
    if (actor) {
      actor.pos = cellWorldPos(piece.anchorAngle, piece.anchorDist, cell);
    }
  });
  piece.edges.forEach(([a, b], i) => {
    const link = piece.linkActors[i];
    const cellA = piece.cells[a];
    const cellB = piece.cells[b];
    if (link && cellA && cellB) {
      const posA = cellWorldPos(piece.anchorAngle, piece.anchorDist, cellA);
      const posB = cellWorldPos(piece.anchorAngle, piece.anchorDist, cellB);
      link.pos = posA.add(posB).scale(0.5);
    }
  });
};

export const createFallingPiece = (
  shape: PieceShape,
  anchorAngle: number,
  anchorDist: number,
  speed: number
): FallingPiece => {
  const cells = shape.cells.map((cell) => ({ ...cell }));
  const edges = computeEdges(cells);

  const cellActors = cells.map(() => {
    const orb = new Actor({ z: 12 });
    orb.graphics.use(orbGraphic(shape.color));
    return orb;
  });

  const linkActors = edges.map(() => {
    const link = new Actor({ z: 11 });
    link.graphics.use(new Circle({ radius: LINK_DOT_RADIUS, color: Color.fromHex(shape.color) }));
    link.graphics.opacity = 0.45;
    return link;
  });

  const piece: FallingPiece = {
    cells,
    edges,
    color: shape.color,
    anchorAngle,
    anchorDist,
    speed,
    cellActors,
    linkActors,
    trailTimer: 0,
  };
  positionPiece(piece);
  return piece;
};
