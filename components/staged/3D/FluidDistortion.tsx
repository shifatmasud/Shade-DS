import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';

export interface FluidDistortionProps {
  children: (texture: THREE.Texture) => React.ReactNode;
  /** Brush radius in normalized screen space (default: 0.065) */
  radius?: number;
  /** Impulse force strength (default: 4.5) */
  strength?: number;
  /** Dissipation decay rate per frame (default: 0.96) */
  dissipation?: number;
  /** Blending weight between carried low-res velocity and new input (default: 0.88) */
  mixRatio?: number;
}

const COMMON_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Pass 1: Paint Pass Shader (Render mouse 2D distance field + velocity impulse, back-advect and mix with carried low-res velocity)
const PAINT_FRAG = `
  uniform sampler2D tLowRes;
  uniform vec2 uPointer;
  uniform vec2 uPrevPointer;
  uniform vec2 uVelocity;
  uniform float uTime;
  uniform float uRadius;
  uniform float uStrength;
  uniform float uDissipation;
  uniform float uMixRatio;
  uniform float uAspect;
  uniform float uActive;
  varying vec2 vUv;

  // 2D Simplex Noise implementation (Ashima Arts / Stefan Gustavson)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // (0.5*(sqrt(3.0)-1.0))
                        -0.577350269189626, // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx) ;
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0) )
      + i.x + vec3(0.0, i1.x, 1.0) );
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 a0 = x - floor(x + 0.5);
    vec3 g = a0 * vec3(x0.x, x12.xz) + h * vec3(x0.y, x12.yw);
    vec3 diff = 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    g *= diff;
    return 130.0 * dot(m, g);
  }

  // 2D Curl Noise vector field based on Simplex Noise potential
  vec2 curlNoise(vec2 p, float time, float freq) {
    float eps = 0.015;
    vec2 coord = p * freq;
    vec2 tOffset = vec2(time * 0.12, time * 0.08);
    
    float valR = snoise(coord + tOffset + vec2(eps, 0.0));
    float valL = snoise(coord + tOffset - vec2(eps, 0.0));
    float valU = snoise(coord + tOffset + vec2(0.0, eps));
    float valD = snoise(coord + tOffset - vec2(0.0, eps));
    
    float d_dx = (valR - valL) / (2.0 * eps);
    float d_dy = (valU - valD) / (2.0 * eps);
    
    return vec2(d_dy, -d_dx);
  }

  // Segment distance function (capsule distance in aspect-corrected UV space)
  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000001), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    // 1. Back-advect UV coordinate along low-res velocity field for natural fluid flow
    vec4 lowResRaw = texture2D(tLowRes, vUv);
    vec2 lowResVel = (lowResRaw.rg - 0.5) * 2.0;

    vec2 advectUv = vUv - lowResVel * 0.014;
    vec4 prevSample = texture2D(tLowRes, clamp(advectUv, 0.0, 1.0));
    vec2 prevVel = (prevSample.rg - 0.5) * 2.0;
    float prevDensity = prevSample.b;

    // 2. Aspect-ratio corrected pointer segment distance (Capsule Splatting)
    vec2 p = vUv;
    p.x *= uAspect;
    vec2 a = uPrevPointer;
    a.x *= uAspect;
    vec2 b = uPointer;
    b.x *= uAspect;

    float dist = sdSegment(p, a, b);

    // 3. Fluid metaball bell-curve splat falloff
    float radius = uRadius * mix(1.0, 1.5, uActive);
    float rNorm = clamp(dist / max(radius, 0.0001), 0.0, 1.0);
    float splat = 1.0 - rNorm * rNorm;
    splat = splat * splat; // Smooth organic liquid curve

    // Mouse velocity impulse
    vec2 pointerVel = uVelocity * uStrength * mix(2.5, 5.2, uActive);

    // Swirl & Vorticity injection along segment normal for organic fluid turbulence
    vec2 segDir = b - a;
    float segLen = length(segDir);
    vec2 swirl = vec2(0.0);
    if (segLen > 0.00001) {
      vec2 normDir = segDir / segLen;
      vec2 normPerp = vec2(-normDir.y, normDir.x);
      vec2 pa = p - a;
      float side = sign(dot(pa, normPerp));
      swirl = normPerp * side * segLen * 4.0 * sin(dist * 25.0 + uTime * 4.0);
    }

    vec2 inputVel = (pointerVel + swirl) * splat;

    // Advect and dissipate previous velocity and density
    vec2 advectedVel = prevVel * uDissipation;
    float advectedDensity = prevDensity * (uDissipation * 0.98);

    // Combine input velocity and back-advected fluid momentum
    vec2 mixedVel = advectedVel + inputVel * 2.8;

    // Spatial density gradient from low-res texture (representing trail slopes and bounds)
    float dX = texture2D(tLowRes, vUv + vec2(0.008, 0.0)).b - texture2D(tLowRes, vUv - vec2(0.008, 0.0)).b;
    float dY = texture2D(tLowRes, vUv + vec2(0.0, 0.008)).b - texture2D(tLowRes, vUv - vec2(0.0, 0.008)).b;
    vec2 densitySlope = vec2(dX, dY);
    float slopeMag = length(densitySlope);

    // Edge & slope amplification factors
    float trailEdgeFactor = smoothstep(0.01, 0.35, slopeMag);
    float localSplatEdge = smoothstep(0.05, 0.5, splat) * (1.0 - smoothstep(0.5, 0.95, splat));
    float totalSlopesFactor = max(trailEdgeFactor, localSplatEdge);

    // Generate organic 2D Curl Noise for better fluid motion path
    vec2 curl1 = curlNoise(vUv, uTime, 3.2);
    vec2 curl2 = curlNoise(vUv, uTime * 1.6, 7.5);
    vec2 combinedCurl = curl1 * 0.75 + curl2 * 0.25;

    // Scale Curl Noise: significantly increased on trail slopes, bounds, and under pointer
    float baseCurlStrength = 0.04;
    float edgeCurlBoost = 0.22 * totalSlopesFactor;
    float pointerCurlBoost = 0.35 * splat * mix(1.0, 2.2, uActive);
    
    vec2 injectedCurl = combinedCurl * (baseCurlStrength + edgeCurlBoost + pointerCurlBoost);
    mixedVel += injectedCurl;

    // Organic micro-turbulence noise
    float noise = sin(vUv.x * 35.0 + uTime * 3.0) * cos(vUv.y * 35.0 + uTime * 3.0) * 0.0015;
    mixedVel += vec2(noise, -noise);

    // Clamp speed for numerical stability
    float speed = length(mixedVel);
    if (speed > 1.35) {
      mixedVel = (mixedVel / speed) * 1.35;
    }

    // Combine fluid density with liquid threshold profile
    float newDensity = splat * mix(0.85, 1.0, uActive);
    float finalDensity = clamp(max(advectedDensity, newDensity), 0.0, 1.0);

    // Output 8-bit packed velocity into RG channels, density into B channel
    gl_FragColor = vec4(mixedVel * 0.5 + 0.5, finalDensity, 1.0);
  }
`;

