# Tech Spec

1. **Objective**
   - **Problem Statement**: Standard Navier-Stokes fluid simulations in WebGL (with multi-pass Jacobi pressure solvers, divergence calculation, and high-precision floating point textures) are computationally expensive and prone to performance bottlenecks on mobile/web GPUs.
   - **Solution Overview**: Implement an ultra-lightweight, 8-bit texture compliant offscreen fluid distortion pipeline for the 3D scene with environment mapping:
     1. Render the main 3D scene (geometries, lighting, environment map reflections, physics objects) to an offscreen `THREE.WebGLRenderTarget`.
     2. Maintain a 2D motion vector / paint map using a ping-pong pair of render targets scaled at 1/4 resolution, and a lower-resolution blur target at 1/8 resolution.
     3. Splat mouse/touch position and velocity into the paint target using a 2D distance field, mixing previous low-resolution velocity vectors into the updated state.
     4. Downsample and blur the updated paint state to the 1/8 lower-resolution target for next-frame velocity propagation and advection.
     5. Composite the final image by sampling the offscreen 3D scene target with a 9-tap blue-noise jittered velocity offset and velocity-dependent RGB chromatic aberration shift.
   - **Scope & Context**: Replaces or enhances the rendering pipeline in `/components/staged/3D/scene.tsx` while adhering strictly to Shade DSL, ShadeR DSL, and system architecture rules.

2. **Success Criteria**
   - **Offscreen Scene Fidelity**: The 3D scene with Environment map (city preset), physics cubes, floor, and sky renders cleanly into an offscreen render target (`sceneTarget`) without visual degradation.
   - **Motion Vector Dynamics**: Pointer and touch gestures paint velocity vectors into the 1/4 resolution ping-pong target using a smooth 2D radial distance field.
   - **Velocity Transport & Blurring**: The 1/8 resolution downsampled blur pass smoothly carries and diffuses velocity momentum across frames.
   - **Jittered Chromatic Distortion**: The compositing shader applies a 9-tap sampling pass jittered with blue noise and applies RGB dispersion scaled by fluid velocity.
   - **Performance & Resource Hygiene**: Runs efficiently at 60 FPS using standard 8-bit RGBA WebGL render targets. Disposes all framebuffers, geometries, and materials cleanly on unmount or window resize.
   - **Touch & Drag Parity**: Touch drag interactions trigger fluid motion with exact coordinate-to-screen mapping matching mouse pointer drags.

3. **Project Requirements**
   - [ ] Define the offscreen scene capture pass (`sceneTarget`) in R3F with explicit frame loop priority (`useFrame(..., 1)`).
   - [ ] Initialize ping-pong render targets at 1/4 screen resolution (`paintTargetA`, `paintTargetB`) and lower-res target at 1/8 screen resolution (`blurTarget`).
   - [ ] Implement the Distance Field Paint & Velocity Mixing Shader (`PAINT_SIM_FRAG`) to splat cursor velocity and blend previous frame low-res vectors.
   - [ ] Implement the 9-Tap Downsample & Gaussian/Box Blur Shader (`BLUR_FRAG`) to feed the 1/8 res buffer for the next frame iteration.
   - [ ] Implement the 9-Tap Blue Noise Jittered Distortion Shader (`DISTORTION_COMPOSITE_FRAG`) with velocity-driven RGB chromatic shift.
   - [ ] Integrate mouse/touch move event tracking with resolution-scaled normalized device coordinates (NDC) and frame-delta velocity vectors.
   - [ ] Add touch scrubbing support (`onTouchMove`, `onTouchStart`, `onTouchEnd`) for mobile gesture parity.
   - [ ] Verify build compilation (`compile_applet`) and zero-flicker visual quality.

4. **Architecture Decisions**
   - **8-Bit Texture Compatibility**: By replacing full pressure-Poisson solvers with velocity mixing and downscaled blur propagation, standard `THREE.UnsignedByteType` (8-bit) textures work smoothly across all web and mobile GPUs without requiring floating-point texture extension support.
   - **Resolution Scaling**: `1/4` screen resolution for motion vector ping-pong targets balances high spatial detail for fluid swirls with minimal memory bandwidth. `1/8` screen resolution for the blur target provides wide velocity diffusion at almost zero extra GPU cost.
   - **9-Tap Blue Noise Jittering**: Procedural 2D noise or static blue noise texture offsets the 9 texture taps, removing banding artifacts without needing high sample counts or multi-pass blur pipelines.
   - **R3F Render Loop Integration**: Using a dedicated `<OffscreenFluidPipeline />` component rendered inside the `<Canvas>` allows full control over `gl.setRenderTarget` calls while keeping all physics (`@react-three/rapier`) and environment maps (`Environment`) unchanged.

