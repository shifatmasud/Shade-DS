# PRD - MotionValue Optimization

## Overview
Optimize `RangeSlider` and `AnimatedCounter` components to minimize React `useState` usage in favor of `framer-motion`'s `MotionValue`. This ensures higher performance and reduced virtual DOM reconciliation during high-frequency updates (like dragging a slider).

## OKR
- **RangeSlider**: Eliminate `internalValue` state. Replace `isDragging` and `isHovered` with `MotionValue` based logic if feasible, or justify their persistence.
- **AnimatedCounter**: Ensure digit updates are purely `MotionValue` driven (already largely true), but audit for any remaining unnecessary `useState` calls.

## ADR
- **Architecture**: Move from reactive React state (V-DOM) to imperative MotionValue updates (Direct DOM).
- **Tooltips**: Transition tooltip visibility from `AnimatePresence` (which requires state) to `MotionValue` driven opacity/scale to avoid re-renders.
- **Internal Value**: Rely entirely on the `motionValue` prop for the current value. Remove `internalValue` sync logic.

## TODO
- [ ] **RangeSlider**:
    - [ ] Create `dragMV` and `hoverMV` MotionValues.
    - [ ] Remove `isDragging` and `isHovered` useState.
    - [ ] Replace `AnimatePresence` with direct `motion.div` visibility driven by `dragMV` and `hoverMV`.
    - [ ] Remove `internalValue` useState and related `useEffect`.
    - [ ] Update `handlePointerDown`, `handlePointerMove`, `handlePointerUp` to set `dragMV`.
    - [ ] Update `ValueDisplay` to handle changes without needing `internalValue` state if possible (keep `inputValue` as it's for text input).
- [ ] **AnimatedCounter**:
    - [ ] Review `tracks` state usage. Determine if we can pre-allocate a maximum number of digits or if `useState` for structural changes is truly the "minimal" way. 
    - [ ] (Decision: Keep `tracks` state for structural changes (9 -> 10) as it's infrequent, but ensure all numerical updates are `MotionValue` based).
