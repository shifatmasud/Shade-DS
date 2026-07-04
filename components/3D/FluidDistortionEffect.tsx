import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// 1. Shared Vertex Shader
export const SIM_VERTEX = `
  varying vec2 v_uv;
  varying vec2 vUv;
  void main() {
    v_uv = uv;
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// 2. GPGPU Velocity Simulation Fragment Shader (Advection, Splat, and Curl Noise Turbulence)
export const VELOCITY_FRAG = `
  precision highp float;
  uniform sampler2D u_velocityTexture;
  varying vec2 v_uv;

  uniform vec2 u_texelSize;
  uniform float u_dt;
  uniform float u_decay;

  uniform vec2 u_pointer;
  uniform vec2 u_prevPointer;
  uniform vec2 u_pointerVel;
  uniform float u_radius;
  uniform float u_strength;

  uniform float u_curlScale;
  uniform float u_curlStrength;
  uniform float u_time;

  float sdSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(1e-8, dot(ba, ba)), 0.0, 1.0);
    return length(pa - ba * h);
  }

  // Procedural 2D Simplex/Value Noise Helpers for Curl Noise
  vec2 hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
  }

  float noise(in vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    float va = dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
    float vb = dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float vc = dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float vd = dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
    return va + u.x*(vb-va) + u.y*(vc-va) + u.x*u.y*(va-vb-vc+vd);
  }

  vec2 curlNoise(vec2 p) {
    float eps = 0.01;
    float n_x1 = noise(p + vec2(eps, 0.0));
    float n_x2 = noise(p - vec2(eps, 0.0));
    float n_y1 = noise(p + vec2(0.0, eps));
    float n_y2 = noise(p - vec2(0.0, eps));
    float dg_dy = (n_y1 - n_y2) / (2.0 * eps);
    float dg_dx = (n_x1 - n_x2) / (2.0 * eps);
    return vec2(dg_dy, -dg_dx);
  }

  void main() {
    // Decode velocity from biased [0.0, 1.0] to true [-1.0, 1.0] space
    vec2 prevVel = (texture2D(u_velocityTexture, v_uv).rg - 0.5) * 2.0;

    // 4. Advect Velocity
    vec2 advectUv = v_uv - prevVel * u_dt * u_texelSize;
    vec2 advectedVel = (texture2D(u_velocityTexture, advectUv).rg - 0.5) * 2.0;

    // Apply Decay
    advectedVel *= u_decay;

    // 3. Inject Gaussian velocity splat
    float d = sdSegment(v_uv, u_prevPointer, u_pointer);
    float splat = exp(-d * d / (2.0 * u_radius * u_radius));
    vec2 splatVel = u_pointerVel * u_strength * splat;
    advectedVel += splatVel;

    // 4. Add Curl Noise (Turbulence)
    vec2 curl = curlNoise(v_uv * u_curlScale + u_time * 0.15) * u_curlStrength;
    advectedVel += curl * (0.1 + length(prevVel) * 0.9);

    // Encode velocity back into [0.0, 1.0] texture space
    vec2 finalVel = clamp(advectedVel, vec2(-1.0), vec2(1.0));
    gl_FragColor = vec4(finalVel * 0.5 + 0.5, 0.0, 1.0);
  }
`;

// 3. GPGPU Dye Simulation Fragment Shader (Advection, Subtle Splat)
export const DYE_FRAG = `
  precision highp float;
  uniform sampler2D u_dyeTexture;
  uniform sampler2D u_velocityTexture;
  varying vec2 v_uv;

  uniform vec2 u_texelSize;
  uniform float u_dt;
  uniform float u_decay;

  uniform vec2 u_pointer;
  uniform vec2 u_prevPointer;
  uniform float u_radius;
  uniform float u_dyeAmount;

  float sdSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(1e-8, dot(ba, ba)), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    // Decode current velocity field
    vec2 velocity = (texture2D(u_velocityTexture, v_uv).rg - 0.5) * 2.0;

    // 7. Advect Dye
    vec2 advectUv = v_uv - velocity * u_dt * u_texelSize;
    float advectedDye = texture2D(u_dyeTexture, advectUv).r;

    // Apply Dye Dissipation/Decay
    advectedDye *= u_decay;

    // 6. Inject Gaussian dye splat (nearly invisible, very subtle)
    float d = sdSegment(v_uv, u_prevPointer, u_pointer);
    float splat = exp(-d * d / (2.0 * u_radius * u_radius));
    float splatDye = u_dyeAmount * splat;
    advectedDye += splatDye;

    gl_FragColor = vec4(clamp(advectedDye, 0.0, 1.0), 0.0, 0.0, 1.0);
  }
