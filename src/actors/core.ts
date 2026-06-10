import { Actor, Canvas, Circle, Color, Vector, vec } from 'excalibur';
import {
  CENTER_X,
  CENTER_Y,
  COLOR_ACCENT,
  COLOR_CORE_FILL,
  COLOR_CORE_FILL_LIGHT,
  COLOR_CORE_PULSE,
  COLOR_CORE_STROKE,
  CORE_RADIUS,
  FIELD_LIMIT_RADIUS,
  MAX_RINGS,
  RING_HEIGHT,
  SECTOR_ANGLE,
  SECTOR_COUNT,
} from '../constants';
import { withAlpha } from '../fx/palette';

export interface CoreVisual {
  /** Rotates with the core angle; everything bound to the core is a child of this. */
  readonly root: Actor;
  /** Container for bound wedge actors (local polar coordinates). */
  readonly boundLayer: Actor;
  /** Drives the continuous "alive" effects: halo, pulse, spinner, orbiting motes. */
  update(tMs: number): void;
}

export const createCoreVisual = (): CoreVisual => {
  const root = new Actor({ pos: vec(CENTER_X, CENTER_Y), z: 5 });

  // Soft halo breathing behind everything.
  const haloRadius = CORE_RADIUS * 2.4;
  const halo = new Actor({ z: 3 });
  halo.graphics.use(
    new Canvas({
      width: haloRadius * 2,
      height: haloRadius * 2,
      cache: true,
      draw: (ctx) => {
        const gradient = ctx.createRadialGradient(
          haloRadius,
          haloRadius,
          CORE_RADIUS * 0.5,
          haloRadius,
          haloRadius,
          haloRadius
        );
        gradient.addColorStop(0, withAlpha(COLOR_ACCENT, 0.22));
        gradient.addColorStop(1, withAlpha(COLOR_ACCENT, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, haloRadius * 2, haloRadius * 2);
      },
    })
  );
  root.addChild(halo);

  // Sector spokes, ring circles and danger boundary, rotated with the core.
  const size = FIELD_LIMIT_RADIUS * 2 + 8;
  const guides = new Actor({ z: 4 });
  guides.graphics.use(
    new Canvas({
      width: size,
      height: size,
      cache: true,
      draw: (ctx) => {
        const center = size / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        for (let ring = 1; ring < MAX_RINGS; ring++) {
          ctx.beginPath();
          ctx.arc(center, center, CORE_RADIUS + ring * RING_HEIGHT, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([6, 10]);
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(center, center, FIELD_LIMIT_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      },
    })
  );
  root.addChild(guides);

  const disc = new Actor({ z: 6 });
  disc.graphics.use(
    new Canvas({
      width: CORE_RADIUS * 2 + 8,
      height: CORE_RADIUS * 2 + 8,
      cache: true,
      draw: (ctx) => {
        const center = CORE_RADIUS + 4;
        const gradient = ctx.createRadialGradient(
          center - CORE_RADIUS * 0.3,
          center - CORE_RADIUS * 0.3,
          CORE_RADIUS * 0.1,
          center,
          center,
          CORE_RADIUS
        );
        gradient.addColorStop(0, COLOR_CORE_FILL_LIGHT);
        gradient.addColorStop(1, COLOR_CORE_FILL);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, CORE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = COLOR_CORE_STROKE;
        ctx.stroke();
      },
    })
  );
  root.addChild(disc);

  const pulse = new Actor({ z: 7 });
  pulse.graphics.use(
    new Circle({ radius: CORE_RADIUS * 0.55, color: Color.fromHex(COLOR_CORE_PULSE) })
  );
  root.addChild(pulse);

  // Slowly counter-spinning dashed ring inside the core.
  const spinnerRadius = CORE_RADIUS * 0.78;
  const spinner = new Actor({ z: 8 });
  spinner.graphics.use(
    new Canvas({
      width: spinnerRadius * 2 + 6,
      height: spinnerRadius * 2 + 6,
      cache: true,
      draw: (ctx) => {
        const center = spinnerRadius + 3;
        ctx.setLineDash([10, 14]);
        ctx.strokeStyle = withAlpha(COLOR_ACCENT, 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center, center, spinnerRadius, 0, Math.PI * 2);
        ctx.stroke();
      },
    })
  );
  root.addChild(spinner);

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
    const pulseScale = 1 + 0.12 * Math.sin(tMs * 0.0025);
    pulse.scale = vec(pulseScale, pulseScale);
    pulse.graphics.opacity = 0.65 + 0.35 * Math.sin(tMs * 0.004);

    const haloScale = 1 + 0.06 * Math.sin(tMs * 0.0021);
    halo.scale = vec(haloScale, haloScale);

    spinner.rotation = -tMs * 0.0004;

    motes.forEach((mote, i) => {
      const angle = tMs * 0.0012 + (i * Math.PI * 2) / 3;
      mote.pos = Vector.fromAngle(angle).scale(CORE_RADIUS * 0.68);
    });
  };

  return { root, boundLayer, update };
};
