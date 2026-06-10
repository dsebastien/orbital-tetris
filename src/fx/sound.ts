/**
 * Tiny Web Audio synth — every effect is an oscillator with an envelope, no
 * assets. The context is created lazily on the first call, which always
 * happens inside a user gesture, so autoplay policies never block it.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

const ensureContext = (): AudioContext | null => {
  if (typeof AudioContext === 'undefined') {
    return null;
  }
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
};

interface ToneOptions {
  readonly type?: OscillatorType;
  readonly durationMs?: number;
  readonly delayMs?: number;
  readonly volume?: number;
  /** Target frequency for an exponential glide over the tone's duration. */
  readonly slideTo?: number;
}

const tone = (frequency: number, opts: ToneOptions = {}): void => {
  const audio = ensureContext();
  if (!audio || !master || muted) {
    return;
  }
  const duration = (opts.durationMs ?? 100) / 1000;
  const start = audio.currentTime + (opts.delayMs ?? 0) / 1000;
  const osc = audio.createOscillator();
  osc.type = opts.type ?? 'square';
  osc.frequency.setValueAtTime(frequency, start);
  if (opts.slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + duration);
  }
  const gain = audio.createGain();
  gain.gain.setValueAtTime(opts.volume ?? 0.15, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
};

/** C-major-ish pentatonic steps used for clears and fanfares. */
const ARPEGGIO = [523.25, 659.25, 783.99, 1046.5, 1318.5];

export const sfx = {
  /** Returns the new muted state. */
  toggleMuted(): boolean {
    muted = !muted;
    return muted;
  },

  /** One lane step of the core. */
  step(): void {
    tone(160, { durationMs: 35, volume: 0.05 });
  },

  /** Spinning the falling piece. */
  spin(): void {
    tone(320, { type: 'triangle', durationMs: 70, volume: 0.12, slideTo: 480 });
  },

  /** A piece binding to the construction. */
  lock(): void {
    tone(150, { type: 'sine', durationMs: 140, volume: 0.25, slideTo: 65 });
  },

  /** Hard-drop slam — doubles as the lock thud of the slammed piece. */
  hardDrop(): void {
    tone(220, { type: 'sawtooth', durationMs: 160, volume: 0.2, slideTo: 50 });
  },

  /** Rising arpeggio; higher and longer for full rings, pitched up per extra arc. */
  clear(arcs: number, fullRing: boolean): void {
    const notes = fullRing ? ARPEGGIO : ARPEGGIO.slice(0, 3);
    const pitch = Math.pow(2, (arcs - 1) / 12);
    notes.forEach((frequency, i) => {
      tone(frequency * pitch, {
        type: 'triangle',
        durationMs: 160,
        delayMs: i * 70,
        volume: 0.16,
      });
    });
  },

  /** Level-up fanfare. */
  levelUp(): void {
    [392, 523.25, 659.25, 783.99].forEach((frequency, i) => {
      tone(frequency, { durationMs: 140, delayMs: i * 90, volume: 0.12 });
    });
  },

  /** Long falling sweep when the run ends. */
  gameOver(): void {
    tone(300, { type: 'sawtooth', durationMs: 900, volume: 0.3, slideTo: 40 });
  },
};