`;

// 4. 9-Tap Gaussian Blur Fragment Shader (Dye Field Smoothing)
export const BLUR_9_FRAG = `
  precision highp float;
  uniform sampler2D u_dyeTexture;
  uniform vec2 u_texelSize;
  varying vec2 v_uv;

  void main() {
    vec2 t = u_texelSize;
    
    // 9-tap texture fetch matrix
    float d00 = texture2D(u_dyeTexture, v_uv + vec2(-t.x, -t.y)).r;
    float d10 = texture2D(u_dyeTexture, v_uv + vec2( 0.0, -t.y)).r;
    float d20 = texture2D(u_dyeTexture, v_uv + vec2( t.x, -t.y)).r;
    float d01 = texture2D(u_dyeTexture, v_uv + vec2(-t.x,  0.0)).r;
    float d11 = texture2D(u_dyeTexture, v_uv).r;
    float d21 = texture2D(u_dyeTexture, v_uv + vec2( t.x,  0.0)).r;
    float d02 = texture2D(u_dyeTexture, v_uv + vec2(-t.x,  t.y)).r;
    float d12 = texture2D(u_dyeTexture, v_uv + vec2( 0.0,  t.y)).r;
    float d22 = texture2D(u_dyeTexture, v_uv + vec2( t.x,  t.y)).r;

    // 9-Tap Gaussian Kernel weights:
    // [ 1  2  1 ]
    // [ 2  4  2 ] / 16
    // [ 1  2  1 ]
    float blurred = (d00 * 1.0 + d10 * 2.0 + d20 * 1.0 +
                     d01 * 2.0 + d11 * 4.0 + d21 * 2.0 +
                     d02 * 1.0 + d12 * 2.0 + d22 * 1.0) / 16.0;

    gl_FragColor = vec4(blurred, 0.0, 0.0, 1.0);
  }
