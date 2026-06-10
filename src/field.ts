import { Actor, Engine, Keys, Scene, Vector, vec } from 'excalibur';
import {
  BIND_TWEEN_MS,
  CENTER_X,
  CENTER_Y,
  COLOR_WARNING,
  CORE_RADIUS,
  DEMO_ROTATION_FACTOR,
  MAX_RINGS,
  RING_HEIGHT,
  ROTATION_SPEED,
  SCORE_PER_PIECE,
  SCORE_PER_RING,
  SECTOR_ANGLE,
  SECTOR_COUNT,
  SPAWN_RADIUS,
  TRAIL_INTERVAL_MS,
} from './constants';
import { createBackground } from './actors/background';
import { createCoreVisual } from './actors/core';
import {
  createFallingPiece,
  positionPiece,
  type FallingPiece,
} from './actors/piece';
import { createBoundWedge } from './actors/wedge';
import { createParticleSystem } from './fx/particles';
import {
  cellAt,
  clearRings,
  createGrid,
  findFullRings,
  lockCells,
  sectorAtAngle,
  surfaceRing,
  type LockCell,
} from './grid';
import { randomShape, rotateCells, computeEdges } from './pieces';
import type { Grid, LevelConfig, PieceCell } from './types';

export interface FieldOptions {
  /** Demo fields auto-rotate, aim at the emptiest sectors and never end the game. */
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
  /** Spin the falling piece closest to the core by 90°. */
  rotateActivePiece(): void;
  readonly score: number;
}

interface BindTween {
  readonly actor: Actor;
  t: number;
}

