# PRD: Fix Button Label Wrapping

## Overview
Button labels are currently wrapping when the button width is constrained (e.g., when `width: 100%` is applied to a button in a narrow container). This results in broken UI where the text spills into multiple lines.

## Objectives
- Prevent button labels from wrapping.
- Ensure text remains on a single line.
- Maintain existing layout and padding.

# OKR: Success Criteria
- [ ] Button labels in `Core/Button.tsx` do not wrap.
- [ ] Button labels in `staged/Button.tsx` do not wrap.
- [ ] The fix is minimal (ideally 1 line per file as requested).

# ADR: Architectural Design
- Apply `whiteSpace: "nowrap"` to the button's style object.
- This ensures that the text content will overflow or stretch the button rather than wrapping, which is the standard behavior for polished UI buttons.

# TODO
- [x] Add `whiteSpace: 'nowrap'` to content wrapper in `/components/Core/Button.tsx`.
- [x] Add `whiteSpace: 'nowrap'` to `contentWrapperStyle` in `/components/staged/Button.tsx`.
- [x] Ensure `whiteSpace: 'nowrap'` is NOT on the parent button to prevent breaking siblings like `SuccessLayer`.
- [x] Move `SuccessLayer` to the bottom of the children in `/components/staged/Button.tsx` to ensure it is on top.
- [x] Increase `zIndex` and add `translateZ` (via `zSuccess`) to `SuccessLayer` in `/components/staged/Button.tsx` for 3D visibility parity.
