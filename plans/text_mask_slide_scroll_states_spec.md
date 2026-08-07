# Tech Spec - TextMaskSlide Scroll States and Prop Control

1. **Objective**
Expand `framer/TextMaskSlide.tsx` to support discrete animation states, scroll-driven triggers, and direct prop-driven animations, integrated seamlessly with sibling text binding.
- **Animation States**: Support distinct `slideUp` (revealing), `stationary` (at rest), and `slideDown` (concealing) states.
- **Triggers**: Add `fromProp` (animating reactively when an `animState` prop changes) and `onScroll` (animating smoothly based on viewport scroll progress).
- **Binding Mode**: Fully support `sibling` mode to let a text element on the canvas act as the host, allowing the component to hide, split, and animate its sibling.

2. **Success Criteria**
- Seamless transition between `slideUp`, `stationary`, and `slideDown` states.
- Support `trigger: "fromProp"` where changing the `animState` prop immediately triggers the corresponding reveal or conceal stagger animation.
- Support `trigger: "onScroll"` where the split elements dynamically slide up as they enter the viewport, remain stationary in the center, and slide down as they exit the viewport.
- Preserve full reliability of the `sibling` binding mode, ensuring the targeted sibling is properly hidden, split, wrapped in overflow-hidden masks, and animated.
- Strict type-safety, zero linter/compiler errors, and full compliance with Shade DSL rules (DATA -> LOGIC -> RENDER) and AGENTS.md theme tokens.

3. **Project Requirements**
- [ ] Create Tech Spec plan in `/plans/text_mask_slide_scroll_states_spec.md`.
- [ ] Extend properties in `addPropertyControls` for `animState` (slideUp, stationary, slideDown) and `trigger` (onScroll, fromProp, etc.).
- [ ] Implement `trigger === "fromProp"` reactive handler to trigger animations on `animState` changes.
- [ ] Implement `trigger === "onScroll"` tracker using Framer Motion's `useScroll` and `useTransform` / `useMotionValueEvent` to map scroll progress to the three states.
- [ ] Ensure `bindingMode === "sibling"` discovers sibling text, hides the original sibling, and performs the split animation dynamically.
- [ ] Maintain full accessibility fallback and SSR compliance.
- [ ] Validate implementation via `lint_applet` and `compile_applet`.

4. **Architecture Decisions**
- **State Control**: Rather than running infinite timelines, we transition between states using Framer Motion's imperative `animate()` API. This allows us to reuse the existing rich stagger, spring transition, rotation, and blur parameters for both prop-driven and scroll-zone changes.
- **Scroll Mapping**: When `trigger === "onScroll"`, we track the element's position relative to the viewport using Framer Motion's `useScroll`. We divide the scroll range [0, 1] into three distinct logical zones:
  - Entering [0.0 to 0.25]: Slides up from bottom into center.
  - Mid-Viewport [0.25 to 0.75]: Remains stationary and fully visible.
  - Exiting [0.75 to 1.0]: Slides down to bottom out of view.
  By tracking the active zone, we trigger snappy, staggered animations when crossing zone boundaries, giving an extremely polished, high-fidelity responsive effect.

5. **Pseudo Code**

```
COMPONENT TextMaskSlide
  DATA
    props: text, splitMode, bindingMode, trigger, animState, ...existingAnimProps
    state: isClient (boolean), currentZone (string)
    refs: containerRef, splitInstance, activeControls

  LOGIC
    action performTransition(targetState):
      targets = getSplitTargets()
      stopActiveControls()

      // Set state based on targetState
      targets.forEach((el, index) => {
        let fromX = "0%", fromY = "0%", opacityVal = 1
        let toX = "0%", toY = "0%", toOpacity = 1

        if (targetState == "slideUp") {
          fromY = "110%"
          opacityVal = fade ? 0 : 1
          toY = "0%"
          toOpacity = 1
        } else if (targetState == "slideDown") {
          fromY = "0%"
          opacityVal = 1
          toY = "110%"
          toOpacity = fade ? 0 : 1
        } else { // stationary
          toY = "0%"
          toOpacity = 1
        }

        // Run animation with stagger
        animate(el, { y: toY, opacity: toOpacity }, { ...transition, delay })
      })

    effect handlePropTrigger:
      if trigger == "fromProp":
        performTransition(animState)

    effect handleScrollTrigger:
      if trigger == "onScroll":
        useScroll(containerRef) -> scrollYProgress
        onChange(scrollYProgress) -> val:
          let newZone = "stationary"
          if val < 0.25: newZone = "slideUp"
          else if val > 0.75: newZone = "slideDown"

          if newZone != currentZone:
            setZone(newZone)
            performTransition(newZone)

  RENDER
    <Tag ref={containerRef} ...>
      ...
    </Tag>
```
