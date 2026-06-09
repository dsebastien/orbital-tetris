import { Color, Font, FontUnit, Label, Scene, TextAlign, vec } from 'excalibur';
import { COLOR_TEXT_MUTED, GAME_WIDTH } from '../constants';

export interface Hud {
  setScore(score: number): void;
  setLevel(level: number): void;
  setProgress(cleared: number, needed: number): void;
}

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
    text: 'RINGS 0/2',
    font: makeFont(16, TextAlign.Right, COLOR_TEXT_MUTED),
  });
  scene.add(score);
  scene.add(level);
  scene.add(progress);

  return {
    setScore: (value: number): void => {
      score.text = `SCORE ${value}`;
    },
    setLevel: (value: number): void => {
      level.text = `LEVEL ${value}`;
    },
    setProgress: (cleared: number, needed: number): void => {
      progress.text = `RINGS ${cleared}/${needed}`;
    },
  };
};