5. **Pseudo Code**

```yaml
# ShadeR DSL System Architecture Specification

Stage: @compute (Motion Vector Field Evolution)

Input:
  - prevPaintTexture: texture          # Ping-pong target A (1/4 screen length)
  - lowResBlurTexture: texture         # Lower-res blurred target (1/8 screen length)
  - pointerPos: vec2                   # Normalized pointer coordinates (0..1)
  - pointerVel: vec2                   # Frame delta velocity vector
  - brushRadius: float                 # 2D distance field radius
  - mixFactor: float                   # Blending weight between input and carried velocity

Process:
  - Node: Distance Field Splat
    inputs:
      - uv: vec2
      - pointerPos: vec2
      - brushRadius: float
    outputs:
      - inputIntensity: float
    function: pure
    logic:
      Calculate smoothstep 2D radial distance field centered at pointerPos with cutoff at brushRadius.

  - Node: Velocity Carrier & Mixer
    inputs:
      - inputIntensity: float
      - pointerVel: vec2
      - lowResVelocity: vec2
      - mixFactor: float
    outputs:
      - blendedVelocity: vec2
    function: stateful
    logic:
      Sample carried velocity from lowResBlurTexture, mix with new pointerVel proportional to inputIntensity and decay.

  - Node: Blur Downsampler
    inputs:
      - paintTexture: texture
    outputs:
      - lowResBlurredTexture: texture
    function: pure
    logic:
      Apply a 9-tap downsampled box/gaussian blur to store in lower-res (1/8 screen length) buffer for next frame velocity carrier pass.

Output:
  - nextPaintTexture: texture          # Ping-pong target B (1/4 screen length)
  - blurTargetTexture: texture         # Lower-res target (1/8 screen length)


Stage: @fragment (Offscreen Scene Distortion Compositor)

Input:
  - offscreenSceneTexture: texture     # 3D scene with env map rendered offscreen
  - motionVectorTexture: texture       # Active paint target (1/4 screen length)
  - blueNoiseTexture: texture          # Blue noise jitter matrix or procedural hash
  - rgbShiftIntensity: float           # Chromatic dispersion scaling coefficient

Process:
  - Node: Jittered Velocity Sampler
    inputs:
      - uv: vec2
      - motionVectorTexture: texture
      - noiseVal: float
    outputs:
      - jitteredVelocity: vec2
    function: pure
    logic:
      Sample motion vector map using 9-tap kernel offset by blue noise jittering.

  - Node: Chromatic Dispersion Distortion
    inputs:
      - uv: vec2
      - sceneTexture: texture
      - velocity: vec2
      - rgbShiftIntensity: float
    outputs:
      - finalColor: vec4
    function: pure
    logic:
      Distort scene UV coords by velocity. Sample Red, Green, and Blue channels at offset UV positions proportional to velocity magnitude.

Output:
  - finalViewportColor: vec4
```

```tsx
// Component Architecture (Shade DSL Component Spec)

COMPONENET: OffscreenFluidPipeline
  DATA:
    ref: sceneTarget, paintTargetA, paintTargetB, blurTarget
    ref: paintMaterial, blurMaterial, compositeMaterial
    ref: pointerState { currentPos, prevPos, vel }
  LOGIC:
    effect:
      useFrame((state) => {
        // Step 1: Render 3D Scene to offscreen buffer
        gl.setRenderTarget(sceneTarget);
        gl.render(scene, camera);

        // Step 2: Render Mouse Input + Carried Velocity into Paint Target
        paintMaterial.uniforms.u_prevLowRes.value = blurTarget.texture;
        paintMaterial.uniforms.u_pointerPos.value = pointerState.currentPos;
        paintMaterial.uniforms.u_pointerVel.value = pointerState.vel;
        gl.setRenderTarget(activePaintTarget);
        gl.render(simScene, quadCamera);

        // Step 3: Blur Paint Result to Lower-Res Target (1/8 size)
        blurMaterial.uniforms.u_paintTexture.value = activePaintTarget.texture;
        gl.setRenderTarget(blurTarget);
        gl.render(blurScene, quadCamera);

        // Step 4: Composite Distorted Scene to Default Framebuffer
        compositeMaterial.uniforms.u_sceneTexture.value = sceneTarget.texture;
        compositeMaterial.uniforms.u_vectorMap.value = activePaintTarget.texture;
        gl.setRenderTarget(null);
        gl.render(compositeScene, quadCamera);

        // Step 5: Swap Ping-Pong Targets
        swapTargets();
      }, 1);
  RENDER:
    R3F JSX TAGS:
      null // Renders strictly via WebGL framebuffers and full-screen quad passes
```