// Pass 2: Downsample / Blur Pass Shader (Downsample paint target to lower res target ~1/8 screen)
const BLUR_FRAG = `
  uniform sampler2D tPaint;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    // 3x3 Box blur downsample for smooth velocity carry
    vec4 c  = texture2D(tPaint, vUv) * 0.25;
    vec4 t1 = texture2D(tPaint, vUv + vec2( uTexelSize.x, 0.0)) * 0.125;
    vec4 t2 = texture2D(tPaint, vUv + vec2(-uTexelSize.x, 0.0)) * 0.125;
    vec4 t3 = texture2D(tPaint, vUv + vec2(0.0,  uTexelSize.y)) * 0.125;
    vec4 t4 = texture2D(tPaint, vUv + vec2(0.0, -uTexelSize.y)) * 0.125;
    vec4 d1 = texture2D(tPaint, vUv + vec2( uTexelSize.x,  uTexelSize.y)) * 0.0625;
    vec4 d2 = texture2D(tPaint, vUv + vec2(-uTexelSize.x,  uTexelSize.y)) * 0.0625;
    vec4 d3 = texture2D(tPaint, vUv + vec2( uTexelSize.x, -uTexelSize.y)) * 0.0625;
    vec4 d4 = texture2D(tPaint, vUv + vec2(-uTexelSize.x, -uTexelSize.y)) * 0.0625;
    
    gl_FragColor = c + t1 + t2 + t3 + t4 + d1 + d2 + d3 + d4;
  }
`;

