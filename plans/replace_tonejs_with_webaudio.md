# Plan: Replace Tone.js with Web Audio API

## 1. PRD (Overview & Objectives)
- **Objective**: Eliminate Tone.js from the codebase to reduce bundle size and startup overhead, replacing it with a pure Web Audio API-based synthesis engine.
- **Scope**:
  - Implement a highly responsive, custom audio scheduler using raw Web Audio API.
  - Implement ten built-in sound recipes (`chime`, `sparkle`, `droplet`, `bloom`, `whisper`, `tick`, `press`, `release`, `toggle`, `success`) as specified.
  - Support features such as custom attack/decay envelopes, tone/noise layers, pitch gliding, detuning, and custom lowpass feedback shimmer delay.
  - Map legacy sounds (`click`, `hover`, `press`, `drag`, `impact`) gracefully to the new recipes.
  - Play sounds for all user interactions, state changes, and physical movements across all interactive UI elements.

## 2. OKR (Success Criteria)
- **Key Result 1**: Codebase compiles successfully without any Tone.js references or type errors.
- **Key Result 2**: Synthesized sounds have pristine tone quality, accurate envelope timing, and flawless glide and shimmer effects.
- **Key Result 3**: Custom UI elements (Buttons, Toggles, Selects, Accordions, Inputs, Range Sliders, and Tabs) produce immediate tactile acoustic feedback on hover, click, press, release, state change, or motion.

## 3. ADR (Architectural Design)
- **Context Management**: Lazy-initialize `AudioContext` on user interaction (pointerdown, click) to comply with browser autoplay policies.
- **Noise Layer**: Use a pre-cached 2-second `AudioBuffer` filled with white noise. Avoid runtime overhead by reusing the buffer across all noise trigger events.
- **Synthesis Pipeline**:
  - For each triggered sound recipe:
    - Create a transient `masterGainNode` scaled by `recipe.masterGain` and the dynamic `intensity` parameter.
    - Set up a dynamic feedback delay loop for `shimmer` (DelayNode -> BiquadFilter (lowpass) -> GainNode (feedback) -> DelayNode). Mix the wet output into the master destination.
    - Loop over the layers, spawning a `GainNode` for each layer. Use Web Audio parameter automation (`setValueAtTime`, `linearRampToValueAtTime`) to schedule the precise attack-decay volume envelope.
    - For `tone` layers, spawn an `OscillatorNode` and schedule logarithmic glides using `exponentialRampToValueAtTime` when `glideTo` is set.
    - For `noise` layers, spawn an `AudioBufferSourceNode` routed through a custom shaping `BiquadFilterNode`.
    - Automatically schedule the `.start(time)` and `.stop(time)` on source nodes.
    - Set a safety `setTimeout` timer to clean up and `disconnect` all nodes after the sound and shimmer have fully decayed.

## 4. TODO List
- [ ] Create this plan (Completed).
- [ ] Implement Web Audio-based `/services/soundService.ts`.
- [ ] Scan and update core UI components (`Button.tsx`, `Toggle.tsx`, `Select.tsx`, etc.) to trigger appropriate sounds (`press`, `release`, `toggle`, `tick`, `success`, `hover`, `whisper`) during interaction phases.
- [ ] Clean up any legacy Tone.js references.
- [ ] Run linter and compiler to verify system health.
