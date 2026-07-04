# Plan: Fluid Distortion Upgrade

## 1. PRD (Overview & Objectives)
The objective is to replace the current fluid distortion effect with a highly robust and faithful implementation of the 10-step Complete Simulation Pipeline detailed in the architecture diagram.
The upgrade must satisfy these constraints:
- **Original Scene Preservation**: The colors, lighting, and color spaces of the original 3D scene must remain completely unmodified when no fluid trail is present.
- **Localized Flow Trail Zone**: All fluid refraction, blur, and iridescence must exist exclusively within the flow trail boundary (isolated by the dye/dye-blurred fields).
- **Aesthetic Precision**: The iridescence colors (blue/red shear layers), rounded Gaussian splats, curl noise/turbulence, and advection transport must look highly organic and premium.

---

## 2. OKR (Success Criteria)
- **Fluid Simulation Integrity (100%)**: Implementation of separate velocity, dye, and dye-blurred FBO passes matching the architecture diagram's pipeline order.
- **No Scene Degradation (0% alteration)**: Perfect sharpness, color space accuracy, and luminosity of the underlying 3D scene (Wiggle Cube, etc.) outside of active flow trails.
- **Zero Memory Leaks**: Proper clean-up/disposal of all old FBOs and materials during canvas resizes or component unmounting.
- **High Performance (60+ FPS)**: Low overhead, utilizing optimized multi-tap sampling and GPGPU texture ping-ponging.

---

## 3. ADR (Architectural Design)

### 3.1 GPGPU Pipeline & Ping-Pong FBOs
We will use three distinct ping-pong/single FBOs:
1. **Velocity FBO** (`velocityTarget1`, `velocityTarget2`):
   - Ping-pong targets.
   - Channel mapping: `rg` = velocity vector (offset by `0.5` bias for standard unsigned texture support).
2. **Dye FBO** (`dyeTarget1`, `dyeTarget2`):
   - Ping-pong targets.
   - Channel mapping: `r` = dye concentration (scalar `0.0` to `1.0`).
3. **Dye Blurred FBO** (`dyeBlurredTarget`):
   - Single target updated per-frame.
   - 9-tap Gaussian blur applied to Dye density to create extremely smooth, stable gradients.

### 3.2 Computational Pass Shader Definitions
- **Velocity Pass Shader**:
  - Inputs: `u_velocityTexture`, `u_pointer`, `u_prevPointer`, `u_pointerVel`, `u_dt`, `u_curlScale`, `u_curlStrength`, `u_decay`
  - Logic: 
    1. Advect velocity: `velocity(uv) = sample(velocityTexture, uv - velocity * dt)`
    2. Inject Gaussian velocity splat: `velocity += dir * strength * exp(-dot(d,d) / (2 * sigma^2))`
    3. Generate 2D Curl Noise: `curl = normalize(del x noise)` and add to velocity: `velocity += curl * curlStrength`
- **Dye Pass Shader**:
  - Inputs: `u_dyeTexture`, `u_velocityTexture`, `u_pointer`, `u_prevPointer`, `u_dt`, `u_decay`
  - Logic:
    1. Advect dye: `dye(uv) = sample(dyeTexture, uv - velocity * dt)`
    2. Inject Gaussian dye splat: `dye += amount * exp(-dot(d,d) / (2 * sigma^2))` (subtle amount)
- **9-Tap Gaussian Blur Shader**:
  - Inputs: `u_dyeTexture`, `u_texelSize`
  - Logic: Apply standard 1D/2D Gaussian blur weights `[1, 2, 1] / [2, 4, 2] / [1, 2, 1] / 16`
- **Compositor Shader**:
  - Inputs: `u_sceneTexture`, `u_dyeBlurredTexture`, `u_refractionStrength`, `u_blurRadius`, `u_iridescentIntensity`
  - Logic:
    1. Sample `u_dyeBlurredTexture` to obtain dye density. If density is `0.0`, early exit with unmodified `u_sceneTexture`.
    2. Compute spatial gradient: `grad = vec2(dD/dx, dD/dy)` using central differences.
    3. Compute edge weight (magnitude of gradient) and perpendicular shear direction.
    4. Colorize: Blend blue/red based on the perpendicular direction (`dot(perp, vec2(1,1))`).
    5. Displace UV coordinates along gradient to refract.
    6. Multi-tap blur the `u_sceneTexture` at the displaced UV with radius proportional to `dye_blurred`.
    7. Blend iridescent color over the blurred/refracted scene color based on iridescent intensity and edge weight.

---

## 4. TODO List
- [ ] Create/Update `/components/3D/FluidDistortionEffect.tsx`
- [ ] Implement robust 2D Simplex/Curl Noise in GLSL
- [ ] Implement GPGPU Simulation State Loops (Velocity & Dye updates)
- [ ] Implement the 9-Tap Gaussian Blur pass
- [ ] Implement the Compositor Shader with precise gradient, iridescence, and refraction/blur logic
- [ ] Verify there are no memory leaks or WebGL warnings on resizing
- [ ] Verify 3D scene colors and spaces are completely untouched outside flow trails
- [ ] Compile and verify the build
