# Tech Spec 

1. **Objective**
- **Problem Statement**: The current page exit and enter animations are too fast and suffer from jitter and flashing (FOUC: Flash of Un-animated Content when the new page renders at full opacity before being reset to 0, combined with abrupt 0.35s / 0.45s animation timings and premature fallback cutoffs).
- **Solution Overview**: Transform the page exit and enter into a slow, gentle, cinematic transition:
  1. Increase exit duration to a gentle ~0.65s with `ease: [0.4, 0, 0.2, 1]`, progressive `blur(16px)`, `opacity: 0`, and `translateY(14px)`.
  2. Increase enter & morph duration to a slow, luxurious ~0.75s–0.8s with `ease: [0.16, 1, 0.3, 1]`, smoothly de-blurring from `blur(16px)` to `blur(0px)` and fading from `opacity: 0` to `opacity: 1`.
  3. Synchronously prime incoming page elements to `opacity: 0` and `blur(16px)` on mount when an incoming snapshot is present, preventing the initial white/content flash before morphing begins.
  4. Extend readiness and fallback cleanup timeouts to 2200ms to allow slow animations to finish gracefully.
- **Scope**: Changes in `/framer/ArticleImageTransition.tsx`.
- **Context**: Standalone Framer Code Component for seamless shared element and page content transitions.

2. **Success Criteria**
- **Key Results**:
  - Outgoing page exit animation is visibly slow, gentle, and smooth (0.65s duration, soft blur and fade).
  - Incoming page enter animation smoothly fades and blurs in from 0 to 1 without any initial flash, jitter, or jump.
  - Morph animation (`animateView`) aligns with the slow, gentle curve (~0.75s).
  - Zero FOUC: no flash of un-animated content upon arriving at the destination page.
  - Full TypeScript and build verification.
- **Non-Negotiables**:
  - Standalone component portability in `/framer/ArticleImageTransition.tsx`.
  - Preserve Dock and README immunity.

3. **Project Requirements**
- [x] Create tech spec plan in `/plans/slow_gentle_page_exit_enter_transition.md`.
- [x] Update timeout constants (`READINESS_TIMEOUT_MS: 2000`, `FALLBACK_CLEANUP_MS: 2400`) to support slow gentle animations.
- [x] Refactor `animateSurroundingExit` to slow gentle defaults (duration: 0.65s, `ease: [0.4, 0, 0.2, 1]`, `blur(16px)`, `translateY(14px)`).
- [x] Refactor `animateSurroundingEnter` to slow gentle defaults (duration: 0.75s, `ease: [0.16, 1, 0.3, 1]`, `blur(16px)` -> `blur(0px)`, `translateY(14px)` -> `translateY(0px)`).
- [x] Prime incoming page elements synchronously on mount if valid snapshot exists to prevent the flash of unstyled/un-animated content.
- [x] Align `animateView` morph transition default duration to 0.75s with `ease: [0.16, 1, 0.3, 1]`.
- [x] Verify build via `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
- **Cinematic Easing Curves**: Use `[0.4, 0, 0.2, 1]` for exit (starts gently, accelerates softly into the transition) and `[0.16, 1, 0.3, 1]` (luxurious, physical ease-out) for enter and morph, giving a cohesive, fluid feel.
- **Anti-Flash Priming on Mount**: When `readSnapshot()` finds a valid transition record, immediately set initial entry styles (`opacity: 0`, `filter: "blur(16px)"`) before running requestAnimationFrame loops. This eliminates the 1-2 frame flash of the new page before animation starts.
- **Progressive Blur & Transform Interpolation**: Animate `filter: "blur(16px)"` to `filter: "blur(0px)"` and `transform: "translateY(14px)"` to `transform: "translateY(0px)"` to ensure GPU compositor acceleration without pixel stepping.

5. **Pseudo Code**
```shade-dsl
COMPONENT ArticleTransition
  DATA
    const DEFAULT_EXIT_TRANSITION = { duration: 0.65, ease: [0.4, 0, 0.2, 1] }
    const DEFAULT_ENTER_TRANSITION = { duration: 0.75, ease: [0.16, 1, 0.3, 1] }
    const DEFAULT_MORPH_TRANSITION = { duration: 0.75, ease: [0.16, 1, 0.3, 1] }
  LOGIC
    action primeIncomingElements():
      // Synchronously prevent flash of un-animated content
      if valid snapshot detected on mount:
        elements = getSurroundingElements(null)
        setStyles(elements, { opacity: 0, filter: "blur(16px)", transform: "translateY(14px)" })

    action animateSurroundingExit(elements, transition):
      duration = transition?.duration || 0.65
      ease = transition?.ease || [0.4, 0, 0.2, 1]
      return animate(elements, { opacity: 0, filter: "blur(16px)", transform: "translateY(14px)" }, { duration, ease })

    action animateSurroundingEnter(elements, transition):
      duration = transition?.duration || 0.75
      ease = transition?.ease || [0.16, 1, 0.3, 1]
      return animate(elements, { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }, { duration, ease })
```
