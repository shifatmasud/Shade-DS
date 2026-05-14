/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// We use dynamic imports for Tone to avoid SSR issues on platforms like Vercel
let Tone: typeof import('tone') | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Instruments and Effects
let reverb: any = null;
let windFilter: any = null;
let windNoise: any = null;
let windEnv: any = null;
let rippleSynth: any = null;

async function getTone() {
  if (typeof window === 'undefined') return null;
  if (!Tone) {
    try {
      Tone = await import('tone');
    } catch (e) {
      console.error('Failed to load Tone.js module:', e);
    }
  }
  return Tone;
}

// Initialize audio context and chain
async function init() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const T = await getTone();
      if (!T) return;

      // Primary Tone start
      await T.start();
      console.log('Tone.js: Context started', T.context.state);

      // Master Reverb (reduced wet slightly to keep sounds direct/loud)
      reverb = new T.Reverb({
        decay: 1.5,
        preDelay: 0.01,
        wet: 0.1
      }).toDestination();
      await reverb.generate();

      // --- WIND (Hover) ---
      windFilter = new T.Filter({
        type: 'bandpass',
        frequency: 800, 
        Q: 0.8
      }).connect(reverb);

      windEnv = new T.AmplitudeEnvelope({
        attack: 0.2,
        decay: 0.4,
        sustain: 0,
        release: 0.3
      }).connect(windFilter);

      windNoise = new T.Noise('pink').connect(windEnv);
      windNoise.volume.value = 0; // MAX Volume for testing
      windNoise.start();

      const windLFO = new T.LFO(0.3, 600, 1000).connect(windFilter.frequency);
      windLFO.start();

      // --- WATER (Ripple/Bloop) ---
      rippleSynth = new T.MembraneSynth({
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
    const T = await getTone();
    if (!T) return;

    if (!isInitialized) {
      await init();
    }
    
    if (T.context.state !== 'running') {
      try {
        await T.context.resume();
        await T.start();
      } catch (e) {
        console.warn('Tone.js: Resume failed', e);
      }
    }

    if (T.context.state === 'running') {
      console.log('Tone.js: Context UNLOCKED and RUNNING');
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });
}

export type SoundType = 'click' | 'hover' | 'press' | 'drag';

let lastScheduledTime = 0;

export async function playSound(type: SoundType) {
  const T = await getTone();
  if (!T) return;

  if (!isInitialized) {
    await init();
  }
  
  // Critical for Vercel/Production: Check and resume context state if it suspended
  if (T.context.state !== 'running') {
    try {
      await T.context.resume();
    } catch (e) {
      // Silent fail if context can't resume
      return;
    }
  }
  
  // Use a slightly larger lookahead (0.05) to ensure stability in production environments
  let time = T.now() + 0.05;
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

