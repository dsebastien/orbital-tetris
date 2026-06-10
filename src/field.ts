import { Actor, Circle, Color, Engine, Keys, Scene, Vector, vec } from 'excalibur';
import {
  BIND_TWEEN_MS,
  CASCADE_CHECK_DELAY_MS,
  CENTER_X,
  CENTER_Y,
  CLEAR_DYING_MS,
  CLEAR_RUN_LENGTH,
  COLLAPSE_DELAY_MS,
  COLLAPSE_SLIDE_MS,
  COLOR_ACCENT,
  COLOR_DANGER,
  COLOR_WARNING,
  COMBO_RESET_LOCKS,
  CORE_RADIUS,
  CORE_SNAP_SPEED,
  CORE_STEP_DAS_DELAY_MS,
  CORE_STEP_REPEAT_MS,
  DEMO_ROTATION_FACTOR,
  FLASH_FULL_RING_OPACITY,
  FULL_RING_MULTIPLIER,
  INNER_LOCK_DELAY_MS,
  INNER_RING_SLOW_FACTOR,
  INNER_SLOW_ZONE_RINGS,
  LOCK_DELAY_MS,
  MAX_RINGS,
  PIECE_ALIGN_SPEED,
  RING_HEIGHT,
  ROTATION_SPEED,
  SCORE_PER_CLEARED_CELL,
  SCORE_PER_PIECE,
  SECTOR_ANGLE,
  SECTOR_COUNT,
  SHAKE_CLEAR_MAG,
  SHAKE_CLEAR_MS,
  SHAKE_FULL_RING_MAG,
  SHAKE_FULL_RING_MS,
  SHAKE_HARD_DROP_MAG,
  SHAKE_HARD_DROP_MS,
  SOFT_DROP_LOCK_FACTOR,
  SOFT_DROP_SPEED_FACTOR,
  SPAWN_RADIUS,
  SPAWN_TELEGRAPH_MS,
  SWEEP_EPSILON,
  TRAIL_INTERVAL_MS,
} from './constants';
import { createBackground } from './actors/background';
import { createCoreVisual } from './actors/core';
import {
  createFallingPiece,
  pieceCellWorldPositions,
  positionPiece,
  rebuildPieceCells,
  type FallingPiece,
} from './actors/piece';
import { applyWedge, createBoundWedge, wedgeMidRadius } from './actors/wedge';
import { createParticleSystem } from './fx/particles';
import { sfx } from './fx/sound';
import {
  cellAt,
  clearRuns,
  createGrid,
  findClearableRuns,
  lockCells,
  sectorAtAngle,
  shortestAngleDelta,
  surfaceRing,
  type LockCell,
} from './grid';
import { createBag, randomShape, rotateCells } from './pieces';
import type { Grid, LevelConfig, PieceCell, PieceShape } from './types';

export interface FieldOptions {
  /** Demo fields auto-rotate, aim at the emptiest sectors and never end the game. */
  readonly demo: boolean;
  readonly onGameOver?: (score: number) => void;
  /** Called with the number of arcs cleared simultaneously. */
  readonly onClears?: (count: number, score: number) => void;
  /** Called whenever the upcoming piece changes (never in demo mode). */
  readonly onNextShape?: (shape: PieceShape) => void;
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

/** A cleared wedge flashing white, then shrinking and spinning away. */
interface DyingTween {
  readonly actor: Actor;
  readonly midAngle: number;
  t: number;
}

/** A surviving wedge sliding inward to fill the gap a clear left below it. */
interface CollapseTween {
  readonly actor: Actor;
  readonly sector: number;
  readonly fromRing: number;
  readonly toRing: number;
  readonly color: string;
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
    clearsToAdvance: 2,
  };
  let coreAngle = 0;
  let targetCoreAngle = 0;
  let lastStepDir: -1 | 0 | 1 = 0;
  let stepHoldTimer = 0;
  let score = 0;
  let paused = false;
  let over = false;
  let rotationInput: -1 | 0 | 1 = 0;
  let spawnTimer = 0;
  let aliveTimer = 0;
  /** Consecutive clearing locks; multiplies clear scores. */
  let combo = 0;
  let locksSinceClear = 0;
  /** Chain depth of collapse-triggered clears; multiplies clear scores. */
  let cascadeLevel = 0;
  /** Countdown to the post-collapse cascade re-check; -1 when idle. */
  let cascadeTimer = -1;
  let pieces: FallingPiece[] = [];
  let bindTweens: BindTween[] = [];
  let dyingTweens: DyingTween[] = [];
  let collapseTweens: CollapseTween[] = [];
  const drawFromBag = createBag();
  let nextShape: PieceShape = drawFromBag();
  /** Entry angle telegraphed by the rim marker before the next spawn. */
  let pendingAngle: number | null = null;
  let marker: Actor | null = null;

