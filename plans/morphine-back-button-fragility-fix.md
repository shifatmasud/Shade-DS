# Tech Spec: Eliminating Intermittent Fragility in Browser Back Button Morphing

1. **Objective**
   - Eliminate intermittent race conditions and timing fragility when navigating backwards via browser Back button or history traversal in `Morphine.tsx`.
   - Ensure 100% deterministic shared-element reverse morph from Detail view to the exact origin Card on the List view.

2. **Success Criteria**
   - Browser Back button navigation triggers reverse shared-element morph reliably every single time.
   - Elimination of premature tagging before React list component mounts in the DOM.
   - Full backward compatibility with Forward navigation, Click navigation, and Enter/Exit fade/blur animations.
   - Code changes strictly confined to `/framer/test/Morphine.tsx`.
   - Standalone compilation passes with zero errors.

3. **Project Requirements**
   - [x] Create Root Cause Analysis in `/RCA/rca-back-button-morph-fragility.md`.
   - [x] Create Tech Spec in `/plans/morphine-back-button-fragility-fix.md`.
   - [ ] Implement `waitForTargetElements` in `/framer/test/Morphine.tsx`.
   - [ ] Update `performViewTransition` to await `waitForTargetElements` prior to tagging destination elements.
   - [ ] Enhance reverse pair discovery fallback in `resolveBidirectionalPairs`.
   - [ ] Compile and verify standalone build.

4. **Architecture Decisions**
   - **Active DOM Target Polling vs Arbitrary Mutation**: Rather than triggering on the first DOM mutation (which could be the unmounting of the detail view), `waitForTargetElements` observes mutations until the expected `[data-framer-name]` nodes actually exist in the document.
   - **Hybrid Observer + rAF Strategy**: Combines `MutationObserver` (event-driven) and `requestAnimationFrame` (frame-driven) to resolve immediately with zero latency as soon as the DOM is populated.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   LOGIC {
     FUNC waitForTargetElements(names, timeoutMs) {
       IF (elementsExist(names)) RETURN elements
       OBSERVE DOM mutations UNTIL (elementsExist(names) OR timeout)
       RETURN foundElements
     }

     FUNC performViewTransition(pairs, direction) {
       animateView(async () => {
         await performNavigation()
         IF direction == "reverse" {
           await waitForTargetElements(targetFromNames)
           tagActiveOriginCardInNewDOM(memory, targetFromNames)
         } ELSE {
           await waitForTargetElements(targetToNames)
           tagForwardDestinationElements(targetToNames)
         }
       })
     }
   }
   ```
