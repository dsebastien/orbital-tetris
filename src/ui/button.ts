import { Actor, Color, Font, FontUnit, Rectangle, Text, Vector } from 'excalibur';
import { COLOR_ACCENT, COLOR_CORE_PULSE } from '../constants';

export interface ButtonOptions {
  readonly pos: Vector;
  readonly label: string;
  readonly onClick: () => void;
  readonly width?: number;
  readonly height?: number;
  readonly fontSize?: number;
}

export const createButton = (opts: ButtonOptions): Actor => {
  const fontSize = opts.fontSize ?? 26;
  // Monospace glyphs are ~0.6em wide; never let the caption overflow the box.
  const minWidth = Math.ceil(opts.label.length * fontSize * 0.62) + 48;
  const width = Math.max(opts.width ?? 300, minWidth);
  const height = opts.height ?? 60;
  const button = new Actor({ pos: opts.pos, width, height, z: 50 });
  button.graphics.use(
    new Rectangle({
      width,
      height,
      color: Color.fromHex(COLOR_CORE_PULSE),
      strokeColor: Color.fromHex(COLOR_ACCENT),
      lineWidth: 2,
    })
  );

  const caption = new Actor({ z: 51 });
  caption.graphics.use(
    new Text({
      text: opts.label,
      // No textAlign here: the graphics component already centers the Text
      // graphic on the actor; combining both shifts the caption off-center.
      font: new Font({
        family: 'monospace',
        size: fontSize,
        unit: FontUnit.Px,
        color: Color.White,
        bold: true,
      }),
    })
  );
  button.addChild(caption);

  button.on('pointerup', () => opts.onClick());
  button.on('pointerenter', () => {
    button.graphics.opacity = 0.8;
  });
  button.on('pointerleave', () => {
    button.graphics.opacity = 1;
  });

  return button;
};
