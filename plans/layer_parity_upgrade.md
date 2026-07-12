# PRD: State & Ripple Layer Parity Upgrade

## Overview
Align the Framer versions of `StateLayer` and `RippleLayer` with their Core counterparts, specifically exposing `forced` props and ensuring high-quality interaction parity between mouse and touch devices.

## Objectives
- Expose `forced` property in `Framer/StateLayer.tsx` and `Framer/RippleLayer.tsx`.
- Implement live touch position tracking in `Framer/StateLayer.tsx` using `onTouchMove` (or ensuring `pointermove` is sufficient and correctly mapped).
- Maintain consistency with `AGENTS.md` Interaction & Touch Parity guidelines.

# OKR: Success Criteria
- [ ] `Framer/StateLayer` supports a `forced` prop that displays a full-size overlay.
- [ ] `Framer/RippleLayer` supports a `forced` prop that displays a full-size overlay.
- [ ] `Framer/StateLayer` position follows touch position live during scrubbing.
- [ ] No regressions in existing Framer Canvas behavior.

# ADR: Architectural Design
- **Forced State**: When `forced` is true, the layers will bypass their internal event listeners and display a static or simple fade-in overlay representing the "active" state.
- **Touch Parity**: 
    - `pointermove` is already used, which covers touch on modern browsers. However, to strictly follow the "scrubbing" requirement, I will verify if specific touch event handling is needed to prevent default scroll behavior during interaction.
    - The `AGENTS.md` suggests mapping `onTouchMove` coordinates for hit-testing and position updates.

# TODO
- [ ] Edit `Framer/StateLayer.tsx`:
    - Add `forced` to props and property controls.
    - Implement `forced` render logic.
    - Ensure `pointermove` handles touch correctly or add `touchmove`.
- [ ] Edit `Framer/RippleLayer.tsx`:
    - Add `forced` to props and property controls.
    - Implement `forced` render logic.
