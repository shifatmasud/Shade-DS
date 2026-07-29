# Tech Spec - Sharp Bounded Fluid Optics & Low Viscosity

1. **Objective**
   The user reported that the current WebGL fluid distortion "looks disgusting". They requested:
   - Low viscosity (slower decay, longer-lasting flowing eddies and curls).
   - Smooth big wavy brush path (elegant large strokes without jagged edges or sudden jumps).
   - Absolute zero distortion of neighbors (no blurry halo/bleeding of nearby items).
   - Sharp bound fluid trail (crisp edges, refraction and chromatic dispersion strictly confined inside the active trail zone).

2. **Success Criteria**
   - **Low Viscosity**: The fluid continues to swirl and propagate in organic vortex loops after a stroke.
   - **Wavy Path**: The brush strokes are smooth, large, and continuous. Jittery input is filtered out.
   - **Sharp Trail Boundary**: Zero refraction or blur occurs on pixels outside the trail zone (density < 0.08). Neighbors remain perfectly crisp.
   - **Clean Transitions**: Smooth anti-aliasing on the sharp trail border using a high-slope blending mask.

3. **Project Requirements**
   - [ ] Implement exponential smoothing (lerp) on the pointer coordinates in `FluidDistortion.tsx` to filter out hand jitters and generate smooth wavy trajectories.
   - [ ] Modify the fluid update shader (`PAINT_FRAG`):
     - Separate advection from force injection (back-advect purely along the velocity field).
     - Inject curl noise and pointer forces directly into the velocity to allow physical curl propagation.
     - Eliminate or reduce arbitrary constant wind forces to keep the fluid trail contained and clear.
   - [ ] Update the refraction post-processing shader (`DISTORTION_FRAG`):
     - Apply a sharp threshold (e.g. `0.08`) with a narrow slope transition (`smoothstep` over a `0.01` span).
     - Short-circuit the shader for any pixels where `trailMask < 0.001` by returning `inputColor` immediately.
     - Blend the final refracted color with the original screen color using `trailMask` for crisp, anti-aliased, razor-sharp edges.
   - [ ] Adjust default parameters in `services/shaderStore.ts` to reflect large brush radius (`0.11`) and extremely low viscosity (`dissipation: 0.988`).

4. **Architecture Decisions**
   - **True Physical Vorticity**: Adding curl noise directly as a velocity impulse (instead of just warping the back-advection coordinate) ensures that curl patterns travel along with the fluid flow, resulting in authentic low-viscosity vortices.
   - **Zero-Distortion Masking**: Short-circuiting the fragment shader on `trailMask < 0.001` ensures optimal GPU performance and completely protects neighboring screen pixels from any bleeding or blurring.

5. **Pseudo Code (ShadeR DSL)**
   ```yaml
   Stage: @fragment (Refraction Post-Processing)
   Input:
     - tFluid: texture
     - inputColor: vec4
     - uv: vec2
   Process:
     - Node: Trail Mask Threshold
       inputs:
         - density: float
         - threshold: float (0.08)
       outputs:
         - trailMask: float
       logic: |
         trailMask = smoothstep(threshold - 0.005, threshold + 0.005, density)
         if (trailMask < 0.001) return inputColor;

     - Node: Refraction & Chromatic Dispersion
       inputs:
         - trailMask: float
         - uv: vec2
       outputs:
         - accumulatedColor: vec3
       logic: |
         Loop 9-tap kernel:
           offsetR = refractOffset * (1.0 + shift) * trailMask
           offsetG = refractOffset * trailMask
           offsetB = refractOffset * (1.0 - shift) * trailMask
           accumulate samples from inputBuffer
         
     - Node: Edge Blending
       inputs:
         - accumulatedColor: vec3
         - inputColor: vec4
         - trailMask: float
       outputs:
         - outputColor: vec4
       logic: |
         return mix(inputColor, vec4(accumulatedColor, inputColor.a), trailMask)
   ```
