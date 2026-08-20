# Tech Spec - Morphine Back Button Support via Existing Morph Nav & Identity Pipelines

1. **Objective**
- **Problem Statement**:
  - In `/framer/test/Morphine.tsx`, browser Back button navigation (as well as browser Forward button and programmatic `history.back()`) does not trigger Morphine's shared-element view transitions or reverse morphing because `popstate` is not observed and `navigate` skips `navigationType === "traverse"`.
  - When returning from a detail page to a list page via the browser back button, the page updates without the fluid reverse morph transition into the originating card (e.g. `product-2`).
- **Solution Overview**:
  - Connect browser history traversal events (`popstate` and Navigation API `navigate` traverse) directly into Morphine's existing morph navigation and identity pipelines.
  - Reuse the locked reverse navigation pipeline (`tagActiveOriginCardInNewDOM`, `getStoredOriginMemory`, `detectNavigationDirection`) and identity pairing pipeline (`generateUID`, `resolveBidirectionalPairs`) to automatically identify the originating card and assign matching `data-morphine-id` attributes.
  - Coordinate history transitions with `animateView()` and Framer's client router while maintaining the global transition lock (`isTransitioning`, cooldown) to prevent re-entrant triggers, race conditions, or post-enter blur bursts.
- **Scope**: Standalone Framer component in `/framer/test/Morphine.tsx`.
- **Context**: Framer Code Component for shared-element page transitions, CMS card-to-detail morphing, and fluid layout navigation.

2. **Success Criteria**
- **Key Results**:
  - Clicking the browser Back button (or pressing Alt+Left / Cmd+[, mouse back button, swipe back, or calling `window.history.back()`) from a detail page triggers the reverse morph transition back into the exact originating card in the list.
  - Clicking the browser Forward button triggers forward morph transition with matching destination identity tags.
  - Existing forward and on-page reverse navigation pipelines remain intact with zero regressions to locked pipelines.
  - No post-transition blur bursts, duplicate transitions, or infinite loops occur.
  - Component is 100% standalone, SSR-safe, and builds cleanly with zero TypeScript or lint errors.

3. **Project Requirements**
- [ ] Implement history traversal listener (`handlePopState` / `popstate`) in `framer/test/Morphine.tsx` that integrates with existing `performViewTransition`.
- [ ] Connect `handlePopState` and `handleNavigate` (traverse) to the existing `detectNavigationDirection`, `resolveBidirectionalPairs`, and `OriginMemory` pipelines.
- [ ] Ensure `waitForDomChange(350)` synchronizes with Framer router DOM updates during history pops.
- [ ] Enforce the global navigation lock (`getGlobalState().isTransitioning`) and cooldown window (350ms) across all traversal triggers to prevent double-firing.
- [ ] Verify standalone compilation and zero lint regressions via `compile_applet`.

4. **Architecture Decisions**
- **Reuse Existing Locked Pipelines Without Duplication**:
  - *Decision*: Route Back button events through `resolveBidirectionalPairs` (which already contains the locked reverse pair resolution step 3B) and `tagActiveOriginCardInNewDOM` (which handles slug, index, URL, and title matching for the originating card).
  - *Why*: Guarantees exact behavioral parity between on-page back buttons and browser history back buttons while honoring the locked pipeline constraints.
- **Universal History Event Strategy (`popstate` + Navigation API)**:
  - *Decision*: Attach a capturing `popstate` listener on `window` to handle universal history changes across all browsers (Chrome, Safari, Firefox, iOS). When Navigation API is present, ensure traverse events coordinate cleanly through `event.intercept` or delegate to `popstate` without double execution.
  - *Why*: Framer's router renders route changes on `popstate`. Wrapping `waitForDomChange` within `animateView` ensures `animateView` captures the old snapshot, allows Framer to mount the list page, applies identity tags, and executes the reverse morph.
- **State Mutex & Cooldown Guarding**:
  - *Decision*: Check `isBusy()` (transitioning or within 350ms of transition completion) at the start of `handlePopState` and `handleNavigate`.
  - *Why*: Completely eliminates secondary re-entrant transitions caused by `replaceState` in `syncCanonicalRouteUrl` or router re-renders, preventing the "blur burst" defect.

5. **Pseudo Code**
```shade
Component Morphine:
  Data:
    globalState = window.__MORPHINE_STATE__ ?? { isTransitioning: false, lastTransitionEndTime: 0 }
    targetFromNames = props.targetFromNames ?? "Card"
    targetToNames = props.targetToNames ?? "Card"
    transition = props.transition

  Logic:
    Function isBusy():
      If globalState.isTransitioning Or (Date.now() - globalState.lastTransitionEndTime < 350):
        Return True
      Return False

    On PopState (event):
      If isBusy(): Return
      
      uid = generateUID()
      currentUrl = window.location.href
      
      // Utilize existing direction detection and bidirectional pair resolution pipeline
      direction = detectNavigationDirection(fromList, toList, null, null)
      pairs = resolveBidirectionalPairs(targetFromNames, targetToNames, null, null, direction, uid)
      
      If Not hasDiscovered(pairs): Return
      
      performViewTransition(pairs, direction, currentUrl, async () => {
        // Wait for Framer's React router to mount the destination DOM
        await waitForDomChange(350)
      }, uid)

    On Navigate (event):
      If Not event.canIntercept Or event.downloadRequest Or event.formData Or event.hashChange:
        Return
      If isBusy(): Return

      // If traverse navigation, determine direction using memory & route hierarchy
      isTraverse = event.navigationType == "traverse"
      forcedDir = isTraverse ? "reverse" : undefined
      
      uid = generateUID()
      pairs = resolveBidirectionalPairs(targetFromNames, targetToNames, null, null, forcedDir, uid)
      If Not hasDiscovered(pairs): Return
      
      direction = pairs[0].direction
      currentUrl = window.location.href
      
      event.intercept({
        async handler():
          await performViewTransition(pairs, direction, currentUrl, async () => {
            await waitForDomChange(350)
          }, uid)
      })

    On Link Click (event):
      // Existing click pipeline executing performViewTransition with preventDefault and router navigation
      ...

  Render:
    <div style={{ display: "none" }} data-framer-name="MorphineController" aria-hidden="true" />
```
