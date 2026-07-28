# Tech Spec

1. **Objective**
   - **Problem Statement**: The current fluid simulation lacks organic, high-frequency turbulence and curl-noise along its movement paths, and the post-processed glass refraction is too uniform and lacks deep chromatic separation on bounds and slopes.
   - **Solution Overview**: 
     - Implement a robust 2D Simplex Noise generator in the simulation shader to derive a divergence-free **2D Curl Noise** vector field.
     - Inject this Curl Noise into the velocity evolution pass, scaling its intensity based on both interaction and local slope magnitude.
     - Increase the art-directed chromatic dispersion of the refractive glass post-process by scaling the RGB shift offset proportionally to the density's spatial gradient (slopes and bounds).
     - Standardize a high-performance 9-tap Gaussian blur accompanied by high-frequency blue noise tap-jittering to establish a premium frosted look along fluid trail edges.
   - **Scope**: Upgrading `/components/staged/3D/FluidDistortion.tsx` to include Simplex/Curl noise and enhanced refraction-dispersion post-processing.
   - **Context**: Executed inside the existing 3D viewport of the React-R3F workspace, conforming to ShadeR DSL execution model constraints.

2. **Success Criteria**
   - **Key Results**:
     - Real-time 2D Curl Noise injected into fluid path rendering, visible as intricate swirling eddies following the mouse cursor.
     - Visually striking chromatic dispersion along trail slopes and bounds with a peak shift scale factor when moving the pointer quickly.
     - Premium 9-tap Gaussian blur blended with high-frequency blue-noise jittering specifically intensified on density slopes.
     - Perfect compilation of the applet without any Three.js/R3F runtime crashes.

3. **Project Requirements**
   - [ ] Implement standard 2D Simplex Noise inside `PAINT_FRAG`.
   - [ ] Implement central-difference-based 2D Curl Noise in `PAINT_FRAG`.
   - [ ] Calculate density spatial gradient (slope) from previous low-res frames.
   - [ ] Dynamically inject and scale the Curl Noise based on the density slope and pointer interaction.
   - [ ] Calculate high-resolution density spatial gradient in `DISTORTION_FRAG`.
   - [ ] Build a 9-tap Gaussian Blur kernel using high-frequency pseudo-blue noise coordinate jitter.
   - [ ] Scale RGB chromatic dispersion shift, refraction offset, and blur radius dynamically using trail slope/bounds intensity.
   - [ ] Test & verify compilation.

4. **Architecture Decisions**
   - **Decisions**:
     - *Simplex vs Perlin*: Simplex noise is selected for higher performance and lower arithmetic instruction density in the paint shader.
     - *Finite Differencing for Curl*: Simple central-differencing over $\epsilon = 0.01$ is chosen to compute the spatial derivatives of the Simplex noise potential field, resulting in a perfect mathematical curl field.
     - *Density Spatial Gradient*: Sampling the local low-res/high-res density textures with subtle offsets allows measuring the rate of density change, which acts as a robust indicator of "slopes and bounds."

5. **Pseudo Code**

```yaml
Stage: @compute (PAINT_FRAG)
Input:
  - tLowRes: texture
  - uPointer, uPrevPointer, uVelocity: vec2
  - uTime, uRadius, uStrength, uDissipation: float

Process:
  - Node: Simplex Noise Generator
    inputs:
      - p: vec2
    outputs:
      - val: float
    function: pure
    logic: |
      Generate 2D simplex noise for potential field.

  - Node: Curl Noise Derivation
    inputs:
      - uv: vec2
      - time: float
      - freq: float
    outputs:
      - curl: vec2
    function: pure
    logic: |
      Sample Simplex Noise potential field at (x±eps, y±eps).
      Compute central differences d_dx and d_dy.
      Return vec2(d_dy, -d_dx) for solenoidal flow.

  - Node: Density Gradient Calculator
    inputs:
      - uv: vec2
      - tex: texture
    outputs:
      - slopeMag: float
    function: pure
    logic: |
      Sample tex.b at neighbors and compute length(gradient).

  - Node: Velocity Mixer
    inputs:
      - advected: vec2
      - input: vec2
      - curl: vec2
      - slope: float
    outputs:
      - finalVel: vec2
    function: pure
    logic: |
      Scale curl by slope magnitude and pointer interaction.
      Combine advected velocity, pointer input, and scaled curl.

Output:
  - gl_FragColor: vec4(finalVel, finalDensity, 1.0)
```

```yaml
Stage: @fragment (DISTORTION_FRAG)
Input:
  - tFluid: texture
  - inputBuffer: texture
  - uv: vec2

Process:
  - Node: HighRes Gradient Calculator
    inputs:
      - uv: vec2
    outputs:
      - slopeMag: float
    function: pure
    logic: |
      Measure dX and dY of tFluid.b.
      Return length(vec2(dX, dY)).

  - Node: Refractive Blur and Dispersion Kernel
    inputs:
      - uv: vec2
      - slopeMag: float
    outputs:
      - outputColor: vec4
    function: pure
    logic: |
      Compute trailEdgeIntensity = max(smoothstep(bounds), smoothstep(slopeMag)).
      Scale blurRadius, dispersion shift, and jitter intensity by trailEdgeIntensity.
      Execute 9-tap loop with pseudo-blue noise coordinate jitter:
        Accumulate chromatic separated samples (offsetR, offsetG, offsetB) with Gaussian weights.

Output:
  - outputColor: vec4
```