  const killMarker = (): void => {
    marker?.kill();
    marker = null;
  };

  const showMarker = (angle: number, colorHex: string): void => {
    killMarker();
    marker = new Actor({
      pos: vec(CENTER_X, CENTER_Y).add(Vector.fromAngle(angle).scale(SPAWN_RADIUS)),
      z: 14,
    });
    marker.graphics.use(new Circle({ radius: 7, color: Color.fromHex(colorHex) }));
    scene.add(marker);
  };

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

  /** Danger when any bound cell sits on the outermost ring. */
  const updateDanger = (): void => {
    let danger = false;
    for (let sector = 0; sector < SECTOR_COUNT && !danger; sector++) {
      danger = cellAt(grid, MAX_RINGS - 1, sector) !== null;
    }
    core.setDanger(danger);
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
    dyingTweens = [];
    collapseTweens = [];
    updateDanger();
  };

  /**
   * Rebuild after a clear with the collapse animated: cells that slid inward
   * start at their old ring and tween to their new one, and the cleared cells
   * leave white dying wedges behind. The grid itself is already final — only
   * the visuals catch up.
   */
  const rebuildBoundAnimated = (
    cleared: readonly { ring: number; sector: number; color: string }[],
    sliders: readonly { sector: number; fromRing: number; toRing: number }[]
  ): void => {
    bindTweens = [];
    dyingTweens = [];
    collapseTweens = [];
    const sliderFrom = new Map<string, number>();
    for (const slider of sliders) {
      sliderFrom.set(`${slider.toRing}|${slider.sector}`, slider.fromRing);
    }
    clearChildren(core.boundLayer);
    for (let ring = 0; ring < MAX_RINGS; ring++) {
      for (let sector = 0; sector < SECTOR_COUNT; sector++) {
        const cell = cellAt(grid, ring, sector);
        if (!cell) {
          continue;
        }
        const fromRing = sliderFrom.get(`${ring}|${sector}`);
        const wedge = createBoundWedge(fromRing ?? ring, sector, cell.color);
        core.boundLayer.addChild(wedge);
        if (fromRing !== undefined) {
          collapseTweens.push({ actor: wedge, sector, fromRing, toRing: ring, color: cell.color, t: 0 });
        }
      }
    }
    for (const cell of cleared) {
      const wedge = new Actor({ z: 11 });
      const midAngle = (cell.sector + 0.5) * SECTOR_ANGLE;
      applyWedge(wedge, cell.ring, midAngle, '#ffffff');
      core.boundLayer.addChild(wedge);
      dyingTweens.push({ actor: wedge, midAngle, t: 0 });
    }
    updateDanger();
  };

  const clearGhost = (piece: FallingPiece): void => {
    for (const ghost of piece.ghostActors) {
      core.ghostLayer.removeChild(ghost);
    }
    piece.ghostActors = [];
    piece.ghostKey = '';
  };

  /** Translucent preview of the exact cells the piece will lock into. */
  const updateGhost = (piece: FallingPiece, baseSector: number, lockRing: number): void => {
    const key = `${baseSector}|${lockRing}|${piece.cells.map((cell) => `${cell.s},${cell.r}`).join(';')}`;
    if (key === piece.ghostKey) {
      return;
    }
    for (const ghost of piece.ghostActors) {
      core.ghostLayer.removeChild(ghost);
    }
    piece.ghostActors = [];
    piece.ghostKey = key;
    const overflow = piece.cells.some((cell) => lockRing + cell.r >= MAX_RINGS);
    for (const cell of piece.cells) {
      const ring = lockRing + cell.r;
      if (ring >= MAX_RINGS) {
        continue;
      }
      const sector = (baseSector + cell.s) % SECTOR_COUNT;
      const ghost = createBoundWedge(ring, sector, overflow ? COLOR_DANGER : piece.color);
      ghost.z = 8;
      ghost.graphics.opacity = overflow ? 0.3 : 0.22;
      core.ghostLayer.addChild(ghost);
      piece.ghostActors.push(ghost);
    }
  };

