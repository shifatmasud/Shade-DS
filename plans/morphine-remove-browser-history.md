# Tech Spec - Remove Browser Back & Forward History Button Support in Morphine

1. **Objective**
- **Problem Statement**: The user requested removing browser Back & Forward history button traversal interception (`popstate` and traverse navigation events) from `framer/test/Morphine.tsx`.
- **Solution Overview**:
  1. Remove `popstate` event listener (`handlePopState`) and its window subscription/cleanup.
  2. Guard the Navigation API handler (`handleNavigate`) against traverse events (`event.navigationType === "traverse"`) so browser back/forward history actions execute standard default browser navigation without Morphine view transition interception.
  3. Clean up `historyIndex` tracking from `GlobalMorphineState` and history state mutation calls.
  4. Preserve all in-page click handling, on-page back/return button actions, active origin card bidirectional morphing, and `animateView` animations.
- **Scope**: `/framer/test/Morphine.tsx`.
- **Context**: Standalone Framer Code Component for shared-element morphing and view transitions.

2. **Success Criteria**
- **Key Results**:
  - Browser Back and Forward buttons are no longer intercepted by Morphine's custom view transition controller.
  - In-page navigation and in-page back buttons continue to perform smooth bidirectional morphing and page transitions.
  - Code is fully standalone, SSR-safe, and builds cleanly with 0 TypeScript/lint errors.

3. **Project Requirements**
- [ ] Create Tech Spec in `/plans/morphine-remove-browser-history.md`.
- [ ] Remove `handlePopState` and `window.addEventListener("popstate", ...)` in `/framer/test/Morphine.tsx`.
- [ ] Ensure `handleNavigate` skips `navigationType === "traverse"`.
- [ ] Remove `historyIndex` from `GlobalMorphineState` and `window.history.replaceState` index mutations.
- [ ] Validate compilation with `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
- **Removal of Traversal Interception**:
  - *Decision*: Remove `popstate` listener and skip `traverse` navigation in `handleNavigate`.
  - *Why*: Direct compliance with user directive to remove browser back/forward history button support while maintaining in-page link navigation.
- **Preserve On-Page Return/Reverse Transitions**:
  - *Decision*: Keep `detectNavigationDirection` and click interception for on-page buttons/links (e.g. `<a href="...">Back</a>`, `[data-framer-name="Back"]`).
  - *Why*: Allows UI-driven back actions inside the page to continue morphing smoothly without conflicting with browser-level history buttons.

5. **Pseudo Code**
```shade
Component Morphine:
  Data:
    globalState = window.__MORPHINE_STATE__ ?? { isTransitioning: false, lastTransitionEndTime: 0 }
    transition = props.transition
    enterExitActive = props.enableEnterExit ?? true

  Logic:
    On Navigation (event):
      If event.navigationType == "traverse": Return
      If event.canIntercept == false Or isBusy(): Return
      Intercept navigation -> performViewTransition(...)

    On Link Click (event):
      If isBusy() Or isModifiedClick(event): Return
      direction = detectNavigationDirection(...)
      pairs = resolveBidirectionalPairs(...)
      event.preventDefault()
      performViewTransition(pairs, direction, ...)

  Render:
    <div style={{ display: "none" }} data-framer-name="MorphineController" />
```
