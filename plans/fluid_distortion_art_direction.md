# PRD: Fluid Distortion Art Direction

## Overview
The goal is to refine the `FluidDistortionEffect` component to achieve a premium "liquid flow" aesthetic. Currently, it feels static and "blob-like". The trails need to be smooth, swirly, and clear (no color in the core), with iridescent highlights strictly at the edges to simulate reflected sunlight optics.

## OKRs
- [ ] **Fluidity**: Fluid movement feels swirly and persistent, not like a static blob.
- [ ] **Transparency**: Flow trail cores are colorless, showing only refracted background.
- [ ] **Iridescence**: Iridescent effects appear only at high-gradient boundaries (edges) and feel transparent/reflective.
- [ ] **Color Accuracy**: The background 3D scene is not darkened or color-shifted when the effect is active.

## ADR
- **Simulation**: Use higher curl noise frequency and strength to induce more swirls. Slightly decrease velocity decay for persistence.
- **Compositing**: 
  - Use `HalfFloatType` for the scene render target to ensure linear color math precision.
  - Implement a more sophisticated iridescence model based on gradient magnitude.
  - Ensure the "core" of the dye field (low gradient, high density) remains colorless.
- **Color Space**: Render the scene to a linear buffer, perform all distortion math in linear space, and allow the default output pass to handle final sRGB conversion.

## TODO
- [ ] Modify `FluidDistortionEffect.tsx`:
  - [ ] Update `sceneRenderTarget` to use `HalfFloatType` and `LinearSRGBColorSpace` (or `NoColorSpace` depending on Three.js version).
  - [ ] Update `VELOCITY_FRAG` for more swirliness.
  - [ ] Update `DISTORTION_COMPOSITOR_FRAG` for colorless cores and edge-only iridescence.
  - [ ] Adjust default uniform values (`u_curlScale`, `u_curlStrength`, `u_decay`, etc.).
- [ ] Verify build and visual quality.
