import { Actor, Circle, Color, Engine, Keys, Scene, Vector, vec } from 'excalibur';
import {
  BIND_TWEEN_MS,
  BLOCK_COLORS,
  BLOCK_RADIUS,
  CENTER_X,
  CENTER_Y,
  COLOR_OUTLINE,
  COLOR_WARNING,
  CORE_RADIUS,
  DEMO_ROTATION_FACTOR,
  MAX_RINGS,
  RING_HEIGHT,
  ROTATION_SPEED,
  SCORE_PER_BIND,
  SCORE_PER_RING,
  SECTOR_ANGLE,
  SECTOR_COUNT,
  SPAWN_RADIUS,
  TRAIL_INTERVAL_MS,
} from './constants';
import { createCoreVisual } from './actors/core';
import { blockWorldPos, createIncomingBlock, type IncomingBlock } from './actors/block';
import { createParticleSystem } from './fx/particles';
import {
  bindBlock,
  cellAt,
  clearRings,
  createGrid,
  findFullRings,
  sectorAtAngle,
  stackHeight,
} from './grid';
import type { Grid, LevelConfig } from './types';

export interface FieldOptions {
  /** Demo fields auto-rotate, aim at the emptiest sector and never end the game. */
  readonly demo: boolean;
  readonly onGameOver?: (score: number) => void;
  readonly onRingsCleared?: (count: number, score: number) => void;
}

export interface Field {
  update(engine: Engine, elapsedMs: number): void;
  reset(config: LevelConfig, score: number): void;
  setConfig(config: LevelConfig): void;
  setPaused(paused: boolean): void;
  /** Touch input: -1 rotate left, 1 rotate right, 0 idle. Keyboard is read directly. */
  setRotationInput(dir: -1 | 0 | 1): void;
  readonly score: number;
}

interface BindTween {
  readonly actor: Actor;
  t: number;
}