export const createField = (scene: Scene, opts: FieldOptions): Field => {
  const background = createBackground(scene);
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
  let pieces: FallingPiece[] = [];
  let bindTweens: BindTween[] = [];

  const worldBoundPos = (ring: number, sector: number): Vector => {
    const local = Vector.fromAngle((sector + 0.5) * SECTOR_ANGLE).scale(
      CORE_RADIUS + (ring + 0.5) * RING_HEIGHT
    );
    return vec(CENTER_X, CENTER_Y).add(local.rotate(coreAngle));
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
          core.boundLayer.addChild(createBoundWedge(ring, sector, cell.color));
        }
      }
    }
    bindTweens = [];
  };

  const removePiece = (piece: FallingPiece): void => {
    for (const actor of [...piece.cellActors, ...piece.linkActors]) {
      actor.kill();
    }
    pieces = pieces.filter((other) => other !== piece);
  };

  /** Lock anchor ring for a set of piece cells facing the given base sector. */
  const lockRingFor = (cells: readonly PieceCell[], baseSector: number): number => {
    let lockRing = 0;
    for (const cell of cells) {
      const sector = (baseSector + cell.s) % SECTOR_COUNT;
      lockRing = Math.max(lockRing, surfaceRing(grid, sector) - cell.r);
    }
    return lockRing;
  };

  /** Demo pieces aim at the base sector minimizing landing height, leading the rotation. */
  const demoSpawnAngle = (cells: readonly PieceCell[]): number => {
    let bestBase = 0;
    let bestRing = Number.POSITIVE_INFINITY;
    for (let base = 0; base < SECTOR_COUNT; base++) {
      const ring = lockRingFor(cells, base);
      if (ring < bestRing) {
        bestRing = ring;
        bestBase = base;
      }
    }
    const landing = CORE_RADIUS + (bestRing + 0.5) * RING_HEIGHT;
    const fallTime = (SPAWN_RADIUS - landing) / config.blockSpeed;
    const drift = ROTATION_SPEED * DEMO_ROTATION_FACTOR * fallTime;
    return coreAngle + drift + (bestBase + 0.5) * SECTOR_ANGLE;
  };

  const spawnPiece = (): void => {
    const shape = randomShape();
    const angle = opts.demo ? demoSpawnAngle(shape.cells) : Math.random() * Math.PI * 2;
    const piece = createFallingPiece(shape, angle, SPAWN_RADIUS, config.blockSpeed);
    for (const actor of [...piece.cellActors, ...piece.linkActors]) {
      scene.add(actor);
    }
    pieces.push(piece);
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
    fx.shockwave(vec(CENTER_X, CENTER_Y), CORE_RADIUS + MAX_RINGS * RING_HEIGHT * 0.5, '#ffffff');
    grid = createGrid();
    rebuildBound();
  };

  const handleClears = (): void => {
    const full = findFullRings(grid);
    if (full.length === 0) {
      return;
    }
    for (const ring of full) {
      fx.shockwave(
        vec(CENTER_X, CENTER_Y),
        CORE_RADIUS + (ring + 0.5) * RING_HEIGHT,
        COLOR_WARNING
      );
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

  const lockPiece = (piece: FallingPiece, baseSector: number, lockRing: number): void => {
    const placements: LockCell[] = piece.cells.map((cell) => ({
      sector: (baseSector + cell.s) % SECTOR_COUNT,
      ring: lockRing + cell.r,
      color: piece.color,
    }));
    removePiece(piece);

    if (!lockCells(grid, placements)) {
      if (opts.demo) {
        explodeGrid();
        return;
      }
      over = true;
      opts.onGameOver?.(score);
      return;
    }

    for (const placement of placements) {
      const wedge = createBoundWedge(placement.ring, placement.sector, placement.color);
      wedge.scale = vec(1.5, 1.5);
      core.boundLayer.addChild(wedge);
      bindTweens.push({ actor: wedge, t: 0 });
      fx.burst(worldBoundPos(placement.ring, placement.sector), placement.color, 7);
    }
    score += SCORE_PER_PIECE;
    handleClears();
  };

  const rotateActivePiece = (): void => {
    if (over || paused || pieces.length === 0) {
      return;
    }
    const active = pieces.reduce((nearest, piece) =>
      piece.anchorDist < nearest.anchorDist ? piece : nearest
    );
    active.cells = rotateCells(active.cells);
    active.edges = computeEdges(active.cells);
    positionPiece(active);
  };

  const update = (engine: Engine, elapsedMs: number): void => {
    aliveTimer += elapsedMs;
    background.update(aliveTimer);
    core.update(aliveTimer);
    fx.update(elapsedMs);

    bindTweens = bindTweens.filter((tween) => {
      tween.t += elapsedMs;
      const progress = Math.min(tween.t / BIND_TWEEN_MS, 1);
      const scale = 1.5 - 0.5 * progress;
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
      if (
        engine.input.keyboard.wasPressed(Keys.Up) ||
        engine.input.keyboard.wasPressed(Keys.W) ||
        engine.input.keyboard.wasPressed(Keys.Space)
      ) {
        rotateActivePiece();
      }
    }
    const speed = opts.demo ? ROTATION_SPEED * DEMO_ROTATION_FACTOR : ROTATION_SPEED;
    coreAngle += dir * speed * dt;
    core.root.rotation = coreAngle;

    if (paused) {
      return;
    }

    spawnTimer += elapsedMs;
    const interval = pieces.length === 0 ? Math.min(config.spawnIntervalMs, 600) : config.spawnIntervalMs;
    if (spawnTimer >= interval && pieces.length < config.maxConcurrent) {
      spawnTimer = 0;
      spawnPiece();
    }

    for (const piece of [...pieces]) {
      piece.anchorDist -= piece.speed * dt;
      positionPiece(piece);
      piece.trailTimer += elapsedMs;
      if (piece.trailTimer > TRAIL_INTERVAL_MS) {
        piece.trailTimer = 0;
        for (const actor of piece.cellActors) {
          fx.trail(actor.pos.clone(), piece.color);
        }
      }
      const baseSector = sectorAtAngle(piece.anchorAngle, coreAngle);
      const lockRing = lockRingFor(piece.cells, baseSector);
      const restDist = CORE_RADIUS + (lockRing + 0.5) * RING_HEIGHT;
      if (piece.anchorDist <= restDist) {
        lockPiece(piece, baseSector, lockRing);
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
    for (const piece of [...pieces]) {
      removePiece(piece);
    }
    grid = createGrid();
    rebuildBound();
    fx.clear();
  };

  return {
    update,
    reset,
    rotateActivePiece,
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
