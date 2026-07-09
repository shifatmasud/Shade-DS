# PRD: Colorless Shallow Water Flow Trail

## Overview
Implement a high-fidelity, colorless fluid simulation that acts as a shallow water overlay on a 3D scene. The water should be perfectly invisible when idle and only reveal itself through smooth optical distortions (refraction, caustics, fresnel, blur) when disturbed by user interaction.

## Objectives
- **Invisible Idle State**: 1:1 match between original scene and water-overlaid scene when no flow is present.
- **Realistic GPGPU Fluid Simulation**: Implement velocity advection, vorticity confinement, viscosity, and dissipation.
- **Advanced Optical Pipeline**: 
    - Refraction based on surface slope reconstruction.
    - Localized caustics in the wake.
    - Subtle Fresnel reflections and specular glints.
    - Flow-weighted Gaussian blur for the refracted scene.
    - Subtle iridescence on high-curvature edges.

# OKR: Success Criteria
- **Visual Accuracy**: Distortions must feel liquid and "wet" without introducing artificial color (mostly colorless).
- **Performance**: Maintain 60fps at high DPR (1080p+ equivalent).
- **Stability**: No flickering or "physical explosions" in the simulation.
- **Identity Property**: $f(Scene, Flow=0) = Scene$.

# ADR: Architectural Design

## 1. Simulation Layer (GPGPU @compute)
- **State Fields**:
    - `Velocity`: vec2 (rg)
    - `Density` (Pressure/Height): float (r)
- **Pipeline**:
    - **Splat**: Inject velocity from pointer movement.
    - **Advection**: Move velocity and density along the velocity field.
    - **Vorticity Confinement**: Re-inject curl to prevent simulation "death" and add swirly detail.
    - **Viscosity/Dissipation**: Gradual energy loss.
    - **Slope Reconstruction**: Compute `Normal` (vec3) from density gradient for optics.

## 2. Optical Pipeline (Post-Process @fragment)
- **Input**: Scene Texture, Flow Field (Normal + Density + Velocity).
- **Process**:
    - **Refraction**: Sample Scene Texture with UV offset derived from Flow Normal.
    - **Flow-Weighted Blur**: 9-tap Gaussian blur on the *refracted* scene, with radius scaled by `Flow Intensity * Curvature`.
    - **Caustics**: Procedural patterns added to the wake, driven by surface convergence.
    - **Fresnel/Specular**: Additive highlights on high-slope regions facing the "light".
    - **Iridescence**: Subtle RGB fringe on sharp refractive boundaries.

# TODO
1. [ ] Define Shader Constants and Materials in `FluidDistortionEffect.tsx`.
2. [ ] Implement `SIM_VERTEX`.
3. [ ] Implement `VELOCITY_ADVECTION_FRAG` with Vorticity Confinement.
4. [ ] Implement `DENSITY_ADVECTION_FRAG` (replaces Dye).
5. [ ] Implement `SLOPE_RECONSTRUCTION_FRAG` to calculate normals and curvature.
6. [ ] Implement `OPTICAL_PIPELINE_FRAG` (The main compositor).
7. [ ] Update React component to manage 3 ping-pong targets (Velocity, Density, Scene).
8. [ ] Verify 1:1 identity when idle.
