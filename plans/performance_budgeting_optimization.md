# Tech Spec 

1. **Objective**
   - **Problem Statement**: The 3D scene and fluid distortion post-processing pipeline currently drop to 7-8 FPS on low-end and mid-range mobile devices due to heavy fragment shader loops (9-tap Gaussian kernel with 27 chromatic dispersion texture fetches per pixel), high physical material transmission overhead (`transmission` triggers offscreen buffer copying for floor and cubes), high WebGL canvas DPR scaling, excessive geometry subdivisions (8x8x8 box geometry with 3x normal reconstruction loops per vertex), and per-instance Web Worker postMessage IPC overhead.
   - **Solution Overview**: Perform end-to-end performance budgeting and optimization:
     - **Canvas & DPR**: Cap DPR dynamically to `[0.75, 1.25]` (desktop/mobile aware), disable MSAA completely (`antialias: false`), and use lightweight/balanced SMAA (`SMAAPreset.MEDIUM` or `LOW`).
     - **Fluid Distortion Optics Shader**:
       - Add strict early exit in `DISTORTION_FRAG` when `fluidSample.b < 0.0005` before executing density gradient and sampling loops.
       - Optimize 9-tap kernel to a balanced 5-tap cross kernel with combined RGB texture sampling or adaptive tap offset scaling.
       - Cap simulation FBO target resolutions (`paintWidth`/`paintHeight` capped at max 160px / 96px).
       - Simplify noise and potential function evaluations in `PAINT_FRAG`.
     - **3D Materials & Geometry**:
       - Remove transmission from `Floor` (`transmission = 0`) to avoid extra screen pass buffer copies.
       - Simplify `JellyBox` physical material transmission on secondary spawned physics cubes, or optimize transmission and IOR calculations.
       - Reduce `BoxGeometry` segments from 8x8x8 to 5x5x5 or 6x6x6 for 50%+ vertex count reduction.
       - Early-exit active impact loops in vertex shader normal reconstruction when `uImpactActive[i] < 0.5`.
     - **Physics & IPC**:
       - Remove `ccd={true}` from standard physics cubes (retaining stability via kinematic translation clamping).
       - Replace per-instance Web Workers with an inline lightweight main-thread animation loop / single worker to eliminate postMessage IPC overhead per frame.
     - **Environment & Lighting**:
       - Reduce environment HDR map resolution to 128.
   - **Scope**: Modify `scene.tsx`, `FluidDistortion.tsx`, `WiggleCube.tsx`, and `shaderStore.ts` (if default parameters need tuning for mobile budget).
   - **Context**: Ensure the app maintains high visual fidelity (fluid refraction, soft jelly jiggle, SMAA antialiasing) while achieving ultra-smooth 60 FPS performance on mobile hardware.

2. **Success Criteria**
   - **Key Results**:
     - Frame rate increases from 7-8 FPS to 60 FPS on standard mobile viewports / throttled mobile GPUs.
     - Zero MSAA used; post-processing uses balanced SMAA (`SMAAPreset.MEDIUM`).
     - Texture samples per pixel in post-processing reduced by over 60%.
     - Vertex shader impact evaluation cost reduced by ~65%.
     - Zero WebGL framebuffer copies from floor transmission.
   - **Non-Negotiables & Criteria**:
     - Preserve smooth liquid fluid refraction and cursor ripples.
     - Preserve squishy jelly box vertex deformations and collision impact ripples.
     - Maintain crisp UI overlay and SMAA anti-aliased geometry edges.

3. **Project Requirements**
   - [ ] Optimize `DISTORTION_FRAG` with strict early-exit before gradient math and reduce kernel to balanced 5-tap texture sampling.
   - [ ] Cap `FluidDistortion` FBO resolutions (max 160x160 paint, 80x80 low-res).
   - [ ] Optimize `PAINT_FRAG` liquid potential and noise calculations.
   - [ ] Lower Canvas DPR range to `[0.75, 1.25]` and set SMAA preset to `MEDIUM`.
   - [ ] Remove transmission from `Floor` mesh material in `scene.tsx`.
   - [ ] Reduce `BoxGeometry` subdivisions in `WiggleCube.tsx` from 8x8x8 to 5x5x5.
   - [ ] Optimize vertex shader deformation loops with `uImpactActive` guard checks.
   - [ ] Remove `ccd={true}` from physics bodies to prevent Rapier CPU bottlenecks.
   - [ ] Replace per-instance Web Worker IPC with lightweight inline frame updates.
   - [ ] Lower environment map resolution to 128 in `ProgressiveEnvironment`.

4. **Architecture Decisions**
   - **Trade-offs**:
     - *5-tap kernel vs 9-tap kernel*: Reduces chromatic dispersion texture samples from 27 to 15 per active pixel (and 0 for inactive pixels via early exit). The visual difference is indistinguishable given the motion blur of fluid distortion.
     - *Box subdivision 5x5x5 vs 8x8x8*: Reduces vertex count from 384 per box to 150 per box (~60% reduction), saving massive vertex shader matrix transformations and normal reconstruction calculations per frame.
     - *Floor transmission = 0*: Floor transmission is invisible under a dark background anyway, but removing it saves an entire offscreen render pass copy in Three.js `MeshPhysicalMaterial`.
     - *Inline timeline update vs per-instance Web Worker*: Web Workers incur JSON serialization and event loop overhead when called every frame per mesh (`postMessage`). Moving collision slot timeline updates inline inside `useFrame` eliminates all worker IPC overhead while taking < 0.01ms on main thread.
   - **Alternatives Considered**:
     - *Disabling fluid post-processing entirely on mobile*: Rejected because user requested balanced quality with fluid distortion intact.
     - *Full resolution FBOs*: Caused severe fill-rate drops; downsampling simulation FBOs maintains liquid smoothness while dramatically boosting FPS.

5. **Pseudo Code**

```yaml
Stage: @fragment

Input:
  - tFluid: texture
  - inputBuffer: texture
  - vUv: vec2

Process:
  - Node: Early Exit Guard
    logic: |
      vec4 fluidSample = texture2D(tFluid, vUv);
      if (fluidSample.b < 0.0005) {
        outputColor = texture2D(inputBuffer, vUv);
        return;
      }

  - Node: 5-Tap Balanced Dispersion Sampler
    logic: |
      vec2 taps[5] = vec2[](vec2(0,0), vec2(-1,0), vec2(1,0), vec2(0,-1), vec2(0,1));
      float weights[5] = float[](0.35, 0.1625, 0.1625, 0.1625, 0.1625);
      for (int i = 0; i < 5; i++) {
        vec2 refractOffset = tapVel * refractVal * tapDensity;
        // Sample R, G, B with scaled chromatic shift
        accumulatedColor += sampledRGB * weights[i];
      }

Output:
  - outputColor: vec4
```
