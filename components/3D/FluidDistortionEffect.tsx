import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Universal Vertex Shader defining both v_uv and vUv for fragment shader compatibility
export const SIM_VERTEX = `
  varying vec2 v_uv;
  varying vec2 vUv;
  void main() {
    v_uv = uv;
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export const BLUR_9_FRAG = `
  precision highp float;
  uniform sampler2D u_texture;
  uniform vec2 u_delta;
  varying vec2 v_uv;
  void main() {
    vec4 color = texture2D(u_texture, v_uv) * 0.1633;
    vec2 delta = u_delta;
    color += texture2D(u_texture, v_uv - delta) * 0.1531;
    color += texture2D(u_texture, v_uv + delta) * 0.1531;
    delta += u_delta;
    color += texture2D(u_texture, v_uv - delta) * 0.12245;
    color += texture2D(u_texture, v_uv + delta) * 0.12245;
    delta += u_delta;
    color += texture2D(u_texture, v_uv - delta) * 0.0918;
    color += texture2D(u_texture, v_uv + delta) * 0.0918;
    delta += u_delta;
    color += texture2D(u_texture, v_uv - delta) * 0.051;
    color += texture2D(u_texture, v_uv + delta) * 0.051;
    gl_FragColor = color;
  }
`;

export const SCREEN_PAINT_FRAG = `
  precision highp float;
  uniform sampler2D u_lowPaintTexture;
  uniform sampler2D u_prevPaintTexture;
  uniform vec2 u_paintTexelSize;
  uniform vec2 u_scrollOffset;
  uniform vec4 u_drawFrom; // x, y, radius, 1
  uniform vec4 u_drawTo;   // x, y, radius, 1
  uniform float u_pushStrength;
  uniform vec3 u_dissipations;
  uniform vec2 u_vel;
  varying vec2 v_uv;

  float sdSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  #ifdef USE_NOISE
  uniform float u_curlScale;
  uniform float u_curlStrength;
  vec2 hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
  }
  vec3 noised(in vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    vec2 ga = hash(i + vec2(0.0, 0.0)); vec2 gb = hash(i + vec2(1.0, 0.0));
    vec2 gc = hash(i + vec2(0.0, 1.0)); vec2 gd = hash(i + vec2(1.0, 1.0));
    float va = dot(ga, f - vec2(0.0, 0.0)); float vb = dot(gb, f - vec2(1.0, 0.0));
    float vc = dot(gc, f - vec2(0.0, 1.0)); float vd = dot(gd, f - vec2(1.0, 1.0));
    return vec3(va + u.x*(vb-va) + u.y*(vc-va) + u.x*u.y*(va-vb-vc+vd), ga + u.x*(gb-ga) + u.y*(gc-ga) + u.x*u.y*(ga-gb-gc+gd));
  }
  #endif

  void main() {
    float dist = sdSegment(gl_FragCoord.xy, u_drawFrom.xy, u_drawTo.xy);
    float progressOnSegment = clamp(dot(gl_FragCoord.xy - u_drawFrom.xy, u_drawTo.xy - u_drawFrom.xy) / max(0.0001, dot(u_drawTo.xy - u_drawFrom.xy, u_drawTo.xy - u_drawFrom.xy)), 0.0, 1.0);
    vec2 radiusWeight = mix(u_drawFrom.zw, u_drawTo.zw, progressOnSegment);
    
    float drawingMask = 1.0 - smoothstep(-0.01, radiusWeight.x, dist);
    
    vec4 lowData = texture2D(u_lowPaintTexture, v_uv - u_scrollOffset);
    vec2 velInv = (0.5 - lowData.xy) * u_pushStrength;
    
    #ifdef USE_NOISE
    vec3 noiseVal = noised(gl_FragCoord.xy * u_curlScale * (1.0 - lowData.xy));
    velInv += noiseVal.yz * (lowData.z + lowData.w) * u_curlStrength;
    #endif
    
    vec4 data = texture2D(u_prevPaintTexture, v_uv - u_scrollOffset + velInv * u_paintTexelSize);
    data.xy -= 0.5;
    
    vec4 delta = (u_dissipations.xxyz - 1.0) * data;
    vec2 newVel = u_vel * drawingMask;
    delta += vec4(newVel, radiusWeight.yy * drawingMask);
    
    delta.zw = sign(delta.zw) * max(vec2(0.004), abs(delta.zw));
    data += delta;
    data.xy += 0.5;
    
    gl_FragColor = clamp(data, vec4(0.0), vec4(1.0));
  }
