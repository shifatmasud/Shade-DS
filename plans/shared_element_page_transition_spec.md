# Tech Spec - SharedElementTransition Component & Usage Guidelines

1. **Objective**
   - **Problem Statement**: Standard Framer page routing causes abrupt screen replacements without fluid shared-element morphing or choreographed exit/entry animations between pages. Users need a production-grade `SharedElementTransition` Code Component that supports `mode` observation ("auto", "old page", "new page") to track state changes between two page instances, canvas-bound `ScrollSectionRef` target resolution, `animateView` choreographies, and comprehensive usage guidelines.
   - **Solution Overview**: Build a hydration-safe Framer Code Component (`framer/SharedElementTransition.tsx`) with property controls for `mode`, `section` (`ScrollSectionRef`), `transition`, `exitOffset`, `entryOffset`, and `blurAmount`. Integrate Framer Motion's `animateView` for `.add(from, to)`, `.old()`, and `.new()` snapshot morphing, accompanied by pure Framer Motion `layoutId` spring fallback and comprehensive usage guidelines in `skills/framer-code-components-overrides/references/shared-element-page-transitions.md`.
   - **Scope**: Update `/framer/SharedElementTransition.tsx` and provide comprehensive usage guidelines in `/skills/framer-code-components-overrides/references/shared-element-page-transitions.md` adhering to Framer Code Component constraints and AGENTS.md guidelines.
   - **Context**: Integrates with Framer's `ControlType.ScrollSectionRef`, `ControlType.Enum`, `ControlType.Transition`, `ControlType.Number`, and Framer Motion's View Transition snapshot engine.

2. **Success Criteria**
   - **Key Results**:
     - `SharedElementTransition` component with exact property controls schema requested: `mode` enum (`"auto"`, `"old page"`, `"new page"`), `section` (`ScrollSectionRef`), `transition` (`ControlType.Transition`), `exitOffset`, `entryOffset`, and `blurAmount`.
     - Complete dual-mode observation logic: auto-detects navigation direction with explicit manual override ("old page" vs "new page") across component instances.
     - View Transition snapshot engine with `animateView(update).add(from, to).old().new()` and graceful `layoutId` / native fallback.
     - Detailed, production-ready usage guidelines with step-by-step canvas setup, mode configuration, and troubleshooting in the markdown reference.
   - **Non-Negotiables**:
     - Full hydration safety (`isClient` guard, `RenderTarget.canvas` editor badge).
     - Strict adherence to AGENTS.md planning and styling rules.
     - Pure TypeScript and Framer Motion compatibility.

3. **Project Requirements**
   - [ ] Implement `mode` enum property control and instance state observation in `/framer/SharedElementTransition.tsx`.
   - [ ] Ensure `section` (`ControlType.ScrollSectionRef`) integrates with `resolveTargetElement` for smooth geometry matching.
   - [ ] Wire `animateView` snapshot morphing with `.old()` exit choreography and `.new()` entry choreography.
   - [ ] Implement pure Framer Motion `layoutId` fallback when `animateView` is unavailable.
   - [ ] Author and update comprehensive usage guidelines in `/skills/framer-code-components-overrides/references/shared-element-page-transitions.md`.
   - [ ] Validate compilation and linting across the codebase.

4. **Architecture Decisions**
   - **Mode Coordination (1A & 2C)**: The `mode` property control allows auto-detection (inferring outgoing vs incoming based on active route and navigation queue) while allowing creators to explicitly pin an instance as `"old page"` (triggering exit snapshot choreography) or `"new page"` (triggering entry snapshot choreography).
   - **Canvas Property Controls Schema**:
     - `mode`: `ControlType.Enum` with options `["auto", "old page", "new page"]`.
     - `section`: `ControlType.ScrollSectionRef` for visual canvas section binding.
     - `transition`: `ControlType.Transition` with spring default (`stiffness: 300, damping: 30, duration: 0.6`).
     - `exitOffset` & `entryOffset`: `ControlType.Number` with unit `px`.
     - `blurAmount`: `ControlType.Number` with unit `px`.
   - **Fallback Strategy (4B)**: When `animateView` is unavailable in standard environments, the component gracefully falls back to browser-native `document.startViewTransition` with assigned `viewTransitionName` or Framer Motion layout morphing.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   DATA
     mode: "auto" | "old page" | "new page" = "auto"
     sectionRef: ScrollSectionRef
     transition: TransitionConfig = { type: "spring", stiffness: 300, damping: 30, duration: 0.6 }
     exitOffset: number = 40
     entryOffset: number = -40
     blurAmount: number = 8
     activeRoute: string = window.location.pathname

   LOGIC
     FUNCTION resolveTarget(doc) ->
       IF sectionRef.current -> RETURN sectionRef.current
       RETURN doc.querySelector("[data-scroll-section]") || doc.querySelector("[data-framer-name]")

     FUNCTION executeTransition(destinationUrl) ->
       fromEl = resolveTarget(document)
       isOutgoing = (mode == "old page") || (mode == "auto" && activeRoute != destinationUrl)
       
       animateView(async () => {
         await swapDOM(destinationUrl)
         toEl = resolveTarget(document)
       })
       .add(fromEl, toEl)
       .old({ opacity: 0, y: exitOffset, filter: `blur(${blurAmount}px)` })
       .new({ opacity: 1, y: 0, filter: "blur(0px)" })
       .withOptions(transition)

   RENDER
     <SharedElementWrapper>
       <CanvasPreviewBadge visible={isOnCanvas} mode={mode} />
     </SharedElementWrapper>
   ```
