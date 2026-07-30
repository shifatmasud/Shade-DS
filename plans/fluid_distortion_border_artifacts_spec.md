# Tech Spec - Fluid Distortion Border Artifact Resolution

1. **Objective**
   - **Problem Statement**: When the fluid distortion trail is near the screen borders, visual artifacts (such as edge streaks, repeated pixel stretching, or sharp boundary lines) are visible.
   - **Solution Overview**:
     1. **Out-of-Bounds Sampling Prevention**: In `DISTORTION_FRAG`, prevent clamping artifacts by returning zero density and neutral velocity `vec4(0.5, 0.5, 0.0, 0.0)` when the mapped `fluidUv` is outside the normal FBO range of `[0.0, 1.0]`. Apply this check to the main sample, derivative taps, and Gaussian blur samples.
     2. **No-Slip Boundary Conditions (Boundary Fade)**: In `PAINT_FRAG`, smoothly fade advected density and velocity to exactly zero within `3%` of the texture borders using a procedural `borderMask`. This prevents any density from collecting on the edges and being dragged inward, satisfying clean fluid boundary conditions.

2. **Success Criteria**
   - **Key Results**:
     - No stretching or trailing pixel streaks on the edges when moving the cursor near the borders.
     - Fluid trails naturally and smoothly fade out as they reach the viewport boundaries.
     - The app compiles and builds successfully with no syntax or runtime errors.

3. **Project Requirements**
   - [ ] Add an out-of-bounds bounds check in `DISTORTION_FRAG` to neutralise samples.
   - [ ] Implement a smooth `borderMask` fade-out in `PAINT_FRAG` for advected density and velocity.
   - [ ] Ensure derivative taps in `DISTORTION_FRAG` do not sample outside the coordinate frame.

4. **Architecture Decisions**
   - **Procedural Border Mask**: Multiplied directly onto advected values inside the paint loop. Extremely efficient and requires no extra render passes or texture state changes.
   - **Out-of-Bounds Safeguard**: Explicitly check bounds inside the post-processing shader to decouple screen-space size changes from FBO resolution clamping behavior.

5. **Pseudo Code**

   **ShadeR DSL - Boundary Safeguard (Distortion Fragment)**
   ```yaml
   Stage: @fragment (Distortion Post-processing)

   Input:
     - fluidUv: vec2
     - tFluid: sampler2D

   Process:
     - Node: Bounds Check
       logic: |
         bool isOutOfBounds(vec2 uv) {
           return uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;
         }
         
         vec4 sampleFluidSafe(vec2 uv) {
           if (isOutOfBounds(uv)) return vec4(0.5, 0.5, 0.0, 0.0);
           return texture2D(tFluid, uv);
         }
   ```