`;

export const DISTORTION_COMPOSITOR_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D u_texture;
  uniform sampler2D u_screenPaintTexture;
  uniform vec2 u_screenPaintTexelSize;
  uniform float u_amount;
  uniform float u_rgbShift;
  uniform float u_multiplier;
  uniform float u_colorMultiplier;
  uniform float u_shade;
  uniform float u_time;
  uniform vec2 u_res;

  float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }

  void main() {
    float bnoise = rand(gl_FragCoord.xy + fract(u_time));
    vec4 data = texture2D(u_screenPaintTexture, vUv);
    
    // Calculate trail weight and mask
    float weight = (data.z + data.w) * 0.5;
    float effectMask = smoothstep(0.0, 0.15, weight);
    
    // Sample original color for background consistency
    vec4 sceneColor = texture2D(u_texture, vUv);
    
    // Early exit if no trail is present to maintain perfect sharpness
    if (effectMask <= 0.0) {
      gl_FragColor = sceneColor;
      return;
    }

    vec2 vel = (0.5 - data.xy - 0.001) * 2.0 * weight;
    vec2 velocity = vel * u_amount / 4.0 * u_screenPaintTexelSize * u_multiplier;
    float dispersion = 2.0 * u_rgbShift; // Multiplier for channel spread
    
    // Multi-tap dispersion sampling
    vec3 distortedColor = vec3(0.0);
    
    // Sample 9 taps with channel shifting
    vec2 uvBase = vUv + bnoise * velocity;
    for(int i = 0; i < 9; i++) {
      distortedColor.r += texture2D(u_texture, uvBase + velocity * dispersion * 0.2).r;
      distortedColor.g += texture2D(u_texture, uvBase).g;
      distortedColor.b += texture2D(u_texture, uvBase - velocity * dispersion * 0.2).b;
      uvBase += velocity;
    }
    distortedColor /= 9.0;
    
    // Chromatic shimmer accent
    vec3 shimmer = sin(vec3(vel.x + vel.y) * 40.0 + vec3(0.0, 2.0, 4.0) * u_rgbShift);
    distortedColor += shimmer * smoothstep(0.4, -0.9, weight) * u_shade * max(abs(vel.x), abs(vel.y)) * u_colorMultiplier;
    
    gl_FragColor = mix(sceneColor, vec4(distortedColor, 1.0), effectMask);
  }
`;

