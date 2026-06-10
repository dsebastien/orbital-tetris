import { Actor, Canvas, Vector } from 'excalibur';
import {
  CORE_RADIUS,
  RING_HEIGHT,
  SECTOR_ANGLE,
  WEDGE_GAP_ANGULAR,
  WEDGE_GAP_RADIAL,
} from '../constants';
import { shade, withAlpha } from '../fx/palette';
import type { PieceCell } from '../types';

const PAD = 4;

/** Ring used to shape the wedges of a piece in flight (mid-field curvature). */
export const PIECE_VIRTUAL_RING = 2;
/** Distance from a piece's virtual circle center to its r=0 cell centers. */
export const PIECE_VIRTUAL_MID = CORE_RADIUS + (PIECE_VIRTUAL_RING + 0.5) * RING_HEIGHT;

interface WedgeGeometry {
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly halfAngle: number;
  readonly xMin: number;
  readonly xMax: number;
}

const geometryFor = (ring: number): WedgeGeometry => {
  const innerRadius = CORE_RADIUS + ring * RING_HEIGHT + WEDGE_GAP_RADIAL;
  const outerRadius = CORE_RADIUS + (ring + 1) * RING_HEIGHT - WEDGE_GAP_RADIAL;
  const halfAngle = SECTOR_ANGLE / 2 - WEDGE_GAP_ANGULAR;
  return {
    innerRadius,
    outerRadius,
    halfAngle,
    xMin: innerRadius * Math.cos(halfAngle),
    xMax: outerRadius,
  };
};

// Wedge bitmaps only depend on (ring, color): cache and share them.
const wedgeCache = new Map<string, Canvas>();

const wedgeGraphic = (ring: number, colorHex: string): Canvas => {
  const key = `${ring}|${colorHex}`;
  const cached = wedgeCache.get(key);
  if (cached) {
    return cached;
  }

  const geo = geometryFor(ring);
  const width = Math.ceil(geo.xMax - geo.xMin) + PAD * 2;
  const height = Math.ceil(2 * geo.outerRadius * Math.sin(geo.halfAngle)) + PAD * 2;

  const canvas = new Canvas({
    width,
    height,
    cache: true,
    draw: (ctx) => {
      ctx.save();
      // Place the (virtual) circle center left of the canvas so the wedge,
      // pointing along +X, lands inside the bitmap.
      ctx.translate(PAD - geo.xMin, height / 2);
      ctx.beginPath();
      ctx.arc(0, 0, geo.outerRadius, -geo.halfAngle, geo.halfAngle);
      ctx.arc(0, 0, geo.innerRadius, geo.halfAngle, -geo.halfAngle, true);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(0, 0, geo.innerRadius, 0, 0, geo.outerRadius);
      gradient.addColorStop(0, shade(colorHex, -0.45));
      gradient.addColorStop(0.55, colorHex);
      gradient.addColorStop(1, shade(colorHex, 0.25));
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = withAlpha('#ffffff', 0.35);
      ctx.stroke();
      ctx.restore();
    },
  });
  wedgeCache.set(key, canvas);
  return canvas;
};

/** A wedge cell positioned in a polar frame (parent provides the circle center). */
const wedgeActor = (ring: number, midAngle: number, colorHex: string, z: number): Actor => {
  const geo = geometryFor(ring);
  const wedge = new Actor({
    pos: Vector.fromAngle(midAngle).scale((geo.xMin + geo.xMax) / 2),
    rotation: midAngle,
    z,
  });
  wedge.graphics.use(wedgeGraphic(ring, colorHex));
  return wedge;
};

/**
 * A bound cell rendered as a ring segment that tiles the circle.
 * Positioned in the core's local frame (parent = bound layer).
 */
export const createBoundWedge = (ring: number, sector: number, colorHex: string): Actor =>
  wedgeActor(ring, (sector + 0.5) * SECTOR_ANGLE, colorHex, 10);

/**
 * One cell of a tetromino in flight, shaped exactly like the bound wedges so
 * the piece reads as a rounded tetromino from the moment it spawns.
 * Positioned in the piece's local frame (parent = piece root at the virtual center).
 */
export const createPieceCellWedge = (cell: PieceCell, colorHex: string): Actor =>
  wedgeActor(cell.r + PIECE_VIRTUAL_RING, cell.s * SECTOR_ANGLE, colorHex, 12);
