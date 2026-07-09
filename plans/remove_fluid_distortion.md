# PRD: Remove Fluid Distortion Effect

## Overview
The user wants to remove the `FluidDistortionEffect` component from the 3D scene and render the scene directly. This simplifies the rendering pipeline by removing the post-processing layer that captures the scene into a target and re-renders it with distortion.

## OKR
- [ ] `FluidDistortionEffect` is removed from `Scene3D`.
- [ ] The 3D scene renders correctly to the screen without distortion.
- [ ] `FluidDistortionEffect.tsx` file is deleted.
- [ ] No compilation errors or broken references.

## ADR
- **Architecture**: Move from a post-processed scene (Scene -> Target -> Screen) to a direct rendering (Scene -> Screen).
- **Files Affected**:
    - `/components/3D/scene.tsx`: Remove import and usage.
    - `/components/3D/FluidDistortionEffect.tsx`: Delete file.

## TODO
- [ ] Remove `FluidDistortionEffect` from `/components/3D/scene.tsx`.
- [ ] Delete `/components/3D/FluidDistortionEffect.tsx`.
- [ ] Run `compile_applet` to verify.
