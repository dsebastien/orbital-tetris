import {
  Actor,
  Circle,
  Color,
  Font,
  FontUnit,
  Label,
  Rectangle,
  Scene,
  TextAlign,
  Vector,
  vec,
} from 'excalibur';
import { CENTER_X, CENTER_Y, FLASH_DURATION_MS, GAME_HEIGHT, GAME_WIDTH } from '../constants';

interface Particle {
  readonly actor: Actor;
  readonly vel: Vector;
  life: number;
  readonly maxLife: number;
  /** Scale growth per second — used by shockwaves. */
  readonly grow?: number;
  /** Starting opacity the fade-out scales from (default 1). */
  readonly baseOpacity?: number;
}

export interface ParticleSystem {
  /** Radial explosion of colored sparks (binding, ring clears, game over). */
  burst(pos: Vector, colorHex: string, count: number): void;
  /** Single fading dot left behind by a moving block. */
  trail(pos: Vector, colorHex: string): void;
  /** Floating score text. */
  popup(pos: Vector, text: string, colorHex: string): void;
  /** Expanding fading ring outline — ring clears and explosions. */
  shockwave(pos: Vector, radius: number, colorHex: string): void;
  /** Full-screen color flash fading out — full-ring clears. */
  flash(colorHex: string, opacity: number): void;
  update(elapsedMs: number): void;
  clear(): void;
}

export const createParticleSystem = (scene: Scene): ParticleSystem => {
  let particles: Particle[] = [];

  const track = (
    actor: Actor,
    vel: Vector,
    maxLife: number,
    extra?: { grow?: number; baseOpacity?: number }
  ): void => {
    scene.add(actor);
    particles.push({ actor, vel, life: 0, maxLife, ...extra });
  };

  const burst = (pos: Vector, colorHex: string, count: number): void => {
    for (let i = 0; i < count; i++) {
      const spark = new Actor({ pos: pos.clone(), z: 20 });
      spark.graphics.use(
        new Circle({ radius: 2 + Math.random() * 3, color: Color.fromHex(colorHex) })
      );
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 140;
      track(spark, Vector.fromAngle(angle).scale(speed), 350 + Math.random() * 350);
    }
  };

  const flash = (colorHex: string, opacity: number): void => {
    const overlay = new Actor({ pos: vec(CENTER_X, CENTER_Y), z: 55 });
    overlay.graphics.use(
      new Rectangle({ width: GAME_WIDTH, height: GAME_HEIGHT, color: Color.fromHex(colorHex) })
    );
    track(overlay, vec(0, 0), FLASH_DURATION_MS, { baseOpacity: opacity });
  };

  const trail = (pos: Vector, colorHex: string): void => {
    const dot = new Actor({ pos: pos.clone(), z: 8 });
    dot.graphics.use(
      new Circle({ radius: 3 + Math.random() * 2, color: Color.fromHex(colorHex) })
    );
    track(dot, vec(0, 0), 400);
  };

  const popup = (pos: Vector, text: string, colorHex: string): void => {
    const label = new Label({
      pos: pos.clone(),
      z: 30,
      text,
      font: new Font({
        family: 'monospace',
        size: 28,
        unit: FontUnit.Px,
        color: Color.fromHex(colorHex),
        textAlign: TextAlign.Center,
        bold: true,
      }),
    });
    track(label, vec(0, -50), 900);
  };

  const shockwave = (pos: Vector, radius: number, colorHex: string): void => {
    const ring = new Actor({ pos: pos.clone(), z: 25 });
    ring.graphics.use(
      new Circle({
        radius,
        color: Color.Transparent,
        strokeColor: Color.fromHex(colorHex),
        lineWidth: 4,
      })
    );
    track(ring, vec(0, 0), 600, { grow: 0.9 });
  };

  const update = (elapsedMs: number): void => {
    const dt = elapsedMs / 1000;
    particles = particles.filter((particle) => {
      particle.life += elapsedMs;
      if (particle.life >= particle.maxLife) {
        particle.actor.kill();
        return false;
      }
      particle.actor.pos = particle.actor.pos.add(particle.vel.scale(dt));
      particle.actor.graphics.opacity =
        (particle.baseOpacity ?? 1) * Math.max(0, 1 - particle.life / particle.maxLife);
      if (particle.grow !== undefined) {
        const scale = 1 + particle.grow * (particle.life / 1000);
        particle.actor.scale = vec(scale, scale);
      }
      return true;
    });
  };

  const clear = (): void => {
    for (const particle of particles) {
      particle.actor.kill();
    }
    particles = [];
  };

  return { burst, trail, popup, shockwave, flash, update, clear };
};
