# ADR: FillSlider Thumb and Prefix Removal

## Context
The user requested a vertical thumb for the `FillSlider` that appears only during interaction and a change in value formatting.

## Decision 1: Thumb Implementation via Framer Motion
- **Choice**: Use a `motion.div` absolutely positioned relative to the slider container.
- **Rationale**: Framer Motion provides high-performance animations and easy binding to existing `MotionValue`s used for the fill width. By using `animate` props for opacity, we can easily handle the "On tap, On hover & on Drag" visibility requirement.

## Decision 2: Formatting Cleanup
- **Choice**: Remove the hardcoded `<span>0.</span>` in `FillSlider.tsx`.
- **Rationale**: This is the most direct way to "Remove 0.n Prefix" as specified in the request. If the user meant a change in the `AnimatedCounter` itself, it would be less obvious since `AnimatedCounter` is a generic digit-scrolling component.

## Decision 3: Style System Alignment
- **Choice**: Refactor component styles to the `Variant Style System` (base, variant, size).
- **Rationale**: Strict adherence to the `AGENTS.md` guidelines for professional React/Shade DSL development.
