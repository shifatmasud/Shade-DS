# Plan: Fluid Simulation and Refraction Fixes

## RCA (Root Cause Analysis)

### 1. Issue: "Fluid Simulation & its blur aren't noticeable yet."
* **Cause A (Rapid Dye Decay)**: Inside the simulation pass, the dye dissipation rates are set to `0.94` (`u_dissipations.yz = 0.94`), which means the dye concentration (the visual trail) decays by 6% *every single frame*. Consequently, any visual trails disappear within a fraction of a second, making the simulation and its blurred trail barely noticeable.
* **Cause B (No Physical Diffusion in Advection)**: The simulation updates the state by advecting the previous frame but does *not* blend the advected state with the blurred state (`u_lowPaintTexture`). This means there is no actual diffusion (spreading/viscosity) of the density or velocity fields across the simulation grid, resulting in sharp, isolated artifacts rather than a smooth, continuous fluid medium.
* **Cause C (Masked Refraction)**: In `DISTORTION_COMPOSITOR_FRAG`, the refraction weight is strictly masked by the dye concentration (`weight = (data.z + data.w) * 0.5`). As a result, when the dye decays, the refractive distortion completely vanishes, even if a strong physical velocity wave is still propagating outward.

### 2. Issue: "Fluid disturbance need to be fluid wave like. Now it feels choppy."
* **Cause A (Alternating Direction 1D Blur)**: In the frame loop, the horizontal and vertical blur passes are alternated frame-by-frame (`blurMaterial.uniforms.u_delta.value.set(1.4 / simWidth, 0.0)` on odd frames, and `(0.0, 1.4 / simHeight)` on even frames). This causes the velocity field's blur to oscillate between purely horizontal and purely vertical, creating severe frame-rate-dependent visual jitter and choppiness.
* **Cause B (Velocity Field Saturation)**: The cursor push velocity is scaled as `velX = dx * 0.15` in JavaScript. Since the simulation texture uses an 8-bit clamp (`[0.0, 1.0]`) and the zero velocity offset is `0.5`, any mouse movement greater than `3.3` pixels instantly saturates the velocity field to its maximum limits. This clipping destroys all fine detail, vortices, and gradients, making the simulation feel harsh and jagged.
* **Cause C (High-Frequency Jitter Noise)**: In the compositor, a frame-varying high-frequency random noise value (`bnoise = rand(gl_FragCoord.xy + fract(u_time))`) is added directly to the refraction offset. This adds heavy grain/noise to the distorted texture every frame, creating a choppy, flickering static look instead of a smooth, glassy refractive water wave.

### 3. Issue: "Fluid sim pass darkened the scene texture. Fix it."
* **Cause A (Color Space Double-Encoding)**: `sceneRenderTarget` is configured with `colorSpace: THREE.SRGBColorSpace`. This causes Three.js to encode the rendered scene texture to sRGB format. When this texture is sampled in the custom shader (`DISTORTION_COMPOSITOR_FRAG`), the GPU decodes it, but because the compositor's output is treated as linear, Three.js applies sRGB encoding a *second* time when rendering to the screen. This double-conversion heavily darkens the midtones and shadows.
* **Cause B (Negative Chromatic Shimmer)**: In `DISTORTION_COMPOSITOR_FRAG`, the chromatic shimmer is calculated as a raw sine wave (`shimmer = sin(...)` in `[-1.0, 1.0]`). Because it is negative half of the time, it subtracts from the scene color, directly darkening the pixels in the refraction zone.

---

