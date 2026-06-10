import { Color, Engine, Font, FontUnit, Label, Scene, TextAlign, vec } from 'excalibur';
import {
  CENTER_X,
  CENTER_Y,
  COLOR_ACCENT,
  COLOR_TEXT_MUTED,
  COLOR_WARNING,
  DEMO_BLOCK_SPEED,
  DEMO_MAX_CONCURRENT,
  DEMO_SPAWN_INTERVAL_MS,
  GAME_HEIGHT,
} from '../constants';
import { createField, type Field } from '../field';
import { loadBest } from '../highscore';
import { createButton } from '../ui/button';
import type { GameStartData, LevelConfig } from '../types';

const DEMO_CONFIG: LevelConfig = {
  level: 1,
  blockSpeed: DEMO_BLOCK_SPEED,
  spawnIntervalMs: DEMO_SPAWN_INTERVAL_MS,
  maxConcurrent: DEMO_MAX_CONCURRENT,
  clearsToAdvance: Number.POSITIVE_INFINITY,
};

/** Attract-mode menu: the field plays itself behind a big start button. */
export class MenuScene extends Scene {
  private field!: Field;
  private bestLabel!: Label;

  override onInitialize(engine: Engine): void {
    this.field = createField(this, { demo: true });

    const title = new Label({
      pos: vec(CENTER_X, 80),
      z: 60,
      text: 'ORBITAL TETRIS',
      font: new Font({
        family: 'monospace',
        size: 52,
        unit: FontUnit.Px,
        color: Color.fromHex(COLOR_ACCENT),
        textAlign: TextAlign.Center,
        bold: true,
        shadow: { blur: 26, color: Color.fromHex(COLOR_ACCENT) },
      }),
    });
    this.add(title);

    const subtitle = new Label({
      pos: vec(CENTER_X, 120),
      z: 60,
      text: 'Rotate the core. Assemble arcs. Survive.',
      font: new Font({
        family: 'monospace',
        size: 18,
        unit: FontUnit.Px,
        color: Color.fromHex(COLOR_TEXT_MUTED),
        textAlign: TextAlign.Center,
      }),
    });
    this.add(subtitle);

    this.bestLabel = new Label({
      pos: vec(CENTER_X, 152),
      z: 60,
      text: '',
      font: new Font({
        family: 'monospace',
        size: 18,
        unit: FontUnit.Px,
        color: Color.fromHex(COLOR_WARNING),
        textAlign: TextAlign.Center,
        bold: true,
      }),
    });
    this.add(this.bestLabel);

    const controls = new Label({
      pos: vec(CENTER_X, GAME_HEIGHT - 40),
      z: 60,
      text: '← / → step one lane — ↑ / space spin the piece — tap zones on mobile',
      font: new Font({
        family: 'monospace',
        size: 16,
        unit: FontUnit.Px,
        color: Color.fromHex(COLOR_TEXT_MUTED),
        textAlign: TextAlign.Center,
      }),
    });
    this.add(controls);

    const start = createButton({
      pos: vec(CENTER_X, CENTER_Y),
      width: 180,
      height: 70,
      label: 'START',
      fontSize: 32,
      onClick: () => {
        const data: GameStartData = { level: 1, score: 0 };
        void engine.goToScene('game', { sceneActivationData: data });
      },
    });
    this.add(start);
  }

  override onActivate(): void {
    this.field.reset(DEMO_CONFIG, 0);
    const best = loadBest();
    this.bestLabel.text = best ? `BEST ${best.score} — LEVEL ${best.level}` : '';
  }

  override onPreUpdate(engine: Engine, elapsed: number): void {
    this.field.update(engine, elapsed);
  }
}
