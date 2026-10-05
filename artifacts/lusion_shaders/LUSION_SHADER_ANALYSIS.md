# Comprehensive Reverse-Engineering Analysis: Lusion.co WebGL Shader Architecture
**Target Application**: https://lusion.co/  
**Focus**: Interactive Cursor Movement Trail Shaders, Fluid Simulation & Screen Distortion  
**Extracted Modules**: 5 Core Shader Systems + 50 Live WebGL2 Compilations  
**Date**: 2026-10-03T03:40:36.033Z

---

## 1. Executive Summary & Pipeline Overview

Lusion’s award-winning interactive experience is built on an interconnected GPGPU rendering and simulation pipeline orchestrated by their proprietary **`ScreenPaint`** subsystem. Rather than using standard Three.js materials or trivial CSS animations, every cursor interaction generates a continuous fluid velocity vector field that permeates the entire scene:

```
[User Input: Mouse / Touch Move]
             │
             ▼
   [Pointer Math: sdSegment Capsule Distance & Dynamic Radius]
             │
             ▼
[Stage @compute: ScreenPaint GPGPU Fluid Simulation (frag$n)]
    ├── Input: Low-Res Blurred Buffer + Previous Frame Ping-Pong
    ├── Advection: Semi-Lagrangian reverse texel sampling
    ├── Turbulence: Analytical 2D Simplex / Curl noise (noised)
    └── Dissipation: Exponential decay (velocity, weights)
             │
             ▼
[Output: u_screenPaintTexture (RGBA Floating-Point Buffer)]
    ├── R, G: 2D Velocity Vector Field (centered at 0.5)
    ├── B: Trail Density / Pressure Weight 1
    └── A: Transient Impulse Weight 2
             │
             ├──────────────────────────┬──────────────────────────┐
             ▼                          ▼                          ▼
  [Post-Processing Compositor]   [3D Geometry & Typography]   [Background Lighting]
  (frag$1: 9-Tap Motion Blur     (titleFrag & videoFrag:      (frag$o: Emissive Glow
   + Iridescent Dispersion)       Bicubic Catmull-Rom Warp)    + Dynamic Shadows)
```

---

## 2. In-Depth Breakdown of the Cursor Move Trail Shaders

### A. The Core Simulation Engine: `ScreenPaint` (`frag$n`)

#### 1. Continuous Splatting with Segment Signed Distance
Standard mouse move events only fire discretely (every 8–16ms). When a user moves their mouse quickly, discrete point splats create a broken series of disjoint dots.  
Lusion completely eliminates this artifact using an analytical **2D Capsule / Segment Signed Distance Field** (`sdSegment`):

```glsl
vec2 sdSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return vec2(length(pa - ba * h), h);
}
```
- `u_drawFrom` & `u_drawTo`: Stores previous and current mouse coordinates `(x, y)` and radius/weight `(z, w)`.
- The shader computes the exact perpendicular distance from every pixel on the simulation buffer to the capsule line segment connecting the previous and current mouse points.
- Radius dynamically widens based on pointer speed: `f = math.fit(u, 0, radiusDistanceRange, minRadius, maxRadius)`.

#### 2. Semi-Lagrangian Advection with Reverse Velocity
The fluid momentum is transported forward across time using semi-Lagrangian back-advection:
```glsl
vec4 lowData = texture2D(u_lowPaintTexture, v_uv - u_scrollOffset);
vec2 velInv = (0.5 - lowData.xy) * u_pushStrength;
vec4 data = texture2D(u_prevPaintTexture, v_uv - u_scrollOffset + velInv * u_paintTexelSize);
```
Notice how the velocity vector stored in the low-res blurred buffer (`lowData.xy`) back-samples the high-res previous frame (`u_prevPaintTexture`), creating smooth fluid curls.

#### 3. Analytical 2D Curl & Derivative Noise Perturbation
When `USE_NOISE` is active, Lusion adds organic turbulent vortices using an analytical derivative noise function (`noised`):
```glsl
vec3 noise3 = noised(gl_FragCoord.xy * u_curlScale * (1.0 - lowData.xy));
vec2 noise = noised(gl_FragCoord.xy * u_curlScale * (2.0 - lowData.xy * (0.5 + noise3.x) + noise3.yz * 0.1)).yz;
velInv += noise * (lowData.z + lowData.w) * u_curlStrength;
```
Because `noised` returns both the noise value and its exact partial derivatives (`vec3(val, dval/dx, dval/dy)`), the resulting curl vectors are mathematically divergence-free, preventing volume collapse.

