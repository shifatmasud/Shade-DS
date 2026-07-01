# PRD - Reduce Fill Slider Contrast

## Overview
The user wants to reduce the visual contrast of the `FillSlider` component. Currently, it uses high-contrast tokens for the fill and border which can feel too "loud" in the UI.

## Objectives
- Decrease the contrast between the slider track and the fill area.
- Soften the container border.
- Maintain legibility of the label and value.

# OKR - Success Criteria
- The `FillSlider` should appear more subtle and integrated into the interface.
- Contrast ratio between track and fill should be visually reduced.
- All functional interactions (dragging, counter animations) must remain intact.

# ADR - Architectural Design
- **Component**: `/components/staged/FillSlider.tsx`
- **Strategy**: 
    - Modify the `container` border token from `Content[3]` to `Surface[3]` to make the boundary softer.
    - Apply an opacity filter or use a more subtle token for the `fill` layer.
    - I will use the `opacity` property on the `motion.div` fill layer to precisely control contrast while adhering to theme tokens.
    - I will also adjust the track background if necessary to ensure the hierarchy is preserved.

# TODO
- [ ] Read `/components/staged/FillSlider.tsx` (Done).
- [ ] Update `styles.container` to use a softer border color (`theme.Color.Base.Surface[3]`).
- [x] Update `styles.fill` to have a reduced opacity (0.25).
- [x] Verify changes with `compile_applet`.
