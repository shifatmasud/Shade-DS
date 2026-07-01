# ADR - UI Refinement Strategy

## Context
1. `FillSlider` has low visibility in light mode due to similar track/fill colors.
2. Large spatial blobs in `ColorPicker` are overly saturated, distracting from the main controls.

## Decision
1. **Contrast**: Use a darker token (`Content[3]`) or a more contrasting surface pair for `FillSlider` in light mode.
2. **Saturation**: Adjust the HSL calculation for `ringOuter` in `ColorPicker.tsx` to use 75% saturation instead of 95%.

## Consequences
- Better accessibility for users in light mode.
- More balanced and professional color palette in the spatial picker.
