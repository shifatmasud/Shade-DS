# Plan - Core and Staged Button Success State Refinement

## PRD (Overview & Objectives)
- **Objective**: Fix bugs in the success state of both Core and Staged buttons.
- **Key Issues**:
  1. **Success Mask Coverage**: The success color mask layer needs to always fill **120%** of the button's width and height to guarantee complete edge-to-edge subpixel coverage, preventing any tiny gaps or visual flashes near rounded corners.
  2. **Consistent Layout Structure**: The success color mask layer must be nested inside the button component as a dedicated, clipped child layer, exactly like our standard interaction state/ripple layers.
  3. **No Layout Shift**: In the success state, the button's width and height must not differ from its default state. Swapping text/icons should never trigger any sudden layout resizing or shifting in the viewport.

---

## OKR (Success Criteria)
- **O1**: The success mask layer in both `/components/Core/Button.tsx` and `/components/staged/Button.tsx` is implemented with a size of 120% of its parent and is neatly nested within a relative clipping container.
- **O2**: The button does not shrink, grow, or layout-shift when transitioning to and from the success state. It retains its exact default dimensions.
- **O3**: Linter (`lint_applet`) and compilation (`compile_applet`) checks pass successfully with zero errors.

---

## ADR (Architectural Design)
- **Nested Clipping Layout**:
  - In `Core/Button.tsx`, we wrap the success mask `motion.div` in a container `div` styled with `position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none', zIndex: 0.5`.
  - In `staged/Button.tsx`, we wrap the success mask `motion.div` in a 3D layer container styled with `...layerWrapperStyle, zIndex: 0.5`, containing a clipping inner `div` with `width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit'`.
  - The actual success mask layer in both components is styled with `position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%'` and `borderRadius: 'inherit'`. This expands the mask 10% outward in every direction (totaling 120% size centered), with overflow handling any spilling cleanly.
- **Zero-Shift Dimensions Preservation**:
  - Instead of unmounting the default content and mounting success content sequentially inside a standard `AnimatePresence mode="wait"`, we will render both layers in parallel inside the button.
  - The **Default Content** remains in the normal document flow (using standard CSS layout). When `isSuccess` is true, we animate its opacity to `0`, its scale/y position slightly, and set `pointerEvents: 'none'`. Because it remains in the flow, the button's computed width and height are preserved exactly as defined by the default label/icon.
  - The **Success Content** is rendered as an absolutely positioned layer (`position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'`). When `isSuccess` is true, we animate its opacity to `1`. This overlays the success message perfectly without altering the layout dimensions of the button.

---

## TODO List
1. [x] Inspect `/components/Core/Button.tsx` and `/components/staged/Button.tsx` codebases.
2. [x] Design the zero-layout-shift layout architecture.
3. [x] Create `/plans/button_success_mask_and_size_fix.md` plan.
4. [ ] Apply changes to `/components/Core/Button.tsx` (waiting for user command).
5. [ ] Apply changes to `/components/staged/Button.tsx` (waiting for user command).
6. [ ] Run `lint_applet` to verify codebase syntax.
7. [ ] Run `compile_applet` to confirm successful app compilation.
