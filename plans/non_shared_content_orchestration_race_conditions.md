# Tech Spec 

1. **Objective**
- **Problem Statement**: Page transitions need complete orchestration between shared elements and non-shared surrounding content. Currently, non-shared elements lack isolated exit/enter animation with translation and blur, and transitions lack robust race condition handling, transition ID tracking, and cancellation cleanups.
- **Solution Overview**: Implement section 4 (Non-shared content separate fade/blur/translate animation without affecting shared targets), section 5 (Transition orchestration pipeline for outgoing capture and incoming morph), and section 6 (Race conditions handling with transition IDs, simultaneous transition locking, safe cancellation, stuck style cleanup, and fallback timeout) in `/framer/ArticleImageTransition.tsx`.
- **Scope**: Confined to `/framer/ArticleImageTransition.tsx`.
- **Context**: Standalone Framer Code Component for seamless shared element and page content transitions.

2. **Success Criteria**
- **Key Results**:
  - Non-shared content participates in a separate transition (`opacity: 0`, `filter: blur(...)`, `transform: translate(...)` on exit; initialized at `opacity: 0`, blur, translated position then animated to `opacity: 1`, `blur(0)`, original position on enter).
  - Shared targets are strictly excluded from the generic fade/blur/translate animations to maintain crisp visual fidelity during morphing.
  - Outgoing and incoming transition orchestration executes in the specified sequence (detect → identify shared targets → write sessionStorage record with transitionId → animate non-shared out → render destination → detect record → connect targets → animate morph + non-shared in → cleanup sessionStorage).
  - Multiple simultaneous transitions are prevented with a global active transition controller.
  - Interrupted navigations cancel/replace previous transitions safely and reset any modified inline styles (opacity, filter, transform) so nothing is left stuck.
  - Transition IDs prevent stale pages from consuming newer transition records.
  - Fallback timeouts prevent navigation from being blocked indefinitely.
  - Full TypeScript build and lint pass with zero errors.
- **Non-Negotiables**:
  - Maintain standalone component portability in `/framer/ArticleImageTransition.tsx`.
  - Preserve Dock and README immunity.

3. **Project Requirements**
- [x] Create tech spec plan in `/plans/non_shared_content_orchestration_race_conditions.md`.
- [x] Implement `getSurroundingElements` to discover non-shared elements while excluding shared target and its descendants.
- [x] Implement style tracking and safe style restoration for non-shared elements on cancellation/completion.
- [x] Implement unique `transitionId` in `Snapshot` record and verification during consumption.
- [x] Implement global transition lock and cancellation controller to handle race conditions.
- [x] Implement exit animation: non-shared elements animate to `opacity: 0`, `filter: "blur(12px)"`, `transform: "translateY(16px)"`.
- [x] Implement enter animation: non-shared elements initialize at `opacity: 0`, `filter: "blur(12px)"`, `transform: "translateY(16px)"` and animate to `opacity: 1`, `filter: "blur(0px)"`, `transform: "translateY(0px)"`.
- [x] Implement timeout fallbacks and sessionStorage cleanups.
- [x] Verify build via `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
- **DOM Hierarchy Isolation**: `getSurroundingElements` walks structural children from the page root down. If a container holds the shared target, it traverses its children to isolate only non-target siblings, ensuring the shared target never inherits parent filters or transforms.
- **Stateful Cleanup Protocol**: A style snapshot map records previous inline values of `opacity`, `filter`, and `transform` before applying exit/enter styles, guaranteeing zero stuck styles on completion or abort.
- **Global Controller & Transition ID**: A singleton controller (`globalActiveTransition`) tracks running animations, timers, and DOM nodes. Starting a new transition aborts any active one and restores DOM styles cleanly before proceeding.

5. **Pseudo Code**
```shade-dsl
COMPONENT ArticleTransition
  DATA
    props: { snapshotId, targetName, transition }
    type Snapshot: { transitionId, direction, cardIndex, x, y, width, height, ... }
    ref: activeTransitionRef, hasPlayedRef, lastPlayedUrlRef
  LOGIC
    action getSurroundingElements(targetEl):
      walk DOM tree from page root
      exclude targetEl, targetEl.children, and targetEl ancestors
      return nonSharedElements[]

    action animateNonSharedExit(elements, transition):
      backupStyles(elements)
      return animate(elements, { opacity: 0, filter: "blur(12px)", transform: "translateY(16px)" }, transition)

    action animateNonSharedEnter(elements, transition):
      setInitialStyles(elements, { opacity: 0, filter: "blur(12px)", transform: "translateY(16px)" })
      return animate(elements, { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }, transition)

    action cancelActiveTransition():
      stopAllAnimations()
      removeTemporaryNodes()
      restoreAllElementStyles()

    effect onMount/UrlChange:
      if incoming snapshot with valid transitionId:
        cancelActiveTransition()
        start incoming orchestration:
          find targetEl
          surrounding = getSurroundingElements(targetEl)
          animateSharedMorph(fromEl, targetEl)
          animateNonSharedEnter(surrounding)
          cleanup sessionStorage and restore styles on complete
      bind outgoing navigation listeners:
        on click/pointerdown:
          cancelActiveTransition()
          write snapshot with new transitionId
          animateNonSharedExit(surrounding)
  RENDER
    SEMANTIC HTML JSX TAGS
      div [style: { width: 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }]
```
