import { Color, DisplayMode, Engine } from 'excalibur';
import { COLOR_BACKGROUND, GAME_HEIGHT, GAME_WIDTH } from './constants';
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
});

game.add('menu', new MenuScene());
game.add('game', new GameScene());
game.add('gameover', new GameOverScene());

void game.start().then(() => game.goToScene('menu'));
