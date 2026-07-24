# PRD: Fix State Layer Displacement on Window Resize

## Overview & Objectives
The `StateLayer` component (and potentially others like `RippleLayer` or `SuccessLayer`) experiences displacement when the window is resized. This happens because the stored bounding rectangle (`rect`) of the host element becomes stale, leading to incorrect relative mouse position calculations.

Objectives:
- Ensure `StateLayer` maintains accurate positioning during and after window resize.
- Improve the reliability of `useHostRect` to provide a truly live `DOMRect` that accounts for viewport changes.
- Ensure performant and robust event handling in parasitic components.

## OKR (Success Criteria)
- `StateLayer` circle remains perfectly aligned with the pointer even after window resizing.
- No regression in `RippleLayer` or `SuccessLayer` functionality.
- Smooth animations and transitions are maintained.

## ADR (Architectural Design)
- **Problem**: `useHostRect` only uses `ResizeObserver`, which tracks size changes but not necessarily position changes relative to the viewport (like during window resize if size stays the same).
- **Solution 1**: Enhance `useHostRect` in `hooks/useHost.ts` to include `window` resize and scroll listeners.
- **Solution 2**: In `StateLayer.tsx`, use a local `getBoundingClientRect()` call within the `pointermove` handler to guarantee accuracy, similar to how `RippleLayer` does it.
- **Decision**: We will do both. Updating `useHostRect` is good for global consistency, but using a local check in high-frequency event handlers ensures absolute accuracy without waiting for a React state update/re-render cycle to propagate the new `rect` back into the event closure.

## TODO
- [ ] Modify `hooks/useHost.ts` to add window event listeners to `useHostRect`.
- [ ] Modify `components/Core/sub-components/StateLayer.tsx` to use a fresh `getBoundingClientRect` in pointer handlers.
- [ ] Verify functionality with `compile_applet`.
