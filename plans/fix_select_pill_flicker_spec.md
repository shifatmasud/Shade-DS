# Tech Spec

1. **Objective**
   - **Problem Statement**:
     In the `Select` component (`components/Core/Select.tsx`), when moving the cursor across dropdown options, the hover background pill exhibits a noticeable visual flicker that feels like a z-index fight or an unwanted opacity cross-fade animation.
   - **Solution Overview**:
     The flicker is caused by wrapping each individual option's hover indicator in its own `<AnimatePresence>` with `initial={{ opacity: 0 }}` and `exit={{ opacity: 0 }}`. When the cursor moves from option $A$ to option $B$, option $A$'s `<AnimatePresence>` keeps option $A$'s pill in the DOM executing an exit fade-out, while option $B$'s `<AnimatePresence>` mounts option $B$'s pill executing an initial fade-in. Because both elements share the same `layoutId` (`select-hover-${instanceId}`), Framer Motion simultaneously interpolates layout while two active DOM nodes cross-fade their opacities and overlap, producing visual z-fighting and opacity stuttering.
     By eliminating the per-item `<AnimatePresence>` wrappers and removing `initial`/`exit` opacity animations on the shared `layoutId` pill (matching the architecture of `SegmentedControl.tsx` and `SegmentedTab.tsx`), exactly one DOM node is rendered at all times. Framer Motion smoothly glides this single element across options with continuous 100% opacity and spring physics, eliminating all z-fighting, flicker, and opacity artifacts.
   - **Scope**: `components/Core/Select.tsx`.
   - **Context**: Design system primitive `<Select />` utilized across the application, including the Terminal/TUI Quick Snippets menu.

2. **Success Criteria**
   - **Key Results**:
     - Moving the cursor across items in both list and grid dropdown variants animates the hover background pill with zero flicker, zero z-fighting, and zero opacity cross-fading.
     - The pill glides crisply and continuously between options using physical spring dynamics.
     - The hover pill remains strictly behind text labels and icons (`zIndex: 0` behind `zIndex: 1`).
     - Scrolling the dropdown list maintains accurate pill positioning with zero layout drift.
   - **Non-Negotiables**:
     - Strict adherence to `Theme.tsx` design tokens and helper functions.
     - No modifications to `/framer/` files except permitted test paths.
     - Zero TypeScript or lint errors (`npm run lint`).
     - Clean compilation (`compile_applet`).

3. **Project Requirements**
   - [ ] Remove `<AnimatePresence>` from option items in `components/Core/Select.tsx` (both grid and list variants).
   - [ ] Remove `initial={{ opacity: 0 }}` and `exit={{ opacity: 0 }}` from the `layoutId={`select-hover-${instanceId}`}` motion element.
   - [ ] Ensure `zIndex: 0` with `pointerEvents: 'none'` sits behind the `zIndex: 1` option content.
   - [ ] Document Root Cause Analysis in `/RCA/rca-select-pill-flicker.md`.
   - [ ] Update changelog in `README.md`.
   - [ ] Verify via `lint_applet` and `compile_applet`.

4. **Architecture Decisions**
   - *Single-Node Shared Layout vs Multi-Node AnimatePresence*: In Framer Motion, `<AnimatePresence>` around individual collection items is an anti-pattern when using shared `layoutId`. When an item unmounts under `AnimatePresence`, it remains in the DOM during its exit duration. Having two nodes with the same `layoutId` rendered concurrently triggers duplicate layout projections and opacity blending. Rendering a single conditional `<motion.div layoutId=... />` without `AnimatePresence` ensures the shared layout engine projects the single element cleanly between parent bounding boxes without intermediate ghost elements.

5. **Pseudo Code (Shade DSL)**
   ```shade
   Component SelectDropdown {
     DATA: {
       prop options: list<Option>
       prop isGrid: bool
       state hoveredIdx: int
     }
     LOGIC: {
       fn handleHover(index) {
         hoveredIdx = index
       }
       fn handleLeave() {
         hoveredIdx = -1
       }
     }
     RENDER: {
       view.menu(onPointerLeave: handleLeave) {
         each option, idx in options {
           view.optionItem(
             onPointerEnter: () => handleHover(idx),
             relative: true,
             zIndex: 1
           ) {
             if hoveredIdx == idx {
               // Render single layout projection node without AnimatePresence or exit opacity
               motion.pill(
                 layoutId: "select-hover",
                 zIndex: 0,
                 inset: isGrid ? "2px" : "2px 4px",
                 bg: theme.Color.Base.Surface[2],
                 spring: { stiffness: 500, damping: 38 }
               )
             }
             view.label(zIndex: 1, text: option.label)
           }
         }
       }
     }
   }
   ```
