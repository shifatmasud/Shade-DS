---
name: postprocessing-render-pipeline
description: Architecture, setup, and optimization rules for EffectComposer, offscreen WebGL render targets, multi-pass rendering pipelines, and screen-wide post-processing effects (such as fluid simulations layered on 3D scenes).
---

# Post-Processing & Render Pipeline Architecture

This skill provides production guidelines for building high-performance post-processing render pipelines in Three.js and React Three Fiber (R3F), utilizing `EffectComposer`, multi-pass offscreen render targets, screen-wide overlay passes, and GLSL composite shaders.

---

# 1. Pipeline Overview & Core Principles

When rendering complex 3D scenes layered with screen-wide effects (e.g., fluid simulation refractions, bloom, chromatic aberration, custom lens distortion):

1. **Scene Pass**: Render the primary 3D scene into an offscreen render target (`sceneTarget`) with anti-aliasing and native resolution scaling.
2. **Effect/Simulation Pass**: Execute GPGPU or screen-space compute passes (e.g., fluid solver, velocity fields, particle accumulation) in offscreen buffers.
3. **Composite Pass**: Combine the offscreen 3D scene texture and the effect texture in a final shader pass rendered to the screen.

```
┌─────────────────┐      ┌─────────────────────────┐
│ Primary 3D Scene│      │ Screen-Space Effect/Sim │
└────────┬────────┘      └────────────┬────────────┘
         │                            │
  (sceneTarget)               (effectTarget)
         │                            │
         └─────────────┬──────────────┘
                       │
             ┌─────────▼────────┐
             │ Composite Shader │ (Early-Exit & Color Space Aligned)
             └─────────┬────────┘
                       │
                ┌──────▼──────┐
                │   Display   │
                └─────────────┘
```

---

# 2. DPR-Scaled Offscreen Buffers

A common issue in offscreen post-processing is sub-pixel blurriness caused by ignoring the device's pixel ratio. Standard canvas viewports scale by `window.devicePixelRatio`, but offscreen `WebGLRenderTarget` objects default to 1x unless explicitly calculated.

## Technical Rule
Always integrate dynamic `devicePixelRatio` (DPR) calculation into the resolution mapping for offscreen render targets.

```typescript
import * as THREE from 'three';

export function createDPRScaledRenderTarget(
  width: number,
  height: number,
  dpr: number = window.devicePixelRatio || 1,
  options: THREE.RenderTargetOptions = {}
): THREE.WebGLRenderTarget {
  const physicalWidth = Math.floor(width * dpr);
  const physicalHeight = Math.floor(height * dpr);

  const renderTarget = new THREE.WebGLRenderTarget(physicalWidth, physicalHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType, // High precision for color reproduction & blending
    samples: 4, // MSAA anti-aliasing for smooth 3D edges
    ...options,
  });

  return renderTarget;
}

export function updateRenderTargetSize(
  target: THREE.WebGLRenderTarget,
  width: number,
  height: number,
  dpr: number = window.devicePixelRatio || 1
): void {
  const physicalWidth = Math.floor(width * dpr);
  const physicalHeight = Math.floor(height * dpr);

  if (target.width !== physicalWidth || target.height !== physicalHeight) {
    target.setSize(physicalWidth, physicalHeight);
  }
}
```

---

# 3. Color Space Alignment

Mismatches between the render target texture color space and `gl.outputColorSpace` cause severe visual degradation:
- Brightness drop or dark bands.
- Gamma shifts (washed-out or oversaturated colors).
- Inaccurate tone mapping when compositing.

## Technical Rule
Explicitly synchronize the offscreen render target texture color space with `renderer.outputColorSpace` (typically `THREE.SRGBColorSpace`).

```typescript
// Synchronize render target texture color space with renderer output
export function alignTargetColorSpace(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget
): void {
  // Enforce sRGB color space alignment across offscreen targets
  target.texture.colorSpace = renderer.outputColorSpace;
}
```

### Full Setup Example:
```typescript
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const sceneTarget = createDPRScaledRenderTarget(
  window.innerWidth,
  window.innerHeight,
  renderer.getPixelRatio()
);

alignTargetColorSpace(renderer, sceneTarget);
```

---

# 4. Strict Localized Masking (GLSL Optimization)

Screen-wide effect passes (such as fluid refraction, heat haze, or optical distortion) can be computationally expensive if every pixel calculates complex domain warping or chromatic offsets. Furthermore, calculating distortion across empty regions can cause unwanted visual noise or artifacts.

## Technical Rule
Implement an **instant early-exit condition** in the composite GLSL fragment shader. If the interaction/effect alpha or magnitude is zero (`alpha <= 0.0`), bypass all mathematical transformations and sample the pristine 3D scene directly.

## Composite Fragment Shader (`composite.frag`):

```glsl
uniform sampler2D tScene;    // Pristine 3D Scene Target
uniform sampler2D tFluid;    // GPGPU Fluid / Effect Target
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec4 fluidSample = texture2D(tFluid, vUv);
  float alpha = fluidSample.a;

  // STRICT LOCALIZED MASKING (EARLY EXIT)
  // Outside active fluid/cursor trails, bypass math and return pristine 3D scene directly.
  if (alpha <= 0.001) {
    gl_FragColor = texture2D(tScene, vUv);
    return;
  }

  // Refraction / Warp calculation using fluid velocity (r, g channels)
  vec2 velocity = fluidSample.rg;
  float refractionStrength = 0.03 * alpha;
  vec2 distortedUv = vUv + velocity * refractionStrength;

  // Clamp UVs to prevent edge wrapping artifacts
  distortedUv = clamp(distortedUv, vec2(0.001), vec2(0.999));

  vec4 sceneColor = texture2D(tScene, distortedUv);

  // Blend fluid dye/color with distorted scene color
  vec3 finalColor = mix(sceneColor.rgb, fluidSample.rgb, alpha * 0.25);

  gl_FragColor = vec4(finalColor, sceneColor.a);
}
```