## PRD (Product Requirements Document)
* **Objective**: Transform the fluid simulation into an ultra-smooth, premium, noticeble, glass-like refractive wave effect that seamlessly overlays the 3D scene without altering its original color representation or brightness.
* **Key Features**:
  1. **Perfect Scene Brightness**: Neutral compositing when there is no fluid activity, ensuring 100% brightness parity with the direct scene output.
  2. **Continuous 2D Symmetrical Diffusion**: Symmetrical, non-alternating 2D Gaussian blur executed every frame to enable smooth fluid dissipation.
  3. **High-Fidelity Propagating Waves**: Velocity waves propagate far and wide, distorting the scene even after the visual dye fades.
  4. **No-Clip Velocity Gradients**: Responsive, unclipped interaction tracking that preserves subtle fluid vortices and high-speed motion details.
  5. **Additive Shimmer Reflections**: Specular highlights that brighten the wave crests without subtracting from the underlying scene colors.

---

## OKR (Objectives and Key Results)
* **Objective 1**: Resolve all visual choppiness and flicker.
  * *KR 1.1*: Remove alternating directional blurs and replace with a unified single-pass 2D Gaussian blur.
  * *KR 1.2*: Eliminate the high-frequency jitter/noise from the compositor UV offsets.
* **Objective 2**: Increase noticeability and create a "fluid wave" propagation feel.
  * *KR 2.1*: Decrease simulation decay rates (dissipation) so waves persist on screen for several seconds.
  * *KR 2.2*: Base refraction weight on both velocity magnitude and dye concentration.
  * *KR 2.3*: Introduce a physical diffusion blending step in the simulation pass.
* **Objective 3**: Fix scene darkening completely.
  * *KR 3.1*: Change `sceneRenderTarget` to use `THREE.LinearSRGBColorSpace` to prevent double sRGB encoding.
  * *KR 3.2*: Map chromatic shimmer to a strictly positive `[0, 1]` range to make it purely additive.

---

## ADR (Architectural Design Record)
* **Color Space**: Utilize `THREE.LinearSRGBColorSpace` for the scene off-screen render target to keep all rendering operations in Linear space until the final compositor outputs to the screen canvas (where sRGB encoding is applied exactly once).
* **Blur Pass**: Replace the 1D Gaussian blur with a 2D Gaussian 9-tap blur shader that runs symmetrically every frame.
* **Refraction Pipeline**: Implement 3-tap chromatic aberration (R, G, B channel offsets) using smooth velocity vectors without stochastic noise.
* **Velocity Scaling**: Scale input interactions using a smooth linear dampening factor (`0.012` multiplier) with strict saturation guards (`[-0.45, 0.45]` clamp) to preserve physical wave structures.

---

## TODO List
1. [ ] **Update Color Space**: In `/components/3D/FluidDistortionEffect.tsx`, change `sceneRenderTarget`'s `colorSpace` from `THREE.SRGBColorSpace` to `THREE.LinearSRGBColorSpace`.
2. [ ] **Refactor Blur Shader**: Rewrite `BLUR_9_FRAG` to execute a symmetrical 9-tap 2D Gaussian blur using a unified `u_delta` containing the 2D texel size.
3. [ ] **Refactor Simulation Shader**: Update `SCREEN_PAINT_FRAG` to blend the advected state with the low-pass blurred state (`u_lowPaintTexture`) to model real physical fluid diffusion.
4. [ ] **Refactor Compositor Shader**: Rewrite `DISTORTION_COMPOSITOR_FRAG` to:
   - Base weight on the union of velocity magnitude and dye concentration.
   - Calculate smooth UV offsets for R, G, B channels (no grain noise).
   - Convert chromatic shimmer to a strictly positive additive effect (`sin(...) * 0.5 + 0.5`).
5. [ ] **Optimize JavaScript Interaction and Frame Loop**:
   - In `useFrame`, set `u_delta` for the blur material to the static 2D texel size (no alternating axes).
   - Scale and clamp mouse/interaction deltas before updating `u_vel` to prevent clamping/saturation.
   - Update `u_dissipations` to much slower decay values (`0.992` velocity, `0.980` dye) to let the waves persist.
6. [ ] **Verify and Build**: Run `compile_applet` and `lint_applet` to guarantee flawless execution.
