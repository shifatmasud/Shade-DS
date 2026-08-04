# Tech Spec 

1. **Objective**
   - **Problem Statement**: The dissipation parameter in the fluid distortion shader is not fast enough. Smaller values (like `0.85`) do not decay the ripples and velocities rapidly, causing fluid trails to persist too long even when low dissipation values are requested. This is because of the hardcoded `mix(0.985, uDissipation, 0.08)` in the paint pass shader, which overrides the actual dissipation value and keeps the multiplier near `0.98`.
   - **Solution Overview**: Update the paint pass shader in `FluidDistortion.tsx` to directly apply `uDissipation` (or a scaled version of it) without the restrictive mixing logic, making dissipation faster and allowing the full range (e.g., `0.85`) to take full effect. Also, ensure there is 0 instant or fade dissolve without proper physical wave propagation, and ensure mouse move generates appropriate ripple forces.
   - **Scope**: Modify `/components/staged/3D/FluidDistortion.tsx` paint pass shader dissipation logic. Also update `/services/shaderStore.ts` `DEFAULT_SHADER_PARAMS` to match the exact defaults requested by the user.

2. **Success Criteria**
   - Fluid trails and ripples dissipate much faster when `dissipation = 0.85`.
   - No instant or fade dissolves without physical wave propagation (dissipation is handled natively in the physical simulation loops).
   - Mouse move inputs a velocity and wave height impulse proportionally to move the ripple.
   - The default values are:
     - `radius`: 0.06
     - `strength`: 0.5
     - `dissipation`: 0.85
     - `curlStrength`: 0.07
     - `curlFreq`: 1
     - `refractStrength`: 0.18
     - `dispersionScale`: 0.5
     - `blurRadius`: 0.004
     - `jitterStrength`: 0.02
   - No linter/compilation errors.

3. **Project Requirements**
   - Modify dissipation calculations in `/components/staged/3D/FluidDistortion.tsx` paint shader:
     - Change the wave and velocity dissipation factors to utilize the raw `uDissipation` directly or in a way that respects low values (e.g., 0.85) properly.
   - Ensure mouse move creates beautiful physical wave propagation and velocity trails:
     - Check the mouse movement excitation: `newWaveHeight = clamp(newWaveHeight + splat * mix(0.4, 0.85, activeVal), -1.0, 1.0)` and `newWaveVel = clamp(newWaveVel + splat * 3.5, -2.5, 2.5)`. This is already in place and works nicely by adding impulses to the wave height and velocity.
   - Update `DEFAULT_SHADER_PARAMS` in `/services/shaderStore.ts`.
   - Compile and lint to ensure there are no issues.

4. **Architecture Decisions**
   - **Trade-offs**: Raw `uDissipation` provides complete linear control to the user. At 0.85, the wave decay will feel very snappy and responsive, disappearing quickly as desired.
   - **Benefit**: Restores intuitive slider behavior for fluid simulation, matching the user's expectations.

5. **Pseudo Code**
   ```glsl
   // In PAINT_FRAG:
   float finalDamping = clamp(progressiveDamping * uDissipation * borderMask, 0.0, 0.996);
   newWaveVel *= finalDamping;
   newWaveHeight *= finalDamping;

   float velDissipation = uDissipation;
   vec2 advectedVel = (advectedSample.rg - 0.5) * 2.0 * velDissipation * borderMask;
   ```