const FluidDistortionEffect: React.FC = () => {
  const { gl, size } = useThree();

  // Dynamic aspect ratio calculation to prevent any visual stretching across breakpoint devices
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

  // Track interaction variables
  const isDrawingRef = useRef(false);
  const currentPointer = useRef(new THREE.Vector2(0, 0));
  const prevPointer = useRef(new THREE.Vector2(0, 0));
  const firstFrameRef = useRef(true);

  // Keep a ref of active render targets to ensure proper disposal of old FBO resources during resize
  const targetsRef = useRef<{
    sceneRenderTarget: THREE.WebGLRenderTarget;
    paintTarget1: THREE.WebGLRenderTarget;
    paintTarget2: THREE.WebGLRenderTarget;
    blurTarget: THREE.WebGLRenderTarget;
  } | null>(null);

  // Setup Render Targets (FBOs) using useMemo for lifecycle retention
  const {
    sceneRenderTarget,
    paintTarget1,
    paintTarget2,
    blurTarget,
    quadGeometry,
    orthoCamera
  } = useMemo(() => {
    // Dispose of previous render targets to prevent memory/VRAM leaks
    if (targetsRef.current) {
      targetsRef.current.sceneRenderTarget.dispose();
      targetsRef.current.paintTarget1.dispose();
      targetsRef.current.paintTarget2.dispose();
      targetsRef.current.blurTarget.dispose();
    }

    const dpr = gl.getPixelRatio();
    const sceneTarget = new THREE.WebGLRenderTarget(size.width * dpr, size.height * dpr, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
      colorSpace: THREE.SRGBColorSpace, // CRITICAL: Use SRGBColorSpace to match R3F canvas encoding and prevent double encoding / darkening
    });

    const createSimTarget = () => new THREE.WebGLRenderTarget(simWidth, simHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    const pTarget1 = createSimTarget();
    const pTarget2 = createSimTarget();
    const bTarget = createSimTarget();

    const geometry = new THREE.PlaneGeometry(2, 2);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const newTargets = {
      sceneRenderTarget: sceneTarget,
      paintTarget1: pTarget1,
      paintTarget2: pTarget2,
      blurTarget: bTarget,
    };

    targetsRef.current = newTargets;

    return {
      ...newTargets,
      quadGeometry: geometry,
      orthoCamera: camera
    };
  }, [gl, size.width, size.height, simWidth, simHeight]);

  // Track rendering target references and dynamically sync when targets re-create
  const paintTarget1Ref = useRef(paintTarget1);
  const paintTarget2Ref = useRef(paintTarget2);

  useEffect(() => {
    paintTarget1Ref.current = paintTarget1;
    paintTarget2Ref.current = paintTarget2;
  }, [paintTarget1, paintTarget2]);

  // Setup Shader Materials
  const { paintMaterial, blurMaterial, compMaterial } = useMemo(() => {
    const pMaterial = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX,
      fragmentShader: SCREEN_PAINT_FRAG,
      defines: {
        USE_NOISE: ''
      },
      uniforms: {
        u_lowPaintTexture: { value: null },
        u_prevPaintTexture: { value: null },
        u_paintTexelSize: { value: new THREE.Vector2(1 / simWidth, 1 / simHeight) },
        u_scrollOffset: { value: new THREE.Vector2(0, 0) },
        u_drawFrom: { value: new THREE.Vector4(-1000, -1000, 16.0, 1.0) },
        u_drawTo: { value: new THREE.Vector4(-1000, -1000, 16.0, 1.0) },
        u_pushStrength: { value: 84.0 }, // PUSH POWER: 84.0
        u_dissipations: { value: new THREE.Vector3(0.992, 0.982, 0.982) }, // FLUID FLOW: Slower decay to let fluid waves persist and propagate beautifully
        u_vel: { value: new THREE.Vector2(0, 0) },
        u_curlScale: { value: 0.0085 }, // CHAOS: 17.00 scaled
        u_curlStrength: { value: 0.102 } // CHAOS: 17.00 scaled
      },
      depthWrite: false,
      depthTest: false
    });

    const bMaterial = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX,
      fragmentShader: BLUR_9_FRAG,
      uniforms: {
        u_texture: { value: null },
        u_delta: { value: new THREE.Vector2(1 / simWidth, 1 / simHeight) }
      },
      depthWrite: false,
      depthTest: false
    });

    const cMaterial = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX,
      fragmentShader: DISTORTION_COMPOSITOR_FRAG,
      uniforms: {
        u_texture: { value: null },
        u_screenPaintTexture: { value: null },
        u_screenPaintTexelSize: { value: new THREE.Vector2(1 / simWidth, 1 / simHeight) },
        u_amount: { value: 2.80 }, // FLUID REFRACTION: 2.80
        u_rgbShift: { value: 0.50 }, // DISPERSION: 5.00 maps to 0.50 shift
        u_multiplier: { value: 0.95 }, // PINCH DISTORTION: 0.95
        u_colorMultiplier: { value: 2.2 },
        u_shade: { value: 0.8 },
        u_time: { value: 0.0 },
        u_res: { value: new THREE.Vector2(size.width, size.height) }
      },
      depthWrite: false,
      depthTest: false
    });

    return {
      paintMaterial: pMaterial,
      blurMaterial: bMaterial,
      compMaterial: cMaterial
    };
  }, [size.width, size.height, simWidth, simHeight]);

  // Build isolated Off-screen simulation scenes to keep main R3F graph clean
  const { simScene, blurScene, compScene } = useMemo(() => {
    const sScene = new THREE.Scene();
    sScene.add(new THREE.Mesh(quadGeometry, paintMaterial));

    const bScene = new THREE.Scene();
    bScene.add(new THREE.Mesh(quadGeometry, blurMaterial));

    const cScene = new THREE.Scene();
    cScene.add(new THREE.Mesh(quadGeometry, compMaterial));

    return {
      simScene: sScene,
      blurScene: bScene,
      compScene: cScene
    };
  }, [quadGeometry, paintMaterial, blurMaterial, compMaterial]);

  // Pointer Interaction Events (highly optimized for desktop hover and touch drags)
  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      isDrawingRef.current = true;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      currentPointer.current.set(x, y);
      prevPointer.current.set(x, y);
      firstFrameRef.current = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

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

  // Frame Loop logic (Priority 1 disables default R3F screen flush, giving us control)
  useFrame((state) => {
    const { gl: renderer, scene, camera, size: currentSize, clock } = state;

    // Rescale scene render target dynamically if viewport is resized
    const dpr = renderer.getPixelRatio();
    const w = currentSize.width * dpr;
    const h = currentSize.height * dpr;
    if (sceneRenderTarget.width !== w || sceneRenderTarget.height !== h) {
      sceneRenderTarget.setSize(w, h);
      compMaterial.uniforms.u_res.value.set(currentSize.width, currentSize.height);
    }

    // 1. Calculate interaction coordinates mapped to Simulation space
    const prevX = (prevPointer.current.x * 0.5 + 0.5) * simWidth;
    const prevY = (prevPointer.current.y * 0.5 + 0.5) * simHeight;
    const currX = (currentPointer.current.x * 0.5 + 0.5) * simWidth;
    const currY = (currentPointer.current.y * 0.5 + 0.5) * simHeight;

    const dx = currX - prevX;
    const dy = currY - prevY;

    // Scale push velocity based on cursor acceleration (clamped to prevent flat-clipping/saturation)
    const velX = THREE.MathUtils.clamp(dx * 0.07, -0.45, 0.45);
    const velY = THREE.MathUtils.clamp(dy * 0.07, -0.45, 0.45);

    let brushRadius = 8.0;
    let brushWeight = 0.0;

    if (isDrawingRef.current) {
      brushRadius = 22.0;
      brushWeight = 1.0;
    } else {
      // Gentle cursor movement wake for active mouse hover
      const movement = Math.sqrt(dx * dx + dy * dy);
      if (movement > 0.05) {
        brushRadius = 12.0;
        brushWeight = 0.22;
      }
    }

    if (firstFrameRef.current) {
      paintMaterial.uniforms.u_vel.value.set(0, 0);
      paintMaterial.uniforms.u_drawFrom.value.set(currX, currY, brushRadius, brushWeight);
      paintMaterial.uniforms.u_drawTo.value.set(currX, currY, brushRadius, brushWeight);
      firstFrameRef.current = false;
    } else {
      paintMaterial.uniforms.u_vel.value.set(velX, velY);
      paintMaterial.uniforms.u_drawFrom.value.set(prevX, prevY, brushRadius, brushWeight);
      paintMaterial.uniforms.u_drawTo.value.set(currX, currY, brushRadius, brushWeight);
    }

    prevPointer.current.copy(currentPointer.current);

    // 2. Render standard 3D Scene into our scene render target
    renderer.setRenderTarget(sceneRenderTarget);
    renderer.render(scene, camera);

    // 3. Symmetrical 2D Blur pass for smooth fluid diffusion (runs every frame in a single pass)
    blurMaterial.uniforms.u_texture.value = paintTarget1Ref.current.texture;
    blurMaterial.uniforms.u_delta.value.set(1.2 / simWidth, 1.2 / simHeight);

    renderer.setRenderTarget(blurTarget);
    renderer.render(blurScene, orthoCamera);

    // 4. Run paint simulation step
    paintMaterial.uniforms.u_lowPaintTexture.value = blurTarget.texture;
    paintMaterial.uniforms.u_prevPaintTexture.value = paintTarget1Ref.current.texture;

    renderer.setRenderTarget(paintTarget2Ref.current);
    renderer.render(simScene, orthoCamera);

    // Ping-pong render targets swap
    const temp = paintTarget1Ref.current;
    paintTarget1Ref.current = paintTarget2Ref.current;
    paintTarget2Ref.current = temp;

    // 5. Compositing distortion pass back to the default screen buffer
    compMaterial.uniforms.u_texture.value = sceneRenderTarget.texture;
    compMaterial.uniforms.u_screenPaintTexture.value = paintTarget1Ref.current.texture;
    compMaterial.uniforms.u_time.value = clock.getElapsedTime();

    renderer.setRenderTarget(null);
    renderer.render(compScene, orthoCamera);
  }, 1);

  // Deep cleanup of all WebGL resources to fully prevent memory leaks
  useEffect(() => {
    return () => {
      sceneRenderTarget.dispose();
      paintTarget1.dispose();
      paintTarget2.dispose();
      blurTarget.dispose();
      quadGeometry.dispose();
      paintMaterial.dispose();
      blurMaterial.dispose();
      compMaterial.dispose();
    };
  }, [sceneRenderTarget, paintTarget1, paintTarget2, blurTarget, quadGeometry, paintMaterial, blurMaterial, compMaterial]);

  return null;
};

export default FluidDistortionEffect;
