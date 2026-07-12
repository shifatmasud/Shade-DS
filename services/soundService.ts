/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type BaseLayer = {
  /** Seconds after the trigger that this layer starts. */
  offset?: number;
  /** Fade-in time, in seconds. */
  attack: number;
  /** Fade-out time, in seconds, starting right after the attack. */
  decay: number;
  /** Peak volume reached at the end of the attack. */
  peak: number;
};

/** A single note — the building block for chimes, arpeggios, and pads. */
export type ToneLayer = BaseLayer & {
  kind: "tone";
  waveform: OscillatorType;
  frequency: number;
  /** Detune in cents, for a gentle chorus/beating effect between layers. */
  detune?: number;
  /** If set, the pitch glides smoothly from `frequency` to this value. */
  glideTo?: number;
  /** How long the glide takes, in seconds. Defaults to attack + decay. */
  glideTime?: number;
};

/** A soft filtered noise bed — used for breathy, textural layers. */
export type NoiseLayer = BaseLayer & {
  kind: "noise";
  filterType: BiquadFilterType;
  filterFrequency: number;
  filterQ?: number;
};

export type SoundLayer = ToneLayer | NoiseLayer;

/** A soft, spacious echo tail applied to the whole sound — the "magic dust". */
export type Shimmer = {
  delay: number;
  feedback: number;
  wet: number;
  lowpass: number;
};

export type SoundRecipe = {
  masterGain: number;
  layers: SoundLayer[];
  shimmer?: Shimmer;
};

export const RECIPES = {
  /** A soft two-note ascending bell, like an iOS/macOS confirmation tink. */
  chime: {
    masterGain: 0.5,
    layers: [
      { kind: "tone", waveform: "sine", frequency: 1046.5, attack: 0.006, decay: 0.22, peak: 0.09 },
      { kind: "tone", waveform: "sine", frequency: 1568, offset: 0.09, attack: 0.006, decay: 0.26, peak: 0.08 },
    ],
    shimmer: { delay: 0.12, feedback: 0.25, wet: 0.18, lowpass: 4000 },
  },
  /** A quick ascending twinkle of four notes — bright and playful. */
  sparkle: {
    masterGain: 0.5,
    layers: [
      { kind: "tone", waveform: "sine", frequency: 1760, offset: 0, attack: 0.003, decay: 0.09, peak: 0.045 },
      { kind: "tone", waveform: "sine", frequency: 2217, offset: 0.045, attack: 0.003, decay: 0.09, peak: 0.04 },
      { kind: "tone", waveform: "sine", frequency: 2637, offset: 0.09, attack: 0.003, decay: 0.1, peak: 0.038 },
      { kind: "tone", waveform: "sine", frequency: 3520, offset: 0.135, attack: 0.003, decay: 0.12, peak: 0.032 },
    ],
    shimmer: { delay: 0.07, feedback: 0.35, wet: 0.22, lowpass: 6000 },
  },
  /** A single note gliding smoothly downward, like a drop of water. */
  droplet: {
    masterGain: 0.55,
    layers: [
      { kind: "tone", waveform: "sine", frequency: 1200, glideTo: 550, glideTime: 0.14, attack: 0.004, decay: 0.2, peak: 0.075 },
    ],
    shimmer: { delay: 0.09, feedback: 0.2, wet: 0.15, lowpass: 3000 },
  },
  /** A warm, slow-swelling pad from two gently detuned sines. */
  bloom: {
    masterGain: 0.5,
    layers: [
      { kind: "tone", waveform: "sine", frequency: 528, attack: 0.06, decay: 0.32, peak: 0.06 },
      { kind: "tone", waveform: "sine", frequency: 528, detune: 12, attack: 0.06, decay: 0.34, peak: 0.05 },
    ],
    shimmer: { delay: 0.15, feedback: 0.2, wet: 0.12, lowpass: 2500 },
  },
  /** The quietest option — a breathy, textureless swell for dense lists. */
  whisper: {
    masterGain: 0.5,
    layers: [
      { kind: "noise", filterType: "lowpass", filterFrequency: 1200, filterQ: 0.7, attack: 0.04, decay: 0.16, peak: 0.05 },
    ],
  },
  /** A focused, bandpass-filtered tick with a bright sine ping on top — crisp and instant. */
  tick: {
    masterGain: 0.4,
    layers: [
      { kind: "noise", filterType: "bandpass", filterFrequency: 5400, filterQ: 1.8, attack: 0.001, decay: 0.018, peak: 0.14 },
      { kind: "tone", waveform: "sine", frequency: 2600, attack: 0.001, decay: 0.012, peak: 0.018 },
    ],
  },
  /** A dull, muted knock — the "down" half of a press/release pair, like a key bottoming out. */
  press: {
    masterGain: 0.4,
    layers: [
      { kind: "noise", filterType: "bandpass", filterFrequency: 1700, filterQ: 1.4, attack: 0.001, decay: 0.02, peak: 0.13 },
    ],
  },
  /** A brighter, springier tick — the "up" half of a press/release pair, like a key returning. */
  release: {
    masterGain: 0.4,
    layers: [
      { kind: "noise", filterType: "bandpass", filterFrequency: 4600, filterQ: 1.8, attack: 0.001, decay: 0.016, peak: 0.12 },
      { kind: "tone", waveform: "sine", frequency: 3200, offset: 0.006, attack: 0.001, decay: 0.05, peak: 0.02 },
    ],
  },
  /** A two-part click-clack, like a mechanical switch flipping between states. */
  toggle: {
    masterGain: 0.4,
    layers: [
      { kind: "noise", filterType: "bandpass", filterFrequency: 2200, filterQ: 1.6, attack: 0.001, decay: 0.016, peak: 0.12 },
      { kind: "noise", filterType: "bandpass", filterFrequency: 3800, filterQ: 1.6, offset: 0.024, attack: 0.001, decay: 0.02, peak: 0.1 },
    ],
  },
  /** A short, warm three-note ascending confirmation — "done", not a fanfare. */
  success: {
    masterGain: 0.5,
    layers: [
      { kind: "tone", waveform: "sine", frequency: 880, attack: 0.004, decay: 0.09, peak: 0.06 },
      { kind: "tone", waveform: "sine", frequency: 1108.73, offset: 0.06, attack: 0.004, decay: 0.1, peak: 0.06 },
      { kind: "tone", waveform: "sine", frequency: 1318.51, offset: 0.12, attack: 0.004, decay: 0.18, peak: 0.07 },
    ],
    shimmer: { delay: 0.1, feedback: 0.22, wet: 0.16, lowpass: 4500 },
  },
} as const satisfies Record<string, SoundRecipe>;

