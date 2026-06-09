import { Actor, Canvas, Circle, Color, Vector, vec } from 'excalibur';
import {
  CENTER_X,
  CENTER_Y,
  COLOR_ACCENT,
  COLOR_CORE_FILL,
  COLOR_CORE_PULSE,
  COLOR_CORE_STROKE,
  CORE_RADIUS,
  FIELD_LIMIT_RADIUS,
  SECTOR_ANGLE,
  SECTOR_COUNT,
} from '../constants';

export interface CoreVisual {
  /** Rotates with the core angle; everything bound to the core is a child of this. */
  readonly root: Actor;
  /** Container for bound block actors (local polar coordinates). */
  readonly boundLayer: Actor;
  /** Drives the continuous "alive" effects: pulse, glow, orbiting motes. */
  update(tMs: number): void;
}

export const createCoreVisual = (): CoreVisual => {
  const root = new Actor({ pos: vec(CENTER_X, CENTER_Y), z: 5 });

  // Sector spokes + danger boundary, drawn once and rotated with the core.
  const size = FIELD_LIMIT_RADIUS * 2 + 8;
  const guides = new Actor({ z: 4 });
  guides.graphics.use(
    new Canvas({
      width: size,
      height: size,
      cache: true,
      draw: (ctx) => {
        const center = size / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1;
        for (let sector = 0; sector < SECTOR_COUNT; sector++) {
          const angle = sector * SECTOR_ANGLE;
          ctx.beginPath();
          ctx.moveTo(
            center + Math.cos(angle) * CORE_RADIUS,
            center + Math.sin(angle) * CORE_RADIUS
          );
          ctx.lineTo(
            center + Math.cos(angle) * FIELD_LIMIT_RADIUS,
            center + Math.sin(angle) * FIELD_LIMIT_RADIUS
          );
          ctx.stroke();
        }
        ctx.setLineDash([6, 10]);
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.35)';
        ctx.beginPath();
        ctx.arc(center, center, FIELD_LIMIT_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      },
    })
  );
  root.addChild(guides);

  const disc = new Actor({ z: 6 });
  disc.graphics.use(
    new Circle({
      radius: CORE_RADIUS,
      color: Color.fromHex(COLOR_CORE_FILL),
      strokeColor: Color.fromHex(COLOR_CORE_STROKE),
      lineWidth: 3,
    })
  );
  root.addChild(disc);

  const pulse = new Actor({ z: 7 });
  pulse.graphics.use(
    new Circle({ radius: CORE_RADIUS * 0.55, color: Color.fromHex(COLOR_CORE_PULSE) })
  );
  root.addChild(pulse);

  const motes: Actor[] = [];
  for (let i = 0; i < 3; i++) {
    const mote = new Actor({ z: 8 });
    mote.graphics.use(new Circle({ radius: 4, color: Color.fromHex(COLOR_ACCENT) }));
    root.addChild(mote);
    motes.push(mote);
  }

  const boundLayer = new Actor({ z: 9 });
  root.addChild(boundLayer);

  const update = (tMs: number): void => {
    const scale = 1 + 0.12 * Math.sin(tMs * 0.0025);
    pulse.scale = vec(scale, scale);
    pulse.graphics.opacity = 0.65 + 0.35 * Math.sin(tMs * 0.004);
    motes.forEach((mote, i) => {
      const angle = tMs * 0.0012 + (i * Math.PI * 2) / 3;
      mote.pos = Vector.fromAngle(angle).scale(CORE_RADIUS * 0.68);
    });
  };

  return { root, boundLayer, update };
};
