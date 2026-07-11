# PRD: Fluid Motion Suite

## Overview
Implement a global "Fluid Motion Suite" for all element contents (text, icons) across the application to replace instant or simple opacity-only transitions.

## Objectives
- Define a "Fluid Motion Suite" consisting of gentle spring, opacity, scale, and blur animations.
- Apply this suite to components that exhibit content changes (e.g., Buttons, Labels, Select options).
- Ensure high-quality interactive parity between mouse and touch.

## OKR (Success Criteria)
- No instant transitions for text/icon content changes.
- Smooth, "fluid" feel when UI states change.
- Integration into core components (Button, Toggle, SegmentedTab, etc.).

## ADR (Architectural Design)
- **FluidContent Component**: A specialized wrapper component using `AnimatePresence` and `motion` to handle content swapping.
- **Theme Integration**: Define motion presets in `Theme.tsx` for consistency.
- **Component Refactoring**: Update core components to use `FluidContent` for their labels and icons.

## TODO
- [ ] Create `components/Core/FluidMotion.tsx` to export motion variants and the `FluidContent` component.
- [ ] Update `Theme.tsx` with motion constants (optional but good for consistency).
- [ ] Integrate `FluidContent` into `Button.tsx`.
- [ ] Integrate `FluidContent` into `Toggle.tsx`.
- [ ] Integrate `FluidContent` into `SegmentedTab.tsx`.
- [ ] Integrate `FluidContent` into `Select.tsx`.
- [ ] Integrate `FluidContent` into `AnimatedCounter.tsx` (if applicable).
- [ ] Audit other components for content transitions.