  const removePiece = (piece: FallingPiece): void => {
    clearGhost(piece);
    piece.root.kill();
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

  /** Anchor distance where the given cells come to rest under a core angle. */
  const restDistFor = (cells: readonly PieceCell[], anchorAngle: number, coreTarget: number): number => {
    const baseSector = sectorAtAngle(anchorAngle, coreTarget);
    return CORE_RADIUS + (lockRingFor(cells, baseSector) + 0.5) * RING_HEIGHT;
  };

  /**
   * Step one lane, unless the construction would sweep through a piece that
   * is already deeper than the destination lane's surface. Pushing such a
   * piece back out would reset its lock timer — an infinite stall.
   */
  const tryStep = (dir: -1 | 1): void => {
    const nextAngle = targetCoreAngle + dir * SECTOR_ANGLE;
    const blocked = pieces.some(
      (piece) =>
        piece.anchorDist < restDistFor(piece.cells, piece.anchorAngle, nextAngle) - SWEEP_EPSILON
    );
    if (blocked) {
      return;
    }
    targetCoreAngle = nextAngle;
    sfx.step();
  };

  /** Demo pieces aim at the base sector minimizing landing height, leading the rotation. */
  const demoSpawnAngle = (cells: readonly PieceCell[]): number => {
    let bestRing = Number.POSITIVE_INFINITY;
    const rings: number[] = [];
    for (let base = 0; base < SECTOR_COUNT; base++) {
      const ring = lockRingFor(cells, base);
      rings.push(ring);
      bestRing = Math.min(bestRing, ring);
    }
    // Random pick among the tied-lowest bases, or pieces would pile on one sector.
    const candidates = rings.flatMap((ring, base) => (ring === bestRing ? [base] : []));
    const bestBase = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
    const landing = CORE_RADIUS + (bestRing + 0.5) * RING_HEIGHT;
    const fallTime = (SPAWN_RADIUS - landing) / config.blockSpeed;
    const drift = ROTATION_SPEED * DEMO_ROTATION_FACTOR * fallTime;
    return coreAngle + drift + (bestBase + 0.5) * SECTOR_ANGLE;
  };

  /**
   * World angle of the center of the lane the piece currently locks into.
   * The lane is decided by the stepped target angle (instant on input) while
   * the drawn angle follows the animated core, so piece and construction
   * glide together during a step.
   */
  const laneAngleFor = (piece: FallingPiece): number =>
    coreAngle + (sectorAtAngle(piece.anchorAngle, targetCoreAngle) + 0.5) * SECTOR_ANGLE;

  const spawnPiece = (): void => {
    const shape = opts.demo ? randomShape() : nextShape;
    const angle = opts.demo
      ? demoSpawnAngle(shape.cells)
      : pendingAngle ?? Math.random() * Math.PI * 2;
    const piece = createFallingPiece(shape, angle, SPAWN_RADIUS, config.blockSpeed);
    piece.displayAngle = laneAngleFor(piece);
    positionPiece(piece);
    scene.add(piece.root);
    pieces.push(piece);
    if (!opts.demo) {
      pendingAngle = null;
      killMarker();
      nextShape = drawFromBag();
      opts.onNextShape?.(nextShape);
    }
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

  /** Score and animate all clearable runs. Returns true when any cleared. */
  const handleClears = (): boolean => {
    const runs = findClearableRuns(grid, CLEAR_RUN_LENGTH);
    if (runs.length === 0) {
      return false;
    }
    let gained = 0;
    const cleared: { ring: number; sector: number; color: string }[] = [];
    const removedBySector = new Map<number, number[]>();
    for (const run of runs) {
      fx.shockwave(
        vec(CENTER_X, CENTER_Y),
        CORE_RADIUS + (run.ring + 0.5) * RING_HEIGHT,
        COLOR_WARNING
      );
      for (const sector of run.sectors) {
        const cell = cellAt(grid, run.ring, sector);
        if (cell) {
          fx.burst(worldBoundPos(run.ring, sector), cell.color, 10);
          cleared.push({ ring: run.ring, sector, color: cell.color });
        }
        const removed = removedBySector.get(sector) ?? [];
        removed.push(run.ring);
        removedBySector.set(sector, removed);
      }
      gained +=
        SCORE_PER_CLEARED_CELL * run.sectors.length * (run.fullRing ? FULL_RING_MULTIPLIER : 1);
    }
    gained *= runs.length * (combo + 1) * (cascadeLevel + 1);

    if (!opts.demo) {
      const fullRing = runs.some((run) => run.fullRing);
      const magnitude = fullRing ? SHAKE_FULL_RING_MAG : SHAKE_CLEAR_MAG;
      scene.camera.shake(magnitude, magnitude, fullRing ? SHAKE_FULL_RING_MS : SHAKE_CLEAR_MS);
      if (fullRing) {
        fx.flash('#ffffff', FLASH_FULL_RING_OPACITY);
      }
      sfx.clear(runs.length, fullRing);
    }

    // Cells outward of a removed cell slide inward — record where each one
    // travels from so the rebuild can animate the collapse.
    const sliders: { sector: number; fromRing: number; toRing: number }[] = [];
    for (const [sector, removed] of removedBySector) {
      for (let ring = 0; ring < MAX_RINGS; ring++) {
        if (cellAt(grid, ring, sector) === null || removed.includes(ring)) {
          continue;
        }
        const drop = removed.filter((removedRing) => removedRing < ring).length;
        if (drop > 0) {
          sliders.push({ sector, fromRing: ring, toRing: ring - drop });
        }
      }
    }

    clearRuns(grid, runs);
    rebuildBoundAnimated(cleared, sliders);
    score += gained;
    fx.popup(vec(CENTER_X, CENTER_Y - CORE_RADIUS - 40), `+${gained}`, COLOR_WARNING);
    opts.onClears?.(runs.length, score);
    // The collapse can join arcs in inner rings — check again once it settles.
    cascadeTimer = CASCADE_CHECK_DELAY_MS;
    return true;
  };

  const lockPiece = (piece: FallingPiece, baseSector: number, lockRing: number): void => {
    const placements: LockCell[] = piece.cells.map((cell) => ({
      sector: (baseSector + cell.s) % SECTOR_COUNT,
      ring: lockRing + cell.r,
      color: piece.color,
    }));
    const slammed = piece.hardDropped;
    if (slammed) {
      scene.camera.shake(SHAKE_HARD_DROP_MAG, SHAKE_HARD_DROP_MAG, SHAKE_HARD_DROP_MS);
    }
    removePiece(piece);

    if (!lockCells(grid, placements)) {
      if (opts.demo) {
        explodeGrid();
        return;
      }
      over = true;
      sfx.gameOver();
      opts.onGameOver?.(score);
      return;
    }
    if (!opts.demo) {
      if (slammed) {
        sfx.hardDrop();
      } else {
        sfx.lock();
      }
    }
    cascadeLevel = 0;

    for (const placement of placements) {
      const wedge = createBoundWedge(placement.ring, placement.sector, placement.color);
      wedge.scale = vec(1.5, 1.5);
      core.boundLayer.addChild(wedge);
      bindTweens.push({ actor: wedge, t: 0 });
      fx.burst(worldBoundPos(placement.ring, placement.sector), placement.color, 7);
    }
    updateDanger();
    score += SCORE_PER_PIECE;
    if (handleClears()) {
      combo += 1;
      locksSinceClear = 0;
      if (combo >= 2) {
        fx.popup(vec(CENTER_X, CENTER_Y - CORE_RADIUS - 80), `COMBO ×${combo}`, COLOR_ACCENT);
      }
    } else {
      locksSinceClear += 1;
      if (locksSinceClear >= COMBO_RESET_LOCKS) {
        combo = 0;
      }
    }
  };

  /** The piece closest to the core — the one player inputs act on. */
  const activePiece = (): FallingPiece | undefined =>
    pieces.length === 0
      ? undefined
      : pieces.reduce((nearest, piece) => (piece.anchorDist < nearest.anchorDist ? piece : nearest));

  const rotateActivePiece = (): void => {
    if (over || paused) {
      return;
    }
    const active = activePiece();
    if (!active || active.hardDropped) {
      return;
    }
    // Same sweep rule as lane steps: a spin that would only fit farther out
    // than the piece already is would push it back outward — reject it.
    const rotated = rotateCells(active.cells);
    if (
      active.anchorDist <
      restDistFor(rotated, active.anchorAngle, targetCoreAngle) - SWEEP_EPSILON
    ) {
      return;
    }
    active.cells = rotated;
    rebuildPieceCells(active);
    positionPiece(active);
    sfx.spin();
  };

  const hardDropActivePiece = (): void => {
    if (over || paused) {
      return;
    }
    const active = activePiece();
    if (active) {
      active.hardDropped = true;
    }
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

    // Cleared wedges: hold the white flash, then shrink, spin and fade away.
    dyingTweens = dyingTweens.filter((tween) => {
      tween.t += elapsedMs;
      const progress = Math.min(tween.t / CLEAR_DYING_MS, 1);
      if (progress >= 1) {
        tween.actor.kill();
        return false;
      }
      const flash = 0.25;
      if (progress < flash) {
        const swell = 1 + 0.12 * (progress / flash);
        tween.actor.scale = vec(swell, swell);
      } else {
        const fade = (progress - flash) / (1 - flash);
        const scale = 1.12 * (1 - fade * fade);
        tween.actor.scale = vec(scale, scale);
        tween.actor.rotation = tween.midAngle + fade * 1.4;
        tween.actor.graphics.opacity = 1 - fade;
      }
      return true;
    });

    // Surviving wedges gliding one or more rings inward after a clear.
    collapseTweens = collapseTweens.filter((tween) => {
      tween.t += elapsedMs;
      if (tween.t < COLLAPSE_DELAY_MS) {
        return true;
      }
      const progress = Math.min((tween.t - COLLAPSE_DELAY_MS) / COLLAPSE_SLIDE_MS, 1);
      const midAngle = (tween.sector + 0.5) * SECTOR_ANGLE;
      if (progress >= 1) {
        applyWedge(tween.actor, tween.toRing, midAngle, tween.color);
        return false;
      }
      // Ease out; swap to the destination ring's bitmap halfway through.
      const eased = 1 - (1 - progress) * (1 - progress);
      applyWedge(tween.actor, progress < 0.5 ? tween.fromRing : tween.toRing, midAngle, tween.color);
      const from = wedgeMidRadius(tween.fromRing);
      const to = wedgeMidRadius(tween.toRing);
      tween.actor.pos = Vector.fromAngle(midAngle).scale(from + (to - from) * eased);
      return true;
    });

    if (over) {
      return;
    }

    const dt = elapsedMs / 1000;
    let softDrop = false;
    if (opts.demo) {
      coreAngle += ROTATION_SPEED * DEMO_ROTATION_FACTOR * dt;
      targetCoreAngle = coreAngle;
    } else {
      let dir: -1 | 0 | 1 = rotationInput;
      if (engine.input.keyboard.isHeld(Keys.Left) || engine.input.keyboard.isHeld(Keys.A)) {
        dir = -1;
      } else if (
        engine.input.keyboard.isHeld(Keys.Right) ||
        engine.input.keyboard.isHeld(Keys.D)
      ) {
        dir = 1;
      }
      // Lane-stepped rotation: one sector per press, auto-repeat while held.
      if (dir !== lastStepDir) {
        lastStepDir = dir;
        stepHoldTimer = 0;
        if (dir !== 0) {
          tryStep(dir);
        }
      } else if (dir !== 0) {
        stepHoldTimer += elapsedMs;
        if (stepHoldTimer >= CORE_STEP_DAS_DELAY_MS) {
          tryStep(dir);
          stepHoldTimer -= CORE_STEP_REPEAT_MS;
        }
      }
      coreAngle += shortestAngleDelta(coreAngle, targetCoreAngle) * Math.min(1, dt * CORE_SNAP_SPEED);
      if (engine.input.keyboard.wasPressed(Keys.Up) || engine.input.keyboard.wasPressed(Keys.W)) {
        rotateActivePiece();
      }
      if (engine.input.keyboard.wasPressed(Keys.Space)) {
        hardDropActivePiece();
      }
      softDrop =
        engine.input.keyboard.isHeld(Keys.Down) || engine.input.keyboard.isHeld(Keys.S);
    }
    core.root.rotation = coreAngle;

    if (paused) {
      return;
    }

    if (cascadeTimer >= 0) {
      cascadeTimer -= elapsedMs;
      if (cascadeTimer < 0) {
        cascadeTimer = -1;
        cascadeLevel += 1;
        if (handleClears()) {
          fx.popup(
            vec(CENTER_X, CENTER_Y - CORE_RADIUS - 80),
            `CASCADE ×${cascadeLevel + 1}`,
            COLOR_ACCENT
          );
        } else {
          cascadeLevel = 0;
        }
      }
    }

    spawnTimer += elapsedMs;
    const interval = pieces.length === 0 ? Math.min(config.spawnIntervalMs, 600) : config.spawnIntervalMs;
    const canSpawn = pieces.length < config.maxConcurrent;
    if (
      !opts.demo &&
      canSpawn &&
      pendingAngle === null &&
      spawnTimer >= interval - SPAWN_TELEGRAPH_MS
    ) {
      pendingAngle = Math.random() * Math.PI * 2;
      showMarker(pendingAngle, nextShape.color);
    }
    if (marker) {
      marker.graphics.opacity = 0.45 + 0.55 * Math.abs(Math.sin(aliveTimer * 0.008));
    }
    if (spawnTimer >= interval && canSpawn) {
      spawnTimer = 0;
      spawnPiece();
    }

    const active = activePiece();
    for (const piece of [...pieces]) {
      const dropped = piece === active && softDrop;
      // Brake deep in the well (unless soft dropping): near the core there is
      // no stack to warn you, so leave room to step the lane sideways.
      const braking =
        !dropped && piece.anchorDist <= CORE_RADIUS + RING_HEIGHT * (INNER_SLOW_ZONE_RINGS + 0.5);
      const speedFactor = dropped ? SOFT_DROP_SPEED_FACTOR : braking ? INNER_RING_SLOW_FACTOR : 1;
      piece.anchorDist -= piece.speed * dt * speedFactor;

      // Rest on the surface instead of locking instantly: the grace window
      // lets the player step or spin at the last moment to intertwine.
      const baseSector = sectorAtAngle(piece.anchorAngle, targetCoreAngle);
      const lockRing = lockRingFor(piece.cells, baseSector);
      updateGhost(piece, baseSector, lockRing);
      const restDist = CORE_RADIUS + (lockRing + 0.5) * RING_HEIGHT;
      const lockDelay = opts.demo ? 0 : lockRing === 0 ? INNER_LOCK_DELAY_MS : LOCK_DELAY_MS;
      if (piece.hardDropped) {
        // Slam to the rest position and lock this frame — leave a streak of
        // trail dots along the travelled path so the slam reads visually.
        const from = piece.anchorDist;
        piece.anchorDist = restDist;
        piece.lockTimer = lockDelay;
        positionPiece(piece);
        for (let dist = restDist; dist < from; dist += RING_HEIGHT / 2) {
          for (const cell of piece.cells) {
            const angle = piece.displayAngle + cell.s * SECTOR_ANGLE;
            const radius = dist + cell.r * RING_HEIGHT;
            fx.trail(vec(CENTER_X, CENTER_Y).add(Vector.fromAngle(angle).scale(radius)), piece.color);
          }
        }
      } else if (piece.anchorDist <= restDist) {
        piece.anchorDist = restDist;
        piece.lockTimer += elapsedMs * (dropped ? SOFT_DROP_LOCK_FACTOR : 1);
      } else {
        piece.lockTimer = 0;
      }

      // Track the landing lane so the drawn angle always matches the lock.
      const lane = laneAngleFor(piece);
      piece.displayAngle += shortestAngleDelta(piece.displayAngle, lane) * Math.min(1, dt * PIECE_ALIGN_SPEED);
      positionPiece(piece);

      piece.trailTimer += elapsedMs;
      if (piece.trailTimer > TRAIL_INTERVAL_MS) {
        piece.trailTimer = 0;
        for (const pos of pieceCellWorldPositions(piece)) {
          fx.trail(pos, piece.color);
        }
      }

      if (piece.lockTimer >= lockDelay && piece.anchorDist <= restDist) {
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
    combo = 0;
    locksSinceClear = 0;
    cascadeLevel = 0;
    cascadeTimer = -1;
    coreAngle = 0;
    targetCoreAngle = 0;
    lastStepDir = 0;
    stepHoldTimer = 0;
    core.root.rotation = 0;
    for (const piece of [...pieces]) {
      removePiece(piece);
    }
    pendingAngle = null;
    killMarker();
    grid = createGrid();
    rebuildBound();
    fx.clear();
    if (!opts.demo) {
      opts.onNextShape?.(nextShape);
    }
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