// Post-Processing Refraction Shader (9-Tap Gaussian Kernel + Rim Smoothstep Blur & Chromatic Dispersion)
export const DISTORTION_FRAG = `
  uniform sampler2D tFluid;

  // High-frequency pseudo blue noise hash
  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Sample motion vector map
    vec4 fluidSample = texture2D(tFluid, uv);
    vec2 mainVel = (fluidSample.rg - 0.5) * 2.0;
    float mainDensity = fluidSample.b;

    float mask = smoothstep(0.0001, 0.25, mainDensity);
    if (mask <= 0.0001) {
      outputColor = inputColor;
      return;
    }

    // Compute spatial gradient of density to target trail slopes and bounds in high-res space
    float dX = texture2D(tFluid, uv + vec2(0.003, 0.0)).b - texture2D(tFluid, uv - vec2(0.003, 0.0)).b;
    float dY = texture2D(tFluid, uv + vec2(0.0, 0.003)).b - texture2D(tFluid, uv - vec2(0.0, 0.003)).b;
    vec2 densitySlope = vec2(dX, dY);
    float slopeMag = length(densitySlope);

    // Dynamic slope and bounds intensity profile for art directed scaling
    float slopeFactor = smoothstep(0.02, 0.45, slopeMag);
    float boundsFactor = smoothstep(0.005, 0.35, mainDensity) * (1.0 - smoothstep(0.35, 0.9, mainDensity));
    float trailEdgeIntensity = max(slopeFactor, boundsFactor);

    // Smoothstep gradient specifically targeting the fluid rims / edges
    float rimGradient = smoothstep(0.01, 0.25, mainDensity) * (1.0 - smoothstep(0.25, 0.85, mainDensity));

    // 9-Tap Gaussian Kernel offsets and weights
    vec2 tapOffsets[9];
    tapOffsets[0] = vec2(-1.0, -1.0);
    tapOffsets[1] = vec2( 0.0, -1.0);
    tapOffsets[2] = vec2( 1.0, -1.0);
    tapOffsets[3] = vec2(-1.0,  0.0);
    tapOffsets[4] = vec2( 0.0,  0.0);
    tapOffsets[5] = vec2( 1.0,  0.0);
    tapOffsets[6] = vec2(-1.0,  1.0);
    tapOffsets[7] = vec2( 0.0,  1.0);
    tapOffsets[8] = vec2( 1.0,  1.0);

    float weights[9];
    weights[0] = 0.0625;
    weights[1] = 0.1250;
    weights[2] = 0.0625;
    weights[3] = 0.1250;
    weights[4] = 0.2500;
    weights[5] = 0.1250;
    weights[6] = 0.0625;
    weights[7] = 0.1250;
    weights[8] = 0.0625;

    // Distortion blur radius increases along the rims/slopes/bounds via spatial density gradient
    float velMag = length(mainVel);
    float baseBlur = 0.0018;
    float edgeBlurBoost = 0.015 * trailEdgeIntensity;
    float velocityBlurBoost = velMag * 0.014;
    float rimBlurRadius = (baseBlur + edgeBlurBoost + velocityBlurBoost) * mask;

    vec3 accumulatedColor = vec3(0.0);

    for (int i = 0; i < 9; i++) {
      // 9-Tap high-frequency blue noise jitter offset, amplified on slopes and bounds
      vec2 noiseUV = uv * 480.0 + tapOffsets[i] * 13.37;
      float jitterStrength = 0.0022 + 0.0055 * trailEdgeIntensity;
      vec2 jitter = (hash22(noiseUV) - 0.5) * jitterStrength;

      vec2 sampleUv = clamp(uv + tapOffsets[i] * rimBlurRadius + jitter, 0.0, 1.0);
      vec4 tapFluid = texture2D(tFluid, sampleUv);
      vec2 tapVel = (tapFluid.rg - 0.5) * 2.0;
      float tapDensity = tapFluid.b;

      // Soft rim refraction displacement, significantly amplified on slopes and bounds
      float refractStrength = 0.12 + 0.32 * trailEdgeIntensity;
      vec2 refractOffset = tapVel * refractStrength * tapDensity * mask;
      float tapVelMag = length(tapVel);

      // Art directed chromatic dispersion (RGB shift) increased significantly on trail slopes and bounds
      float baseDispersion = 0.04;
      float edgeDispersionBoost = 0.11 * trailEdgeIntensity;
      float shiftScale = (baseDispersion + edgeDispersionBoost) * (tapVelMag + 0.08);

      vec2 offsetR = refractOffset * (1.0 + shiftScale);
      vec2 offsetG = refractOffset;
      vec2 offsetB = refractOffset * (1.0 - shiftScale);

      float r = texture2D(inputBuffer, clamp(uv + offsetR + jitter, 0.0, 1.0)).r;
      float g = texture2D(inputBuffer, clamp(uv + offsetG + jitter, 0.0, 1.0)).g;
      float b = texture2D(inputBuffer, clamp(uv + offsetB + jitter, 0.0, 1.0)).b;

      accumulatedColor += vec3(r, g, b) * weights[i];
    }

    outputColor = vec4(accumulatedColor, inputColor.a);
  }
`;

