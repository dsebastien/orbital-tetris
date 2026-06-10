/** Tiny hex-color helpers for canvas gradients. */

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export const hexToRgb = (hex: string): Rgb => {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
};

const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

/** amount > 0 lightens toward white, amount < 0 darkens toward black. Range -1..1. */
export const shade = (hex: string, amount: number): string => {
  const { r, g, b } = hexToRgb(hex);
  const target = amount > 0 ? 255 : 0;
  const f = Math.abs(amount);
  return `rgb(${clamp(r + (target - r) * f)}, ${clamp(g + (target - g) * f)}, ${clamp(b + (target - b) * f)})`;
};

export const withAlpha = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
