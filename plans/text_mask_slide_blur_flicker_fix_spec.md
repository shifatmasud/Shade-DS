# Tech Spec: Text Mask Slide Blur Flicker Resolution

1. **Objective**
   - **Problem Statement**: In `framer/TextMaskSlide.tsx`, when text splits into nested inner and outer layout layers (for masking) and undergoes slide animations with a `blur` filter, the text transitions often suffer from noticeable flickering. This is particularly severe on Safari and Chrome during the final settle phase of the animation when animating from start (hidden) to end (visible).
   - **Root Cause**: 
     1. The `filter` property is always applied as `filter: "blur(0px)"` even when the `blur` property is set to `0` (default) or when the element is stationary/rested.
     2. Retaining `filter: blur(0px)` forces the browser to keep a separate GPU compositing layer for each individual character/word/line. Transitioning between filtered and unfiltered layouts or merely maintaining `blur(0px)` causes Safari/Chrome to trigger layout paint cycles, resulting in flickering and blurry text rendering (loss of subpixel antialiasing).
     3. Heavy opacity + blur combined animations in Chromium can drop layers or stutter when not properly isolated via CSS performance hints (`will-change`, `backface-visibility`).
   - **Solution Overview**: 
     1. If the `blur` prop is `0` (disabled), we completely bypass writing or animating the `filter` style altogether, shielding the default state from any filter-induced flicker.
     2. If `blur` is active (> 0), we animate the filter normally, but clean it up immediately upon animation completion by setting `el.style.filter = "none"` inside Framer Motion's `onComplete` hook.
     3. Inject performance/stabilization hints (`willChange: "transform, opacity, filter"`, `backfaceVisibility: "hidden"`, `WebkitBackfaceVisibility: "hidden"`) to the animated split-inner elements during initial layout in `useGSAP` to stabilize compositing.

2. **Success Criteria**
   - **Prone-to-flicker removal**: Setting `blur: 0` applies absolutely zero `filter` styling to the text spans/divs.
   - **Pristine settle state**: Animating to `end` removes any active `filter` on complete, returning to native crisp rendering.
   - **Smooth interpolation**: Standard spring animation remains buttery smooth without sudden jumps.
   - **Zero-regressions**: Full compatibility with scroll-trigger mode and other animation types (lines/words/chars).

3. **Project Requirements**
   - Modify `getCoordinates` to return `blurVal: "none"` instead of `"blur(0px)"` when stationary or when `blur === 0`.
   - Update `useGSAP` split target initialization:
     - Apply GPU-promoting stability styles: `willChange: "transform, opacity" + (blur > 0 ? ", filter" : "")`, `backfaceVisibility: "hidden"`, and `-webkit-backface-visibility: hidden`.
     - Only apply `el.style.filter` if `blur > 0`.
   - Update `useEffect` (Prop-based animation loop):
     - Only pass the `filter` property to `animate()` if `blur > 0`.
     - Bind an `onComplete` callback to the `animate()` options which clears the filter (`el.style.filter = "none"`) once the target state settles as `"stationary"`.
   - Update `applyScrollScrub` (Scroll-based animation loop):
     - Avoid writing `el.style.filter` if `blur === 0`.

4. **Architecture Decisions**
   - **Direct-to-DOM Post-Animation Styles**: Bypassing React re-renders by mutating the element styles directly inside the native animation callbacks (`onComplete`). This is consistent with Shade DSL's Zero-Rerender runtime guidelines.
   - **Conditional Filter Lifecycle**: Treating the `filter` layer as transient. It is present only during active animations and deleted during static resting layouts.

5. **Pseudo Code (Shade DSL Component Style)**

```typescript
COMPONENT TextMaskSlide
  DATA
    props: TextMaskSlideProps
    ref: containerRef, splitInstancesRef, activeControlsRef
  LOGIC
    ACTION getCoordinates(zone, type, fade, blur)
      if zone == "stationary" or blur <= 0:
        return { x: "0%", y: "0%", opacity: 1, blurVal: "none" }
      ...
      blurVal = `blur(${blur}px)`
      return { x, y, opacity, blurVal }

    EFFECT useGSAP
      split sibling -> parent and child
      for el in animateTargets:
        el.style.willChange = "transform, opacity" + (blur > 0 ? ", filter" : "")
        el.style.backfaceVisibility = "hidden"
        el.style.WebkitBackfaceVisibility = "hidden"
        if blur > 0:
          el.style.filter = initialCoords.blurVal
        else:
          el.style.filter = ""

    EFFECT propAnimation (animeState)
      for el, index in animateTargets:
        animProps = { x: targetCoords.x, y: targetCoords.y, opacity: targetCoords.opacity }
        if blur > 0:
          animProps.filter = targetCoords.blurVal
          
        animate(el, animProps, {
          ...transition,
          delay: delay,
          onComplete: () => {
            if targetState == "stationary" and blur > 0:
              el.style.filter = "none"
          }
        })

    ACTION applyScrollScrub(latest)
      ...
      styles = interpolateStyle(tEnter, tExit, animeType, fade, blur)
      el.style.transform = styles.transform
      el.style.opacity = styles.opacity
      if blur > 0:
        el.style.filter = styles.filter
      else:
        el.style.filter = ""
```
