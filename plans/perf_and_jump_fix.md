# Plan: Performance Optimization and Jump Fix

## PRD (Overview & Objectives)
- **Problem**: UI freezes during slider interaction. Animated counter "jumps" to the final value upon slider release instead of animating smoothly.
- **Root Cause (Hypothesis)**:
    - **Freeze**: `Home.tsx` re-renders on every slider move because `onValueChange` updates the parent state (`btnProps`). This blocks the main thread for expensive React reconciliation.
    - **Jump**: The state update on release might be resetting components or triggering a massive re-render that interrupts ongoing animations or causes `AnimatedCounter` to lose its "source of truth" context.
    - **Over-precision**: Too many decimal updates in the counter for non-float parameters (like radius) causes unnecessary structural changes.

## OKR (Success Criteria)
- 60fps interaction during dragging.
- Smooth counter transitions even when the slider is released.
- Ability to toggle/limit floating point precision.

## ADR (Architectural Design)
- **Decoupled State Updates**: Sliders will update a `MotionValue` live (already doing this), but they will only trigger "source of truth" React state updates in the parent on `onDragEnd` (release).
- **Stable Counter Keys**: Change `AnimatedCounter` digit keys to be right-aligned (offset from end) so units, tens, etc., have persistent identities across structural changes (e.g., going from 9.9 to 10.0).
- **Memoized Callbacks**: Ensure slider callbacks in `Home.tsx` are stable.
- **Precision Control**: Add `precision` or `decimals` configuration to relevant components.

## TODO
- [ ] Add `onValueRelease` to `FillSlider.tsx`.
- [ ] Add `onValueRelease` to `RangeSlider.tsx`.
- [ ] Update `Home.tsx` to use `onValueRelease` for `setBtnProps`.
- [ ] Update `AnimatedCounter.tsx` digit keying logic.
- [ ] Implement precision/decimal limiting in `AnimatedCounter` or via the formatting prop.
- [ ] Verify fix via lint and manual inspection (mental model).