`;

// 5. Compositing and Post-Process Distortion Fragment Shader
export const DISTORTION_COMPOSITOR_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D u_sceneTexture;
  uniform sampler2D u_dyeBlurredTexture;
  uniform vec2 u_texelSize;

  uniform float u_refractionStrength;
  uniform float u_blurRadius;
  uniform float u_iridescentIntensity;

  // Compute central difference gradient of the blurred dye field
  vec2 getGradient(vec2 uv, vec2 texel) {
    float dL = texture2D(u_dyeBlurredTexture, uv - vec2(texel.x, 0.0)).r;
    float dR = texture2D(u_dyeBlurredTexture, uv + vec2(texel.x, 0.0)).r;
    float dT = texture2D(u_dyeBlurredTexture, uv + vec2(0.0, texel.y)).r;
    float dB = texture2D(u_dyeBlurredTexture, uv - vec2(0.0, texel.y)).r;
    return vec2(dR - dL, dT - dB);
  }

  // Circular Variable-Rate Blur based on local dye density
  vec4 sampleSceneBlurred(vec2 uv, float r) {
    if (r <= 0.02) {
      return texture2D(u_sceneTexture, uv);
    }
    vec4 col = vec4(0.0);
    float totalWeight = 0.0;
    
    // Core center weight
    col += texture2D(u_sceneTexture, uv) * 4.0;
    totalWeight += 4.0;
    
    // Ring 1 offset
    vec2 offset1 = vec2(r, 0.0) * u_texelSize;
    vec2 offset2 = vec2(-r, 0.0) * u_texelSize;
    vec2 offset3 = vec2(0.0, r) * u_texelSize;
    vec2 offset4 = vec2(0.0, -r) * u_texelSize;
    
    // Diagonal Ring 1 offset
    vec2 offset5 = vec2(r, r) * 0.707 * u_texelSize;
    vec2 offset6 = vec2(-r, r) * 0.707 * u_texelSize;
    vec2 offset7 = vec2(r, -r) * 0.707 * u_texelSize;
    vec2 offset8 = vec2(-r, -r) * 0.707 * u_texelSize;
    
    col += texture2D(u_sceneTexture, uv + offset1) * 2.0;
    col += texture2D(u_sceneTexture, uv + offset2) * 2.0;
    col += texture2D(u_sceneTexture, uv + offset3) * 2.0;
    col += texture2D(u_sceneTexture, uv + offset4) * 2.0;
    
    col += texture2D(u_sceneTexture, uv + offset5) * 1.0;
    col += texture2D(u_sceneTexture, uv + offset6) * 1.0;
    col += texture2D(u_sceneTexture, uv + offset7) * 1.0;
    col += texture2D(u_sceneTexture, uv + offset8) * 1.0;
    totalWeight += 12.0;
    
    return col / totalWeight;
  }

  void main() {
    float dye = texture2D(u_dyeBlurredTexture, vUv).r;

    // 10. CRITICAL: Ensure original 3D scene color, light, color space are absolutely untouched outside flow trails
    if (dye < 0.0001) {
      gl_FragColor = texture2D(u_sceneTexture, vUv);
      return;
    }

    // 9. Compute spatial gradient for Iridescent Boundary
    vec2 grad = getGradient(vUv, u_texelSize);
    float edgeWeight = length(grad);

    // Iridescence direction (perpendicular to gradient vector)
    vec2 perp = vec2(-grad.y, grad.x);
    vec2 normPerp = normalize(perp + 1e-6);

    // Colorize: Deep Blue on one side, Hot Magenta/Red on the other side of the shear layer
    float shear = normPerp.x;
    vec3 colorBlue = vec3(0.0, 0.28, 1.0);
    vec3 colorRed = vec3(1.0, 0.03, 0.12);
    vec3 iridColor = mix(colorBlue, colorRed, shear * 0.5 + 0.5);

    // 10. Distort & Refract using dye density & edge gradient
    // Displace texture coordinates backwards along gradient direction
    vec2 refractedUv = vUv - grad * u_refractionStrength * dye * 8.0;
    refractedUv = clamp(refractedUv, vec2(0.0001), vec2(0.9999));

    // Variable blur radius driven by dye density
    float currentBlurRadius = u_blurRadius * dye;
    vec4 sceneColor = sampleSceneBlurred(refractedUv, currentBlurRadius);

    // 10. Composite Iridescent overlay
    // Iridescent intensity is determined by the gradient magnitude (edge weight) and dye presence
    float iridIntensity = edgeWeight * u_iridescentIntensity * dye;
    vec3 finalColor = sceneColor.rgb + iridColor * iridIntensity;

    // Perfectly smooth mask blending at trail borders to completely isolate effect zones
    float transitionMask = smoothstep(0.001, 0.04, dye);
    vec4 originalSceneColor = texture2D(u_sceneTexture, vUv);

    gl_FragColor = mix(originalSceneColor, vec4(finalColor, originalSceneColor.a), transitionMask);
  }
`;