export const createField = (scene: Scene, opts: FieldOptions): Field => {
  const core = createCoreVisual();
  scene.add(core.root);
  const fx = createParticleSystem(scene);

  let grid: Grid = createGrid();
  let config: LevelConfig = {
    level: 1,
    blockSpeed: 60,
    spawnIntervalMs: 2000,
    maxConcurrent: 1,
    ringsToClear: 2,
  };
  let coreAngle = 0;
  let score = 0;
  let paused = false;
  let over = false;
  let rotationInput: -1 | 0 | 1 = 0;
  let spawnTimer = 0;
  let aliveTimer = 0;
  let incoming: IncomingBlock[] = [];
  let bindTweens: BindTween[] = [];

  const localBoundPos = (ring: number, sector: number): Vector =>
    Vector.fromAngle((sector + 0.5) * SECTOR_ANGLE).scale(
      CORE_RADIUS + (ring + 0.5) * RING_HEIGHT
    );

  const worldBoundPos = (ring: number, sector: number): Vector =>
    vec(CENTER_X, CENTER_Y).add(localBoundPos(ring, sector).rotate(coreAngle));

  const makeBoundActor = (ring: number, sector: number, color: string): Actor => {
    const bound = new Actor({ pos: localBoundPos(ring, sector), z: 10 });
    bound.graphics.use(
      new Circle({
        radius: BLOCK_RADIUS,
        color: Color.fromHex(color),
        strokeColor: Color.fromHex(COLOR_OUTLINE),
        lineWidth: 2,
      })
    );
    return bound;
  };

  const clearChildren = (parent: Actor): void => {
    for (const child of [...parent.children]) {
      parent.removeChild(child);
    }
  };

  const rebuildBound = (): void => {
    clearChildren(core.boundLayer);
    for (let ring = 0; ring < MAX_RINGS; ring++) {
      for (let sector = 0; sector < SECTOR_COUNT; sector++) {
        const cell = cellAt(grid, ring, sector);
        if (cell) {
          core.boundLayer.addChild(makeBoundActor(ring, sector, cell.color));
        }
      }
    }
    bindTweens = [];
  };

  const removeIncoming = (block: IncomingBlock): void => {
    block.actor.kill();
    incoming = incoming.filter((other) => other !== block);
  };

  /** Demo blocks aim at the emptiest sector, leading the slow auto-rotation. */
  const demoSpawnAngle = (): number => {
    let best = 0;
    let bestHeight = Number.POSITIVE_INFINITY;
    for (let sector = 0; sector < SECTOR_COUNT; sector++) {
      const height = stackHeight(grid, sector);
      if (height < bestHeight) {
        bestHeight = height;
        best = sector;
      }
    }
    const landing = CORE_RADIUS + bestHeight * RING_HEIGHT + BLOCK_RADIUS;
    const fallTime = (SPAWN_RADIUS - landing) / config.blockSpeed;
    const drift = ROTATION_SPEED * DEMO_ROTATION_FACTOR * fallTime;
    return coreAngle + drift + (best + 0.5) * SECTOR_ANGLE;
  };

  const spawnBlock = (): void => {
    const angle = opts.demo ? demoSpawnAngle() : Math.random() * Math.PI * 2;
    const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)] ?? '#ffffff';
    const block = createIncomingBlock(angle, SPAWN_RADIUS, config.blockSpeed, color);
    scene.add(block.actor);
    incoming.push(block);
  };

  /** Demo-only: blow up the whole construction instead of ending the game. */
  const explodeGrid = (): void => {
    for (let ring = 0; ring < MAX_RINGS; ring++) {
      for (let sector = 0; sector < SECTOR_COUNT; sector++) {
        const cell = cellAt(grid, ring, sector);
        if (cell) {
          fx.burst(worldBoundPos(ring, sector), cell.color, 6);
        }
      }
    }
    grid = createGrid();
    rebuildBound();
  };

  const handleClears = (): void => {
    const full = findFullRings(grid);
    if (full.length === 0) {
      return;
    }
    for (const ring of full) {
      for (let sector = 0; sector < SECTOR_COUNT; sector++) {
        const cell = cellAt(grid, ring, sector);
        if (cell) {
          fx.burst(worldBoundPos(ring, sector), cell.color, 10);
        }
      }
    }
    clearRings(grid, full);
    rebuildBound();
    const gained = SCORE_PER_RING * full.length * full.length;
    score += gained;
    fx.popup(vec(CENTER_X, CENTER_Y - CORE_RADIUS - 40), `+${gained}`, COLOR_WARNING);
    opts.onRingsCleared?.(full.length, score);
  };

  const bindIncoming = (block: IncomingBlock, sector: number): void => {
    const outcome = bindBlock(grid, sector, block.color);
    removeIncoming(block);
    if (outcome.overflow) {
      if (opts.demo) {
        explodeGrid();
        return;
      }
      over = true;
      opts.onGameOver?.(score);
      return;
    }
    score += SCORE_PER_BIND;
    const bound = makeBoundActor(outcome.ring, sector, block.color);
    bound.scale = vec(1.7, 1.7);
    core.boundLayer.addChild(bound);
    bindTweens.push({ actor: bound, t: 0 });
    fx.burst(worldBoundPos(outcome.ring, sector), block.color, 8);
    handleClears();
  };

  const update = (engine: Engine, elapsedMs: number): void => {
    aliveTimer += elapsedMs;
    core.update(aliveTimer);
    fx.update(elapsedMs);

    bindTweens = bindTweens.filter((tween) => {
      tween.t += elapsedMs;
      const progress = Math.min(tween.t / BIND_TWEEN_MS, 1);
      const scale = 1.7 - 0.7 * progress;
      tween.actor.scale = vec(scale, scale);
      return progress < 1;
    });

    if (over) {
      return;
    }

    const dt = elapsedMs / 1000;
    let dir: -1 | 0 | 1 = rotationInput;
    if (opts.demo) {
      dir = 1;
    } else {
      if (engine.input.keyboard.isHeld(Keys.Left) || engine.input.keyboard.isHeld(Keys.A)) {
        dir = -1;
      } else if (
        engine.input.keyboard.isHeld(Keys.Right) ||
        engine.input.keyboard.isHeld(Keys.D)
      ) {
        dir = 1;
      }
    }
    const speed = opts.demo ? ROTATION_SPEED * DEMO_ROTATION_FACTOR : ROTATION_SPEED;
    coreAngle += dir * speed * dt;
    core.root.rotation = coreAngle;

    if (paused) {
      return;
    }

    spawnTimer += elapsedMs;
    if (spawnTimer >= config.spawnIntervalMs && incoming.length < config.maxConcurrent) {
      spawnTimer = 0;
      spawnBlock();
    }

    for (const block of [...incoming]) {
      block.dist -= block.speed * dt;
      block.actor.pos = blockWorldPos(block.angle, block.dist);
      block.trailTimer += elapsedMs;
      if (block.trailTimer > TRAIL_INTERVAL_MS) {
        block.trailTimer = 0;
        fx.trail(block.actor.pos.clone(), block.color);
      }
      const sector = sectorAtAngle(block.angle, coreAngle);
      const landing = CORE_RADIUS + stackHeight(grid, sector) * RING_HEIGHT + BLOCK_RADIUS;
      if (block.dist <= landing) {
        bindIncoming(block, sector);
      }
    }
  };

  const reset = (newConfig: LevelConfig, startScore: number): void => {
    config = newConfig;
    score = startScore;
    over = false;
    paused = false;
    rotationInput = 0;
    spawnTimer = 0;
    coreAngle = 0;
    core.root.rotation = 0;
    for (const block of [...incoming]) {
      removeIncoming(block);
    }
    grid = createGrid();
    rebuildBound();
    fx.clear();
  };

  return {
    update,
    reset,
    setConfig: (newConfig: LevelConfig): void => {
      config = newConfig;
    },
    setPaused: (value: boolean): void => {
      paused = value;
    },
    setRotationInput: (dir: -1 | 0 | 1): void => {
      rotationInput = dir;
    },
    get score(): number {
      return score;
    },
  };
};
