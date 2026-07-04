# Plan: Fluid Effect Masking

## PRD (Product Requirements Document)
- **Overview**: The current fluid distortion shader applies effects like Chromatic Aberration, RGB Shift, and Shimmer across the entire screen buffer, even if the distortion amount is zero. This can lead to subtle softening of the background or undesired shimmering in static areas.
- **Objectives**: 
  - Restrict all post-processing effects (Dispersion, Shimmer, Multi-tap sampling) to the active fluid trail area.
  - Ensure the background texture is perfectly sharp and unaffected when no fluid is present.

## OKR (Objectives and Key Results)
- **Objective**: Improve visual clarity of non-fluid elements.
- **KR1**: Implement a mask based on fluid density (`weight`) in the compositor shader.
- **KR2**: Use the mask to blend between the clean scene texture and the distorted/processed texture.
- **KR3**: Zero overhead for static pixels by skipping complex logic or mixing with zero.

## ADR (Architectural Design Record)
- **Current State**: `DISTORTION_COMPOSITOR_FRAG` samples the simulation texture, calculates velocity, and immediately performs 9-tap sampling and shimmer calculation.
- **Proposed Change**: 
  1. Calculate a `weight` from the simulation texture (`data.z + data.w`).
  2. Derive an `effectMask` from the `weight` (e.g., `smoothstep(0.0, 0.1, weight)`).
  3. Pre-sample the "clean" color from `u_texture` at `vUv`.
  4. Only calculate the distorted color and shimmer if `effectMask > 0.0`.
  5. `mix` the clean color and the distorted color using `effectMask`.
- **Alternatives**: 
  - Just multiplying the `velocity` by a mask (partially done). This doesn't stop the multi-tap averaging or the shimmer addition which might still have non-zero contributions if not perfectly masked.

## TODO
- [ ] Modify `DISTORTION_COMPOSITOR_FRAG` in `/components/3D/FluidDistortionEffect.tsx`.
- [ ] Add `effectMask` calculation.
- [ ] Implement conditional/mixed application of distortion, dispersion, and shimmer.
- [ ] Run `lint_applet` to verify.
