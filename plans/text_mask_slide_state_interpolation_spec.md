# Tech Spec - Text Mask Slide State Interpolation & Stagger Correction

1. **Objective**
   - **Problem Statement**: 
     1. Transitions between "Start (Hidden)" and "End (Visible)" states cause 0 slide animation. This happens because Framer Motion's `animate` function is unable to parse the custom inline `translate3d` style string set on the element's start position, assuming a starting offset of `0` and resulting in an immediate jump.
     2. In addition, when props change mid-transition, the entire text content is re-split by `SplitText`, destroying old DOM nodes and losing all animation state. This makes smooth interpolation impossible.
     3. The stagger order needs to be reversed when transitioning from End (Visible) to Start (Hidden).
   - **Solution Overview**: 
     1. Isolate the text splitting logic from the animation logic. Re-split only when the layout structure changes (`splitMode`, `mask`, `resizeKey`), while preserving DOM nodes on animation state changes (`animeState`, `animeType`, `fade`, `blur`).
     2. Use Framer Motion's `animate` with a zero-duration call to set the initial style properties. This registers the properties correctly with Framer Motion's internal cache, preventing parsing failures and enabling seamless animation.
     3. When `animeState` changes without a re-split, stop active controls and trigger a new animation to the new target coordinates. Do not reset coordinates to start positions; let Framer Motion pick up the current active values and interpolate seamlessly.
     4. Calculate `isReversed` based on `targetState === "entering"` and reverse the stagger index delay accordingly.

2. **Success Criteria**
   - Transitioning from Start (Hidden) to End (Visible) runs a fully-fluid slide animation (not 0 slide/jump).
   - Seamless interpolation from the exact mid-transition state when props change.
   - Stagger order is reversed when transitioning from End (Visible) to Start (Hidden).
   - Passes typescript compilation and lint checks.

3. **Project Requirements**
   - Refactor `framer/TextMaskSlide.tsx` to divide responsibilities between:
     - Text Splitting: runs in `useGSAP` gated by `splitMode`, `mask`, and `resizeKey`. Sets a ref `isNewElementsRef.current = true` and updates a local trigger key.
     - Animation Execution: runs in a standard `useEffect` gated by `animationTriggerKey`, `animeState`, `animeType`, `fade`, `blur`, `stagger`, `transition`.
   - Update the initial style setter to use `animate` with `duration: 0` if `isNewElementsRef.current` is true, then set the ref to false.
   - For regular animation, call `animate` to the target coordinates, automatically interpolating from current values.
   - Handle reversed stagger delays based on whether `targetState === "entering"`.

4. **Architecture Decisions**
   - **Preserving DOM Nodes**: By not re-splitting on animation state changes, we avoid expensive DOM operations and keep the animation targets stable, enabling native interpolation.
   - **Framer Motion Native Caching**: Calling `animate(el, startState, { duration: 0 })` bypasses custom transform string parsing limitations of plain HTML elements.

5. **Pseudo Code**
   ```typescript
   // On SplitText Setup:
   splitInstancesRef.current = { child: childSplit, parent: parentSplit }
   isNewElementsRef.current = true
   setAnimationTriggerKey(prev => prev + 1)

   // On Animation Hook:
   if (isNewElementsRef.current) {
       animate(el, startCoords, { duration: 0 })
   }

   if (isImmediate) {
       animate(el, targetCoords, { duration: 0 })
   } else {
       const isReversed = targetState === "entering"
       const itemDelay = isReversed 
           ? (targets.length - 1 - index) * stagger 
           : index * stagger

       animate(el, targetCoords, { ...transition, delay: itemDelay })
   }
   isNewElementsRef.current = false
   ```
