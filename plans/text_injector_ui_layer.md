# PRD: TextInjector UI Layer Pattern Upgrade

## Overview
Update the root container of the `TextInjector` component to strictly follow the "UI Layers (Visible)" pattern defined in the `parasitic-dom-binding` skill. This ensures consistent geometry mirroring and layout behavior across all overlay-style components.

## Objectives
- Implement the standard UI Layer container style on the root element.
- Preserve existing logic for discovery feedback (Editor Label) and text injection (Counter/Shimmer).
- Ensure the component remains compatible with Framer's DOM structure.

## Success Criteria (OKR)
- Root container uses `position: "absolute"`, `inset: 0`, `pointerEvents: "none"`, `borderRadius: "inherit"`, `overflow: "hidden"`, and `zIndex: 0`.
- The component correctly overlays its host text element when discovered.
- The component displays a debug label when the host is not found.

## ADR: Architectural Design
- **Container Strategy**: Shift from a custom flex container to the standardized "UI Layer" pattern.
- **Style Merging**: Combine the standardized layer styles with the dynamic layout requirements of the `TextInjector` (e.g., text alignment).
- **Z-Index**: Lower from `10` to `0` as per the standard pattern for visible layers.

## TODO
- [ ] Modify `framer/TextInjector.tsx` root `div` style.
- [ ] Verify `borderRadius: "inherit"` and `overflow: "hidden"` don't clip intended text effects.
- [ ] Verify `zIndex: 0` doesn't cause layering issues with the host.