#### 4. Dual-Rate Ping-Pong Dissipation
The simulation updates with exponential dissipation:
```glsl
data.xy -= 0.5;
vec4 delta = (u_dissipations.xxyz - 1.0) * data;
vec2 newVel = u_vel * d;
delta += vec4(newVel, radiusWeight.yy * d);
delta.zw = sign(delta.zw) * max(vec2(0.004), abs(delta.zw));
data += delta;
data.xy += 0.5;
gl_FragColor = clamp(data, vec4(0.0), vec4(1.0));
```
- Velocity dissipates at `0.985` per frame.
- High-frequency weight dissipates at `0.5` per frame (causing rapid settling of sharp spikes while the smooth trail lingers).

---

### B. The Lens Distortion & Iridescent Dispersion Compositor (`frag$1`)

Once the simulation texture (`u_screenPaintTexture`) is generated, the post-processing compositor applies screen-space refraction, motion blur, and chromatic sheen:

```glsl
void main() {
    vec3 bnoise = getBlueNoise(gl_FragCoord.xy + vec2(17., 29.));
    vec4 data = texture2D(u_screenPaintTexture, v_uv);
    float weight = (data.z + data.w) * 0.5;
    vec2 vel = (0.5 - data.xy - 0.001) * 2.0 * weight;
    vec4 color = vec4(0.0);
    vec2 velocity = vel * u_amount / 4.0 * u_screenPaintTexelSize * u_multiplier;
    vec2 uv = v_uv + bnoise.xy * velocity;
    
    // 9-Tap directional velocity accumulation
    for (int i = 0; i < 9; i++) {
        color += texture2D(u_texture, uv);
        uv += velocity;
    }
    color /= 9.0;
    
    // Sinusoidal iridescent rainbow fringes
    color.rgb += sin(vec3(vel.x + vel.y) * 40.0 + vec3(0.0, 2.0, 4.0) * u_rgbShift)
                 * smoothstep(0.4, -0.9, weight) * u_shade * max(0.0, u_colorMultiplier);
                 
    gl_FragColor = color;
}
```

#### Key Innovations in the Compositor:
1. **Blue Noise Dithering**: Jittering the initial UV by `bnoise.xy * velocity` turns what would otherwise be 9 discrete banded ghost images into a silky, continuous motion blur.
2. **Directional Flow Sampling**: The blur direction precisely matches the local curl velocity of the fluid, causing text and 3D objects behind the cursor to smear along the trail.
3. **Phase-Shifted Sinusoidal Iridescence**: `sin(vel + phase)` creates the shimmering oil-slick color fringes at the high-shear boundaries of the cursor trail.

---

## 3. Formal ShadeR DSL Specification

Following the architectural standards defined in the project's **ShadeR DSL Skill** (`/skills/shader_dsl/SKILL.md`), here is the formal IPO (Input-Process-Output) specification for Lusion’s Cursor Move Trail System:

