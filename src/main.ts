import { Color, DisplayMode, Engine } from 'excalibur';

const game = new Engine({
  width: 800,
  height: 800,
  displayMode: DisplayMode.FitScreen,
  backgroundColor: Color.fromHex('#0b0e1d'),
  canvasElementId: 'game',
  suppressPlayButton: true,
});

void game.start();
