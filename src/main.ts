import { Color, DisplayMode, Engine } from 'excalibur';
import { COLOR_BACKGROUND, GAME_HEIGHT, GAME_WIDTH } from './constants';
import { sfx } from './fx/sound';
import { GameOverScene } from './scenes/gameover';
import { GameScene } from './scenes/game';
import { MenuScene } from './scenes/menu';

const game = new Engine({
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  displayMode: DisplayMode.FitScreen,
  backgroundColor: Color.fromHex(COLOR_BACKGROUND),
  canvasElementId: 'game',
  suppressPlayButton: true,
  // FitScreen stretches the backing buffer over the viewport; render at a
  // pixel ratio of at least 2 so text and vector art stay crisp.
  pixelRatio: Math.max(2, window.devicePixelRatio || 1),
});

game.input.gamepads.enabled = true;

game.add('menu', new MenuScene());
game.add('game', new GameScene());
game.add('gameover', new GameOverScene());

window.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') {
    sfx.toggleMuted();
  }
});

void game.start().then(() => game.goToScene('menu'));