---

# 5. Complete Render Pipeline Pattern (Three.js / EffectComposer)

Here is a complete, production-ready pipeline class demonstrating how to structure an offscreen MSAA scene pass, fluid simulation pass, and composite pass using `EffectComposer` or custom render loops.

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export class PostProcessingPipeline {
  private renderer: THREE.WebGLRenderer;
  private sceneTarget: THREE.WebGLRenderTarget;
  private fluidTarget: THREE.WebGLRenderTarget;
  private compositePass: ShaderPass;
  private composer: EffectComposer;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.renderer = renderer;
    const dpr = renderer.getPixelRatio();

    // 1. Create DPR-Scaled Offscreen Buffers
    this.sceneTarget = new THREE.WebGLRenderTarget(
      Math.floor(width * dpr),
      Math.floor(height * dpr),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        samples: 4, // MSAA
      }
    );

    this.fluidTarget = new THREE.WebGLRenderTarget(
      Math.floor(width * dpr),
      Math.floor(height * dpr),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
      }
    );

    // 2. Synchronize Color Spaces
    this.sceneTarget.texture.colorSpace = renderer.outputColorSpace;
    this.fluidTarget.texture.colorSpace = renderer.outputColorSpace;

    // 3. Composite Shader Pass
    const compositeShader: THREE.Shader = {
      uniforms: {
        tScene: { value: this.sceneTarget.texture },
        tFluid: { value: this.fluidTarget.texture },
        uResolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tScene;
        uniform sampler2D tFluid;
        varying vec2 vUv;

        void main() {
          vec4 fluid = texture2D(tFluid, vUv);
          if (fluid.a <= 0.001) {
            gl_FragColor = texture2D(tScene, vUv);
            return;
          }
          vec2 offset = fluid.rg * 0.02 * fluid.a;
          vec4 scene = texture2D(tScene, clamp(vUv + offset, 0.0, 1.0));
          gl_FragColor = mix(scene, vec4(fluid.rgb, 1.0), fluid.a * 0.2);
        }
      `,
    };

    this.compositePass = new ShaderPass(compositeShader);
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(this.compositePass);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera, stepFluidSimulation: (target: THREE.WebGLRenderTarget) => void): void {
    // Step A: Render 3D Scene into offscreen sceneTarget
    this.renderer.setRenderTarget(this.sceneTarget);
    this.renderer.clear();
    this.renderer.render(scene, camera);

    // Step B: Step Fluid Simulation into fluidTarget
    stepFluidSimulation(this.fluidTarget);

    // Step C: Render Final Composite to Canvas Screen
    this.renderer.setRenderTarget(null);
    this.compositePass.uniforms.tScene.value = this.sceneTarget.texture;
    this.compositePass.uniforms.tFluid.value = this.fluidTarget.texture;
    this.composer.render();
  }

  public handleResize(width: number, height: number): void {
    const dpr = this.renderer.getPixelRatio();
    const pw = Math.floor(width * dpr);
    const ph = Math.floor(height * dpr);

    this.sceneTarget.setSize(pw, ph);
    this.fluidTarget.setSize(pw, ph);
    this.compositePass.uniforms.uResolution.value.set(pw, ph);
    this.composer.setSize(width, height);
  }
}
```

---

# 6. ShadeR DSL Architecture Representation

When modeling the post-processing render pipeline using ShadeR DSL:

```yaml
Stage: @fragment

Input:
  - tScene: texture        # DPR-scaled offscreen 3D scene pass
  - tFluid: texture        # Screen-space fluid simulation buffer
  - vUv: vec2              # Screen UV coordinates

Process:
  - Node: Localized Masking Filter
    inputs:
      - fluidSample: vec4
    outputs:
      - isEffectActive: boolean
    function: pure
    logic: Check if fluid alpha <= 0.001 for immediate early-exit pass-through.

  - Node: Refraction Transformer
    inputs:
      - vUv: vec2
      - velocity: vec2
      - alpha: float
    outputs:
      - distortedUv: vec2
    function: pure
    logic: Apply vector offset based on fluid velocity scaled by alpha intensity.

  - Node: Composite Mixer
    inputs:
      - sceneColor: vec4
      - fluidColor: vec3
      - alpha: float
    outputs:
      - finalColor: vec4
    function: pure
    logic: Blend original scene sample with fluid overlay dye color.

Output:
  - fragColor: vec4        # Final color buffer sent to physical display
```

---

# 7. Verification & Troubleshooting Checklist

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Blurry offscreen rendering** | Render target created with default `window.innerWidth` ignoring `devicePixelRatio`. | Multiply target dimensions by `renderer.getPixelRatio()`. |
| **Darkened / dull colors** | Mismatch between target color space and renderer output. | Set `target.texture.colorSpace = renderer.outputColorSpace` (`THREE.SRGBColorSpace`). |
| **Edge artifacting / banding** | Precision loss in framebuffers during simulation blending. | Use `THREE.HalfFloatType` or `THREE.FloatType` for render targets. |
| **High GPU overhead on empty screen** | Calculating complex shaders across all screen pixels. | Add strict early-exit check (`if (alpha <= 0.0) return;`) in GLSL fragment shader. |
