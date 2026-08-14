# Tech Spec - Parasitic SplitText Mask Slide (GSAP SplitText x Framer Motion Bridge)

1. **Objective**
   - **Problem Statement**: Standard text animations in React either force intrusive text wrapping that disrupts CMS/Framer rich text rendering, or fail to achieve two-layer masking (outer overflow clip + inner translation) combined with physical spring choreography and scroll scrubbing.
   - **Solution Overview**: Document and standardize the "Parasitic SplitText & Double-Masking" pattern demonstrated in `framer/TextMaskSlide.tsx` into `/skills/framer-motion-gsap-bridge/SKILL.md`. This pattern uses GSAP's `SplitText` inside `useGSAP` for two-tier DOM splitting (inner animated element + outer mask envelope) targeting sibling nodes, and drives animations using Framer Motion's `animate()` engine (for springs/staggers) or `useScroll` / `useMotionValueEvent` (for viewport scrubbing).
   - **Scope**: Add a dedicated, comprehensive section in `/skills/framer-motion-gsap-bridge/SKILL.md` detailing architecture, DOM hierarchy, double-masking mechanism, Framer `animate()` cache synchronization, staggered spring execution, scroll scrubbing, and state continuity.
   - **Context**: Framer Code Components, GSAP `SplitText` + `useGSAP`, Framer Motion `animate`, `useScroll`, `useMotionValueEvent`.

2. **Success Criteria**
   - **Clear Architectural Breakdown**: Thoroughly explain the GSAP SplitText DOM generation + Framer Motion physical animation handoff.
   - **Double-Masking Pattern**: Detail how outer overflow containers and inner transform targets isolate clipping bounds for lines, words, and characters.
   - **Framer Motion Integration**: Illustrate zero-duration cache sync (`animate(el, startValues, { duration: 0 })`), staggered spring playback (`animate(el, targetValues, { ...transition, delay })`), and scroll-driven scrubbing.
   - **AGENTS.md & SKILL Compliance**: Adhere strictly to skill formatting rules (H1-delimited contexts, type definitions, property control schemas).

3. **Project Requirements**
   - [x] Analyze `framer/TextMaskSlide.tsx` mechanics (parasitic DOM discovery, two-pass `SplitText`, zero-duration cache init, staggered Framer `animate`, scroll interpolation).
   - [x] Create Tech Spec in `/plans/`.
   - [x] Edit `/skills/framer-motion-gsap-bridge/SKILL.md` to add a new top-level H1 section: `# Parasitic SplitText & Double-Masking Pattern (TextMaskSlide)`.
   - [x] Verify skill markdown structure and clarity.

4. **Architecture Decisions**
   - **Decision: Two-Tier SplitText Structure (Inner + Outer)**:
     - *Rationale*: Splitting text into `childSplit` (inner) and `parentSplit` (outer) allows the parent to act as an `overflow: hidden` mask envelope while the child receives 3D hardware-accelerated transforms without clipping adjacent lines.
   - **Decision: Zero-Duration Framer Cache Sync**:
     - *Rationale*: Calling `animate(el, startValues, { duration: 0 })` on dynamically injected DOM nodes ensures Framer Motion's internal transform tracking is synchronized before firing the spring transition.
   - **Decision: Dual Driver (Prop Springs vs. Scroll Scrubbing)**:
     - *Rationale*: Unifies one-shot property triggers (`animate(progress/el, ...)`) and continuous timeline scrub (`useMotionValueEvent(scrollYProgress, "change")`) in a single cohesive component.

5. **Pseudo Code (Written in Shade DSL)**

```shade
DATA:
  props:
    trigger: "fromProp" | "scroll"
    splitMode: "lines" | "words" | "chars"
    transition: TransitionConfig
    stagger: float = 0.05
    mask: boolean = true
  refs:
    containerRef: DOMElement
    splitInstances: { child: SplitTextInstance, parent: SplitTextInstance }
    lastState: "entering" | "stationary" | "exiting"

LOGIC:
  init:
    useGSAP(() => {
      sibling = findSiblingTextElement(containerRef)
      childSplit = new SplitText(sibling, { type: splitMode, ...innerClasses })
      parentSplit = new SplitText(childSplit[splitMode], { type: splitMode, ...outerMaskClasses })
      splitInstances = { child: childSplit, parent: parentSplit }
      return () => { parentSplit.revert(); childSplit.revert() }
    }, [splitMode, mask])

  animateProps:
    targets = splitInstances.child[splitMode]
    targets.forEach((el, i) => {
      animate(el, startCoords, { duration: 0 }) // Sync Framer cache
      animate(el, targetCoords, { ...transition, delay: i * stagger })
    })

  scrollScrub:
    useMotionValueEvent(scrollYProgress, "change", (latest) => {
      applyScrollScrub(latest, targets, stagger)
    })

RENDER:
  <div ref={containerRef} style={{ display: isOnCanvas ? "flex" : "none" }}>
    ⚡ Text Mask Slide Controller
  </div>
```
