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
let clickSynth: any = null;

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
        decay: 0.8,
        preDelay: 0.01,
        wet: 0.05
      }).toDestination();
      await reverb.generate();

      // --- WIND (Hover) ---
      windFilter = new T.Filter({
        type: 'bandpass',
        frequency: 800, 
        Q: 1.2
      }).connect(reverb);

      windEnv = new T.AmplitudeEnvelope({
        attack: 0.1,
        decay: 0.2,
        sustain: 0,
        release: 0.1
      }).connect(windFilter);

      windNoise = new T.Noise('pink').connect(windEnv);
      windNoise.volume.value = -24; 
      windNoise.start();

      const windLFO = new T.LFO(0.3, 600, 1000).connect(windFilter.frequency);
      windLFO.start();

      // --- WATER (Ripple/Bloop) ---
      rippleSynth = new T.MembraneSynth({
        pitchDecay: 0.15, // More pronounced pitch-down ease
        octaves: 3.5,     // Steeper drop for organic feel
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.002, // Sharper start
          decay: 0.1,
          sustain: 0,
          release: 0.1
        }
      }).connect(reverb);
      rippleSynth.volume.value = -14; 

      // --- CLICK (Mechanical Snap) ---
      clickSynth = new T.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
          attack: 0.001,
          decay: 0.02, // Tiny burst
          sustain: 0
        }
      }).connect(reverb);
      clickSynth.volume.value = -28; 
      
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
      if (rippleSynth || clickSynth) {
        // Kill any lingering airy noise from hover before clicking
        if (windEnv) windEnv.triggerRelease(time);
        
        // Organic Click: Deep body with mechanical snap
        if (rippleSynth) rippleSynth.triggerAttackRelease('C4', '0.05', time, 0.5);
        if (clickSynth) clickSynth.triggerAttackRelease('0.05', time, 0.4);
      }
      break;
      
    case 'press':
      if (rippleSynth) {
        // Subtle deeper bloop for press
        rippleSynth.triggerAttackRelease('G4', '0.08', time, 0.5);
      }
      break;
      
    case 'drag':
      if (windEnv) {
        windEnv.triggerAttackRelease('0.05', time, 0.1);
      }
      break;
  }
}

