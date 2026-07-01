# Plan - Select Component Upgrade

## PRD (Overview & Objectives)
The objective is to refine the `Select.tsx` component to achieve a more fluid, high-performance interactive experience and cleaner visual indicators.
- **Performance**: Transition from React state-based highlight positioning to `MotionValue` driven transforms to bypass React's render loop during hover transitions.
- **Visuals**: Replace the background fill for selected icon items in grid mode with a minimalist "tiny dot" indicator at the bottom.
- **Precision**: Fix padding discrepancies in the "Follower Fill" highlight to ensure it perfectly encapsulates the target item.

## OKR (Success Criteria)
- [ ] **Zero-Rerender Hover**: Hovering over select items updates the highlight position without triggering component re-renders.
- [ ] **Dot Indicator**: `icon-grid` variant displays a dot for the selected item instead of a background fill.
- [ ] **Flush Highlight**: The highlight follower matches item bounds exactly (no internal padding offsets).

## ADR (Architectural Design)
- **High-Performance Motion**: Utilize `useMotionValue` for `top`, `left`, `width`, `height`, and `opacity` of the highlight element.
- **Direct Value Injection**: Use `animate(motionValue, target)` from Framer Motion inside the hover logic to smoothly transition these values.
- **Layout Sync**: Use `getBoundingClientRect` to calculate precise offsets relative to the portal container, accounting for any internal padding.
- **Indicator Switch**: Update the `gridItem` rendering logic to include an absolute-positioned dot at the bottom-center.

## TODO
- [ ] **Refactor SelectOverlay Logic**: 
    - Initialize `top`, `left`, `width`, `height`, `opacity` as `useMotionValue`.
    - Replace `setHighlightStyle` with `animate` calls to these motion values.
- [ ] **Update SelectOverlay Render**:
    - Update the highlight `motion.div` to use these motion values directly in `style`.
    - Implement the dot indicator for selected items in `icon-grid`.
    - Ensure highlight bounds are flush with item bounds.
- [ ] **Verification**:
    - Run `lint_applet` to ensure no syntax errors.
    - Run `compile_applet` to verify build stability.
