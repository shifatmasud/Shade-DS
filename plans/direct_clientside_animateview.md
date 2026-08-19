# Tech Spec 

1. **Objective**
- **Problem Statement**: The existing implementation in `/framer/ArticleImageTransition.tsx` captures element styles to storage, spawns an absolute overlay clone (`fromElement`) on `document.body`, and artificially hides destination elements (`toElement`). In modern client-side React/Framer applications, `animateView` is designed to operate directly on live DOM nodes without synthetic overlays, DOM cloning, or element hiding hacks.
- **Solution Overview**: Transition to a direct client-side `animateView` workflow. Directly pass live source (`fromElement`) and destination (`toElement`) nodes to `animateView(update, transition).add(fromElement, toElement)`, while scoping `animate()` exclusively to fade and blur transitions for non-shared surrounding page elements.
- **Scope**: Direct refactor of `/framer/ArticleImageTransition.tsx`.
- **Context**: Standalone Framer code component leveraging Framer Motion's `animateView` and native View Transitions.

2. **Success Criteria**
- **Key Results**:
  - Eliminate DOM clone generation, manual style copying, and `document.body.appendChild(fromElement)` pollution.
  - Eliminate manual pre-hiding (`opacity = "0"`, `visibility = "hidden"`) of destination elements.
  - Direct execution via `animateView(update, transition).add(fromElement, toElement)`.
  - Non-shared surrounding elements / page container gracefully transition with opacity and blur in/out (`opacity: [0, 1]`, `filter: ["blur(16px)", "blur(0px)"]`).
  - Shared morph targets remain sharp and unblurred throughout the animation.
  - Clean build with zero TypeScript compilation errors.
- **Non-Negotiables**:
  - Standalone component integrity in `/framer/ArticleImageTransition.tsx`.
  - Strict preservation of `Dock.tsx` and `README.md` immunity.

3. **Project Requirements**
- [x] Create tech spec plan in `/plans/direct_clientside_animateview.md`.
- [x] Refactor `/framer/ArticleImageTransition.tsx` to eliminate overlay cloning and destination hiding.
- [x] Implement direct `animateView(update, transition).add(fromElement, toElement)`.
- [x] Apply page fade and blur animation to non-morphing elements during the transition.
- [x] Verify build via `compile_applet`.

4. **Architecture Decisions**
- **Direct Compositor Snapshotting**: Instead of serializing CSS styles and recreating a synthetic `div`, `animateView` lets the browser compositor capture the live element directly before and after the DOM/route update.
- **Sharp Shared Target vs Blurred Surroundings**: Surrounding containers are animated with `filter: blur` and `opacity`, leaving the targeted shared elements morphing sharply at native resolution.
- **Simplified Client State**: Reduces code complexity by ~60%, eliminating snapshot serialization parsing errors, stale geometry mismatches, and multi-timer cleanup race conditions.

5. **Pseudo Code**
```shade-dsl
COMPONENT ArticleTransition
  DATA
    props: { snapshotId, targetName, transition }
    ref: activeAnimationsRef, liveSourceElRef
  LOGIC
    action: executeDirectViewTransition(fromEl, toEl, updateDom)
      animate: viewTransition = animateView(updateDom, transition).add(fromEl, toEl)
      animate: pageFade = animate(pageTarget, { opacity: [0, 1], filter: ["blur(16px)", "blur(0px)"] }, transition)
    event: onPointerDown(target)
      action: captureLiveSourceReference(target)
    effect: onMount/routeUpdate
      action: performDirectViewMorphIfTargetFound()
  RENDER
    SEMANTIC HTML JSX TAGS
      div [style: { width: 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }]
```
