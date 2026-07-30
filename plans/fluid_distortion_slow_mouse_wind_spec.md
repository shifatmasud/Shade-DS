# Tech Spec - Fluid Distortion Windforce and Slow Mouse Wave Trails

1. **Objective**
   - **Problem Statement**: The current fluid distortion system has two specific behaviors that need improvement:
     1. The gentle ambient windforce is always active. The user wants the **Full Wind force** to only be active when the mouse (or any touch pointer) is not moving. When the mouse is moving, the wind force should deactivate or scale down to let the user's interactive gesture dominate the flow.
     2. Subtle or slow mouse movements generate short, weak flow trails that dissipate almost immediately. The user wants slow, subtle mouse movements to generate **long, beautiful waves and flow trails**.
   - **Solution Overview**:
     1. **Wind Force Modulation**: Calculate the maximum speed of all active touch/mouse pointers in the `PAINT_FRAG` shader. Dynamically scale the wind force using a highly sensitive transition multiplier (`windScale`) based on this speed. When the speed is `0.0` (mouse stationary), `windScale` is `1.0` (Full Wind). As speed increases, `windScale` smoothly steps down to `0.0`.
     2. **Subtle Movement Amplification**:
        - Boost the density injection (`splatIntensity`) for low speeds so that even micro-movements inject a strong baseline density (e.g., minimum `0.85`).
        - Boost the velocity impulse and wake vorticity non-linearly using a power function (e.g., `pow(speed, 0.55)`) at low speeds. This ensures that slow movements impart a wave-generating momentum into the fluid rather than dying out instantly.
        - Dynamically reduce the dissipation of both density and velocity when the mouse is moving to allow the generated wave trails to persist and travel further as coherent "long waves".
   - **Scope**: Modifications are isolated to `/components/staged/3D/FluidDistortion.tsx`.

2. **Success Criteria**
   - **Key Results**:
     - Wind force is 100% active when the mouse is completely stationary or outside the window, and gracefully fades out to 0% as the mouse moves.
     - Moving the mouse extremely slowly generates rich, full-density wave trails that don't immediately break apart or dissipate.
     - The velocity of slow mouse movements is amplified non-linearly to create wide, propagating wave ripples (long waves).
     - The app compiles and builds successfully without any errors or warnings.

3. **Project Requirements**
   - [ ] Calculate the maximum speed of active pointers in `PAINT_FRAG`.
   - [ ] Add `windScale` to modulate the wind force vector by `smoothstep` transition.
   - [ ] Boost `splatIntensity` for non-zero speeds to a high baseline (e.g., `0.85` minimum).
   - [ ] Introduce non-linear velocity and wake vorticity amplification using `pow(speed, 0.55)` to boost low speeds.
   - [ ] Fine-tune density and velocity dissipation coefficients to keep flow trails long and wave-like during active pointer movement.

4. **Architecture Decisions**
   - **Dynamic Dissipation Scaling**: Standard constant dissipation decays fast movements and slow movements at the exact same rate. By using a slightly higher persistence (lower dissipation decay) for density (`0.982`) and velocity (`0.956`) during movement, the waves can propagate farther.
   - **Non-Linear Velocity Boosting**: Low velocity is normally lost to dissipation. Applying `speedAmp = pow(speed, 0.55) / speed` raises the baseline magnitude of slow movements by over an order of magnitude, creating beautiful wavy ripples while preventing high-speed gestures from blowing up the simulation.

5. **Pseudo Code**

   **ShadeR DSL - Dynamic Wind & Subtle Boost (Paint Fragment)**
   ```yaml
   Stage: @compute (Paint Fragment Shader)

   Input:
     - uVelocity: vec2[5]
     - uActive: float[5]
     - uDissipation: float

   Process:
     - Node: Speed Tracker
       outputs:
         - maxPointerSpeed: float
       logic: |
         float maxPointerSpeed = 0.0;
         for (int i = 0; i < MAX_TOUCHES; i++) {
           if (uActive[i] > 0.01) {
             maxPointerSpeed = max(maxPointerSpeed, length(uVelocity[i]));
           }
         }

     - Node: Wind Modulator
       inputs:
         - maxPointerSpeed: float
       outputs:
         - windScale: float
       logic: |
         // Fades out wind as mouse speed increases
         float windScale = smoothstep(0.0015, 0.00005, maxPointerSpeed);

     - Node: Wave Amplification
       inputs:
         - speed: float
         - uVelocity[i]: vec2
       outputs:
         - boostedVel: vec2
         - splatIntensity: float
       logic: |
         // Boost density baseline for slow movements
         float splatIntensity = speed > 0.000002 ? clamp(0.85 + speed * 2500.0, 0.0, 1.0) : 0.0;
         
         // Boost velocity non-linearly for slow movements
         float speedAmp = 1.0;
         if (speed > 0.000001) {
           speedAmp = pow(speed, 0.55) / speed;
         }
         vec2 boostedVel = uVelocity[i] * speedAmp * uStrength * mix(2.5, 5.2, act) * 0.22;
   ```
