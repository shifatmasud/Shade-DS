# Plan: SVG Path Injector Upgrade

## PRD (Overview & Objectives)
The objective is to upgrade and simplify the standard `SVGPathInjector` Framer code component. The component targets sibling SVG paths on the Framer canvas and applies procedural draw animations, stroke width styling, and color overrides.

Key goals:
- **Simplify Property Controls**: Replace individual duration, delay, and ease property controls with a unified, native `ControlType.Transition` control type.
- **Support New Animation Triggers & Inputs**:
  - Add `drawProgress` numeric prop (0 to 1) for manual progress injection.
  - Support `trigger = "prop"` (animates path length to match `drawProgress` value).
  - Support `trigger = "scroll"` (scroll-linked, tracking scroll position of a section or the container).
  - Support `trigger = "scroll-trigger"` (intersection-observer triggered, runs once when entering the viewport).
  - Support `scrollsectionref` property control (ControlType.ScrollSectionRef) to bind scroll behaviors to a specific canvas scroll section.
- **Animate Styling Overrides**: Make SVG properties (`strokeWidth`, `color`, and `pathLength` draw animations) dynamically animatable using the unified `transition` settings.

---

## OKR (Success Criteria)
1. **Successful Compilation**: The codebase passes all TypeScript compiler, linter, and build tests seamlessly.
2. **Smooth & Animatable Properties**: Changing the `color` or `strokeWidth` on the canvas triggers smooth visual transitions rather than immediate cuts.
3. **Trigger Verifications**:
  - `"mount"` trigger draws the path cleanly on mount.
  - `"hover"` trigger responds to hover.
  - `"prop"` trigger follows `drawProgress`.
  - `"scroll"` trigger drives the path length based on scroll progress of the selected scroll section or containing section.
  - `"scroll-trigger"` starts the drawing animation once when the target viewport section intersection is observed.
4. **Valid Framer Metadata**: Property controls use modern `addPropertyControls` and correct `ControlType` enumeration mapping.

---

## ADR (Architectural Design)
We will follow a clean, modular architecture:

1. **State & Motion Value Isolation**:
   - `progressVal`: Framer Motion `motionValue` for path drawing length.
   - `strokeWidthVal`: Framer Motion `motionValue` for stroke width.
   - `colorVal`: Framer Motion `motionValue` for stroke color.
   - Using motion values for styling guarantees they can be smoothly animated by `framer-motion`'s `animate(...)` function at any moment.

2. **Target Extraction & Style Binding**:
   - SVG paths, lines, polylines, rects, ellipses, etc., are discovered as sibling SVGs.
   - We continue to use Framer Motion's `svgEffect` for handling the `pathLength` animation binding.
   - For `color` and `strokeWidth`, we manually subscribe to `strokeWidthVal` and `colorVal` updates via `.on("change")` listeners, modifying targets' DOM styles directly in real time. This avoids dependency on specific `svgEffect` internals and is 100% robust.

3. **Trigger Coordinators**:
   - A coordinator effect resets/initializes motion value states when changing trigger types.
   - Prop changes (`color`, `strokeWidth`, `drawProgress` under `"prop"` trigger) dynamically invoke `animate(motionValue, target, transition)`.
   - Scroll-linked tracking is achieved via Framer Motion's `useScroll` hook targeting either `scrollsectionref` (if defined and mounted) or `containerRef`. We subscribe to the `scrollYProgress` motion value and animate our drawing `progressVal` in response.
   - Scroll-triggered visual drawing uses standard `IntersectionObserver`.

4. **ControlType.Transition Integration**:
   - The user transitions control will be a single prop `transition` of `ControlType.Transition`.
   - Default: `{ type: "tween", duration: 1.5, delay: 0, ease: "easeInOut" }`.

---

## TODO List
- [ ] Read and double-check imports from `framer` and `framer-motion`.
- [ ] Modify `/Framer/SVGPathInjector.tsx` to:
  - Destructure new properties: `transition`, `drawProgress`, `trigger`, `scrollsectionref`.
  - Set up animatable `motionValue`s for progress, color, and stroke width.
  - Implement discovery and state-held `targets` Array.
  - Run the `svgEffect` inside a `targets` tracking `useEffect` and subscribe to live color/width changes.
  - Orchestrate transitions when animatable properties change.
  - Add scroll-linked mapping (`useScroll` and `scrollYProgress.on("change")`) and scroll-triggered intersection observers.
  - Implement clean Property Controls mapping using `addPropertyControls` and standard `ControlType`.
- [ ] Run `lint_applet` to check for syntax and type safety.
- [ ] Run `compile_applet` to confirm zero build errors.
