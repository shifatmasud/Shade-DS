# PRD: Fix Button Success Layer Visibility

## Overview
The `SuccessLayer` is currently invisible when triggered in the `staged/Button` component. This is likely due to a combination of improper host binding (parasitic component binding to the wrong parent) and aggressive style overrides that break the absolute positioning of transformation wrappers in the 3D stack.

## Objectives
- Restore visibility of the `SuccessLayer` in `staged/Button`.
- Ensure `SuccessLayer` follows the standard "Smart Layer" pattern (supporting `parentRef`).
- Prevent `SuccessLayer` from breaking the layout of absolute wrappers.

## OKR (Success Criteria)
- Clicking a button with `enableSuccess` correctly triggers the green success mask.
- The success label "Success!" (or custom label) is visible and centered.
- No layout shifts occur when the success state is activated.

## ADR (Architectural Design)
- **Host Binding**: Update `SuccessLayer` to support an optional `parentRef` prop. This allows the host (Button) to explicitly define the interaction target (for event listening) while the layer itself is rendered within a specialized 3D wrapper.
- **Style Safety**: Remove the aggressive `useHostStyles(target, { position: 'relative' })` from `SuccessLayer`. Trust the host components or specialized wrappers to handle positioning, or implement a safer check. Given that `StateLayer` and `RippleLayer` do not use this, it is safer to remove it to avoid breaking `absolute` wrappers.
- **Event Parity**: Ensure `lastPos` calculation in `SuccessLayer` uses the `activeTarget` correctly.

## TODO
- [ ] Modify `components/Core/sub-components/SuccessLayer.tsx` to support `parentRef` and remove aggressive style overrides.
- [ ] Modify `components/staged/Button.tsx` to pass `parentRef={localRef}` to the `SuccessLayer`.
- [ ] Verify fix by checking button interaction in the staged environment.
