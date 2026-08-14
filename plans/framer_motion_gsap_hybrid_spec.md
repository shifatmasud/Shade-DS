# Tech Spec - Framer Motion & GSAP Reactive Hybrid Architecture

1. **Objective**
   - **Problem Statement**: Developers often need the physical spring dynamics, reactive gesture handling, and declarative state orchestration of Framer Motion (`useSpring`, `animate`, `useScroll`), alongside the specialized SVG and canvas capabilities of GSAP plugins (MorphSVG, DrawSVG, SplitText, MotionPath). Combining them naively risks race conditions, dual-easing competition, memory leaks, and React re-render thrashing.
   - **Solution Overview**: Establish a zero-overhead, reactive bridge architecture where Framer Motion drives an isolated `MotionValue<number>` representing normalized timeline progress ($0.0 \rightarrow 1.0$), and a paused GSAP timeline with linear easing (`ease: "none"`) subscribes to the `MotionValue` using `useGSAP` to scrub plugins (`MorphSVGPlugin`, `DrawSVGPlugin`, etc.) without React re-renders.
   - **Scope**: Reactive bridge hook/pattern (`useMotionGSAPBridge`), lifecycle safety, MorphSVG/DrawSVG integration, overshoot handling, and performance guarantees.
   - **Context**: Integrates Framer Motion v10+/v11+ and GSAP 3+ (`@gsap/react` / `useGSAP`).

2. **Success Criteria**
   - **Zero Re-render Scrubbing**: Framer `MotionValue.on("change")` scrubs `timeline.progress(latest)` directly on the DOM/SVG layer with 0 component re-renders.
   - **Pure Physics Fidelity**: GSAP tweens configured with `ease: "none"` replicate Framer Motion's springs (stiffness, damping, mass, velocity carryover) with microsecond precision.
   - **Clean Lifecycle & Scope Teardown**: `useGSAP` scoping prevents detached listeners, SVG morphing memory leaks, or stale tween targets.
   - **Overshoot & Boundary Safety**: Graceful handling of spring overshoot ($<0.0$ and $>1.0$) for plugins like MorphSVG and DrawSVG.

3. **Project Requirements**
   - [x] Analyze subscription mechanics between Framer `MotionValue` and GSAP timeline progress.
   - [x] Design normalized timeline scrubbing pattern (`progress(val)` / `totalProgress(val)`).
   - [x] Design integration pattern for GSAP SVG plugins (MorphSVG, DrawSVG).
   - [x] Formulate overshoot mitigation and clamping strategy for SVG path math.
   - [x] Implement robust lifecycle cleanup using `@gsap/react`'s `useGSAP`.
   - [x] Document Shade DSL representation (DATA, LOGIC, RENDER).

4. **Architecture Decisions**
   - **Trade-off: Scrubbing `progress()` vs. GSAP Tick**:
     - *Decision*: Drive GSAP synchronously via `motionValue.on("change", (v) => tl.progress(v))`.
     - *Alternative*: Letting GSAP ticker poll Framer values. *Rejected*: Polling introduces 1-frame latency and phase jitter between animation frames.
   - **Trade-off: Easing Source Authority**:
     - *Decision*: Set `ease: "none"` on all GSAP tweens and let Framer Motion be the single source of truth for temporal curves (springs, custom beziers, inertia).
     - *Benefit*: Eliminates composite curve distortion (e.g. spring easing applied on top of power2.inOut).
   - **Trade-off: Handling Spring Overshoot**:
     - *Decision*: Allow natural progress clamping or custom overshoot handling depending on plugin tolerance (MorphSVG handles $<0$ / $>1$ by extrapolating or can be clamped via `Math.min(Math.max(v, 0), 1)`).

5. **Pseudo Code (Written in Shade DSL)**

```shade
DATA:
  state:
    targetProgress: float = 0.0
    springConfig: { stiffness: 140, damping: 18, mass: 0.8 }
  refs:
    containerRef: DOMElement
    svgPathRef: SVGPathElement
    timelineRef: GSAPTimeline

LOGIC:
  init:
    motionProgress = createMotionValue(0.0)
    springProgress = useSpring(motionProgress, springConfig)
    
    useGSAP(context => {
      // 1. Build paused linear GSAP Timeline
      timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } })
      
      // 2. Add GSAP specialized plugin tweens
      timeline.to(svgPathRef, {
        morphSVG: "#target-shape",
        drawSVG: "0% 100%",
        duration: 1.0
      })
      
      // 3. Reactive Bridge Subscription
      unsubscribe = springProgress.on("change", (latest) => {
        timeline.progress(latest)
      })
      
      return () => {
        unsubscribe()
        timeline.kill()
      }
    }, [containerRef])

  actions:
    triggerForward: () => motionProgress.set(1.0)
    triggerReverse: () => motionProgress.set(0.0)
    animateCustomSpring: (toVal) => animate(motionProgress, toVal, springConfig)

RENDER:
  <Container ref={containerRef}>
    <svg viewBox="0 0 100 100">
      <path ref={svgPathRef} d="M10,10 L90,10 L90,90 L10,90 Z" />
    </svg>
    <Button onClick={triggerForward} />
    <Button onClick={triggerReverse} />
  </Container>
```
