# Tech Spec - Morphine View Transition Controller with Fade-Blur Enter/Exit Animations & Smooth Settling

1. **Objective**
- **Problem Statement**: 
  1. Default root transition crossfades or raw `opacity: [1, 0]` animations can cause blur filters on view transitions to be invisible or washed out due to browser additive `mix-blend-mode: plus-lighter` blending.
  2. Competing CSS `@keyframes` and snapshot `transform: scale(...)` resulted in a post-morph "blur burst / pop / jump" when the browser tore down the view transition pseudo-elements.
- **Solution Overview**: 
  1. Keep `mix-blend-mode: normal !important` on `::view-transition-old(root)` and `::view-transition-new(root)` to prevent white glare and washouts.
  2. Drive root fade & blur purely through Motion's authoritative WAAPI pipeline (`animateView.exit().enter()`) with explicit opacity and filter keyframe arrays, avoiding conflicting CSS `@keyframes`.
  3. Remove snapshot `transform: scale(...)` to eliminate full-viewport rescale jumps on transition completion.
  4. Ensure enter animation ends exactly at `opacity: 1` and `filter: "blur(0px)"` with smooth easing (`ease: [0.4, 0, 0.2, 1]`) so the transition settles into the live DOM seamlessly without any burst or flicker.
  5. Provide Framer Property Controls for `blurAmount`, `duration`, `ease`, and `enableEnterExit`.
- **Scope**: Standalone component in `/framer/test/Morphine.tsx`.
- **Context**: Framer CMS collections, project cards, and fluid page transitions.

2. **Success Criteria**
- **Key Results**:
  - Outgoing and incoming non-shared elements exhibit a rich, cinematic gaussian fade & blur transition.
  - Zero post-morph burst, snap, flash, or jump when the view transition completes.
  - Smooth settling into the live DOM without any residual blur or transform pop.
  - When `enableEnterExit` is toggled off, enter/exit animations are suppressed cleanly without breaking shared element morphing.
  - Standalone build compiles without errors.

3. **Project Requirements**
- [x] Document Root Cause Analysis in `/RCA/rca-blur-burst-after-morph.md`.
- [x] Update `/plans/morphine-animateview.md` with single-source WAAPI architecture.
- [x] Remove conflicting CSS `@keyframes` and root scaling transforms.
- [x] Apply clean `opacity` and `filter` curves via Motion `animateView.exit()` and `.enter()`.
- [x] Verify standalone build via `compile_applet`.

4. **Architecture Decisions**
- **Single-Source WAAPI via Motion**:
  - *Decision*: Motion's `animateView.exit()` and `.enter()` directly manage the WAAPI `KeyframeEffect` on `::view-transition-old(root)` and `::view-transition-new(root)`.
  - *Why*: Eliminates CSS vs JS timing desynchronization and teardown bursts.
- **Pure Opacity + Gaussian Filter without Transform Scaling**:
  - *Decision*: Keep `transform` out of the root snapshot animation.
  - *Why*: Scaling the entire root snapshot causes full-page zoom/shift discrepancies against the live unscaled DOM. Pure blur and opacity smoothly crossfade into the live DOM.

5. **Pseudo Code**
```shade
Component Morphine:
  Data:
    blurPx = props.blurAmount ?? 20
    effectiveTransition = {
      duration: props.duration ?? transition?.duration ?? 0.45,
      ease: transition?.ease ?? [0.4, 0, 0.2, 1]
    }

  Logic:
    exitAnim = {
      opacity: [1, 0.8, 0],
      filter: ["blur(0px)", `blur(${blurPx * 0.5}px)`, `blur(${blurPx}px)`]
    }
    enterAnim = {
      opacity: [0, 0.7, 1],
      filter: [`blur(${blurPx}px)`, `blur(${blurPx * 0.3}px)`, "blur(0px)"]
    }

    animateView(async () => {
      await performNavigation()
      tagElements()
    }, effectiveTransition)
    .exit(isEnterExitActive ? exitAnim : { opacity: 0 })
    .enter(isEnterExitActive ? enterAnim : { opacity: 1 })
```
