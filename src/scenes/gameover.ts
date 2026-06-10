import {
  Color,
  Engine,
  Font,
  FontUnit,
  Label,
  Scene,
  TextAlign,
  vec,
  type SceneActivationContext,
} from 'excalibur';
import { CENTER_X, COLOR_DANGER, COLOR_TEXT_MUTED } from '../constants';
import { createBackground, type Background } from '../actors/background';
import { createButton } from '../ui/button';
import type { GameOverData, GameStartData } from '../types';

export class GameOverScene extends Scene {
  private scoreLabel!: Label;
  private background!: Background;
  private t = 0;
  private data: GameOverData = { score: 0, level: 1 };

  override onInitialize(engine: Engine): void {
    this.background = createBackground(this);
    const title = new Label({
      pos: vec(CENTER_X, 200),
      z: 60,
      text: 'GAME OVER',
      font: new Font({
        family: 'monospace',
        size: 56,
        unit: FontUnit.Px,
        color: Color.fromHex(COLOR_DANGER),
        textAlign: TextAlign.Center,
        bold: true,
      }),
    });
    this.add(title);

    this.scoreLabel = new Label({
      pos: vec(CENTER_X, 270),
      z: 60,
      text: '',
      font: new Font({
        family: 'monospace',
        size: 26,
        unit: FontUnit.Px,
        color: Color.fromHex(COLOR_TEXT_MUTED),
        textAlign: TextAlign.Center,
      }),
    });
    this.add(this.scoreLabel);

    const go = (data: GameStartData): void => {
      void engine.goToScene('game', { sceneActivationData: data });
    };

    this.add(
      createButton({
        pos: vec(CENTER_X, 400),
        label: 'CONTINUE — RETRY LEVEL',
        onClick: () => go({ level: this.data.level, score: this.data.score }),
      })
    );
    this.add(
      createButton({
        pos: vec(CENTER_X, 480),
        label: 'TRY AGAIN — LEVEL 1',
        onClick: () => go({ level: 1, score: 0 }),
      })
    );
    this.add(
      createButton({
        pos: vec(CENTER_X, 560),
        label: 'MAIN MENU',
        onClick: () => {
          void engine.goToScene('menu');
        },
      })
    );
  }

  override onActivate(ctx: SceneActivationContext<GameOverData>): void {
    this.data = ctx.data ?? { score: 0, level: 1 };
    this.scoreLabel.text = `FINAL SCORE ${this.data.score} — REACHED LEVEL ${this.data.level}`;
  }

  override onPreUpdate(_engine: Engine, elapsed: number): void {
    this.t += elapsed;
    this.background.update(this.t);
  }
}
