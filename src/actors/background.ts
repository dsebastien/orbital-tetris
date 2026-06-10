import { Actor, Scene, vec } from 'excalibur';
import { CENTER_X, CENTER_Y, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { crispCanvas } from '../fx/canvas';

export interface Background {
  /** Drives the twinkle and the counter-rotation parallax of the star layers. */
  update(tMs: number, coreAngle?: number): void;
}

/** Deterministic PRNG so the starfield is identical every run (mulberry32). */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const NEBULAE: readonly (readonly [number, number, number, string])[] = [
  [190, 170, 280, '76, 201, 240'],
  [630, 560, 320, '199, 125, 255'],
  [430, 680, 230, '247, 37, 133'],
  [680, 150, 240, '72, 149, 239'],
];

const drawStars = (ctx: CanvasRenderingContext2D, seed: number, count: number): void => {
  const rand = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rand() * GAME_WIDTH;
    const y = rand() * GAME_HEIGHT;
    const radius = 0.4 + rand() * 1.3;
    const alpha = 0.25 + rand() * 0.6;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
};

export const createBackground = (scene: Scene): Background => {
  const center = vec(CENTER_X, CENTER_Y);

  const deep = new Actor({ pos: center, z: 0 });
  deep.graphics.use(
    crispCanvas(GAME_WIDTH, GAME_HEIGHT, (ctx) => {
      for (const [x, y, radius, rgb] of NEBULAE) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${rgb}, 0.12)`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }
      drawStars(ctx, 42, 150);
    })
  );
  scene.add(deep);

  const twinkle = new Actor({ pos: center, z: 1 });
  twinkle.graphics.use(crispCanvas(GAME_WIDTH, GAME_HEIGHT, (ctx) => drawStars(ctx, 1337, 70)));
  scene.add(twinkle);

  const vignette = new Actor({ pos: center, z: 35 });
  vignette.graphics.use(
    crispCanvas(GAME_WIDTH, GAME_HEIGHT, (ctx) => {
      const gradient = ctx.createRadialGradient(
        CENTER_X,
        CENTER_Y,
        GAME_WIDTH * 0.32,
        CENTER_X,
        CENTER_Y,
        GAME_WIDTH * 0.74
      );
      gradient.addColorStop(0, 'rgba(4, 6, 16, 0)');
      gradient.addColorStop(1, 'rgba(4, 6, 16, 0.5)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    })
  );
  scene.add(vignette);

  return {
    update: (tMs: number, coreAngle = 0): void => {
      twinkle.graphics.opacity = 0.45 + 0.35 * Math.sin(tMs * 0.0017);
      // Stars drift against the core's rotation — parallax depth, the far
      // layer slower than the near one. Corners are masked by the vignette.
      deep.rotation = -coreAngle * 0.05;
      twinkle.rotation = -coreAngle * 0.11;
    },
  };
};
