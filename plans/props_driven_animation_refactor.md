# Tech Spec

1. **Objective**
   - **Problem Statement**: The current staged components (e.g. `Button.tsx`, `Card.tsx`) calculate active visual states (such as translation, scale, shadow) directly inside the render loop using helper functions like `getAnimateState()` or inline objects. This violates the "Props-Driven Animation" principle which requires keeping rendering declarative and offloading animations to imperative engine hooks (e.g. `useAnimate` or `useEffect` + `animate` from Framer Motion) triggered by reactive prop changes.
   - **Solution Overview**: Refactor `Button.tsx` and `Card.tsx` using Framer Motion's imperative `useAnimate` API. This allows us to handle state transitions (hover, active, focus, success) inside a reactive `useEffect` block, updating DOM properties smoothly and cleanly without dirtying the rendering tree.
   - **Scope**:
     - Integrate `useAnimate` in `Button.tsx` and drive scale, translation (`y`), and `boxShadow` transitions cleanly via an imperative animation loop inside a `useEffect` reactive hook.
     - Integrate `useAnimate` in `Card.tsx` and drive hover-based translation (`y`) and scale transitions imperatively inside `useEffect`.
     - Align with user's rules: No CSS transitions, maintain mathematically correct shadows/radius nesting, and preserve high-fidelity physical gestures on both cursor and touch.

2. **Success Criteria**
   - Both `Button.tsx` and `Card.tsx` compile successfully and pass linter checks.
   - Hovering, clicking, and focusing on the staged components trigger snappy, physically predictable animations.
   - The code cleanly separates declarative layout structure from imperative animation logic.
   - No layout shifts or animation jumps occur on interaction.

3. **Project Requirements**
   - **Button Component Refactor**:
     - Implement `useAnimate` hook from `framer-motion`.
     - Drive changes in `forcedHover`, `forcedActive`, `forcedFocus`, and internal/external `isSuccess` states through a `useEffect` block.
     - Move the `getAnimateState()` translation/scale/shadow logic to the `useEffect` block to run `animate(...)` imperatively on the component's root DOM node.
     - Retain `whileTap` only when there is no overlapping transition, or rely entirely on imperative active state animations to avoid conflicting gestures.
   - **Card Component Refactor**:
     - Implement `useAnimate` hook from `framer-motion`.
     - Listen to changes in `effectiveHover` and trigger the spring-based offset (`y` and `scale`) imperatively through the `animate` function.
     - Ensure 3D tilts still work harmoniously with the updated translation.

4. **Architecture Decisions**
   - **Use Framer Motion's `useAnimate` Hook**: Highly optimized for scoped, imperative animations. It provides a clean hook `const [scope, animate] = useAnimate()` which eliminates the need to declare state objects directly inside the render loop, leading to faster component rendering cycles.
   - **Keep Shadow Interpolation Safe**: To prevent browser snapping, we will continue to use the constant layers of shadows (with transparent layers where appropriate) as specified in our styling guidelines.

5. **Pseudo Code (Shade DSL Mappings)**
   ```shade
   COMPONENT StagedButton
   DATA
     props variant, label, forcedHover, forcedActive, disabled
     state isHovered, isSuccess
   LOGIC
     action getTargetAnimation()
       if disabled => return { y: 0, scale: 1, shadow: disabledShadow }
       if forcedActive => return { y: 2, scale: 0.95, shadow: activeShadow }
       if forcedHover or isHovered => return { y: -4, scale: 1.05, shadow: hoverShadow }
       return { y: 0, scale: 1, shadow: idleShadow }

     effect onStateChange(effectiveHover, forcedActive, disabled)
       let target = getTargetAnimation()
       animate(scope.current, {
         y: target.y,
         scale: target.scale,
         boxShadow: target.shadow
       }, { duration: 0.2, ease: "easeOut" })
   RENDER
     button.staged-btn(ref=scope)
       div.content-wrapper
         icon(name=props.icon)
         span(text=props.label)
   ```