export type SoundName = keyof typeof RECIPES;

export function isSoundName(value: unknown): value is SoundName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RECIPES, value);
}

/** All available sound names, derived from the recipe palette. */
export const sounds = Object.keys(RECIPES) as readonly SoundName[];

export type SoundType = SoundName | 'click' | 'hover' | 'press' | 'drag' | 'impact';

function resolveSoundName(name: string): SoundName {
  if (isSoundName(name)) return name;
  switch (name) {
    case 'hover': return 'whisper';
    case 'click': return 'tick';
    case 'press': return 'press';
    case 'release': return 'release';
    case 'drag': return 'whisper';
    case 'impact': return 'droplet';
    default: return 'tick';
  }
}

let audioCtx: AudioContext | null = null;
let cachedNoiseBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedNoiseBuffer) return cachedNoiseBuffer;
  const bufferSize = ctx.sampleRate * 2; // 2 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoiseBuffer = buffer;
  return buffer;
}

const soundCache: Record<string, AudioBuffer> = {};

export async function getPreRenderedBuffer(soundName: SoundName): Promise<AudioBuffer> {
  if (soundCache[soundName]) {
    return soundCache[soundName];
  }

  const recipe = RECIPES[soundName] as SoundRecipe;
  if (!recipe) throw new Error(`Unknown sound recipe: ${soundName}`);

  const sampleRate = 44100;
  let maxDuration = 0.1;
  recipe.layers.forEach((layer) => {
    const offset = layer.offset ?? 0;
    const duration = offset + layer.attack + layer.decay;
    if (duration > maxDuration) {
      maxDuration = duration;
    }
  });

  // Include shimmer/reverb tail space
  const duration = maxDuration + (recipe.shimmer ? 0.8 : 0.05);
  
  const OfflineContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineContextClass(1, Math.ceil(sampleRate * duration), sampleRate);

  const masterGainNode = offlineCtx.createGain();
  masterGainNode.gain.setValueAtTime(recipe.masterGain, 0);
  masterGainNode.connect(offlineCtx.destination);

  let shimmerWetNode: GainNode | null = null;
  let delayNode: DelayNode | null = null;
  let feedbackNode: GainNode | null = null;
  let shimmerFilterNode: BiquadFilterNode | null = null;

  if (recipe.shimmer) {
    const shim = recipe.shimmer;
    delayNode = offlineCtx.createDelay(Math.max(1.0, shim.delay * 2));
    delayNode.delayTime.setValueAtTime(shim.delay, 0);

    feedbackNode = offlineCtx.createGain();
    feedbackNode.gain.setValueAtTime(shim.feedback, 0);

    shimmerFilterNode = offlineCtx.createBiquadFilter();
    shimmerFilterNode.type = "lowpass";
    shimmerFilterNode.frequency.setValueAtTime(shim.lowpass, 0);

    shimmerWetNode = offlineCtx.createGain();
    shimmerWetNode.gain.setValueAtTime(shim.wet, 0);

    masterGainNode.connect(delayNode);
    delayNode.connect(shimmerFilterNode);
    shimmerFilterNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);

    shimmerFilterNode.connect(shimmerWetNode);
    shimmerWetNode.connect(offlineCtx.destination);
  }

  recipe.layers.forEach((layer) => {
    const offset = layer.offset ?? 0;
    const startTime = offset;
    const attackTime = startTime + layer.attack;
    const decayTime = attackTime + layer.decay;

    const layerGain = offlineCtx.createGain();
    layerGain.gain.setValueAtTime(0, startTime);
    layerGain.gain.linearRampToValueAtTime(layer.peak, attackTime);
    layerGain.gain.linearRampToValueAtTime(0, decayTime);
    layerGain.connect(masterGainNode);

    if (layer.kind === "tone") {
      const osc = offlineCtx.createOscillator();
      osc.type = layer.waveform;
      osc.frequency.setValueAtTime(layer.frequency, startTime);
      
      if (layer.detune !== undefined) {
        osc.detune.setValueAtTime(layer.detune, startTime);
      }

      if (layer.glideTo !== undefined) {
        const glideTime = layer.glideTime !== undefined ? layer.glideTime : (layer.attack + layer.decay);
        const glideEndTime = startTime + glideTime;
        osc.frequency.setValueAtTime(layer.frequency, startTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, layer.glideTo), glideEndTime);
      }

      osc.connect(layerGain);
      osc.start(startTime);
      osc.stop(decayTime);
    } else if (layer.kind === "noise") {
      const bufferSize = sampleRate * 2;
      const buffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = offlineCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = offlineCtx.createBiquadFilter();
      filter.type = layer.filterType;
      filter.frequency.setValueAtTime(layer.filterFrequency, startTime);
      if (layer.filterQ !== undefined) {
        filter.Q.setValueAtTime(layer.filterQ, startTime);
      }

      noise.connect(filter);
      filter.connect(layerGain);
      noise.start(startTime);
      noise.stop(decayTime);
    }
  });

  const renderedBuffer = await offlineCtx.startRendering();
  soundCache[soundName] = renderedBuffer;
  return renderedBuffer;
}

