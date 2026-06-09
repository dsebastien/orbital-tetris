// All game constants live here. No magic numbers in game code.

// --- Screen / layout ---
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 800;
export const CENTER_X = GAME_WIDTH / 2;
export const CENTER_Y = GAME_HEIGHT / 2;

// --- Polar playfield ---
export const SECTOR_COUNT = 12;
export const SECTOR_ANGLE = (Math.PI * 2) / SECTOR_COUNT;
export const MAX_RINGS = 7;
export const CORE_RADIUS = 70;
export const RING_HEIGHT = 24;
export const BLOCK_RADIUS = 11;
/** Bound blocks beyond this radius mean the run is lost. */
export const FIELD_LIMIT_RADIUS = CORE_RADIUS + MAX_RINGS * RING_HEIGHT;
export const SPAWN_RADIUS = 430;

// --- Rotation ---
export const ROTATION_SPEED = 2.6; // rad/s while an arrow is held
export const DEMO_ROTATION_FACTOR = 0.15;

// --- Difficulty / levels ---
export const MAX_LEVEL = 100;
export const BASE_BLOCK_SPEED = 60; // px/s at level 1
export const SPEED_INCREMENT_PER_LEVEL = 2.2;
export const MAX_BLOCK_SPEED = 280;
export const BASE_SPAWN_INTERVAL_MS = 2100;
export const SPAWN_INTERVAL_DECREMENT_MS = 16;
export const MIN_SPAWN_INTERVAL_MS = 480;

// --- Scoring ---
export const SCORE_PER_BIND = 5;
/** A clear of n simultaneous rings awards SCORE_PER_RING * n * n. */
export const SCORE_PER_RING = 100;

// --- Effects / timing ---
export const TRAIL_INTERVAL_MS = 60;
export const BIND_TWEEN_MS = 200;
export const BANNER_DURATION_MS = 1500;

// --- Demo (main-menu attract mode) ---
export const DEMO_BLOCK_SPEED = 95;
export const DEMO_SPAWN_INTERVAL_MS = 800;
export const DEMO_MAX_CONCURRENT = 4;

// --- Palette ---
export const BLOCK_COLORS: readonly string[] = [
  '#4cc9f0',
  '#f72585',
  '#b5e48c',
  '#ffd166',
  '#c77dff',
  '#ff6b6b',
];

export const COLOR_BACKGROUND = '#0b0e1d';
export const COLOR_CORE_FILL = '#141c3a';
export const COLOR_CORE_STROKE = '#4cc9f0';
export const COLOR_CORE_PULSE = '#1d2f6f';
export const COLOR_ACCENT = '#4cc9f0';
export const COLOR_WARNING = '#ffd166';
export const COLOR_DANGER = '#ff5050';
export const COLOR_OUTLINE = '#070a18';
export const COLOR_TEXT_MUTED = '#8a93b5';
