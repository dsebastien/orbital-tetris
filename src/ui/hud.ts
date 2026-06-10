import { Actor, Color, Font, FontUnit, Label, Scene, TextAlign, vec } from 'excalibur';
import { COLOR_TEXT_MUTED, GAME_WIDTH, SCORE_COUNT_RATE } from '../constants';
import { crispCanvas } from '../fx/canvas';
import { withAlpha } from '../fx/palette';
import type { PieceShape } from '../types';

export interface Hud {
  setScore(score: number): void;
  setLevel(level: number): void;
  setProgress(cleared: number, needed: number): void;
  /** Mini lattice preview of the upcoming piece. */
  setNext(shape: PieceShape): void;
  /** Advances the score count-up animation. */
  update(elapsedMs: number): void;
}

/** Square size of one preview cell in px. */
const PREVIEW_CELL = 14;

const makeFont = (size: number, align: TextAlign, colorHex: string): Font =>
  new Font({
    family: 'monospace',
    size,
    unit: FontUnit.Px,
    color: Color.fromHex(colorHex),
    textAlign: align,
    bold: true,
  });

export const createHud = (scene: Scene): Hud => {
  const score = new Label({
    pos: vec(24, 28),
    z: 40,
    text: 'SCORE 0',
    font: makeFont(22, TextAlign.Left, '#ffffff'),
  });
  const level = new Label({
    pos: vec(GAME_WIDTH - 24, 28),
    z: 40,
    text: 'LEVEL 1',
    font: makeFont(22, TextAlign.Right, '#ffffff'),
  });
  const progress = new Label({
    pos: vec(GAME_WIDTH - 24, 56),
    z: 40,
    text: 'ARCS 0/2',
    font: makeFont(16, TextAlign.Right, COLOR_TEXT_MUTED),
  });
  const nextTitle = new Label({
    pos: vec(24, 64),
    z: 40,
    text: 'NEXT',
    font: makeFont(14, TextAlign.Left, COLOR_TEXT_MUTED),
  });
  const preview = new Actor({ pos: vec(24, 84), z: 40, anchor: vec(0, 0) });

  scene.add(score);
  scene.add(level);
  scene.add(progress);
  scene.add(nextTitle);
  scene.add(preview);

  let shownScore = 0;
  let targetScore = 0;

  return {
    setScore: (value: number): void => {
      targetScore = value;
      // Only count upward — a fresh run snaps straight back to its start.
      if (value < shownScore) {
        shownScore = value;
        score.text = `SCORE ${value}`;
      }
    },
    update: (elapsedMs: number): void => {
      if (shownScore === targetScore) {
        return;
      }
      shownScore += (targetScore - shownScore) * Math.min(1, (elapsedMs / 1000) * SCORE_COUNT_RATE);
      if (targetScore - shownScore < 1) {
        shownScore = targetScore;
      }
      score.text = `SCORE ${Math.round(shownScore)}`;
    },
    setLevel: (value: number): void => {
      level.text = `LEVEL ${value}`;
    },
    setProgress: (cleared: number, needed: number): void => {
      progress.text = `ARCS ${cleared}/${needed}`;
    },
    setNext: (shape: PieceShape): void => {
      const maxS = Math.max(...shape.cells.map((cell) => cell.s));
      const maxR = Math.max(...shape.cells.map((cell) => cell.r));
      const width = (maxS + 1) * PREVIEW_CELL;
      const height = (maxR + 1) * PREVIEW_CELL;
      preview.graphics.use(
        crispCanvas(width, height, (ctx) => {
          for (const cell of shape.cells) {
            const x = cell.s * PREVIEW_CELL;
            // Radial offsets point outward; draw r = 0 at the bottom.
            const y = (maxR - cell.r) * PREVIEW_CELL;
            ctx.fillStyle = shape.color;
            ctx.fillRect(x + 1, y + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
            ctx.strokeStyle = withAlpha('#ffffff', 0.35);
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1.5, y + 1.5, PREVIEW_CELL - 3, PREVIEW_CELL - 3);
          }
        })
      );
    },
  };
};
