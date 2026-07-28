# Tech Spec: Realistic Hydrodynamic Liquid Trail & Curvy Motion Architecture

1. **Objective**
   - **Problem Statement**: The current fluid distortion relies on a straight 2-point line segment (`sdSegment`) between consecutive mouse frames and basic curl noise. This creates rigid, straight-line brush strokes and point-like splats rather than organic, curvy, undulating liquid wake trails on water.
   - **Solution Overview**:
     1. **Curved Path Spline Sampling**: Implement a smoothed pointer history buffer in JavaScript that computes quadratic control points (`uMidPointer`) and curvature vectors, passing smooth curved trajectory data to the shader.
     2. **Domain-Warped Liquid Geometry**: Apply multi-scale hydrodynamic domain warping to UV space `p` before calculating trajectory distance. This deforms the motion path into organic, wavy, fluid-shaped ribbons with soft fluid tendrils and droplets.
     3. **Counter-Rotating Dipole Vorticity**: Inject realistic water wake mechanics (counter-rotating vortex pairs on opposite sides of the motion vector) and serpentine wave undulations along the velocity trajectory.
     4. **Enhanced Fluid Back-Advection**: Refine semi-Lagrangian velocity advection and surface-tension damping so momentum smoothly coasts, swirls, and ripples across the water surface like real liquid.
   - **Scope**: Update `/components/staged/3D/FluidDistortion.tsx` and ensure compatibility with `/components/staged/3D/scene.tsx` and `ShaderControls.tsx`.
   - **Context**: Real-time GPGPU liquid distortion post-processing effect layer running in React Three Fiber canvas.

2. **Success Criteria**
   - **Key Results**:
     - Mouse trails form curvy, organic, flowing liquid shapes rather than straight lines or discrete points.
     - Fluid motion behaves like real liquid on water, with realistic wake vortices, lingering serpentine waves, and smooth momentum coasting.
     - High performance (60 FPS) maintained with optimized 8-bit dual FBO ping-pong architecture.
     - Fully verified compilation with zero shader runtime warnings.
   - **Non-Negotiables**:
     - Quadratic Bezier / domain-warped curved distance field for motion trails.
     - Counter-rotating dipole vortex injection along motion wake.
     - Backwards compatibility with existing shader optics controls.

3. **Project Requirements**
   - [x] Create technical specification plan in `/plans/fluid_motion_curvy_trail_spec.md`.
   - [ ] Update JavaScript pointer tracking in `FluidDistortion.tsx` to maintain smoothed trajectory history and calculate midpoint Bezier control vectors (`uMidPointer`, `uCurveDir`).
   - [ ] Implement `sdBezier` / domain-warped curved distance function in `PAINT_FRAG`.
   - [ ] Add hydrodynamic domain warping (`pWarp`) with multi-octave liquid noise to warp the trajectory into curvy liquid ribbons.
   - [ ] Implement counter-rotating wake vorticity and serpentine wave modulation along motion vector.
   - [ ] Enhance semi-Lagrangian advection and momentum diffusion in `PAINT_FRAG` for realistic water coasting and swirling.
   - [ ] Verify build with `compile_applet`.

4. **Architecture Decisions**
   - **Quadratic Bezier Distance Field (`sdBezier`)**: Replaces simple 2-point straight segments with smooth 3-point quadratic curves (`a` = previous, `b` = midpoint control point, `c` = current pointer), ensuring smooth curvature even during rapid mouse direction changes.
   - **Hydrodynamic Domain Warping**: Warping the input coordinates `p` prior to evaluating distance creates dynamic fluid surface contours, breaking up straight stroke boundaries into natural fluid shapes.
   - **Dipole Wake Vorticity**: Simulates the physical conservation of angular momentum when an object moves through water, creating realistic rotational eddies that linger in the wake.

5. **Pseudo Code**

```yaml
Stage: @compute (Paint Vector Map Simulation - PAINT_FRAG)
Input:
  - tLowRes: sampler2D (previous low-res velocity & density)
  - uPointer: vec2 (current position)
  - uMidPointer: vec2 (curved Bezier control midpoint)
  - uPrevPointer: vec2 (previous position)
  - uVelocity: vec2 (motion vector)
  - uTime: float
  - uRadius: float
  - uStrength: float
  - uDissipation: float
  - uCurlStrength: float

Process:
  - Node: Hydrodynamic Domain Warper
    inputs: [vUv, uTime, uVelocity]
    outputs: [pWarp]
    logic: |
      Compute multi-octave liquid noise displacement.
      Add serpentine cross-wave offset: sin(dot(p, tangent) * freq - uTime * speed).
      Output warped UV position pWarp.

  - Node: Curved Bezier Segment Distance
    inputs: [pWarp, uPrevPointer, uMidPointer, uPointer]
    outputs: [dist, tangent, normal]
    logic: |
      Calculate distance to quadratic Bezier curve (a = uPrevPointer, b = uMidPointer, c = uPointer).
      Derive local curve tangent and perpendicular normal vectors.

  - Node: Dipole Vortex Injector
    inputs: [pWarp, dist, tangent, normal, uVelocity]
    outputs: [wakeVorticity]
    logic: |
      Determine side = sign(dot(pWarp - a, normal)).
      Inject counter-rotating vortex pair: normal * side * exp(-dist * falloff).

  - Node: Back-Advection & Momentum Diffusion
    inputs: [tLowRes, vUv, wakeVorticity, uDissipation]
    outputs: [mixedVel, finalDensity]
    logic: |
      Backtrace velocity along stream lines with liquid turbulence.
      Mix input velocity + wake vorticity + advected momentum.
      Apply fluid dissipation and surface-tension damping.

Output:
  - gl_FragColor: vec4(mixedVel * 0.5 + 0.5, finalDensity, 1.0)
```
