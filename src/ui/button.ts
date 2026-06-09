import {
  Actor,
  Color,
  Font,
  FontUnit,
  Rectangle,
  Text,
  TextAlign,
  Vector,
} from 'excalibur';
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
  const width = opts.width ?? 300;
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
      font: new Font({
        family: 'monospace',
        size: opts.fontSize ?? 26,
        unit: FontUnit.Px,
        color: Color.White,
        textAlign: TextAlign.Center,
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