const FluidDistortionEffect: React.FC = () => {
  const { gl, size } = useThree();

  // Optimized internal simulation dimension
  const { simWidth, simHeight } = useMemo(() => {
    const base = 512;
    const aspect = size.width / size.height;
    let w = base;
    let h = base;
    if (aspect > 1) {
      h = Math.round(base / aspect);
    } else {
      w = Math.round(base * aspect);
    }
    return { simWidth: w, simHeight: h };
  }, [size.width, size.height]);

  // Pointer position and state refs (UV based)
  const isDrawingRef = useRef(false);
  const currentPointer = useRef(new THREE.Vector2(0.5, 0.5));
  const prevPointer = useRef(new THREE.Vector2(0.5, 0.5));
  const pointerVel = useRef(new THREE.Vector2(0, 0));
  const firstFrameRef = useRef(true);

  // Active render target tracker
  const targetsRef = useRef<{
    sceneRenderTarget: THREE.WebGLRenderTarget;
    velocityTarget1: THREE.WebGLRenderTarget;
    velocityTarget2: THREE.WebGLRenderTarget;
    dyeTarget1: THREE.WebGLRenderTarget;
    dyeTarget2: THREE.WebGLRenderTarget;
    dyeBlurredTarget: THREE.WebGLRenderTarget;
  } | null>(null);

  // Set up all WebGL FBO Render Targets
  const {
    sceneRenderTarget,
    velocityTarget1,
    velocityTarget2,
    dyeTarget1,
    dyeTarget2,
    dyeBlurredTarget,
    quadGeometry,
    orthoCamera
  } = useMemo(() => {
    // Deep cleanup old targets on resize or recreate to prevent VRAM memory leaks
    if (targetsRef.current) {
      targetsRef.current.sceneRenderTarget.dispose();
      targetsRef.current.velocityTarget1.dispose();
      targetsRef.current.velocityTarget2.dispose();
      targetsRef.current.dyeTarget1.dispose();
      targetsRef.current.dyeTarget2.dispose();
      targetsRef.current.dyeBlurredTarget.dispose();
    }

    const dpr = gl.getPixelRatio();
    const w = size.width * dpr;
    const h = size.height * dpr;

    const sceneTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
      colorSpace: THREE.SRGBColorSpace, // CRITICAL: Maintain exact color encoding/space to prevent scene darkening
    });

    const createSimTarget = () => new THREE.WebGLRenderTarget(simWidth, simHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    const vTarget1 = createSimTarget();
    const vTarget2 = createSimTarget();
    const dTarget1 = createSimTarget();
    const dTarget2 = createSimTarget();
    const dbTarget = createSimTarget();

    // Fill initial FBOs with neutral baseline
    const renderer = gl;
    const geometry = new THREE.PlaneGeometry(2, 2);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x808000 })); // Encode 0 velocity (0.5, 0.5)
    scene.add(mesh);

    renderer.setRenderTarget(vTarget1);
    renderer.render(scene, camera);
    renderer.setRenderTarget(vTarget2);
    renderer.render(scene, camera);

    mesh.material = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Encode 0 dye concentration
    renderer.setRenderTarget(dTarget1);
    renderer.render(scene, camera);
    renderer.setRenderTarget(dTarget2);
    renderer.render(scene, camera);
    renderer.setRenderTarget(dbTarget);
    renderer.render(scene, camera);

    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();

    const newTargets = {
      sceneRenderTarget: sceneTarget,
      velocityTarget1: vTarget1,
      velocityTarget2: vTarget2,
      dyeTarget1: dTarget1,
      dyeTarget2: dTarget2,
      dyeBlurredTarget: dbTarget,
    };

    targetsRef.current = newTargets;

    return {
      ...newTargets,
      quadGeometry: geometry,
      orthoCamera: camera
    };
  }, [gl, size.width, size.height, simWidth, simHeight]);

  // Ping-pong buffer tracking refs
  const velocityTarget1Ref = useRef(velocityTarget1);
  const velocityTarget2Ref = useRef(velocityTarget2);
  const dyeTarget1Ref = useRef(dyeTarget1);
  const dyeTarget2Ref = useRef(dyeTarget2);

  useEffect(() => {
    velocityTarget1Ref.current = velocityTarget1;
    velocityTarget2Ref.current = velocityTarget2;
    dyeTarget1Ref.current = dyeTarget1;
    dyeTarget2Ref.current = dyeTarget2;
  }, [velocityTarget1, velocityTarget2, dyeTarget1, dyeTarget2]);

  // Setup separate shader materials for each pipeline stage
  const { velocityMaterial, dyeMaterial, blurMaterial, compMaterial } = useMemo(() => {
    const vMaterial = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX,
      fragmentShader: VELOCITY_FRAG,
      uniforms: {
        u_velocityTexture: { value: null },
        u_texelSize: { value: new THREE.Vector2(1 / simWidth, 1 / simHeight) },
        u_dt: { value: 0.016 },
        u_decay: { value: 0.985 }, // Slight decay to let flow swirls persist beautifully
        u_pointer: { value: new THREE.Vector2(0.5, 0.5) },
        u_prevPointer: { value: new THREE.Vector2(0.5, 0.5) },
        u_pointerVel: { value: new THREE.Vector2(0, 0) },
        u_radius: { value: 0.045 }, // Gaussian splat size (relative to screen width)
        u_strength: { value: 12.0 }, // Splat velocity impulse
        u_curlScale: { value: 12.0 }, // Swirl frequency scale
        u_curlStrength: { value: 0.15 }, // Chaos turbulence power
        u_time: { value: 0.0 }
      },
      depthWrite: false,
      depthTest: false
    });

    const dMaterial = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX,
      fragmentShader: DYE_FRAG,
      uniforms: {
        u_dyeTexture: { value: null },
        u_velocityTexture: { value: null },
        u_texelSize: { value: new THREE.Vector2(1 / simWidth, 1 / simHeight) },
        u_dt: { value: 0.016 },
        u_decay: { value: 0.985 }, // Slow dye decay
        u_pointer: { value: new THREE.Vector2(0.5, 0.5) },
        u_prevPointer: { value: new THREE.Vector2(0.5, 0.5) },
        u_radius: { value: 0.04 }, // Dye splat radius
        u_dyeAmount: { value: 0.85 } // Dye density splat injection amount
      },
      depthWrite: false,
      depthTest: false
    });

    const bMaterial = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX,
      fragmentShader: BLUR_9_FRAG,
      uniforms: {
        u_dyeTexture: { value: null },
        u_texelSize: { value: new THREE.Vector2(1.2 / simWidth, 1.2 / simHeight) }
      },
      depthWrite: false,
      depthTest: false
    });

    const cMaterial = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX,
      fragmentShader: DISTORTION_COMPOSITOR_FRAG,
      uniforms: {
        u_sceneTexture: { value: null },
        u_dyeBlurredTexture: { value: null },
        u_texelSize: { value: new THREE.Vector2(1 / size.width, 1 / size.height) },
        u_refractionStrength: { value: 0.28 }, // Subtle, premium refraction
        u_blurRadius: { value: 12.0 }, // Maximum fluid blur
        u_iridescentIntensity: { value: 1.4 } // Beautiful edge iridescence highlight
      },
      depthWrite: false,
      depthTest: false
    });

    return {
      velocityMaterial: vMaterial,
      dyeMaterial: dMaterial,
      blurMaterial: bMaterial,
      compMaterial: cMaterial
    };
  }, [simWidth, simHeight, size.width, size.height]);

  // Build simulation Scenes
  const { velocityScene, dyeScene, blurScene, compScene } = useMemo(() => {
    const vScene = new THREE.Scene();
    vScene.add(new THREE.Mesh(quadGeometry, velocityMaterial));

    const dScene = new THREE.Scene();
    dScene.add(new THREE.Mesh(quadGeometry, dyeMaterial));

    const bScene = new THREE.Scene();
    bScene.add(new THREE.Mesh(quadGeometry, blurMaterial));

    const cScene = new THREE.Scene();
    cScene.add(new THREE.Mesh(quadGeometry, compMaterial));

    return {
      velocityScene: vScene,
      dyeScene: dScene,
      blurScene: bScene,
      compScene: cScene
    };
  }, [quadGeometry, velocityMaterial, dyeMaterial, blurMaterial, compMaterial]);

  // Pointer Interaction Listeners mapping standard screen coordinates to UV coords
  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      isDrawingRef.current = true;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;

      currentPointer.current.set(x, y);
      prevPointer.current.set(x, y);
      pointerVel.current.set(0, 0);
      firstFrameRef.current = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;

      currentPointer.current.set(x, y);
    };

    const handlePointerUp = () => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener('pointerdown', handlePointerDown, { passive: true });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: true });
    canvas.addEventListener('pointercancel', handlePointerUp, { passive: true });
    canvas.addEventListener('pointerleave', handlePointerUp, { passive: true });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [gl]);

  // Frame simulation and execution loops (Priority 1 hooks the screen render)
  useFrame((state) => {
    const { gl: renderer, scene, camera, size: currentSize, clock } = state;

    // Monitor canvas scale changes to resize targets
    const dpr = renderer.getPixelRatio();
    const w = currentSize.width * dpr;
    const h = currentSize.height * dpr;
    if (sceneRenderTarget.width !== w || sceneRenderTarget.height !== h) {
      sceneRenderTarget.setSize(w, h);
      compMaterial.uniforms.u_texelSize.value.set(1 / currentSize.width, 1 / currentSize.height);
    }

    // 1. Calculate interaction dynamics (Pointer Splat inputs)
    const dx = currentPointer.current.x - prevPointer.current.x;
    const dy = currentPointer.current.y - prevPointer.current.y;

    pointerVel.current.set(dx, dy);

    let currentSplatRadius = 0.015;
    let currentSplatStrength = 0.0;
    let currentDyeAmount = 0.0;

    if (isDrawingRef.current) {
      currentSplatRadius = 0.035;
      currentSplatStrength = 18.0;
      currentDyeAmount = 0.75;
    } else {
      // Small ambient wake from passive cursor movement
      const speed = Math.sqrt(dx * dx + dy * dy);
      if (speed > 0.0001) {
        currentSplatRadius = 0.022;
        currentSplatStrength = 5.0;
        currentDyeAmount = 0.15;
      }
    }

    if (firstFrameRef.current) {
      velocityMaterial.uniforms.u_pointer.value.copy(currentPointer.current);
      velocityMaterial.uniforms.u_prevPointer.value.copy(currentPointer.current);
      velocityMaterial.uniforms.u_pointerVel.value.set(0, 0);
      velocityMaterial.uniforms.u_strength.value = 0.0;

      dyeMaterial.uniforms.u_pointer.value.copy(currentPointer.current);
      dyeMaterial.uniforms.u_prevPointer.value.copy(currentPointer.current);
      dyeMaterial.uniforms.u_dyeAmount.value = 0.0;

      firstFrameRef.current = false;
    } else {
      velocityMaterial.uniforms.u_pointer.value.copy(currentPointer.current);
      velocityMaterial.uniforms.u_prevPointer.value.copy(prevPointer.current);
      velocityMaterial.uniforms.u_pointerVel.value.copy(pointerVel.current);
      velocityMaterial.uniforms.u_strength.value = currentSplatStrength;
      velocityMaterial.uniforms.u_radius.value = currentSplatRadius;

      dyeMaterial.uniforms.u_pointer.value.copy(currentPointer.current);
      dyeMaterial.uniforms.u_prevPointer.value.copy(prevPointer.current);
      dyeMaterial.uniforms.u_dyeAmount.value = currentDyeAmount;
      dyeMaterial.uniforms.u_radius.value = currentSplatRadius;
    }

    // Move pointers forward
    prevPointer.current.copy(currentPointer.current);

    // 2. Render normal 3D Scene into our scene buffer
    renderer.setRenderTarget(sceneRenderTarget);
    renderer.render(scene, camera);

    // 3. Update Velocity State (Velocity GPGPU Step)
    velocityMaterial.uniforms.u_velocityTexture.value = velocityTarget1Ref.current.texture;
    velocityMaterial.uniforms.u_time.value = clock.getElapsedTime();
    renderer.setRenderTarget(velocityTarget2Ref.current);
    renderer.render(velocityScene, orthoCamera);

    // Swap velocity buffers
    const tempVel = velocityTarget1Ref.current;
    velocityTarget1Ref.current = velocityTarget2Ref.current;
    velocityTarget2Ref.current = tempVel;

    // 4. Update Dye State (Dye GPGPU Step)
    dyeMaterial.uniforms.u_dyeTexture.value = dyeTarget1Ref.current.texture;
    dyeMaterial.uniforms.u_velocityTexture.value = velocityTarget1Ref.current.texture;
    renderer.setRenderTarget(dyeTarget2Ref.current);
    renderer.render(dyeScene, orthoCamera);

    // Swap dye buffers
    const tempDye = dyeTarget1Ref.current;
    dyeTarget1Ref.current = dyeTarget2Ref.current;
    dyeTarget2Ref.current = tempDye;

    // 5. 9-Tap Gaussian Blur on active Dye Field
    blurMaterial.uniforms.u_dyeTexture.value = dyeTarget1Ref.current.texture;
    renderer.setRenderTarget(dyeBlurredTarget);
    renderer.render(blurScene, orthoCamera);

    // 6. Compositing post-process step back to standard screen
    compMaterial.uniforms.u_sceneTexture.value = sceneRenderTarget.texture;
    compMaterial.uniforms.u_dyeBlurredTexture.value = dyeBlurredTarget.texture;

    renderer.setRenderTarget(null);
    renderer.render(compScene, orthoCamera);
  }, 1);

  // Deep lifecycle clean-up of WebGL targets and allocations to prevent leaks
  useEffect(() => {
    return () => {
      sceneRenderTarget.dispose();
      velocityTarget1.dispose();
      velocityTarget2.dispose();
      dyeTarget1.dispose();
      dyeTarget2.dispose();
      dyeBlurredTarget.dispose();
      quadGeometry.dispose();
      velocityMaterial.dispose();
      dyeMaterial.dispose();
      blurMaterial.dispose();
      compMaterial.dispose();
    };
  }, [
    sceneRenderTarget,
    velocityTarget1,
    velocityTarget2,
    dyeTarget1,
    dyeTarget2,
    dyeBlurredTarget,
    quadGeometry,
    velocityMaterial,
    dyeMaterial,
    blurMaterial,
    compMaterial
  ]);

  return null;
};

export default FluidDistortionEffect;
