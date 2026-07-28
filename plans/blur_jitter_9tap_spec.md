# Tech Spec 

1. **Objective**
Verify and enforce that both the intermediate fluid velocity downsample blur pass (`BLUR_FRAG`) and the post-processing screen refraction pass (`DISTORTION_FRAG`) in `/components/staged/3D/FluidDistortion.tsx` implement complete 9-tap Gaussian sampling kernels and 9-tap blue noise jitter passes rather than 5-tap cross approximations, ensuring smooth fluid dispersion and anti-aliased chromatic dispersion prior to final screen compositing.

2. **Success Criteria**
- `BLUR_FRAG` utilizes 9 spatial texel taps (1 center + 4 cardinal + 4 diagonal) with normalized 2D Gaussian weights (0.25, 0.125 x 4, 0.0625 x 4, total sum = 1.0).
- `DISTORTION_FRAG` executes a full 9-tap loop (3x3 grid) for blue noise jitter evaluation, fluid velocity/density sampling, refractive vector calculation, and RGB chromatic dispersion mixing prior to screen compositing.
- No performance regressions, shader syntax errors, or visual artifacts in the 3D fluid distortion pipeline.

3. **Project Requirements**
- Audit `BLUR_FRAG` in `/components/staged/3D/FluidDistortion.tsx` to ensure 9 spatial taps.
- Audit `DISTORTION_FRAG` in `/components/staged/3D/FluidDistortion.tsx` to ensure 9 kernel offsets (`tapOffsets[9]`), 9 Gaussian kernel weights (`weights[9]`), 9 blue noise jitter evaluations, and 9 weighted chromatic dispersion texture lookups.
- Validate app build stability using `compile_applet`.

4. **Architecture Decisions**
- **9-Tap vs 5-Tap Gaussian Kernel**: A 9-tap 3x3 kernel provides full diagonal sampling, eliminating directional cross artifacts and producing continuous fluid refraction.
- **Integrated 9-Tap Jitter & Dispersion Loop**: Executing blue noise jitter sampling and chromatic dispersion channel offsets inside the 9-tap Gaussian loop ensures noise and color refraction are distributed continuously across adjacent screen samples.

5. **Pseudo Code** (Written in ShadeR DSL)

```yaml
Stage: @fragment

Input:
  - inputBuffer: texture
  - tFluid: texture
  - uBlurRadius: float
  - uJitterStrength: float
  - uRefractStrength: float
  - uDispersionScale: float

Process:
  - Node: 9-Tap Kernel Grid Initializer
    inputs: []
    outputs:
      - tapOffsets: vec2[9]
      - weights: float[9]
    function: pure
    logic: |
      Construct 3x3 normalized offset grid:
        Center (0,0) [w=0.25]
        Cardinals (+-1,0), (0,+-1) [w=0.125]
        Diagonals (+-1,+-1), (+-1,-+1) [w=0.0625]

  - Node: 9-Tap Jitter & Chromatic Dispersion Mixer
    inputs:
      - tapOffsets: vec2[9]
      - weights: float[9]
      - uv: vec2
      - inputBuffer: texture
      - tFluid: texture
    outputs:
      - accumulatedColor: vec3
    function: pure
    logic: |
      Initialize accumulatedColor = vec3(0.0)
      For i = 0 to 8:
        1. Compute 2D hash blue-noise jitter for tap i:
           jitter = (hash22(uv * 480.0 + tapOffsets[i] * 13.37) - 0.5) * jitterVal
        2. Sample fluid texture tFluid at (uv + tapOffsets[i] * rimBlurRadius)
        3. Extract tap velocity and density
        4. Calculate refraction offset and RGB chromatic dispersion shift
        5. Sample inputBuffer at jittered R, G, B offsets
        6. Multiply RGB vector by weights[i] and accumulate into accumulatedColor

Output:
  - outputColor: vec4(accumulatedColor, inputColor.a)
```
