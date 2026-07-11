# Plan - Toggle Squish Effect

## PRD
**Overview**: Enhance the `Toggle` component's thumb animation to include a "compressed height" effect during state transitions (in-between states).
**Objectives**:
- Create a more tactile, "squishy" feel for the toggle.
- Implement a compressed height (scaleY < 1) and expanded width (scaleX > 1) during the transition.

## OKR
- **Success Criteria**:
  - The toggle thumb visibly squishes (flattens) while moving between "On" and "Off" states.
  - The animation feels physical and responsive.

## ADR
- **Approach**:
  - Use Framer Motion's `animate` prop with keyframes for `scaleX` and `scaleY`.
  - Ensure `originX: 0.5` and `originY: 0.5` (already present) to keep the squish centered.
  - Adjust the `transition` timing to make the squish feel natural.
  - Maintain `whileTap` squish for manual interaction.

## TODO
- [ ] Modify `/components/Core/Toggle.tsx` to update the `animate` and `transition` properties of the thumb.
- [ ] Verify the "compressed height" is clearly visible during the "in-between" state.
