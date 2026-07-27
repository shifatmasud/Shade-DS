# Tech Spec (Liquid-Like Fluid Simulation & Distortion Pipeline)

1. **Objective**
   - **Problem Statement**: Standard distance-field cursor splats look rigid and mechanical ("stamp-like"). True fluid feels organic, viscous, cohesive, and swirling, with smooth metaball merging when trails cross or loop.
   - **Solution Overview**: Upgrade the offscreen fluid simulation and distortion pipeline to exhibit true liquid-like behavior:
     1. **DPR-Scaled Scene Pass**: Render the primary 3D scene to a DPR-scaled offscreen `THREE.WebGLRenderTarget` with `samples: 4` (MSAA) and synchronized `sRGBColorSpace`.
     2. **Viscous Advection & Velocity Diffusion**: Advect velocity vectors through the previous frame texture with a diffusion kernel so trails stretch, swirl, and linger like liquid ribbons.
     3. **Metaball Smooth Minimum ($smin$) Blending**: Splat pointer inputs into the paint target using exponential falloff and smooth minimum blending so overlapping cursor movements merge organically like liquid droplets.
     4. **Curl Noise Turbulence**: Inject procedural curl noise into the velocity advection step to create swirling eddy currents and organic turbulence.
     5. **Color Space & Localized Masking**: Synchronize sRGB color spaces across all render targets and apply a strict GLSL early-exit mask (`if (alpha <= 0.001) return;`) outside active fluid regions for maximum performance.
   - **Scope & Context**: Enhances `/components/staged/3D/scene.tsx` while adhering strictly to Shade DSL, ShadeR DSL, and `postprocessing-render-pipeline` skill guidelines.

2. **Success Criteria**
   - **Organic Liquid Viscosity**: Fluid trails stretch, swirl, and merge organically rather than appearing as rigid stamp shapes.
   - **Metaball Blending ($smin$)**: Intersecting or looping cursor paths fuse together seamlessly with smooth liquid surface tension.
   - **Curl Noise Turbulence**: Subtle swirling eddies naturally agitate the fluid trail over time.
   - **DPR Scaling & Crisp Quality**: Offscreen render target resolution scales dynamically with device pixel ratio (`width * dpr`, `height * dpr`).
   - **Performance & Resource Hygiene**: Runs smoothly at 60 FPS using standard 8-bit RGBA render targets with zero memory leaks.

3. **Project Requirements**
   - [ ] Define dynamic DPR-scaled offscreen scene capture pass (`sceneTarget`) in R3F with explicit frame loop priority (`useFrame(..., 1)`).
   - [ ] Align all offscreen render target texture color spaces with `renderer.outputColorSpace` (`THREE.SRGBColorSpace`).
   - [ ] Implement Liquid Advection & Viscosity Diffusion Shader (`PAINT_SIM_FRAG`) incorporating velocity transport, exponential decay, and curl noise.
   - [ ] Implement Metaball Smooth Minimum ($smin$) blending for cursor splats.
   - [ ] Implement 9-Tap Downsample & Blur Shader (`BLUR_FRAG`) for velocity diffusion iteration.
   - [ ] Implement Composite Distortion Shader (`DISTORTION_COMPOSITE_FRAG`) with chromatic aberration and strict localized early-exit masking (`if (fluid.a <= 0.001) { gl_FragColor = texture2D(tScene, vUv); return; }`).
   - [ ] Verify build compilation (`compile_applet`) and visual fluidity.

4. **Architecture Decisions**
   - **Smooth Minimum ($smin$) over Rigid SDF**: Instead of a hard radial cutoff, using polynomial or exponential smooth minimum blending allows multiple touch/mouse points to coalesce like mercury or water droplets.
   - **Velocity Advection + Curl Noise**: Advecting velocity backwards along velocity vectors (`texture2D(prev, uv - vel * dt)`) combined with curl noise generates natural fluid momentum and vortices.
   - **8-Bit RGBA Ping-Pong Targets**: Storing velocity in `rg` channels and fluid density/alpha in `b` or `a` channels allows efficient packing in standard 8-bit WebGL render targets.

5. **Pseudo Code**

```yaml
# ShadeR DSL System Architecture Specification (Liquid Simulation & Distortion Pipeline)

Stage: @fragment (Liquid Simulation & Advection Shader)

Input:
  - tPrev: texture         # Previous frame fluid state (velocity in rg, density in a)
  - tBlur: texture         # Lower-res blurred velocity field (1/8 resolution)
  - uPointer: vec2         # Current normalized pointer position
  - uPrevPointer: vec2     # Previous frame pointer position
  - uVelocity: vec2        # Pointer velocity delta
  - uTime: float           # Elapsed time for curl noise animation

Process:
  - Node: Viscous Back-Advection
    inputs:
      - tPrev: texture
      - vUv: vec2
      - uVelocity: vec2
    outputs:
      - advectedState: vec4
    function: pure
    logic: |
      vec2 coord = vUv - advectedState.rg * 0.015;
      vec4 prev = texture2D(tPrev, coord) * 0.96; // Viscous decay

  - Node: Curl Noise Turbulence
    inputs:
      - vUv: vec2
      - uTime: float
    outputs:
      - curlOffset: vec2
    function: pure
    logic: |
      vec2 noise = cnoise(vec3(vUv * 6.0, uTime * 0.5));
      advectedState.rg += noise * 0.002;

  - Node: Metaball Smooth Minimum ($smin$) Splat
    inputs:
      - vUv: vec2
      - uPointer: vec2
      - uVelocity: vec2
    outputs:
      - finalFluidState: vec4
    function: pure
    logic: |
      float dist = length(vUv - uPointer);
      float splat = smoothstep(0.08, 0.001, dist);
      // Smooth minimum blending with existing density
      float density = smin(prev.a, splat, 0.05);
      vec2 vel = mix(prev.rg, uVelocity * 1.5, splat);
      gl_FragColor = vec4(vel, 0.0, density);

Output:
  - gl_FragColor: vec4     # Updated fluid state texture
```
