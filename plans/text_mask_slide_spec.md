# Tech Spec 

1. **Objective**
Rewrite `framer/TextMaskSlide.tsx` to be a production-ready Framer Code Component that performs text mask slide-up reveals.
The component will combine:
- **GSAP SplitText** (`import { SplitText } from "gsap/SplitText"`) for splitting text into lines, words, or characters with mask container wrappers (`overflow: hidden`).
- **Framer Motion** (`import { animate, stagger, useInView, motion } from "framer-motion"`) for driving 100% of the animation timelines, staggers, and transitions (no GSAP tweens, no CSS keyframes).
- **Parasitic DOM Binding Pattern**: Can operate as a standalone text component or parasitically latch onto host parent/sibling text nodes in the Framer canvas (e.g., `RichTextContainer`, `p`, `span`, `h1`-`h6`).
- **Full Accessibility**: Uses `aria-label` or offscreen screen-reader fallback for smooth text-to-speech, `aria-hidden="true"` on split visual nodes, and `prefers-reduced-motion` compliance.

2. **Success Criteria**
- Clean Architecture following Shade DSL (DATA -> LOGIC -> RENDER) and Framer component standards.
- Text splitting managed exclusively via GSAP SplitText (`new SplitText(...)`) and cleanly reverted on unmount/update via `split.revert()`.
- Animations driven 100% by Framer Motion's `animate()` API with `stagger()`, custom springs/easings, rotation, blur, and opacity controls.
- Parasitic DOM discovery (`bindingMode`: `"standalone" | "parent" | "sibling" | "auto"`) using `useHost` / DOM traversal to bind to Framer's `RichTextContainer` or native text elements.
- Hydration safe two-phase rendering (`isClient`).
- Property controls for `text`, `splitMode`, `bindingMode`, `trigger`, `duration`, `delay`, `stagger`, `ease`, `direction`, `blurAmount`, `fade`, `rotate`, `scale`, `semanticTag`, `font`, `color`.
- Zero TypeScript or lint errors in `framer/TextMaskSlide.tsx`.

3. **Project Requirements**
- [x] Create technical specification plan in `/plans/text_mask_slide_spec.md`.
- [ ] Implement `framer/TextMaskSlide.tsx` with GSAP SplitText registration and cleanup.
- [ ] Implement Framer Motion `animate` pipeline with stagger and customizable directions (bottom-to-top, top-to-bottom, left-to-right, right-to-left).
- [ ] Implement Parasitic DOM binding logic (auto-discovering host text or parent/sibling nodes when in parasitic mode).
- [ ] Add accessibility features (`aria-label`, `aria-hidden`, screen-reader text, reduced motion bypass).
- [ ] Add property controls (`addPropertyControls`).
- [ ] Verify compilation and type safety using `compile_applet` / `lint_applet`.

4. **Architecture Decisions**
- **Text Splitting vs Animation Engine**: GSAP SplitText excels at line recalculation on window resize and precise mask element creation. Framer Motion excels at reactive animation loops, springs, and Framer UI integration. We isolate SplitText strictly to DOM structure generation and use Framer Motion's imperative `animate()` function to animate the generated element arrays.
- **Parasitic Binding vs Standalone**: Framer users want both options — using the component as a primary text layer OR dropping it as a behavioral overlay next to an existing Framer text frame. Supporting `bindingMode` ("standalone" | "parent" | "sibling" | "auto") gives maximum flexibility.
- **Accessibility**: Standard text splitting can ruin screen-reader pronunciation. We solve this by placing `aria-hidden="true"` on the split structure and exposing a unified `aria-label` or offscreen plain text span on the root element.

5. **Pseudo Code**

```
COMPONENT TextMaskSlide
  DATA
    props: text, splitMode, bindingMode, trigger, manualTrigger, replay, once, duration, delay, stagger, ease, direction, blurAmount, fade, rotate, scale, semanticTag, font, color, style
    state: isClient (boolean), isRevealed (boolean)
    refs: containerRef (HTMLElement), splitInstanceRef (SplitText), animationControlsRef (AnimationPlaybackControls)

  LOGIC
    effect initializeGSAP:
      gsap.registerPlugin(SplitText)

    action getTargetElements:
      if bindingMode == "standalone" or container has own text:
        target = containerRef.current
      else:
        target = findParasiticHostTextElement(containerRef)
      return target

    action splitAndAnimate:
      target = getTargetElements()
      if splitInstanceRef.current: splitInstanceRef.current.revert()
      
      split = new SplitText(target, { type: splitMode, linesClass: "mask-line", wordsClass: "mask-word", charsClass: "mask-char" })
      splitInstanceRef.current = split
      
      elements = split[splitMode]
      applyInitialStyles(elements, { direction, blurAmount, fade, rotate, scale })

      if prefersReducedMotion:
        setFinalStyles(elements)
        return

      animationControlsRef.current = animate(elements, 
        { y: 0, x: 0, opacity: 1, filter: "blur(0px)", rotate: 0, scale: 1 },
        { duration, delay: stagger(staggerAmount, { startDelay: delay }), ease: parseEase(ease) }
      )

    effect triggerOnViewOrLoad:
      if trigger == "whileInView" and inView:
        splitAndAnimate()
      else if trigger == "onLoad":
        splitAndAnimate()

  RENDER
    <Tag ref={containerRef} style={containerStyle} aria-label={text} role="text">
      <span style={visuallyHiddenStyle}>{text}</span>
      <div aria-hidden="true">{isClient ? text : text}</div>
    </Tag>
```
