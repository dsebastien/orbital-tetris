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
/** Bound blocks beyond this radius mean the run is lost. */
export const FIELD_LIMIT_RADIUS = CORE_RADIUS + MAX_RINGS * RING_HEIGHT;
export const SPAWN_RADIUS = 430;

// --- Rotation ---
export const ROTATION_SPEED = 2.6; // rad/s while an arrow is held
export const DEMO_ROTATION_FACTOR = 0.15;
/** Taps in the top fraction of the screen spin the piece instead of the core. */
export const PIECE_ROTATE_TOUCH_ZONE = 0.3;

// --- Difficulty / levels ---
export const MAX_LEVEL = 100;
export const BASE_BLOCK_SPEED = 60; // px/s at level 1
export const SPEED_INCREMENT_PER_LEVEL = 2.2;
export const MAX_BLOCK_SPEED = 280;
export const BASE_SPAWN_INTERVAL_MS = 2600;
export const SPAWN_INTERVAL_DECREMENT_MS = 19;
export const MIN_SPAWN_INTERVAL_MS = 700;

// --- Scoring ---
export const SCORE_PER_PIECE = 20;
/** A clear of n simultaneous rings awards SCORE_PER_RING * n * n. */
export const SCORE_PER_RING = 100;

// --- Effects / timing ---
export const TRAIL_INTERVAL_MS = 90;
export const BIND_TWEEN_MS = 220;
export const BANNER_DURATION_MS = 1500;

// --- Demo (main-menu attract mode) ---
export const DEMO_BLOCK_SPEED = 110;
export const DEMO_SPAWN_INTERVAL_MS = 1400;
export const DEMO_MAX_CONCURRENT = 2;

// --- Tetromino piece colors (classic assignments, tuned for the palette) ---
export const PIECE_COLOR_I = '#4cc9f0';
export const PIECE_COLOR_O = '#ffd166';
export const PIECE_COLOR_T = '#c77dff';
export const PIECE_COLOR_S = '#b5e48c';
export const PIECE_COLOR_Z = '#ff6b6b';
export const PIECE_COLOR_J = '#4895ef';
export const PIECE_COLOR_L = '#ff9d5c';

// --- Wedge-cell rendering (bound construction and falling pieces) ---
export const WEDGE_GAP_ANGULAR = 0.014; // rad shaved off each side of a sector
export const WEDGE_GAP_RADIAL = 1.5; // px shaved off inner/outer edges

// --- Palette ---
export const COLOR_BACKGROUND = '#0b0e1d';
export const COLOR_CORE_FILL = '#141c3a';
export const COLOR_CORE_FILL_LIGHT = '#27407f';
export const COLOR_CORE_STROKE = '#4cc9f0';
export const COLOR_ACCENT = '#4cc9f0';
export const COLOR_CORE_PULSE = '#1d2f6f';
export const COLOR_WARNING = '#ffd166';
export const COLOR_DANGER = '#ff5050';
export const COLOR_OUTLINE = '#070a18';
export const COLOR_TEXT_MUTED = '#8a93b5';
