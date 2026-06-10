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
  /** Returns the new muted state. Also gates the continuous music bed. */
  toggleMuted(): boolean {
    muted = !muted;
    if (master) {
      master.gain.value = muted ? 0 : 0.4;
    }
    return muted;
  },

  isMuted(): boolean {
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

// --- Keygen-style chiptune loop -------------------------------------------
// A tiny tracker: 4 bars of 16 sixteenth-steps, square-wave arpeggios fed
// through a dotted-eighth feedback delay, sawtooth bass, kick/snare/hat from
// oscillators and a noise buffer. Scheduled with the classic lookahead
// pattern so timing stays sample-accurate while the tab is busy.

const BPM = 142;
const STEP_DUR = 60 / BPM / 4;
const STEPS_PER_BAR = 16;

/** MIDI note number to frequency. */
const midi = (note: number): number => 440 * 2 ** ((note - 69) / 12);

/** Am — F — C — G, the eternal cracktro progression. */
const PROGRESSION: readonly { readonly root: number; readonly chord: readonly number[] }[] = [
  { root: 33, chord: [57, 60, 64] }, // A1 | A3 C4 E4
  { root: 29, chord: [53, 57, 60] }, // F1 | F3 A3 C4
  { root: 36, chord: [60, 64, 67] }, // C2 | C4 E4 G4
  { root: 31, chord: [55, 59, 62] }, // G1 | G3 B3 D4
];

let noiseBuffer: AudioBuffer | null = null;

const getNoise = (audio: AudioContext): AudioBuffer => {
  if (!noiseBuffer) {
    noiseBuffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.2), audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
};

interface MusicBus {
  readonly out: GainNode;
  readonly delaySend: GainNode;
}

let musicBus: MusicBus | null = null;
let musicTimer: number | null = null;

const note = (
  audio: AudioContext,
  when: number,
  frequency: number,
  durationS: number,
  type: OscillatorType,
  volume: number,
  dest: AudioNode,
  slideTo?: number
): void => {
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, when + durationS);
  }
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + durationS);
  osc.connect(gain).connect(dest);
  osc.start(when);
  osc.stop(when + durationS + 0.02);
};

const hit = (
  audio: AudioContext,
  when: number,
  durationS: number,
  volume: number,
  filterType: BiquadFilterType,
  filterFreq: number,
  dest: AudioNode
): void => {
  const source = audio.createBufferSource();
  source.buffer = getNoise(audio);
  const filter = audio.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + durationS);
  source.connect(filter).connect(gain).connect(dest);
  source.start(when);
  source.stop(when + durationS + 0.02);
};

const scheduleStep = (audio: AudioContext, bus: MusicBus, step: number, when: number): void => {
  const bar = PROGRESSION[Math.floor(step / STEPS_PER_BAR) % PROGRESSION.length]!;
  const pos = step % STEPS_PER_BAR;

  // Arpeggio: chord tones cycling every 16th, hopping octaves — the keygen
  // signature. Also feeds the delay bus for the trailing echo.
  const arpTone = bar.chord[pos % 3]! + 12 * (pos % 2) + 12;
  note(audio, when, midi(arpTone), STEP_DUR * 0.9, 'square', 0.055, bus.out);
  note(audio, when, midi(arpTone), STEP_DUR * 0.9, 'square', 0.045, bus.delaySend);

  // Octave stab at the top of each bar, sustained into the delay.
  if (pos === 0) {
    note(audio, when, midi(bar.chord[0]! + 24), STEP_DUR * 3, 'triangle', 0.12, bus.delaySend);
  }

  // Bass: driving eighths, jumping the octave on the offbeat.
  if (pos % 2 === 0) {
    note(audio, when, midi(bar.root + (pos % 4 === 2 ? 12 : 0)), STEP_DUR * 1.6, 'sawtooth', 0.13, bus.out);
  }

  // Drums: four-on-the-floor kick, snare on 2 and 4, hats on the offbeats.
  if (pos % 4 === 0) {
    note(audio, when, 160, 0.11, 'sine', 0.5, bus.out, 45);
  }
  if (pos === 4 || pos === 12) {
    hit(audio, when, 0.1, 0.16, 'bandpass', 1800, bus.out);
  }
  if (pos % 2 === 1) {
    hit(audio, when, 0.03, 0.045, 'highpass', 7000, bus.out);
  }
};

export const music = {
  start(): void {
    const audio = ensureContext();
    if (!audio || !master || musicTimer !== null) {
      return;
    }
    const out = audio.createGain();
    out.gain.value = 0.5;
    out.connect(master);

    // Dotted-eighth feedback delay — instant cracktro.
    const delaySend = audio.createGain();
    const delay = audio.createDelay(1);
    delay.delayTime.value = STEP_DUR * 3;
    const feedback = audio.createGain();
    feedback.gain.value = 0.32;
    const wet = audio.createGain();
    wet.gain.value = 0.3;
    delaySend.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(out);

    musicBus = { out, delaySend };

    const totalSteps = PROGRESSION.length * STEPS_PER_BAR;
    let step = 0;
    let nextTime = audio.currentTime + 0.05;
    const tick = (): void => {
      if (!musicBus) {
        return;
      }
      while (nextTime < audio.currentTime + 0.2) {
        scheduleStep(audio, musicBus, step, nextTime);
        step = (step + 1) % totalSteps;
        nextTime += STEP_DUR;
      }
    };
    tick();
    musicTimer = window.setInterval(tick, 50);
  },

  stop(): void {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
    if (ctx && musicBus) {
      const bus = musicBus;
      const now = ctx.currentTime;
      bus.out.gain.setValueAtTime(bus.out.gain.value, now);
      bus.out.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      window.setTimeout(() => bus.out.disconnect(), 700);
    }
    musicBus = null;
  },
};
