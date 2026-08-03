# Tech Spec: Smart Forward-Only Slopes & Grid-Based Wave Propagation Ripple System

1. **Objective**
   - **Problem Statement**: 
     1. The current fluid simulation's trails have refraction artifacts where density slopes can cause coordinates to refract backward (opposite to the fluid velocity direction), creating dragging/lagging visual artifacts on trail boundaries.
     2. The current decay/dissipation of the fluid trail takes too long and uses simple linear/power-based decay instead of a true physical wave propagation/ripple system where waves propagate outward and dissipate rapidly.
   - **Solution Overview**:
     - Integrate a grid-based wave propagation system into `PAINT_FRAG` and forward-only refraction with premium options A, B, and C:
       - **Option C (Velocity-Driven Slope Blend)**: Replace the backward density-slope term with a forward advection-bias vector, so lensing is structurally pulled in the direction of the movement and forward-only.
       - **Option B (Progressive Drag/Friction)**: Introduce a non-linear velocity-damping factor acting like hydrodynamic friction, where small/fading waves dissipate exponentially faster than large, high-energy impact ripples.
       - **Option A (Glass-Lens Refraction)**: Maintain the premium 9-tap chromatic dispersion and Gaussian blurred lens, but with a sharper front-facing pressure wave (higher density peak at the tip of the cursor segment).
   - **Scope**: Update `/components/staged/3D/FluidDistortion.tsx` GLSL shaders and coordinate-handling loops.
   - **Context**: Integrates with the R3F 3D Scene viewport as a postprocessing effect.

2. **Success Criteria**
   - **Forward-Only Refraction**: Refraction displacement never drags backwards against the flow direction.
   - **Grid-Based Ripple Propagation**: Moving the mouse/touches triggers beautiful concentric ripples that travel outward, driven by coupled wave height and velocity equations.
   - **Fast Dissipation**: Ripples dissipate quickly and snappily without lingering "stale" ghosts (fades away completely within < 1-2 seconds).
   - **Performance & Stability**: Maintains solid 60 FPS on the FBO pipeline with no GLSL compilation warnings.

3. **Project Requirements**
   - **GLSL Shaders update in `/components/staged/3D/FluidDistortion.tsx`**:
     - **Wave Propagation in `PAINT_FRAG`**:
       - Sample 4-way neighbors of the advected coordinate in `tLowRes` to get the wave heights.
       - The blue (`b`) channel will represent the wave height (coupled with density), and the alpha (`a`) channel will represent the vertical wave velocity (centered at 0.5, where decoded velocity is `(alpha - 0.5) * 2.0`).
       - Calculate the discrete Laplacian of the height:
         `float laplacian = (h_left + h_right + h_up + h_down) - 4.0 * h_center;`
       - Update wave velocity using wave acceleration:
         `float acceleration = uWaveSpeed * laplacian;`
         `float velocity = (v_center + acceleration * uDt) * (uDissipation * 0.88);`
       - Update height:
         `float height = (h_center + velocity * uDt) * (uDissipation * 0.88);`
       - Integrate **Option B (Progressive Drag/Friction)**: Scale the wave decay non-linearly. Low-amplitude waves dissipate exponentially faster than high-amplitude ripples:
         `float ampFactor = clamp(height * 2.2, 0.0, 1.0);`
         `float nonLinearDrag = mix(0.72, 0.94, ampFactor);`
         `velocity *= nonLinearDrag;`
         `height *= nonLinearDrag;`
       - Add **Option A (Glass-Lens Refraction)**: Produce a sharper front-facing pressure wave (higher density peak at the tip of the cursor segment) by modulating the splat density with a polynomial of `tSeg`:
         `float pressureFront = mix(0.7, 1.35, pow(tSeg, 2.5));`
         `float s_i_density = s_i * splatIntensity * pressureFront;`
     - **Forward-Only Blending in `DISTORTION_FRAG`**:
       - Integrate **Option C (Velocity-Driven Slope Blend)**:
         ```glsl
         vec2 flowDir = vec2(0.0);
         float tapVelMag = length(tapVel);
         if (tapVelMag > 0.001) {
           flowDir = tapVel / tapVelMag;
         }
         
         vec2 slopeNormal = -densitySlope;
         float slopeDot = dot(slopeNormal, flowDir);
         if (slopeDot < 0.0) {
           // Cancel backward component entirely
           slopeNormal -= flowDir * slopeDot;
           // Add forward advection-bias vector to structurally pull the lensing forward
           slopeNormal += flowDir * (0.15 * slopeMag);
         }
         ```
         Use this corrected `slopeNormal` instead of `-densitySlope` to calculate `refractOffset`.

4. **Architecture Decisions**
   - **Alpha Channel Wave Encoding**: Utilizing the unused FBO alpha channel to store wave velocity avoids creating an additional texture, maximizing performance and maintaining memory-alignment boundaries.
   - **Advection-Coupled Propagation**: Computing the Laplacian around the back-advected coordinate allows waves to both propagate outward physically and be carried naturally along the stream velocity.

5. **Pseudo Code (ShadeR DSL)**
   ```yaml
   Stage: @fragment (Fluid Update - PAINT_FRAG)
   Process:
     - Node: Wave Propagation
       inputs:
         - h_center: float (center height, advectedSample.b)
         - v_center: float (decoded vertical speed, (advectedSample.a - 0.5) * 2.0)
         - h_left, h_right, h_up, h_down: float (neighbor heights)
       outputs:
         - h_new: float
         - v_new: float
       logic: |
         laplacian = h_left + h_right + h_up + h_down - 4.0 * h_center
         acceleration = 0.55 * laplacian
         v_new = (v_center + acceleration * 0.16) * (uDissipation * 0.86)
         h_new = (h_center + v_new * 0.16) * (uDissipation * 0.86)
         if (splat > 0.001) {
           h_new = max(h_new, splat)
           v_new += splat * 3.5
         }
         output = vec4(mixedVel * 0.5 + 0.5, clamp(h_new, 0.0, 1.0), clamp(v_new, -1.0, 1.0) * 0.5 + 0.5)

   Stage: @fragment (Refraction - DISTORTION_FRAG)
   Process:
     - Node: Forward-Only Filter
       inputs:
         - tapVel: vec2
         - densitySlope: vec2
       outputs:
         - refractOffset: vec2
       logic: |
         flowDir = normalize(tapVel)
         refractOffset = (tapVel * 0.3 - densitySlope * ...) * trailMask
         if (dot(refractOffset, flowDir) < 0.0) {
           refractOffset -= flowDir * dot(refractOffset, flowDir)
         }
   ```
