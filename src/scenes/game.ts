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
import {
  BANNER_DURATION_MS,
  CENTER_X,
  CENTER_Y,
  COLOR_WARNING,
  GAME_HEIGHT,
  MAX_LEVEL,
  PIECE_ROTATE_TOUCH_ZONE,
} from '../constants';
import { createField, type Field } from '../field';
import { sfx } from '../fx/sound';
import { getLevelConfig } from '../levels';
import { createHud, type Hud } from '../ui/hud';
import type { GameOverData, GameStartData } from '../types';

export class GameScene extends Scene {
  private field!: Field;
  private hud!: Hud;
  private banner!: Label;
  private level = 1;
  private arcsCleared = 0;
  private bannerTimer = 0;
  private touchDir: -1 | 0 | 1 = 0;

  override onInitialize(engine: Engine): void {
    this.field = createField(this, {
      demo: false,
      onGameOver: (score) => {
        const data: GameOverData = { score, level: this.level };
        void engine.goToScene('gameover', { sceneActivationData: data });
      },
      onClears: (count) => {
        this.arcsCleared += count;
      },
      onNextShape: (shape) => {
        this.hud.setNext(shape);
      },
    });
    this.hud = createHud(this);

    this.banner = new Label({
      pos: vec(CENTER_X, CENTER_Y - 200),
      z: 60,
      text: '',
      font: new Font({
        family: 'monospace',
        size: 42,
        unit: FontUnit.Px,
        color: Color.fromHex(COLOR_WARNING),
        textAlign: TextAlign.Center,
        bold: true,
      }),
    });
    this.add(this.banner);

    // Touch / mouse: tap the top zone to spin the piece, hold the lower
    // left/right halves to rotate the core.
    engine.input.pointers.primary.on('down', (evt) => {
      if (engine.currentScene !== this) {
        return;
      }
      if (evt.worldPos.y < GAME_HEIGHT * PIECE_ROTATE_TOUCH_ZONE) {
        this.field.rotateActivePiece();
        return;
      }
      this.touchDir = evt.worldPos.x < CENTER_X ? -1 : 1;
    });
    engine.input.pointers.primary.on('up', () => {
      this.touchDir = 0;
    });
  }

  override onActivate(ctx: SceneActivationContext<GameStartData>): void {
    this.level = ctx.data?.level ?? 1;
    const score = ctx.data?.score ?? 0;
    this.arcsCleared = 0;
    this.touchDir = 0;
    this.field.reset(getLevelConfig(this.level), score);
    this.showBanner(`LEVEL ${this.level}`);
    this.syncHud();
  }

  private showBanner(text: string): void {
    this.banner.text = text;
    this.banner.graphics.opacity = 1;
    this.bannerTimer = BANNER_DURATION_MS;
    this.field.setPaused(true);
  }

  private syncHud(): void {
    this.hud.setScore(this.field.score);
    this.hud.setLevel(this.level);
    this.hud.setProgress(this.arcsCleared, getLevelConfig(this.level).clearsToAdvance);
  }

  override onPreUpdate(engine: Engine, elapsed: number): void {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= elapsed;
      this.banner.graphics.opacity = Math.min(1, Math.max(this.bannerTimer, 0) / 400);
      if (this.bannerTimer <= 0) {
        this.banner.text = '';
        this.field.setPaused(false);
      }
    }

    this.field.setRotationInput(this.touchDir);
    this.field.update(engine, elapsed);

    const config = getLevelConfig(this.level);
    if (
      this.bannerTimer <= 0 &&
      this.arcsCleared >= config.clearsToAdvance &&
      this.level < MAX_LEVEL
    ) {
      this.level += 1;
      this.arcsCleared = 0;
      this.field.setConfig(getLevelConfig(this.level));
      this.showBanner(`LEVEL ${this.level}`);
      this.field.celebrateLevelUp();
      sfx.levelUp();
    }

    this.syncHud();
  }
}
