# PRD: Touch Event Parity & Select Component Fix

## Overview
The goal is to ensure high-quality interactive parity between mouse and touch devices. Hover states on desktop should translate to scrub/drag interactions on touch. Additionally, the `Select` component requires debugging and optimization.

## OKR (Success Criteria)
- `AGENTS.md` updated with strict rules for mouse-to-touch event translation.
- `Select` component `handleTouchMove` fixed to support both list and grid variants.
- `Select` component highlight logic made more robust.
- `Select` component propagation issues addressed.

## ADR (Architectural Design)
- **Touch Parity**: Use `onPointerMove` or coordinate-based `onTouchMove` to simulate "hover" (preview) states on touch devices.
- **Select Fix**: 
    - Update `handleTouchMove` to handle both `default` and `icon-grid` variants.
    - Improve highlight positioning logic.
    - Ensure portal cleanup is clean.

## TODO
- [ ] Add touch translation rules to `AGENTS.md`.
- [ ] Update `Select.tsx` `SelectOverlay`:
    - [ ] Fix jitter by using `layout` and `layoutId` or stabilized coordinates.
    - [ ] Ensure `icon-grid` highlight snaps perfectly to item bounds.
    - [ ] Implement gentle Framer Motion transitions for the highlight element.
    - [ ] Fix `handleTouchMove` to support list items (non-grid).
    - [ ] Optimize coordinate calculation.
    - [ ] Fix highlight alignment for list variant.
- [ ] Update `Select.tsx` `Select` main component:
    - [ ] Review event propagation logic.
- [ ] Lint and Compile.
