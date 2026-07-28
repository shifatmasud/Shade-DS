# Tech Spec: Real Liquid Dynamics & Optics for Fluid Distortion

1. **Objective**
   - **Problem Statement**: The current fluid distortion effect uses a point-splat simulation that creates rigid, discrete dots on fast mouse movement. The chromatic aberration (RGB shift) is a naive 3-sample split producing harsh color bands, and the refraction lacks optical depth and frosted blur.
   - **Solution Overview**:
     1. Upgrade fluid simulation (`SIM_FRAG`) to use capsule segment distance tracking between `uPrevPointer` and `uPointer` for continuous fluid ribbon injection, along with velocity-driven vorticity swirl and semi-Lagrangian advection.
     2. Implement a 9-tap Gaussian/Poisson weighted blur kernel for the refraction pass in `DISTORTION_FRAG` to produce a frosted, premium liquid glass trail.
     3. Replace crude 3-channel RGB shift with continuous spectral wavelength dispersion over the 9-tap blurred refraction samples.
   - **Scope**: Modify `/components/staged/3D/FluidDistortion.tsx` simulation GLSL shaders and React canvas frame loop, while ensuring compatibility with `@react-three/postprocessing`.
   - **Context**: Embedded inside the R3F 3D viewport canvas as a custom postprocessing EffectComposer pass.

2. **Success Criteria**
   - **Key Results**:
     - Fluid trail remains continuous, organic, and ribbon-like without rigid dots when sweeping mouse rapidly across the viewport.
     - Refraction includes a 9-tap kernel blur that scales smoothly with fluid density for a frosted liquid glass aesthetic.
     - Spectral dispersion replaces harsh RGB shift with soft, continuous chromatic refraction along the fluid trail edges.
     - Frame rate remains high (60 FPS target) on standard hardware with high-performance FBOs.
   - **Non-Negotiables**:
     - 9-tap blur implementation for refraction distortion.
     - Capsule segment splatting for fluid continuity.
     - Clean compilation with no GLSL runtime errors or React re-render memory leaks.

3. **Project Requirements**
   - [x] Create technical specification plan in `/plans/fluid_distortion_optics_spec.md`.
   - [ ] Refactor `SIM_FRAG` in `/components/staged/3D/FluidDistortion.tsx`:
     - Distance-to-segment function for `uPrevPointer` -> `uPointer`.
     - Velocity impulse & angular swirl (curl/vorticity).
     - Viscous advection and non-linear decay.
   - [ ] Refactor `DISTORTION_FRAG` in `/components/staged/3D/FluidDistortion.tsx`:
     - 9-tap Gaussian blur sampler over `inputBuffer`.
     - Continuous spectral dispersion sampling along refraction distortion vectors.
     - Smooth Fresnel edge specular highlights.
   - [ ] Update frame loop and uniform updates in `FluidDistortion` React component.
   - [ ] Verify build with `compile_applet`.

4. **Architecture Decisions**
   - **Capsule Distance vs Point Splat**: Point splat fails at high velocities because mouse movement events fire at discrete intervals (e.g. 60Hz/120Hz). Ray-segment distance creates an unbroken capsule in UV space between frames.
   - **9-Tap Gaussian Blur in Single Pass Effect**: Executing a 9-tap kernel directly inside the post-processing distortion shader eliminates the need for additional FBO passes while delivering a frosted glass blur on the refracted buffer.
   - **Spectral Dispersion Sampling**: Multi-sampling 9 blur taps with wavelength-dependent UV offsets creates smooth rainbow optics instead of harsh 3-line RGB fringes.

5. **Pseudo Code**

```yaml
Stage: @compute (Fluid Physics Simulation - SIM_FRAG)
Input:
  - tPrev: sampler2D
  - uPointer: vec2
  - uPrevPointer: vec2
  - uVelocity: vec2
  - uTime: float
  - uRadius: float
  - uStrength: float
  - uAspect: float
  - uActive: float

Process:
  - Node: Capsule Distance Solver
    inputs: [vUv, uPointer, uPrevPointer, uAspect]
    outputs: [segDist, segDir]
    logic: Compute closest distance from current UV to line segment (uPrevPointer -> uPointer) corrected for aspect ratio.

  - Node: Velocity & Swirl Injector
    inputs: [segDist, uVelocity, uRadius, uActive]
    outputs: [impulseVel, densitySplat]
    logic: Calculate smoothstep falloff along segment. Inject linear velocity + perpendicular swirl force for vorticity.

  - Node: Advection & Decay
    inputs: [tPrev, vUv, impulseVel]
    outputs: [finalVel, finalDensity]
    logic: Sample tPrev at back-traced UV (vUv - prevVel * dt). Blend with impulse. Apply viscous damping.

Output:
  - gl_FragColor: vec4(finalVel, 0.0, finalDensity)


Stage: @fragment (Refraction & Optics Shading - DISTORTION_FRAG)
Input:
  - inputBuffer: sampler2D
  - tFluid: sampler2D
  - vUv: vec2

Process:
  - Node: Fluid Sample
    inputs: [tFluid, vUv]
    outputs: [fluidVel, fluidDensity]
    logic: Fetch fluid velocity vector and density mask from simulation FBO.

  - Node: Refraction Vector Calculation
    inputs: [fluidVel, fluidDensity]
    outputs: [refractUV, blurRadius]
    logic: Offset UV coordinates using fluid velocity and gradient. Calculate blur spread based on fluid density.

  - Node: 9-Tap Spectral Blur Filter
    inputs: [inputBuffer, refractUV, blurRadius, distortionVector]
    outputs: [frostedRefractiveColor]
    logic: |
      Sample inputBuffer at 9 offset coordinates (3x3 Gaussian grid).
      Apply spectral dispersion weights across wavelengths (Red, Yellow, Green, Cyan, Blue).
      Sum weighted samples into final frosted refractive output color.

Output:
  - outputColor: vec4(frostedRefractiveColor, alpha)
```