export const FluidDistortion: React.FC<FluidDistortionProps> = ({
  children,
  radius = 0.065,
  strength = 4.5,
  dissipation = 0.96,
  mixRatio = 0.88,
}) => {
  const { size, gl } = useThree();

  // Resolution setup as defined by Lusion: Paint FBO (~ 1/4 screen) & Low-Res FBO (~ 1/8 screen)
  const paintWidth = Math.max(128, Math.round(size.width / 4));
  const paintHeight = Math.max(128, Math.round(size.height / 4));
  const lowResWidth = Math.max(64, Math.round(paintWidth / 2));
  const lowResHeight = Math.max(64, Math.round(paintHeight / 2));

  const fboOptions = useMemo(() => ({
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType, // Compact 8-bit texture
  }), []);

  const paintTargetA = useFBO(paintWidth, paintHeight, fboOptions);
  const paintTargetB = useFBO(paintWidth, paintHeight, fboOptions);
  const lowResTargetA = useFBO(lowResWidth, lowResHeight, fboOptions);
  const lowResTargetB = useFBO(lowResWidth, lowResHeight, fboOptions);

  const currentPaint = useRef(paintTargetA);
  const prevPaint = useRef(paintTargetB);
  const currentLowRes = useRef(lowResTargetA);
  const prevLowRes = useRef(lowResTargetB);

  // Shader Materials
  const paintMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      tLowRes: { value: null },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPrevPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uVelocity: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uRadius: { value: radius },
      uStrength: { value: strength },
      uDissipation: { value: dissipation },
      uMixRatio: { value: mixRatio },
      uAspect: { value: size.width / Math.max(size.height, 1) },
      uActive: { value: 0.0 },
    },
    vertexShader: COMMON_VERT,
    fragmentShader: PAINT_FRAG,
  }), []);

  const blurMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      tPaint: { value: null },
      uTexelSize: { value: new THREE.Vector2(1 / paintWidth, 1 / paintHeight) },
    },
    vertexShader: COMMON_VERT,
    fragmentShader: BLUR_FRAG,
  }), [paintWidth, paintHeight]);

  const paintQuad = useMemo(() => {
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), paintMaterial);
  }, [paintMaterial]);

  const blurQuad = useMemo(() => {
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial);
  }, [blurMaterial]);

  const orthographicCamera = useMemo(() => {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }, []);

  const pointer = useRef(new THREE.Vector2(0.5, 0.5));
  const prevPointer = useRef(new THREE.Vector2(0.5, 0.5));
  const isDown = useRef(false);
  const activeLerp = useRef(0);

  useEffect(() => {
    paintMaterial.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
    blurMaterial.uniforms.uTexelSize.value.set(1 / lowResWidth, 1 / lowResHeight);
  }, [size, paintMaterial, blurMaterial, lowResWidth, lowResHeight]);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = () => (isDown.current = true);
    const onUp = () => (isDown.current = false);
    
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onUp);
    
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onUp);
    };
  }, [gl]);

  useFrame((state) => {
    // Track pointer in normalized screen coordinates [0..1, 0..1]
    pointer.current.set(
      (state.pointer.x + 1) / 2,
      (state.pointer.y + 1) / 2
    );

    const velocity = new THREE.Vector2().subVectors(pointer.current, prevPointer.current);
    
    // Smooth transition for active drag state
    activeLerp.current = THREE.MathUtils.lerp(activeLerp.current, isDown.current ? 1 : 0, 0.15);

    // Pass 1: Paint Pass (mouse input + velocity impulse + carry previous low-res velocity)
    paintMaterial.uniforms.tLowRes.value = prevLowRes.current.texture;
    paintMaterial.uniforms.uPointer.value.copy(pointer.current);
    paintMaterial.uniforms.uPrevPointer.value.copy(prevPointer.current);
    paintMaterial.uniforms.uVelocity.value.copy(velocity);
    paintMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    paintMaterial.uniforms.uRadius.value = radius;
    paintMaterial.uniforms.uStrength.value = strength;
    paintMaterial.uniforms.uDissipation.value = dissipation;
    paintMaterial.uniforms.uMixRatio.value = mixRatio;
    paintMaterial.uniforms.uActive.value = activeLerp.current;

    state.gl.setRenderTarget(currentPaint.current);
    state.gl.render(paintQuad, orthographicCamera);

    // Pass 2: Downsample/Blur Pass (Blur current paint result into lower res target for next frame's carry-over)
    blurMaterial.uniforms.tPaint.value = currentPaint.current.texture;
    state.gl.setRenderTarget(currentLowRes.current);
    state.gl.render(blurQuad, orthographicCamera);
    state.gl.setRenderTarget(null);

    // Ping-Pong Swaps
    const tempPaint = currentPaint.current;
    currentPaint.current = prevPaint.current;
    prevPaint.current = tempPaint;

    const tempLowRes = currentLowRes.current;
    currentLowRes.current = prevLowRes.current;
    prevLowRes.current = tempLowRes;

    prevPointer.current.copy(pointer.current);
  });

  return <>{children(prevPaint.current.texture)}</>;
};


