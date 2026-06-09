import { Actor, Circle, Color, Vector, vec } from 'excalibur';
import { BLOCK_RADIUS, CENTER_X, CENTER_Y } from '../constants';

/** A circular tetris block traveling radially from the field edge toward the core. */
export interface IncomingBlock {
  readonly actor: Actor;
  /** World-space angle of its radial path (fixed — the core rotates, not the block). */
  readonly angle: number;
  /** Current distance from the field center. */
  dist: number;
  readonly speed: number;
  readonly color: string;
  trailTimer: number;
}

export const blockWorldPos = (angle: number, dist: number): Vector =>
  vec(CENTER_X + Math.cos(angle) * dist, CENTER_Y + Math.sin(angle) * dist);

export const createIncomingBlock = (
  angle: number,
  dist: number,
  speed: number,
  color: string
): IncomingBlock => {
  const actor = new Actor({ pos: blockWorldPos(angle, dist), z: 12 });

  const glow = new Actor({ z: 11 });
  glow.graphics.use(new Circle({ radius: BLOCK_RADIUS * 1.9, color: Color.fromHex(color) }));
  glow.graphics.opacity = 0.22;
  actor.addChild(glow);

  actor.graphics.use(
    new Circle({
      radius: BLOCK_RADIUS,
      color: Color.fromHex(color),
      strokeColor: Color.White,
      lineWidth: 1.5,
    })
  );

  return { actor, angle, dist, speed, color, trailTimer: 0 };
};
