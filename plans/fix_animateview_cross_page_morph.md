# Tech Spec - Fix animateView Cross-Page Morph Transition

1. **Objective**
- **Problem Statement**: After removing snapshot persistence and the `fromElement` initial-state setup, transitions completely stopped working across page navigations. In cross-page navigation, the source element has already been unmounted by the time the destination page mounts; without reconstructing the pre-mutation source state for `animateView(update)`, the browser detects no DOM delta and skips all animations.
- **Solution Overview**: Restore robust `sessionStorage` snapshot persistence with bidirectional navigation support. Use `animateView(update, transition).add(fromElement, toElement)` with clean DOM state switching inside `update()`, while isolating page-level blur & fade transitions to the surrounding container so the morphing element remains crisp and sharp.
- **Scope**: `/framer/ArticleImageTransition.tsx`.
- **Context**: Framer standalone component for bidirectional cross-page image/card morph transitions.

2. **Success Criteria**
- **Key Results**:
  - Clicking any card on the listing page captures source snapshot and triggers smooth exit transition.
  - Landing on the article page instantly initiates sharp morph from source snapshot to hero element.
  - Back/exit navigation triggers reverse morph back to the matching grid card.
  - Page-level fade and blur (`opacity`, `filter`) are applied to the background/page container without blurring the sharp morphing card.
  - Seamless, glitch-free execution across desktop and touch devices.
  - Zero TypeScript and build errors (`compile_applet` clean).
- **Non-Negotiables**:
  - Standalone component integrity in `/framer/ArticleImageTransition.tsx`.
  - Immunity preservation for `Dock.tsx` and `README.md`.

3. **Project Requirements**
- [x] Create tech spec plan in `/plans/fix_animateview_cross_page_morph.md`.
- [x] Restore `sessionStorage` snapshot reading and writing in `ArticleImageTransition.tsx`.
- [x] Implement `executeMorphWithAnimateView` with pre-mutation `fromElement` and post-mutation `toElement` within `animateView(update).add(fromElement, toElement)`.
- [x] Ensure surrounding page containers fade & blur smoothly while morphing elements stay sharp.
- [x] Verify build with `compile_applet`.

4. **Architecture Decisions**
- **Why Pre-Mutation `fromElement` is Required**: In web and Framer navigation, Page A unmounts when Page B mounts. Native View Transitions require a delta between old and new states. Creating the temporary pre-mutation `fromElement` at the snapshot coordinates provides `animateView` with the exact `from` geometry to morph into `toElement`.
- **Surrounding Isolation**: Surrounding page elements are animated with `opacity` and `filter: blur()`, while `animateView` handles the shared morph group natively.

5. **Pseudo Code**
```shade-dsl
COMPONENT ArticleTransition
  DATA
    props: { snapshotId, targetName, transition }
    ref: activeAnimationsRef, hasPlayedRef, lastPlayedUrlRef
  LOGIC
    action: captureSnapshot(candidate, direction, storageKey)
      storage: sessionStorage.setItem(storageKey, JSON.stringify(snapshot))
      animate: pageExit = animate(pageTarget, { opacity: 0, filter: "blur(16px)" }, exitTransition)
    action: executeMorph(bestTarget, snapshot, storageKey)
      dom: fromElement = createSourceSnapshotElement(snapshot)
      dom: toElement = bestTarget.imageEl
      animate: viewTransition = animateView(update => {
        fromElement.style.display = "none"
        toElement.style.visibility = "visible"
        toElement.style.opacity = "1"
      }, transition).add(fromElement, toElement)
      animate: pageEnter = animate(pageTarget, { opacity: [0, 1], filter: ["blur(16px)", "blur(0px)"] }, transition)
    effect: onMount/routeChange
      action: checkReadyAndExecuteMorph()
      action: bindPointerListeners(targets)
      action: bindExitListeners()
  RENDER
    SEMANTIC HTML JSX TAGS
      div [style: { width: 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }]
```
