# Tech Spec 

1. **Objective**
Add `mask` (on/off toggle) and `animateOnLoad` (trigger on page load vs only on prop change) properties to `framer/TextMaskSlide.tsx` to enable precise layout clipping control and control of initial load animation behavior.

2. **Success Criteria**
- Expose a `mask` boolean prop (default: `true`) to control the outer wrapper's overflow style (`hidden` vs `visible`).
- Expose an `animateOnLoad` boolean prop (default: `true`) to control whether the reveal animation plays automatically on page load when no other props have changed.
- If `animateOnLoad` is `false` and no props have changed since mount, position the elements immediately in their initial/hidden (`entering`) coordinates without triggering Framer Motion's animation controls.
- When any prop (e.g., `animeState`, `animeType`, `mask`) is changed later, the reveal animation triggers and plays normally.
- Expose both new props cleanly in `addPropertyControls`.
- Zero TypeScript, lint, or compilation errors.

3. **Project Requirements**
- [x] Create technical specification plan in `/plans/text_mask_slide_features_spec.md`.
- [ ] Update `TextMaskSlideProps` interface to include `mask` and `animateOnLoad`.
- [ ] Destructure `mask` and `animateOnLoad` with sensible default values (`true`) in the `TextMaskSlide` component parameters.
- [ ] Implement `hasPropChanged` tracking using `useRef` to detect prop alterations after initial mount.
- [ ] Update the `overflow` style mapping in `initializeAndSplit()` to react to the `mask` prop (`el.style.overflow = mask ? "hidden" : "visible"`).
- [ ] Update the `fromProp` effect logic to check `!animateOnLoad && !hasPropChanged.current` and position immediately in the initial state rather than playing the animation.
- [ ] Include `mask` and `animateOnLoad` in all relevant effect dependency arrays.
- [ ] Add `mask` and `animateOnLoad` to the component's `addPropertyControls` definition.
- [ ] Run `lint_applet` and `compile_applet` to verify correctness.

4. **Architecture Decisions**
- **Robust Change Detection**: We track initial prop values using `useRef` and compare them in a `useEffect` hook. If any tracked prop diverges from its mount value, we set `hasPropChanged.current = true`. This provides a reliable, frame-agnostic way to identify if a prop was changed after the page load.
- **Dynamic Mask Style**: Setting `el.style.overflow = mask ? "hidden" : "visible"` allows standard line/word split styling but enables or disables the actual hard clip boundaries on the fly.
- **Initial Instant Rendering**: When `animateOnLoad` is disabled and no props are modified on load, we call `initializeAndSplit()` but apply the starting position style coordinates instantly rather than spawning an `animate` control. This keeps the text prepared and hidden cleanly.

5. **Pseudo Code**

```
COMPONENT TextMaskSlide
  DATA
    props: mask (boolean, default true), animateOnLoad (boolean, default true), ...otherProps
    refs: hasPropChanged (boolean), initialProps (object)

  LOGIC
    effect trackPropChanges:
      if any of otherProps != initialProps.current:
        hasPropChanged.current = true

    action initializeAndSplit:
      ...
      parentTargets.forEach((el) => {
        el.style.overflow = mask ? "hidden" : "visible"
      })
      ...

    effect triggerAnimation:
      if trigger != "scroll":
        if !animateOnLoad and !hasPropChanged.current:
          // Page load with no changes -> position immediately without animating
          targets = initializeAndSplit()
          applyStyles(targets, getCoordinates("entering"))
          return
        
        // Otherwise, animate normally
        animateToState(targetState)
```
