# Tech Spec - Windforce, Dispersion Blur, and Slow Mouse Wave Trails

1. **Objective**
   - **Problem Statement**: The current fluid distortion system has three issues:
     1. The ambient windforce is oriented Northeast (upward and to the right) with orbital swaying, whereas the user wants it strictly upward (no horizontal bias, only symmetric swaying).
     2. The chromatic dispersion refraction pass samples the background image at the original, unblurred pixel center coordinates, leaving the refracted background details crisp instead of softly blurred.
     3. Slow mouse movements do not generate visible wave trails (density splats) because velocity is zeroed out below a high threshold (`0.0005`), and the density splat intensity scales down too quickly to zero.
   - **Solution Overview**:
     1. Adjust `windDir` inside the `PAINT_FRAG` shader to center at `x = 0.0` (purely upward) while preserving the organic orbital swaying.
     2. Incorporate the 9-tap Gaussian blur offset (`blurOffset`) directly into the color-shifted background lookups (`offsetR`, `offsetG`, `offsetB`) within `DISTORTION_FRAG`.
     3. Lower the JS-side movement threshold to `0.00005` to capture micro-movements, and implement a responsive non-linear threshold/clamping function in the paint shader to guarantee continuous density trails for slow movements.
   - **Scope**: Modifications are restricted to `/components/staged/3D/FluidDistortion.tsx`. No changes are made to other components.

2. **Success Criteria**
   - **Key Results**:
     - Wind force moves fluid strictly upward on average, with organic left-right swaying.
     - Chromatic dispersion has a soft, high-quality blurred lens appearance rather than sharp pixel duplication/offsets.
     - Even slow, deliberate mouse movements generate a beautiful, continuous, visible fluid trail.
     - App continues to compile, run at 60 FPS, and passes lint checks.

3. **Project Requirements**
   - [ ] Update `windDir` calculation in `PAINT_FRAG` to be centered at `x = 0.0` (strictly vertical base vector).
   - [ ] Modify `DISTORTION_FRAG` 9-tap lookup loop to add the 9-tap blur offset to the red, green, and blue background lookups.
   - [ ] Decrease the minimum movement threshold in `/components/staged/3D/FluidDistortion.tsx` to `0.00005`.
   - [ ] Enhance `splatIntensity` in `PAINT_FRAG` to have a non-linear scaling with a highly sensitive baseline for slow movements while maintaining zero splat when fully stationary.

4. **Architecture Decisions**
   - **Wind Direction Centering**: By changing the base vector of `windDir` from `vec2(0.35, 0.6)` to `vec2(0.0, 1.0)`, we align the baseline wind directly upward. Symmetrical swaying (`sin(uTime)`) adds organic life without introducing any horizontal drift.
   - **Integrated Blur offsets**: Adding `blurOffset` (which scales with `uBlurRadius * trailMask`) to the background UV coordinates in the 9-tap loop ensures the background is actual Gaussian-blurred when inside the fluid trail, matching real-world blurry dispersion and frosted-glass light transport.
   - **Non-Linear Splat Intensity**: Standard linear scaling is insensitive to slow movements. By applying a baseline value (e.g. `0.25`) immediately when speed is above a tiny threshold, we create clean, continuous dye trails for slow movements without any accumulation when stationary.

5. **Pseudo Code**

   **ShadeR DSL - Wind and Splat Logic (Paint Fragment)**
   ```yaml
   Stage: @compute (Paint Fragment Shader)
   
   Process:
     - Node: Wind Force Generator
       inputs:
         - uTime: float
         - vUv: vec2
       outputs:
         - windForce: vec2
       logic: |
         vec2 windDir = normalize(vec2(0.0, 1.0) + vec2(sin(uTime * 0.15) * 0.12, cos(uTime * 0.1) * 0.12));
         float windNoise = snoise(vUv * 1.5 + vec2(uTime * 0.05, -uTime * 0.03)) * 0.5 + 0.5;
         vec2 windForce = windDir * (0.012 + windNoise * 0.018);

     - Node: Splat Intensity Scaler
       inputs:
         - speed: float
       outputs:
         - splatIntensity: float
       logic: |
         float splatIntensity = speed > 0.00002 ? clamp(speed * 800.0, 0.25, 1.0) : 0.0;
   ```

   **ShadeR DSL - Blurry Dispersion (Distortion Fragment)**
   ```yaml
   Stage: @fragment (Distortion Fragment Shader)
   
   Process:
     - Node: 9-tap Blurry Refraction and Dispersion Mixer
       inputs:
         - uv: vec2
         - tFluid: texture
         - inputBuffer: texture
       outputs:
         - outputColor: vec4
       logic: |
         for (int i = 0; i < 9; i++) {
           vec2 blurOffset = tapOffsets[i] * rimBlurRadius;
           ...
           vec2 offsetR = blurOffset + refractOffset * (1.0 + shiftScale) + appliedJitter;
           vec2 offsetG = blurOffset + refractOffset + appliedJitter;
           vec2 offsetB = blurOffset + refractOffset * (1.0 - shiftScale) + appliedJitter;
           
           float r = texture2D(inputBuffer, clamp(uv + offsetR, 0.0, 1.0)).r;
           float g = texture2D(inputBuffer, clamp(uv + offsetG, 0.0, 1.0)).g;
           float b = texture2D(inputBuffer, clamp(uv + offsetB, 0.0, 1.0)).b;
           accumulatedColor += vec3(r, g, b) * weights[i];
         }
   ```
