/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Tone from 'tone';

let synth: Tone.PolySynth | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Initialize audio context
async function init() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await Tone.start();
      // PolySynth allows multiple sounds to overlap, preventing scheduling clashes on a single voice
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.1 }
      }).toDestination();
      
      // Limit polyphony for UI sounds
      synth.maxPolyphony = 8;
      
      isInitialized = true;
    } catch (e) {
      console.error('Failed to initialize Tone.js', e);
    }
  })();
  
  return initPromise;
}

export type SoundType = 'click' | 'hover' | 'press' | 'drag';

// Tracking last scheduled time to prevent "Start time must be strictly greater than previous start time" error
let lastScheduledTime = 0;

export async function playSound(type: SoundType) {
  if (!isInitialized) {
    await init();
  }
  
  if (!synth) return;

  // Use Tone.now() with a small lookahead buffer
  let time = Tone.now() + 0.01;
  
  // Ensure strict monotonicity for the scheduler
  if (time <= lastScheduledTime) {
    time = lastScheduledTime + 0.001; 
  }
  lastScheduledTime = time;

  switch (type) {
    case 'hover':
      // Gentle, short high pitch
      synth.triggerAttackRelease('A6', '0.02', time, 0.05);
      break;
    case 'click':
      // Satisfying click
      synth.triggerAttackRelease('C5', '0.05', time, 0.2);
      break;
    case 'press':
      // Lower, heavier press
      synth.triggerAttackRelease('G4', '0.1', time, 0.2);
      break;
    case 'drag':
      // Continuous, low-pass filter noise
      synth.triggerAttackRelease('E4', '0.05', time, 0.1);
      break;
  }
}