```yaml
Stage: @compute (GPGPU Cursor Fluid Trail Evolution)

Input:
  - u_prevPaintTexture: texture       # High-res ping-pong source buffer (t - 1)
  - u_lowPaintTexture: texture        # 8x downsampled blurred feedback buffer
  - u_paintTexelSize: vec2            # Inverse resolution of simulation target
  - u_drawFrom: vec4                  # (x0, y0, radius0, weight0)
  - u_drawTo: vec4                    # (x1, y1, radius1, weight1)
  - u_vel: vec2                       # Pointer instantaneous velocity delta
  - u_pushStrength: float             # Advection impulse factor (default: 25.0)
  - u_curlScale: float                # Spatial frequency of turbulence
  - u_curlStrength: float             # Turbulence amplitude (default: 5.0)
  - u_dissipations: vec3              # (velocityDecay: 0.985, weight1Decay: 0.985, weight2Decay: 0.5)

Process:
  - Node: Segment Capsule Splat Generator
    inputs:
      - fragCoord: vec2
      - drawFrom: vec4
      - drawTo: vec4
    outputs:
      - segmentDist: float
      - segmentWeight: float
      - splatMask: float
    function: pure
    logic:
      Compute signed distance to line segment between drawFrom and drawTo.
      Smoothstep inverse distance with interpolated radius to form continuous capsule splat.

  - Node: Analytical Curl Noise Transformer
    inputs:
      - fragCoord: vec2
      - lowResVelocity: vec2
      - curlScale: float
      - curlStrength: float
    outputs:
      - curlOffsetVector: vec2
    function: pure
    logic:
      Evaluate 2D analytical derivative noise.
      Calculate divergence-free curl offsets weighted by accumulated fluid density.

  - Node: Semi-Lagrangian Momentum Advector
    inputs:
      - uv: vec2
      - prevTexture: texture
      - lowResVelocity: vec2
      - curlOffsetVector: vec2
      - texelSize: vec2
      - pushStrength: float
    outputs:
      - advectedState: vec4
    function: stateful
    logic:
      Back-trace UV coordinates along inverted velocity and curl vectors.
      Sample high-resolution previous frame state.

  - Node: Multivariable Dissipation Filter
    inputs:
      - advectedState: vec4
      - newImpulseVelocity: vec2
      - splatMask: float
      - dissipations: vec3
    outputs:
      - finalBufferState: vec4
    function: pure
    logic:
      Apply exponential decay factors to velocity and weights.
      Inject new impulse forces and clamp to [0.0, 1.0] range.

Output:
  - u_currPaintTexture: texture       # Ping-pong destination buffer (t)

---

Stage: @fragment (Compositor & Iridescent Distortion)

Input:
  - u_texture: texture                # Rendered scene color buffer
  - u_screenPaintTexture: texture     # GPGPU velocity & density buffer
  - u_amount: float                   # Refraction strength
  - u_rgbShift: float                 # Iridescent phase shift
  - u_multiplier: float               # Motion blur scale factor

Process:
  - Node: Blue Noise Dither Generator
    inputs:
      - fragCoord: vec2
    outputs:
      - noiseJitter: vec2
    function: pure
    logic:
      Sample blue noise dither matrix to randomize ray sample offsets.

  - Node: Directional Velocity Ray Marcher
    inputs:
      - uv: vec2
      - sceneTexture: texture
      - fluidVelocity: vec2
      - noiseJitter: vec2
      - sampleCount: int = 9
    outputs:
      - accumulatedColor: vec4
    function: pure
    logic:
      Accumulate 9 texture samples along the fluid velocity vector with stochastic dither.

  - Node: Iridescent Chromatic Dispersion Mixer
    inputs:
      - baseColor: vec4
      - fluidVelocity: vec2
      - trailWeight: float
      - rgbShift: float
    outputs:
      - finalColor: vec4
    function: pure
    logic:
      Modulate RGB channels using sinusoidal phase offsets along the velocity vector:
      sin(vec3(vel.x + vel.y)*40.0 + vec3(0.0, 2.0, 4.0)*rgbShift) * weight.

Output:
  - gl_FragColor: vec4                # Final canvas viewport color
```

---

## 4. Extracted Shader Inventory

All extracted shaders are saved in `/artifacts/lusion_shaders/programs/`:

| File | Type | Category | Core Uniforms |
| :--- | :--- | :--- | :--- |
| `01_screen_paint_gpgpu_trail.frag` | GLSL 300 es | GPGPU Simulation | `u_prevPaintTexture`, `u_drawFrom`, `u_drawTo`, `u_dissipations`, `u_curlStrength` |
| `02_screen_paint_distortion_dispersion.frag` | GLSL 300 es | Post-Process | `u_texture`, `u_screenPaintTexture`, `u_amount`, `u_rgbShift`, `u_multiplier` |
| `03_title_bicubic_mesh_warp.frag` | GLSL 300 es | Typography | `u_screenPaintTexture`, `u_gradientTexture`, `u_invertRatio` |
| `04_video_reel_fluid_displace.frag` | GLSL 300 es | Video / Reel | `u_screenPaintTexture`, `u_radialCenter`, `u_showRatio` |
| `05_3d_pbr_cross_ao_blue_noise.frag` | GLSL 300 es | 3D Lighting | `u_nearPositionRadiusList`, `u_screenPaintTexture`, `u_selfRotation` |

---
