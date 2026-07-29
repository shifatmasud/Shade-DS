# Tech Spec: Art-Directed Subtle Wavy Brush Path Architecture

1. **Objective**
   - **Problem Statement**: The brush path in `FluidDistortion.tsx` currently applies a uniform radial stroke splat along a Bezier curve (`sdBezier`) with strong vortex turbulence. This produces relatively heavy, uniform fluid strokes or aggressive wake distortions rather than a subtle, organic, wavy brush envelope that gently wavers like delicate liquid calligraphy on water.
   - **Solution Overview**:
     1. **Subtle Transverse Wave Modulation**: Introduce a high-frequency, low-amplitude sinusoidal offset along the stroke's transverse axis ($p_{\text{perp}}$) driven by arc-length parametrization and continuous phase timing.
     2. **Harmonized Brush Envelope Radius**: Modulate the brush stroke radius ($uRadius$) with gentle micro-ripples ($\pm 8-12\%$ variance) so the brush boundary exhibits subtle organic fluid wavering.
     3. **Softened Edge Falloff & Density Gradient**: Refine the distance field falloff profile to provide a smoother, feather-soft transition into the fluid medium without harsh edge boundaries.
     4. **Tuned Wake Vorticity & Serpentine Damping**: Scale back aggressive wake dipole forces to create an elegant, graceful, subtle wavy trail that lingers naturally with smooth dissipation.
   - **Scope**: Art-direct and refine `/components/staged/3D/FluidDistortion.tsx` brush path shaders and parameters.
   - **Context**: Real-time GPGPU liquid distortion post-processing effect layer running in React Three Fiber canvas.

2. **Success Criteria**
   - **Key Results**:
     - Brush strokes exhibit a subtle, delicate, wavy path contour with organic edge wavering.
     - Fluid trails maintain high visual polish with graceful, understated motion (no harsh jitter or aggressive wake clipping).
     - Maintains smooth 60 FPS performance with zero additional texture lookups.
     - Verified clean compilation with `compile_applet`.
   - **Non-Negotiables**:
     - Strict adherence to ShadeR DSL Input-Process-Output (IPO) architecture standards.
     - Preserves full backwards compatibility with existing post-processing optics (`DISTORTION_FRAG`).

3. **Project Requirements**
   - [x] Create technical specification plan in `/plans/subtle_wavy_brush_path_spec.md`.
   - [ ] Art-direct subtle transverse wave perturbation along the Bezier brush trajectory in `PAINT_FRAG`.
   - [ ] Modulate brush radius with micro-harmonic wave undulations for soft organic edge wavering.
   - [ ] Smooth brush stroke falloff envelope ($s_i$) for seamless fluid integration.
   - [ ] Balance wake dipole vorticity and serpentine cross-wave forces for subtle fluid trailing.
   - [ ] Verify compilation via `compile_applet` once requested to code.

4. **Architecture Decisions**
   - **Arc-Length Transverse Wave Displacement**: Offset the effective evaluation coordinate $p$ along the stroke's perpendicular normal vector $\mathbf{n}_{\text{perp}}$ by $A \cdot \sin(k \cdot t_{\text{arc}} - \omega \cdot \text{time})$, where $A$ is kept subtle ($0.008 - 0.015$). This yields organic wave contours without breaking continuous path alignment.
   - **Micro-Harmonic Radius Envelope**: Modulate $uRadius$ by $(1.0 + 0.10 \cdot \sin(32.0 \cdot t_{\text{arc}} + \text{uTime} \cdot 3.0))$ to create subtle liquid thickness variations along the brush path.
   - **Softened Quintic Radial Falloff**: Use a quintic falloff profile $(1 - r^2)^3$ instead of quadratic $(1 - r^2)^2$ to create a silky, ultra-soft brush margin.

5. **Pseudo Code (ShadeR DSL)**

```yaml
Stage: @fragment (Paint Pass Shader - PAINT_FRAG)

Input:
  - vUv: vec2
  - uPointer: vec2[MAX_TOUCHES]
  - uMidPointer: vec2[MAX_TOUCHES]
  - uPrevPointer: vec2[MAX_TOUCHES]
  - uVelocity: vec2[MAX_TOUCHES]
  - uActive: float[MAX_TOUCHES]
  - uTime: float
  - uRadius: float
  - uStrength: float
  - uAspect: float

Process:
  - Node: Subtle Transverse Wave Generator
    inputs:
      - p: vec2 (aspect-corrected UV)
      - a: vec2 (start position)
      - b: vec2 (end position)
      - uTime: float
    outputs:
      - pSubtleWavy: vec2
      - transverseOffset: float
    function: pure
    logic: |
      Compute normalized stroke direction segDir = normalize(b - a) and perpendicular normPerp = vec2(-segDir.y, segDir.x).
      Project point p onto segment to obtain local arc length tArc = clamp(dot(p - a, segDir) / length(b - a), 0.0, 1.0).
      Calculate subtle wave modulation: subtleWave = sin(tArc * 24.0 - uTime * 4.5) * 0.009 + cos(tArc * 42.0 + uTime * 3.0) * 0.004.
      Apply offset: pSubtleWavy = p - normPerp * subtleWave.

  - Node: Micro-Harmonic Radius Modulator
    inputs:
      - baseRadius: float
      - tArc: float
      - uTime: float
    outputs:
      - modulatedRadius: float
    function: pure
    logic: |
      Compute subtle radius modulation factor radWav = 1.0 + 0.09 * sin(tArc * 35.0 - uTime * 3.5).
      Output modulatedRadius = baseRadius * radWav.

  - Node: Softened Quintic Brush Falloff
    inputs:
      - dist: float
      - radius: float
    outputs:
      - splatWeight: float
    function: pure
    logic: |
      Normalize distance rNorm = clamp(dist / max(radius, 0.0001), 0.0, 1.0).
      Compute smooth quintic decay: s_i = (1.0 - rNorm * rNorm); splatWeight = s_i * s_i * s_i.

  - Node: Subtle Dipole Wake Harmonizer
    inputs:
      - dist: float
      - radius: float
      - normPerp: vec2
      - side: float
      - segLen: float
    outputs:
      - subtleWakeVorticity: vec2
    function: pure
    logic: |
      Dampen wake vortex intensity: vortexFalloff = exp(-dist * 22.0 / max(radius, 0.001)).
      Generate soft counter-rotating dipole pair: dipole = normPerp * side * vortexFalloff * segLen * 5.0 * sin(dist * 20.0 - uTime * 3.5).
      Output subtleWakeVorticity = dipole.

Output:
  - gl_FragColor: vec4(mixedVel * 0.5 + 0.5, finalDensity, 1.0)
```
