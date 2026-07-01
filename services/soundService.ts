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
let impactThud: any = null;
let impactSlap: any = null;

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
        decay: 1.2,
        preDelay: 0.01,
        wet: 0.08
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
        pitchDecay: 0.15,
        octaves: 3.5,
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.002,
          decay: 0.15,
          sustain: 0,
          release: 0.1
        }
      }).connect(reverb);
      rippleSynth.volume.value = -12; 

      // --- CLICK (Mechanical Snap) ---
      clickSynth = new T.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
          attack: 0.001,
          decay: 0.03,
          sustain: 0
        }
      }).connect(reverb);
      clickSynth.volume.value = -26; 

      // --- IMPACT (Squishy Thud) ---
      impactThud = new T.MembraneSynth({
        pitchDecay: 0.08,
        octaves: 2,
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.25,
          sustain: 0,
          release: 0.1
        }
      }).connect(reverb);
      
      impactSlap = new T.NoiseSynth({
        noise: { type: 'pink' },
        envelope: {
          attack: 0.001,
          decay: 0.06,
          sustain: 0
        }
      }).connect(new T.Filter(1500, 'lowpass').connect(reverb));
      
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

export type SoundType = 'click' | 'hover' | 'press' | 'drag' | 'impact';

let lastScheduledTime = 0;

export async function playSound(type: SoundType, intensity: number = 1.0) {
  const T = await getTone();
  if (!T) return;

  if (!isInitialized) {
    await init();
  }
  
  if (T.context.state !== 'running') {
    try {
      await T.context.resume();
    } catch (e) {
      return;
    }
  }
  
  let time = T.now() + 0.02;
  if (time <= lastScheduledTime) {
    time = lastScheduledTime + 0.01; 
  }
  lastScheduledTime = time;

  // Map intensity to volume (dB)
  // 0.2 intensity -> -20dB, 1.5 intensity -> 0dB
  const volumeBoost = Math.log10(intensity) * 20;

  switch (type) {
    case 'impact':
      if (impactThud && impactSlap) {
        const freq = 60 + (1.0 - intensity) * 40; // Harder hits are lower frequency
        impactThud.volume.rampTo(-10 + volumeBoost, 0.01, time);
        impactSlap.volume.rampTo(-18 + volumeBoost, 0.01, time);
        
        impactThud.triggerAttackRelease(freq, '0.1', time);
        impactSlap.triggerAttackRelease('0.05', time);
      }
      break;

    case 'hover':
      if (windEnv) {
        windEnv.triggerAttackRelease('0.2', time, 0.15);
      }
      break;
      
    case 'click':
      if (rippleSynth || clickSynth) {
        if (windEnv) windEnv.triggerRelease(time);
        if (rippleSynth) rippleSynth.triggerAttackRelease('C4', '0.05', time, 0.5);
        if (clickSynth) clickSynth.triggerAttackRelease('0.05', time, 0.4);
      }
      break;
      
    case 'press':
      if (rippleSynth) {
        rippleSynth.triggerAttackRelease('G3', '0.1', time, 0.6);
      }
      break;
      
    case 'drag':
      if (windEnv) {
        windEnv.triggerAttackRelease('0.05', time, 0.08);
      }
      break;
  }
}

