# PRD: Smart Layer Upgrade & Parent Binding

## Overview
The goal is to replace the existing `StateLayer` and `RippleLayer` in `components/Core` with the more advanced versions from the `/Framer` directory. These "smart" layers handle their own event listeners (hover, click, touch) instead of relying on the parent to pass down state. We also need to simplify their binding logic to target the immediate parent and refactor dependent components to remove redundant state management.

## OKR (Success Criteria)
1.  **Parity**: `components/Core/StateLayer.tsx` and `components/Core/RippleLayer.tsx` match the functionality of the Framer versions.
2.  **Parent Binding**: Event listeners in these layers target `parentElement` instead of `parentElement?.parentElement`.
3.  **Refactor**: `Button` and `Card` components (Core and Staged) use these new layers and have removed manual coordination logic for ripples/hover states.
4.  **Clean Code**: Framer-specific imports and property controls are removed from the core components.

## ADR (Architectural Design)
-   **Smart Component Pattern**: The layers will use `useEffect` and `useRef` to attach listeners to their container's parent.
-   **Touch/Mouse Parity**: The logic from Framer layers (touch move scrubbing, coordinate calculations) will be preserved.
-   **Decoupling**: By making layers smart, the parent components (`Button`, `Card`) become thinner and less prone to re-render cycles caused by mouse movement state updates.
-   **Component Hierarchy**: 
    - `Core/StateLayer`: Handles hover/focus state visuals.
    - `Core/RippleLayer`: Handles click/tap burst animations.
    - Both will be inserted directly into the background stack of interactive components.

## TODO
- [ ] Copy and refactor `StateLayer` from `/Framer` to `components/Core`.
    - [ ] Change `parentElement?.parentElement` to `parentElement`.
    - [ ] Remove Framer imports and property controls.
    - [ ] Update props to support `color`, `opacity`, `transition`, `forced`.
- [ ] Copy and refactor `RippleLayer` from `/Framer` to `components/Core`.
    - [ ] Change `parentElement?.parentElement` to `parentElement`.
    - [ ] Remove Framer imports and property controls.
    - [ ] Update props to support `color`, `opacity`, `transition`, `forced`.
- [ ] Update `components/Core/Button.tsx`:
    - [ ] Remove "Native Hover Overlay".
    - [ ] Add `StateLayer` and `RippleLayer`.
- [ ] Update `components/staged/Button.tsx`:
    - [ ] Remove `isHovered`, `coords`, `ripples` state and related handlers.
    - [ ] Simplify `StateLayer` and `RippleLayer` usage.
- [ ] Update `components/staged/Card.tsx`:
    - [ ] Remove `isHovered`, `coords`, `ripples` state and related handlers.
    - [ ] Simplify `StateLayer` and `RippleLayer` usage.
- [ ] Update `components/Package/Card.tsx`:
    - [ ] Remove "Native Hover Overlay".
    - [ ] Add `StateLayer` and `RippleLayer`.
- [ ] Final verification (Lint/Compile).
