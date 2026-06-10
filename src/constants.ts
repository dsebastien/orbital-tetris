// All game constants live here. No magic numbers in game code.

// --- Screen / layout ---
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 800;
export const CENTER_X = GAME_WIDTH / 2;
export const CENTER_Y = GAME_HEIGHT / 2;

// --- Polar playfield ---
// Cell proportions are tuned so cells stay chunky (close to square) in the
// play area and pieces read as classic tetrominoes curved around the circle.
export const SECTOR_COUNT = 16;
export const SECTOR_ANGLE = (Math.PI * 2) / SECTOR_COUNT;
export const MAX_RINGS = 6;
export const CORE_RADIUS = 80;
export const RING_HEIGHT = 30;
/** Bound blocks beyond this radius mean the run is lost. */
export const FIELD_LIMIT_RADIUS = CORE_RADIUS + MAX_RINGS * RING_HEIGHT;
export const SPAWN_RADIUS = 330;

// --- Rotation ---
/** Demo-mode continuous rotation speed (rad/s); player rotation steps by lanes. */
export const ROTATION_SPEED = 2.6;
export const DEMO_ROTATION_FACTOR = 0.15;
/** How fast the core animates toward its stepped target angle (1/s). */
export const CORE_SNAP_SPEED = 14;
/** Hold delay before a held direction starts auto-repeating lane steps. */
export const CORE_STEP_DAS_DELAY_MS = 220;
/** Auto-repeat interval for lane steps while a direction stays held. */
export const CORE_STEP_REPEAT_MS = 140;
/** Taps in the top fraction of the screen spin the piece instead of the core. */
export const PIECE_ROTATE_TOUCH_ZONE = 0.3;
/** How fast a falling piece's displayed angle tracks its landing lane (1/s). */
export const PIECE_ALIGN_SPEED = 10;
/**
 * Grace window after a piece touches the surface before it locks — lets the
 * player step or spin at the last moment to intertwine pieces.
 */
export const LOCK_DELAY_MS = 400;

/**
 * Float tolerance when checking whether a lane step or spin would sweep the
 * construction through a piece that is already deeper than the destination
 * lane's surface — such moves are blocked instead of pushing the piece out.
 */
export const SWEEP_EPSILON = 0.001;

// --- Inner-ring approach ---
/**
 * Pieces brake to this fraction of their speed near the core, and get a
 * longer grace window when resting on the innermost ring — deep in the well
 * there is no stack to warn you, so sideways steps need extra room.
 */
export const INNER_RING_SLOW_FACTOR = 0.55;
/** The brake zone: anchor within this many rings of the core surface. */
export const INNER_SLOW_ZONE_RINGS = 2;
/** Grace window replacing LOCK_DELAY_MS for locks on the innermost ring. */
export const INNER_LOCK_DELAY_MS = 700;

// --- Dropping ---
/** Fall-speed multiplier on the active piece while soft drop is held. */
export const SOFT_DROP_SPEED_FACTOR = 5;
/** Lock-timer multiplier on a resting active piece while soft drop is held. */
export const SOFT_DROP_LOCK_FACTOR = 4;

// --- Difficulty / levels ---
export const MAX_LEVEL = 100;
export const BASE_BLOCK_SPEED = 60; // px/s at level 1
export const SPEED_INCREMENT_PER_LEVEL = 2.2;
export const MAX_BLOCK_SPEED = 280;
export const BASE_SPAWN_INTERVAL_MS = 2600;
export const SPAWN_INTERVAL_DECREMENT_MS = 19;
export const MIN_SPAWN_INTERVAL_MS = 700;

// --- Clearing & scoring ---
/** A contiguous occupied arc of at least this many cells in one ring clears. */
export const CLEAR_RUN_LENGTH = 6;
export const SCORE_PER_PIECE = 20;
/**
 * Each cleared cell is worth this much, doubled for a complete ring, and the
 * total is multiplied by the number of arcs cleared simultaneously.
 */
export const SCORE_PER_CLEARED_CELL = 15;
export const FULL_RING_MULTIPLIER = 2;

// --- Effects / timing ---
export const TRAIL_INTERVAL_MS = 90;
export const BIND_TWEEN_MS = 220;
export const BANNER_DURATION_MS = 1500;
/** Camera shake (magnitude px / duration ms) for hard drops and clears. */
export const SHAKE_HARD_DROP_MAG = 3;
export const SHAKE_HARD_DROP_MS = 110;
export const SHAKE_CLEAR_MAG = 4;
export const SHAKE_CLEAR_MS = 150;
export const SHAKE_FULL_RING_MAG = 8;
export const SHAKE_FULL_RING_MS = 220;
/** Full-screen flash on full-ring clears. */
export const FLASH_DURATION_MS = 280;
export const FLASH_FULL_RING_OPACITY = 0.3;
/** Cleared wedges flash white then shrink/spin away over this long. */
export const CLEAR_DYING_MS = 320;
/** Beat between a clear and the outward cells starting to slide inward. */
export const COLLAPSE_DELAY_MS = 110;
/** Duration of the inward slide of cells outward of a cleared arc. */
export const COLLAPSE_SLIDE_MS = 190;

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
