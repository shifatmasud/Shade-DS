# PRD: Viewport Slot Modal Center Fix

## Overview & Objectives
The user reported that the "Instruction modal" (Viewport Slot info) in the 3D scene freezes the UI but does not open in the center of the viewport. Currently, it is using `position: absolute` which centers it relative to its container (the 3D scene), rather than the entire screen (viewport).

## OKR: Success Criteria
- The modal overlay should cover the entire viewport.
- The modal content should be centered horizontally and vertically within the viewport.
- The "UI freeze" (interaction blocking) should be maintained as expected for a modal, but with the modal content correctly visible and accessible.

## ADR: Architectural Design
- Change the Dialog Overlay's position from `absolute` to `fixed` in `components/3D/scene.tsx`.
- Ensure `inset: 0` is maintained to cover the viewport.
- Use `z-index: 9999` (or a sufficiently high value) to ensure it sits above all other UI elements, including the Dock and Control Panels.

## TODO List
- [ ] Modify `components/3D/scene.tsx` to change the Dialog Overlay container to `position: 'fixed'`.
- [ ] Increase `zIndex` of the overlay to ensure it's not buried under other app layers.
- [ ] Verify positioning.
