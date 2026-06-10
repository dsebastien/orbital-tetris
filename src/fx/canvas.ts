import { Canvas } from 'excalibur';

/** Raster quality multiplier for canvas-drawn art (wedges, core, background). */
const CRISP_QUALITY = 2;

/**
 * A cached Canvas graphic rasterized at double quality, so vector art stays
 * crisp when the engine renders at high pixel ratios. The draw callback works
 * in logical pixels — coordinates are unchanged.
 */
export const crispCanvas = (
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): Canvas =>
  new Canvas({
    width,
    height,
    cache: true,
    quality: CRISP_QUALITY,
    draw,
  });
