# PRD: Direction-Aware Tabbed Panel Navigation

## Overview & Objectives
The `TabbedPanel` component needs a direction-aware slide transition where the panel contents move based on the relative index change (left-to-right or right-to-left). Crucially, these panels must ignore parent layout animations (from `FloatingWindow`) to prevent visual distortion/warping of complex content (like code editors or grids) during height adjustments.

## OKR: Success Criteria
- **Directional Feedback**: Sliding direction matches tab order.
- **Distortion-Free**: Content inside tabs remains sharp and stable, not warped by parent `layout` transitions.
- **Physicality**: Uses spring-based motion for a tactile navigation feel.

## ADR: Architectural Design

### 1. Directional State
We will maintain a tuple state `[activeId, direction]` or calculate direction on-the-fly during `activeTab` updates.
- `direction = nextIndex > currentIndex ? 1 : -1`.

### 2. Layout Isolation
- **Remove `layout` prop** from `TabbedPanel` children and the transitioning `motion.div`.
- Parent components (like `FloatingWindow`) can keep `layout` for height interpretation, but the children will use standard positioning.
- Use `mode="popLayout"` in `AnimatePresence` to ensure the exiting element doesn't shift the new element's initial position.
- Apply `layout={false}` (implicit by removal) to the content container to prevent Framer Motion from trying to interpolate its bounding box during parent resizes.

### 3. Variants
```tsx
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}
```
*Note: Using percentages might be better for full-width panels, or small fixed offsets for a more "lean" feel.*

## TODO
- [x] Analyze `TabbedPanel.tsx` and `FloatingWindow.tsx` constraints.
- [ ] Implement index-based direction tracking in `TabbedPanel`.
- [ ] Define and apply direction-aware variants.
- [ ] Remove `layout` from `TabbedPanel` container and content elements to stop layout warping.
- [ ] Verify `FloatingWindow` height transitions still work without distorting the tab content.
