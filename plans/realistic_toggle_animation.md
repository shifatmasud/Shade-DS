# Plan - Realistic Toggle Animation (Squash & Stretch)

## PRD (Overview & Objectives)
The objective is to enhance the `Toggle` component's transition animation. Instead of a simple linear or spring translation, the toggle thumb should exhibit "squash and stretch" behavior. This means the thumb should elongate horizontally while moving and "settle" into its final position with a slight squash, making the interaction feel more organic and professional.

## OKR (Success Criteria)
- [ ] The toggle thumb stretches horizontally during the transition between states.
- [ ] The toggle thumb squashes back to its circular form upon reaching the destination.
- [ ] The animation feels snappy yet fluid, adhering to the project's high-quality design standards.
- [ ] No regression in functional behavior (toggling state works correctly).

## ADR (Architectural Design)
- **Component**: `/components/Core/Toggle.tsx`.
- **Animation Library**: `framer-motion`.
- **Technique**: Use `motion` variants and keyframe-based `scaleX`/`scaleY` animations coupled with the existing `x` translation spring.
- **Design Tokens**: Maintain use of `theme.time`, `theme.radius`, and `theme.Color`.

## TODO
- [ ] Modify `Toggle.tsx` to use complex `animate` props or variants for the thumb.
- [ ] Define the stretch (`scaleX > 1`, `scaleY < 1`) and settle (`scaleX: 1`, `scaleY: 1`) keyframes.
- [ ] Verify the animation timing with `theme.time` tokens where appropriate.
