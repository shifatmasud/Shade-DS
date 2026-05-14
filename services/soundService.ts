/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Tone from 'tone';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Instruments and Effects
let reverb: Tone.Reverb | null = null;
let windFilter: Tone.Filter | null = null;
let windNoise: Tone.Noise | null = null;
let windEnv: Tone.AmplitudeEnvelope | null = null;
let woodSynth: Tone.MembraneSynth | null = null;
let woodNoise: Tone.Noise | null = null;
let woodEnv: Tone.AmplitudeEnvelope | null = null;
let woodFilter: Tone.Filter | null = null;
let rippleSynth: Tone.MembraneSynth | null = null;

// Initialize audio context and chain
async function init() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await Tone.start();

      // Master Reverb for space
      reverb = new Tone.Reverb({
        decay: 2.0,
        preDelay: 0.02,
        wet: 0.1
      }).toDestination();
      await reverb.generate();

      // --- WIND (Hover) Setup ---
      // Deeper, more subtle wind
      windFilter = new Tone.Filter({
        type: 'bandpass',
        frequency: 800, 
        Q: 0.8
      }).connect(reverb);

      windEnv = new Tone.AmplitudeEnvelope({
        attack: 0.2,
        decay: 0.4,
        sustain: 0,
        release: 0.3
      }).connect(windFilter);

      windNoise = new Tone.Noise('pink').connect(windEnv);
      windNoise.volume.value = -3;
      windNoise.start();

      const windLFO = new Tone.LFO(0.3, 600, 1000).connect(windFilter.frequency);
      windLFO.start();

      // --- WOOD (Click) Setup ---
      // Mellow wood body
      woodFilter = new Tone.Filter({
        type: 'lowpass',
        frequency: 1200 
      }).connect(reverb);

      woodEnv = new Tone.AmplitudeEnvelope({
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.05
      }).connect(woodFilter);

      woodNoise = new Tone.Noise('pink').connect(woodEnv);
      woodNoise.volume.value = -10;
      woodNoise.start();

      woodSynth = new Tone.MembraneSynth({
        pitchDecay: 0.005,
        octaves: 1,
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.08,
          sustain: 0,
          release: 0.08
        }
      }).connect(reverb);
      woodSynth.volume.value = -15;

      // --- WATER (Ripple) Setup ---
      // Resonant "bloop" sound using a membrane synth for pitch glide
      rippleSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 2,
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.15,
          sustain: 0,
          release: 0.1
        }
      }).connect(reverb);
      rippleSynth.volume.value = -18;
      
      isInitialized = true;
    } catch (e) {
      console.error('Failed to initialize Tone.js', e);
    }
  })();
  
  return initPromise;
}

// Global unlock mechanism for browsers that block audio until a user interaction.
if (typeof window !== 'undefined') {
  const unlock = async () => {
    try {
      if (!isInitialized) {
        await init();
      } else if (Tone.context.state !== 'running') {
        await Tone.context.resume();
        await Tone.start();
      }
      
      // Remove listeners after successful interaction
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
    } catch (err) {
      console.warn('Audio unlock failed:', err);
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('click', unlock);
}

export type SoundType = 'click' | 'hover' | 'press' | 'drag';

let lastScheduledTime = 0;

export async function playSound(type: SoundType) {
  if (!isInitialized) {
    await init();
  }
  
  // Ensure strict monotonicity for the scheduler to prevent overlapping errors
  let time = Tone.now() + 0.01;
  if (time <= lastScheduledTime) {
    time = lastScheduledTime + 0.005; 
  }
  lastScheduledTime = time;

  switch (type) {
    case 'hover':
      if (windEnv) {
        windEnv.triggerAttackRelease('0.3', time, 0.1);
      }
      break;
      
    case 'click':
      if (rippleSynth) {
        // Pure "bloop" sound - subtle and clear
        rippleSynth.triggerAttackRelease('C5', '0.05', time, 0.2);
      }
      break;
      
    case 'press':
      if (rippleSynth) {
        // Deeper "bloop" for press
        rippleSynth.triggerAttackRelease('G4', '0.08', time, 0.3);
      }
      break;
      
    case 'drag':
      if (windEnv) {
        windEnv.triggerAttackRelease('0.05', time, 0.05);
      }
      break;
  }
}
