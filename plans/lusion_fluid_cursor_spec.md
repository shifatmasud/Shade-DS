# Tech Spec: Lusion Fluid Cursor Motion Vector & Blue Noise Refraction Architecture

1. **Objective**
   - **Problem Statement**: Standard fluid shaders perform multi-pass Poisson pressure iteration and divergence calculations, which are computationally expensive. Earlier iterations caused choppy dot artifacts or required full floating-point precision FBOs.
   - **Solution Overview**:
     Implement the exact low-overhead Lusion fluid architecture directly shared by Lusion's CEO:
     1. **Paint FBO (1/4 screen size)** + **Low-Res FBO (1/8 screen size)** ping-pong pipeline using 8-bit texture encoding for compact velocity vectors `(vx, vy)`.
     2. **Paint Pass (`PAINT_FRAG`)**: Render mouse 2D segment distance field + velocity impulse, sample the low-res blurred velocity from the previous frame, and mix them together into the paint target.
     3. **Blur/Downsample Pass (`BLUR_FRAG`)**: Downsample and blur the current paint result into the lower resolution target (~1/8 screen size) for carry-over into the next frame's paint pass.
     4. **Blue Noise 9-Tap Jittered Refraction Pass (`DISTORTION_FRAG`)**: Sample motion velocity vectors across a 9-tap kernel using high-frequency blue noise jitter, applying chromatic RGB shift proportional to motion velocity.
   - **Scope**:
     Update `/components/staged/3D/FluidDistortion.tsx` with the dual-resolution ping-pong vector pipeline, blue noise 9-tap jittered distortion shader, and exposed art-direction props.
   - **Context**: Used as the primary post-processing fluid distortion layer across the 3D canvas viewport in `/components/staged/3D/scene.tsx`.

2. **Success Criteria**
   - **Key Results**:
     - Ultra-fluid cursor trail that smoothly advects and blends without stuttering or discrete dot artifacts.
     - 8-bit compact texture implementation running at a rock-solid 60 FPS on standard devices.
     - 9-tap blue noise jittered refraction with velocity-dependent chromatic aberration and subtle optical caustics.
     - Clean compilation with no GLSL runtime errors or FBO memory leaks.
   - **Non-Negotiables**:
     - Strict adherence to Lusion's 1/4 + 1/8 screen res dual ping-pong target architecture.
     - 8-bit velocity vector packing/unpacking `(val * 0.5 + 0.5)`.
     - 9-tap blue noise jittered motion vector sampling in `DISTORTION_FRAG`.

3. **Project Requirements**
   - [x] Create technical specification plan in `/plans/lusion_fluid_cursor_spec.md`.
   - [ ] Implement dual FBO targets in `FluidDistortion.tsx` (Paint FBO ~ 1/4 size, LowRes FBO ~ 1/8 size).
   - [ ] Write `PAINT_FRAG` shader (mouse distance field + velocity impulse + low-res velocity carry and mix).
   - [ ] Write `BLUR_FRAG` shader (downsample & blur paint output to low-res target).
   - [ ] Write `DISTORTION_FRAG` shader (9-tap blue noise jittered velocity sampling + chromatic dispersion).
   - [ ] Expose art-direction props (`radius`, `strength`, `dissipation`, `mixRatio`, `distortionStrength`, `rgbShift`).
   - [ ] Verify build with `compile_applet`.

4. **Architecture Decisions**
   - **8-Bit Texture Velocity Encoding**: Mapping velocity values `[-1.0, 1.0]` to `[0.0, 1.0]` via `vel * 0.5 + 0.5` enables running the entire pipeline on standard 8-bit `RGBAFormat` textures, reducing memory bandwidth by 50% compared to `HalfFloatType`.
   - **Dual Resolution Multi-Pass**: Separating paint injection (1/4 screen) and frame-to-frame velocity persistence/blurring (1/8 screen) creates natural fluid momentum without requiring costly multi-iteration Jacobi pressure solvers.
   - **Procedural Blue Noise Jittering**: Applying high-frequency noise jitter to the 9-tap distortion sampling breaks up banding and reproduces Lusion's smooth frosted glass refraction effect.

5. **Pseudo Code**

```yaml
Stage: @compute (Paint Vector Map Simulation - PAINT_FRAG)
Input:
  - tLowRes: sampler2D (1/8 res previous blurred velocity)
  - uPointer: vec2 (0..1 UV)
  - uPrevPointer: vec2 (0..1 UV)
  - uVelocity: vec2
  - uRadius: float
  - uStrength: float
  - uDissipation: float
  - uMixRatio: float

Process:
  - Node: Velocity Unpacker
    inputs: [tLowRes, vUv]
    outputs: [prevVel, prevDensity]
    logic: Unpack previous 8-bit packed velocity (tex.rg - 0.5) * 2.0 and density tex.b.

  - Node: Segment Distance & Splat
    inputs: [vUv, uPointer, uPrevPointer, uRadius]
    outputs: [splat, mouseVel]
    logic: Compute 2D segment distance sdSegment(p, a, b). Apply smoothstep falloff and inject pointer velocity + swirl.

  - Node: Vector Carry & Mix
    inputs: [prevVel, mouseVel, uDissipation, uMixRatio]
    outputs: [mixedVel, finalDensity]
    logic: Combine carried low-res velocity with new mouse velocity impulse. Apply dissipation decay.

Output:
  - gl_FragColor: vec4(mixedVel * 0.5 + 0.5, finalDensity, 1.0)


Stage: @compute (Downsample & Blur Pass - BLUR_FRAG)
Input:
  - tPaint: sampler2D (1/4 res paint target)
  - uTexelSize: vec2

Process:
  - Node: 5-Tap Downsample Blur
    inputs: [tPaint, vUv, uTexelSize]
    outputs: [blurredColor]
    logic: Average center and 4 neighbor texels to downsample paint vector map into 1/8 res target.

Output:
  - gl_FragColor: vec4(blurredColor)


Stage: @fragment (Blue Noise Refraction Shading - DISTORTION_FRAG)
Input:
  - inputBuffer: sampler2D (Screen Scene)
  - tFluid: sampler2D (Motion Vector Map)
  - vUv: vec2

Process:
  - Node: 9-Tap Jittered Refraction Sampler
    inputs: [inputBuffer, tFluid, vUv]
    outputs: [refractedColor]
    logic: |
      For i = 0..8:
        Compute blue noise jitter for tap coordinate.
        Unpack velocity from tFluid at jittered UV.
        Calculate refraction displacement vector and velocity-driven RGB shift.
        Sample inputBuffer for R, G, B with chromatic offsets.
        Sum samples into accumulated color.
      Divide by 9.0 and add subtle caustics highlight.

Output:
  - outputColor: vec4(refractedColor, alpha)
```
