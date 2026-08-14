# Tech Spec - Framer Property Controls & MotionValue x GSAP Architecture Bridge Skill

1. **Objective**
   - **Problem Statement**: Framer designers and developers configure interactive transitions (Spring, Ease, Inertia) using Framer's Property Panel (`ControlType.Transition`), but Framer Motion lacks specialized SVG morphing, path drawing, and timeline sequencing plugins (like GSAP's `MorphSVGPlugin`, `DrawSVGPlugin`, `SplitText`). Conversely, GSAP lacks native integration with Framer's `ControlType.Transition` property control.
   - **Solution Overview**: Create a reusable architecture pattern and formal agent skill (`/skills/framer-motion-gsap-bridge/SKILL.md`) enabling Framer Code Components to accept `transition` props from Framer Property Controls (`ControlType.Transition`), drive a normalized `MotionValue` via Framer's `animate(progressValue, target, transition)`, and scrub a linear GSAP timeline (`ease: "none"`) using `useGSAP`.
   - **Scope**: Skill definition (`SKILL.md`), Framer property control bindings, reactive scrub bridge pattern, overshoot protection, MorphSVG/DrawSVG integration examples, and Framer canvas/preview lifecycle safety.
   - **Context**: Framer Code Components, Framer Motion v10+/v11+, `@gsap/react` (`useGSAP`), GSAP 3.x core + plugins.

2. **Success Criteria**
   - **Full Framer Property Control Compatibility**: Seamlessly accepts `ControlType.Transition` props with user-configured spring stiffness, damping, mass, or easing bezier curves.
   - **Zero Re-render Scrubbing**: Direct `motionValue.on("change")` -> `gsapTimeline.progress()` pipeline without React re-render overhead.
   - **Framer Canvas & Hydration Safe**: Robust against Framer's canvas live-editing, SSR/hydration, and resizing triggers using `useGSAP` with scoped DOM targets.
   - **Compliant Skill Structure**: Adheres strictly to AGENTS.md skill formatting rules (YAML frontmatter, H1-delimited contexts, clean documentation, executable code examples).

3. **Project Requirements**
   - [x] Draft technical specification plan in `/plans/`.
   - [x] Create comprehensive agent skill in `/skills/framer-motion-gsap-bridge/SKILL.md`.
   - [x] Provide exact Framer Code Component template using `addPropertyControls` and `ControlType.Transition`.
   - [x] Provide detailed explanation and patterns for interactive states (Hover, Toggle, Drag, Trigger).

4. **Architecture Decisions**
   - **Decision: Declarative `animate(progress, target, transition)` Driver**:
     - *Rationale*: Passing Framer's `transition` prop directly to Framer Motion's `animate()` function translates the designer's visual UI settings (spring stiffness, damping, bounce, duration) into a continuous progress stream without manual curve conversion.
   - **Decision: Scoped Linear GSAP Timeline**:
     - *Rationale*: Setting `defaults: { ease: "none" }` on the GSAP timeline guarantees that the timing and physics curves defined in Framer's Property Panel are reflected 1:1 on GSAP plugin tweens.

5. **Pseudo Code (Written in Shade DSL)**

```shade
DATA:
  props:
    transition: TransitionConfig = { type: "spring", stiffness: 800, damping: 60 }
    isToggled: boolean = false
  refs:
    containerRef: DOMElement
    pathRef: SVGPathElement
    timelineRef: GSAPTimeline
  values:
    progress: MotionValue(0.0)

LOGIC:
  init:
    useGSAP(ctx => {
      timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } })
      timeline.to(pathRef, { morphSVG: "#targetPath", drawSVG: "0% 100%", duration: 1.0 })
      
      unsub = progress.on("change", val => {
        timeline.progress(clamp(val, 0.0, 1.0))
      })
      
      return () => {
        unsub()
        timeline.kill()
      }
    }, [containerRef])

  onPropChange(isToggled, transition):
    target = isToggled ? 1.0 : 0.0
    animate(progress, target, transition)

RENDER:
  <svg ref={containerRef}>
    <path ref={pathRef} d="..." />
  </svg>
```
