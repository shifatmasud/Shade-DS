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
let rippleSynth: Tone.MembraneSynth | null = null;

// Initialize audio context and chain
async function init() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Primary Tone start
      await Tone.start();
      console.log('Tone.js: Context started', Tone.context.state);

      // Master Reverb (reduced wet slightly to keep sounds direct/loud)
      reverb = new Tone.Reverb({
        decay: 1.5,
        preDelay: 0.01,
        wet: 0.1
      }).toDestination();
      await reverb.generate();

      // --- WIND (Hover) ---
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
      windNoise.volume.value = 0; // MAX Volume for testing
      windNoise.start();

      const windLFO = new Tone.LFO(0.3, 600, 1000).connect(windFilter.frequency);
      windLFO.start();

      // --- WATER (Ripple/Bloop) ---
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
      rippleSynth.volume.value = 0; // MAX Volume for testing
      
      isInitialized = true;
      console.log('Tone.js: Engine Ready');
    } catch (e) {
      console.error('Tone.js: Init Error', e);
    }
  })();
  
  return initPromise;
}

// Global unlock mechanism: Must be triggered by a genuine USER EVENT
if (typeof window !== 'undefined') {
  const unlock = async () => {
    console.log('Tone.js: Attempting Global Unlock...', Tone.context.state);
    
    if (!isInitialized) {
      await init();
    }
    
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
      await Tone.start();
    }

    if (Tone.context.state === 'running') {
      console.log('Tone.js: Context UNLOCKED and RUNNING');
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('click', unlock);
}

export type SoundType = 'click' | 'hover' | 'press' | 'drag';

let lastScheduledTime = 0;

export async function playSound(type: SoundType) {
  if (!isInitialized) {
    console.log('SoundService: Initializing on playSound call');
    await init();
  }
  
  // Critical for Vercel/Production: Check and resume context state if it suspended
  if (Tone.context.state !== 'running') {
    try {
      console.log('SoundService: Resuming Tone.context');
      await Tone.context.resume();
    } catch (e) {
      console.warn('SoundService: Could not resume context', e);
    }
  }
  
  // Use a slightly larger lookahead (0.05) to ensure stability in production environments
  let time = Tone.now() + 0.05;
  if (time <= lastScheduledTime) {
    time = lastScheduledTime + 0.01; 
  }
  lastScheduledTime = time;

  switch (type) {
    case 'hover':
      if (windEnv) {
        windEnv.triggerAttackRelease('0.3', time, 0.2); // Slightly more powerful hover
      }
      break;
      
    case 'click':
      if (rippleSynth) {
        // Pure "bloop" sound
        rippleSynth.triggerAttackRelease('C5', '0.05', time, 0.8);
      }
      break;
      
    case 'press':
      if (rippleSynth) {
        // Deeper "bloop" for press
        rippleSynth.triggerAttackRelease('G4', '0.08', time, 1.0);
      }
      break;
      
    case 'drag':
      if (windEnv) {
        windEnv.triggerAttackRelease('0.05', time, 0.1);
      }
      break;
  }
}