let soundEnabled = true;

if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('enableSound');
  if (saved === 'false') {
    soundEnabled = false;
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('enableSound', enabled ? 'true' : 'false');
  }
}

export async function playSound(type: SoundType, intensity: number = 1.0) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('WebAudio: context resume failed:', e);
    }
  }

  const soundName = resolveSoundName(type);
  try {
    const buffer = await getPreRenderedBuffer(soundName);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(intensity, ctx.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch (error) {
    console.error("Failed to play pre-rendered sound:", error);
  }
}

let typingWorker: Worker | null = null;

export function getTypingWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (!typingWorker) {
    const workerCode = `
      let lastPlayTime = 0;
      const MIN_INTERVAL = 35; // ms between sounds
      self.onmessage = function(e) {
        if (e.data.type === 'keystroke') {
          const now = Date.now();
          if (now - lastPlayTime >= MIN_INTERVAL) {
            lastPlayTime = now;
            self.postMessage({ type: 'play_tick' });
          }
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    typingWorker = new Worker(url);
    
    typingWorker.onmessage = (e) => {
      if (e.data.type === 'play_tick') {
        playSound('tick', 0.4);
      }
    };
  }
  return typingWorker;
}

export function playTypingSound() {
  const worker = getTypingWorker();
  if (worker) {
    worker.postMessage({ type: 'keystroke' });
  } else {
    playSound('tick', 0.4);
  }
}

// Keep the global unlock for click/pointer actions
if (typeof window !== 'undefined') {
  const unlock = async () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('WebAudio: Resume failed', e);
      }
    }
    
    if (ctx.state === 'running') {
      console.log('WebAudio: context activated and running');
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });
}
