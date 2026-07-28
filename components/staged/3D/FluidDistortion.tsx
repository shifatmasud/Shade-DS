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
  /** Curl noise strength (default: 0.25) */
  curlStrength?: number;
  /** Curl noise frequency (default: 3.5) */
  curlFreq?: number;
}

const MAX_TOUCHES = 5;

const COMMON_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Pass 1: Paint Pass Shader (Multi-touch 2D distance field + velocity impulse, back-advect and mix with carried low-res velocity)
const PAINT_FRAG = `
  #define MAX_TOUCHES 5
  uniform sampler2D tLowRes;
  uniform sampler2D uNoiseTex;
  uniform vec2 uPointer[MAX_TOUCHES];
  uniform vec2 uMidPointer[MAX_TOUCHES];
  uniform vec2 uPrevPointer[MAX_TOUCHES];
  uniform vec2 uVelocity[MAX_TOUCHES];
  uniform float uActive[MAX_TOUCHES];
  uniform float uTime;
  uniform float uRadius;
  uniform float uStrength;
  uniform float uDissipation;
  uniform float uMixRatio;
  uniform float uAspect;
  uniform float uCurlStrength;
  uniform float uCurlFreq;
  varying vec2 vUv;

  // Replaced procedural Simplex Noise math with pre-baked 32x32 noise texture lookup
  float snoise(vec2 v) {
    return texture2D(uNoiseTex, v).r * 2.0 - 1.0;
  }

  // Custom liquid potential function that generates marbled, ridged, stream-aligned patterns
  float liquidPotential(vec2 p, float time, float freq, float stretch) {
    vec2 coord = p * freq;
    coord.x += sin(p.y * 3.0 + time * 0.2) * 0.15 * stretch;
    coord.y += cos(p.x * 3.0 + time * 0.15) * 0.15 * stretch;
    
    vec2 tOffset = vec2(time * 0.1, time * 0.06);
    float n = snoise(coord + tOffset);
    return sin(n * 4.0 + time * 0.3);
  }

  vec2 liquidCurlNoise(vec2 p, float time, float freq, float stretch) {
    float eps = 0.015;
    
    float valR = liquidPotential(p + vec2(eps, 0.0), time, freq, stretch);
    float valL = liquidPotential(p - vec2(eps, 0.0), time, freq, stretch);
    float valU = liquidPotential(p + vec2(0.0, eps), time, freq, stretch);
    float valD = liquidPotential(p - vec2(0.0, eps), time, freq, stretch);
    
    float d_dx = (valR - valL) / (2.0 * eps);
    float d_dy = (valU - valD) / (2.0 * eps);
    
    return vec2(d_dy, -d_dx);
  }

  // Segment distance fallback function
  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000001), 0.0, 1.0);
    return length(pa - ba * h);
  }

  // Quadratic Bezier distance function for curved liquid trajectory
  float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {    
    vec2 a = B - A;
    vec2 b = A - 2.0*B + C;
    vec2 c = a * 2.0;
    vec2 d = A - pos;

    float bb = dot(b,b);
    if (bb < 0.000001) {
      return sdSegment(pos, A, C);
    }

    float kk = 1.0 / bb;
    float kx = kk * dot(a,b);
    float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
    float kz = kk * dot(d,a);      

    float res = 0.0;

    float p = ky - kx*kx;
    float p3 = p*p*p;
    float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
    float h = q*q + 4.0*p3;

    if(h >= 0.0) { 
      float hf = sqrt(h);
      vec2 x = (vec2(hf, -hf) - q) / 2.0;
      vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
      float t = clamp(uv.x + uv.y - kx, 0.0, 1.0);
      vec2 qpos = d + (c + b*t)*t;
      res = dot(qpos,qpos);
    } else {
      float z = sqrt(-p);
      float v = acos( clamp(q/(p*z*2.0), -1.0, 1.0) ) / 3.0;
      float m = cos(v);
      float n = sin(v)*1.732050808;
      vec3 t = clamp(vec3(m+m, -n-m, n-m)*z - kx, 0.0, 1.0);
      vec2 qpos1 = d + (c + b*t.x)*t.x;
      vec2 qpos2 = d + (c + b*t.y)*t.y;
      vec2 qpos3 = d + (c + b*t.z)*t.z;
      res = min(min(dot(qpos1,qpos1), dot(qpos2,qpos2)), dot(qpos3,qpos3));
    }

    return sqrt(res);
  }

  void main() {
    // 1. Back-advect UV coordinate along low-res velocity field for natural fluid flow
    vec4 lowResRaw = texture2D(tLowRes, vUv);
    vec2 lowResVel = (lowResRaw.rg - 0.5) * 2.0;

    // 2. Spatial density gradient from low-res texture
    float dX = texture2D(tLowRes, vUv + vec2(0.008, 0.0)).b - texture2D(tLowRes, vUv - vec2(0.008, 0.0)).b;
    float dY = texture2D(tLowRes, vUv + vec2(0.0, 0.008)).b - texture2D(tLowRes, vUv - vec2(0.0, 0.008)).b;
    vec2 densitySlope = vec2(dX, dY);
    float slopeMag = length(densitySlope);
    float trailEdgeFactor = smoothstep(0.01, 0.35, slopeMag);

    vec2 p = vUv;
    p.x *= uAspect;

    // Fetch previous low-res density to calculate dissipation area
    vec4 prevLowResRaw = texture2D(tLowRes, vUv);
    float prevDensity = prevLowResRaw.b;

    // Accumulate multi-touch splats and velocity impulses
    float splat = 0.0;
    float maxActive = 0.0;
    vec2 totalPointerVel = vec2(0.0);

    for (int i = 0; i < MAX_TOUCHES; i++) {
      float act = uActive[i];
      if (act > 0.001) {
        vec2 a = uPrevPointer[i];
        a.x *= uAspect;
        vec2 mid = uMidPointer[i];
        mid.x *= uAspect;
        vec2 b = uPointer[i];
        b.x *= uAspect;

        float distClean = sdBezier(p, a, mid, b);
        float rad = uRadius * mix(1.0, 1.5, act);
        float rNorm = clamp(distClean / max(rad, 0.0001), 0.0, 1.0);
        float s_i = 1.0 - rNorm * rNorm;
        s_i = s_i * s_i;

        splat = max(splat, s_i);
        maxActive = max(maxActive, act);

        vec2 pointerVel_i = uVelocity[i] * uStrength * mix(2.5, 5.2, act);

        vec2 segDir = b - a;
        float segLen = length(segDir);
        vec2 wakeVorticity_i = vec2(0.0);
        if (segLen > 0.00001) {
          vec2 normDir = segDir / segLen;
          vec2 normPerp = vec2(-normDir.y, normDir.x);
          vec2 pa = p - a;
          float side = sign(dot(pa, normPerp));

          float vortexFalloff = exp(-distClean * 18.0 / max(rad, 0.001));
          vec2 dipole = normPerp * side * vortexFalloff * segLen * 12.0 * sin(distClean * 28.0 - uTime * 5.0);
          vec2 serpentine = normPerp * sin(dot(pa, normDir) * 38.0 - uTime * 6.0) * vortexFalloff * 0.45;

          wakeVorticity_i = dipole + serpentine;
        }

        totalPointerVel += (pointerVel_i + wakeVorticity_i) * s_i;
      }
    }

    float activeVal = maxActive;

    // Dissipation area mask: high in aging/advected wake, low in active fresh trailing area
    float activeTrailMask = clamp(splat * mix(1.0, 1.25, activeVal), 0.0, 1.0);
    float dissipationArea = clamp(prevDensity * (1.0 - activeTrailMask * 0.9), 0.0, 1.0);

    // 1. Hydrodynamic domain warping
    float speed = length(totalPointerVel);
    vec2 flowDir = speed > 0.0001 ? totalPointerVel / speed : vec2(1.0, 0.0);
    vec2 perpDir = vec2(-flowDir.y, flowDir.x);

    // Multi-octave liquid turbulence field
    float n1 = snoise(vUv * uCurlFreq * 2.2 + vec2(uTime * 0.7, uTime * 0.4));
    float n2 = snoise(vUv * uCurlFreq * 4.8 - vec2(uTime * 1.1, uTime * 0.8));

    // Serpentine liquid surface wave undulation
    float waveUndulation = sin(dot(p, flowDir) * 35.0 - uTime * 6.5) * cos(dot(p, perpDir) * 22.0 + uTime * 4.2);

    // Swirling rotational noise for dissipation domain warping
    float swirlAngle = snoise(vUv * 3.2 + uTime * 0.6) * 6.28318;
    vec2 swirlDomainVec = vec2(cos(swirlAngle), sin(swirlAngle));

    // Combined domain offset: strictly concentrated in dissipation area
    float curlMult = max(uCurlStrength, 0.0) / 0.25;
    vec2 fluidDomainOffset = (perpDir * (n1 * 0.045 + waveUndulation * 0.028) + flowDir * (n2 * 0.03) + swirlDomainVec * 0.035) * (1.0 + curlMult * 0.9);
    vec2 pWarp = p + fluidDomainOffset * dissipationArea;

    float localSplatEdge = smoothstep(0.05, 0.5, splat) * (1.0 - smoothstep(0.5, 0.95, splat));
    float totalSlopesFactor = max(trailEdgeFactor, localSplatEdge);

    // 2. Liquid-directed curl noise with stream-aligned stretching
    float flowSpeed = length(lowResVel);
    float flowStretch = clamp(flowSpeed * 5.0, 0.0, 1.5);
    
    vec2 curl1 = liquidCurlNoise(vUv, uTime, uCurlFreq, 1.0 + flowStretch);
    vec2 curl2 = liquidCurlNoise(vUv, uTime * 1.5, uCurlFreq * 2.2, 0.5 + flowStretch * 0.5);
    vec2 combinedCurl = curl1 * 0.7 + curl2 * 0.3;

    // Curl noise injection
    float baseCurlStrength = 0.01 * curlMult;
    float dissipationCurlBoost = 0.35 * dissipationArea * curlMult;
    float edgeCurlBoost = 0.18 * totalSlopesFactor * dissipationArea * curlMult;
    
    vec2 injectedCurl = combinedCurl * (baseCurlStrength + dissipationCurlBoost + edgeCurlBoost);

    // 3. Wind Force Motion in Dissipation Area
    vec2 baseWindDir = normalize(vec2(0.4, 0.7) + vec2(sin(uTime * 0.3) * 0.25, cos(uTime * 0.25) * 0.2));
    float windNoise = snoise(vUv * 2.8 + vec2(uTime * 0.35, -uTime * 0.25)) * 0.5 + 0.5;
    vec2 windForce = baseWindDir * (0.018 + windNoise * 0.032) * dissipationArea;

    // 4. Back-advect density and velocity along separate paths with wind force
    vec2 advectVelUv = vUv - (lowResVel + injectedCurl + windForce) * 0.014;
    vec2 advectDensityUv = vUv - (lowResVel + windForce * 0.8) * 0.014;

    vec4 velSample = texture2D(tLowRes, clamp(advectVelUv, 0.0, 1.0));
    vec4 densitySample = texture2D(tLowRes, clamp(advectDensityUv, 0.0, 1.0));

    vec2 prevVel = (velSample.rg - 0.5) * 2.0;
    float advectedDensity = densitySample.b * (uDissipation * 0.985);

    vec2 inputVel = totalPointerVel;

    // Advect and dissipate previous velocity
    vec2 advectedVel = prevVel * uDissipation;

    // Combine input velocity, back-advected fluid momentum, and wind force
    vec2 mixedVel = advectedVel + inputVel * 3.2 + windForce * 1.5;

    // Organic micro-turbulence noise
    float noise = sin(vUv.x * 35.0 + uTime * 3.0) * cos(vUv.y * 35.0 + uTime * 3.0) * 0.0015;
    mixedVel += vec2(noise, -noise);

    // Clamp speed for numerical stability
    float speedCap = length(mixedVel);
    if (speedCap > 1.35) {
      mixedVel = (mixedVel / speedCap) * 1.35;
    }

    // Combine fluid density with liquid threshold profile
    float newDensity = splat * mix(0.85, 1.0, activeVal);
    float finalDensity = clamp(max(advectedDensity, newDensity), 0.0, 1.0);

    // Output 8-bit packed velocity into RG channels, density into B channel
    gl_FragColor = vec4(mixedVel * 0.5 + 0.5, finalDensity, 1.0);
  }
`;

// Pass 2: Downsample / Blur Pass Shader
const BLUR_FRAG = `
  uniform sampler2D tPaint;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
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

// Post-Processing Refraction Shader
export const DISTORTION_FRAG = `
  uniform sampler2D tFluid;
  uniform float uRefractStrength;
  uniform float uDispersionScale;
  uniform float uBlurRadius;
  uniform float uJitterStrength;

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 fluidSample = texture2D(tFluid, uv);
    float mainDensity = fluidSample.b;

    if (mainDensity < 0.0005) {
      outputColor = inputColor;
      return;
    }

    float mask = smoothstep(0.0001, 0.25, mainDensity);
    vec2 mainVel = (fluidSample.rg - 0.5) * 2.0;

    float dX = texture2D(tFluid, uv + vec2(0.003, 0.0)).b - texture2D(tFluid, uv - vec2(0.003, 0.0)).b;
    float dY = texture2D(tFluid, uv + vec2(0.0, 0.003)).b - texture2D(tFluid, uv - vec2(0.0, 0.003)).b;
    vec2 densitySlope = vec2(dX, dY);
    float slopeMag = length(densitySlope);

    float slopeFactor = smoothstep(0.02, 0.45, slopeMag);
    float boundsFactor = smoothstep(0.005, 0.35, mainDensity) * (1.0 - smoothstep(0.35, 0.9, mainDensity));
    float trailEdgeIntensity = max(slopeFactor, boundsFactor);

    // 9-tap kernel offsets (3x3 grid)
    vec2 tapOffsets[9];
    tapOffsets[0] = vec2( 0.0,  0.0);
    tapOffsets[1] = vec2(-1.0,  0.0);
    tapOffsets[2] = vec2( 1.0,  0.0);
    tapOffsets[3] = vec2( 0.0, -1.0);
    tapOffsets[4] = vec2( 0.0,  1.0);
    tapOffsets[5] = vec2(-1.0, -1.0);
    tapOffsets[6] = vec2( 1.0, -1.0);
    tapOffsets[7] = vec2(-1.0,  1.0);
    tapOffsets[8] = vec2( 1.0,  1.0);

    // 9-tap Gaussian kernel weights
    float weights[9];
    weights[0] = 0.25;
    weights[1] = 0.125;
    weights[2] = 0.125;
    weights[3] = 0.125;
    weights[4] = 0.125;
    weights[5] = 0.0625;
    weights[6] = 0.0625;
    weights[7] = 0.0625;
    weights[8] = 0.0625;

    float velMag = length(mainVel);
    float blurMult = max(uBlurRadius, 0.0) / 0.012;
    float baseBlur = 0.0018 * blurMult;
    float edgeBlurBoost = 0.015 * trailEdgeIntensity * blurMult;
    float velocityBlurBoost = velMag * 0.014 * blurMult;
    float rimBlurRadius = (baseBlur + edgeBlurBoost + velocityBlurBoost) * mask;

    float jitterMult = max(uJitterStrength, 0.0) / 0.005;
    float refractMult = max(uRefractStrength, 0.0) / 0.35;
    float dispersionMult = max(uDispersionScale, 0.0) / 0.15;

    vec3 accumulatedColor = vec3(0.0);

    // RGB Chromatic Dispersion Mixer pass followed by 9-tap blur pass & 9-tap blue noise jitter pass
    for (int i = 0; i < 9; i++) {
      vec2 noiseUV = uv * 480.0 + tapOffsets[i] * 13.37;
      float jitterVal = (0.0022 + 0.0055 * trailEdgeIntensity) * jitterMult;
      vec2 jitter = (hash22(noiseUV) - 0.5) * jitterVal;

      vec2 sampleUv = clamp(uv + tapOffsets[i] * rimBlurRadius, 0.0, 1.0);
      vec4 tapFluid = texture2D(tFluid, sampleUv);
      vec2 tapVel = (tapFluid.rg - 0.5) * 2.0;
      float tapDensity = tapFluid.b;

      float refractVal = (0.12 + 0.32 * trailEdgeIntensity) * refractMult;
      vec2 refractOffset = tapVel * refractVal * tapDensity * mask;
      float tapVelMag = length(tapVel);

      float baseDispersion = 0.04 * dispersionMult;
      float edgeDispersionBoost = 0.11 * trailEdgeIntensity * dispersionMult;
      float shiftScale = (baseDispersion + edgeDispersionBoost) * (tapVelMag + 0.08);

      vec2 appliedJitter = jitter * mask;
      vec2 offsetR = refractOffset * (1.0 + shiftScale) + appliedJitter;
      vec2 offsetG = refractOffset + appliedJitter;
      vec2 offsetB = refractOffset * (1.0 - shiftScale) + appliedJitter;

      float r = texture2D(inputBuffer, clamp(uv + offsetR, 0.0, 1.0)).r;
      float g = texture2D(inputBuffer, clamp(uv + offsetG, 0.0, 1.0)).g;
      float b = texture2D(inputBuffer, clamp(uv + offsetB, 0.0, 1.0)).b;

      accumulatedColor += vec3(r, g, b) * weights[i];
    }

    outputColor = vec4(accumulatedColor, inputColor.a);
  }
`;

interface TouchSlot {
  id: number;
  pointer: THREE.Vector2;
  midPointer: THREE.Vector2;
  prevPointer: THREE.Vector2;
  prev2Pointer: THREE.Vector2;
  velocity: THREE.Vector2;
  active: boolean;
  activeLerp: number;
}

// Pre-calculate 32x32 noise lookup texture DataTexture
const create32x32NoiseTexture = (): THREE.DataTexture => {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;

      const nx = Math.sin(u * Math.PI * 2);
      const ny = Math.cos(v * Math.PI * 2);
      const nx2 = Math.sin(u * Math.PI * 4 + 1.2);
      const ny2 = Math.sin(v * Math.PI * 4 + 0.7);
      const nx3 = Math.cos(u * Math.PI * 6 - 0.8);
      const ny3 = Math.cos(v * Math.PI * 6 + 1.5);

      const nVal = (nx * ny + nx2 * ny2 * 0.5 + nx3 * ny3 * 0.25) / 1.75;
      const nValScaled = nVal * 0.5 + 0.5;

      const gx = Math.cos(u * Math.PI * 2 + 0.5);
      const gy = Math.sin(v * Math.PI * 2 + 1.1);
      const gx2 = Math.sin(u * Math.PI * 4 - 0.4);
      const gy2 = Math.cos(v * Math.PI * 4 + 0.3);
      const gVal = (gx * gy + gx2 * gy2 * 0.5) / 1.5;
      const gValScaled = gVal * 0.5 + 0.5;

      data[idx]     = Math.floor(Math.max(0, Math.min(255, nValScaled * 255)));
      data[idx + 1] = Math.floor(Math.max(0, Math.min(255, gValScaled * 255)));
      data[idx + 2] = Math.floor(Math.max(0, Math.min(255, nValScaled * 255)));
      data[idx + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

// Capped fixed FBO resolutions for fluid simulation passes
const PAINT_WIDTH = 128;
const PAINT_HEIGHT = 128;
const LOW_RES_WIDTH = 64;
const LOW_RES_HEIGHT = 64;

export const FluidDistortion: React.FC<FluidDistortionProps> = ({
  children,
  radius = 0.065,
  strength = 4.5,
  dissipation = 0.96,
  mixRatio = 0.88,
  curlStrength = 0.25,
  curlFreq = 3.5,
}) => {
  const { size, gl } = useThree();

  const noiseTexture = useMemo(() => create32x32NoiseTexture(), []);

  const fboOptions = useMemo(() => ({
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  }), []);

  // Capped fixed FBO target allocation (128x128 for paint, 64x64 for lowRes)
  const paintTargetA = useFBO(PAINT_WIDTH, PAINT_HEIGHT, fboOptions);
  const paintTargetB = useFBO(PAINT_WIDTH, PAINT_HEIGHT, fboOptions);
  const lowResTargetA = useFBO(LOW_RES_WIDTH, LOW_RES_HEIGHT, fboOptions);
  const lowResTargetB = useFBO(LOW_RES_WIDTH, LOW_RES_HEIGHT, fboOptions);

  const currentPaint = useRef(paintTargetA);
  const prevPaint = useRef(paintTargetB);
  const currentLowRes = useRef(lowResTargetA);
  const prevLowRes = useRef(lowResTargetB);

  const touchSlots = useRef<TouchSlot[]>(
    Array.from({ length: MAX_TOUCHES }, () => ({
      id: -1,
      pointer: new THREE.Vector2(0.5, 0.5),
      midPointer: new THREE.Vector2(0.5, 0.5),
      prevPointer: new THREE.Vector2(0.5, 0.5),
      prev2Pointer: new THREE.Vector2(0.5, 0.5),
      velocity: new THREE.Vector2(0, 0),
      active: false,
      activeLerp: 0,
    }))
  );

  const uPointerArray = useMemo(() => Array.from({ length: MAX_TOUCHES }, () => new THREE.Vector2(0.5, 0.5)), []);
  const uMidPointerArray = useMemo(() => Array.from({ length: MAX_TOUCHES }, () => new THREE.Vector2(0.5, 0.5)), []);
  const uPrevPointerArray = useMemo(() => Array.from({ length: MAX_TOUCHES }, () => new THREE.Vector2(0.5, 0.5)), []);
  const uVelocityArray = useMemo(() => Array.from({ length: MAX_TOUCHES }, () => new THREE.Vector2(0, 0)), []);
  const uActiveArray = useMemo(() => new Float32Array(MAX_TOUCHES), []);

  const paintMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      tLowRes: { value: null },
      uNoiseTex: { value: noiseTexture },
      uPointer: { value: uPointerArray },
      uMidPointer: { value: uMidPointerArray },
      uPrevPointer: { value: uPrevPointerArray },
      uVelocity: { value: uVelocityArray },
      uActive: { value: uActiveArray },
      uTime: { value: 0 },
      uRadius: { value: radius },
      uStrength: { value: strength },
      uDissipation: { value: dissipation },
      uMixRatio: { value: mixRatio },
      uAspect: { value: size.width / Math.max(size.height, 1) },
      uCurlStrength: { value: curlStrength },
      uCurlFreq: { value: curlFreq },
    },
    vertexShader: COMMON_VERT,
    fragmentShader: PAINT_FRAG,
  }), [noiseTexture]);

  const blurMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      tPaint: { value: null },
      uTexelSize: { value: new THREE.Vector2(1 / PAINT_WIDTH, 1 / PAINT_HEIGHT) },
    },
    vertexShader: COMMON_VERT,
    fragmentShader: BLUR_FRAG,
  }), []);

  const paintQuad = useMemo(() => {
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), paintMaterial);
  }, [paintMaterial]);

  const blurQuad = useMemo(() => {
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial);
  }, [blurMaterial]);

  const orthographicCamera = useMemo(() => {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }, []);

  useEffect(() => {
    paintMaterial.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
    blurMaterial.uniforms.uTexelSize.value.set(1 / LOW_RES_WIDTH, 1 / LOW_RES_HEIGHT);
  }, [size, paintMaterial, blurMaterial]);

  useEffect(() => {
    const el = gl.domElement;

    const normalizeCoord = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = 1.0 - (clientY - rect.top) / rect.height;
      return { nx, ny };
    };

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const { nx, ny } = normalizeCoord(touch.clientX, touch.clientY);
        
        let slot = touchSlots.current.find((s) => s.id === touch.identifier);
        if (!slot) {
          slot = touchSlots.current.find((s) => !s.active || s.id === -1);
        }
        if (slot) {
          slot.id = touch.identifier;
          slot.pointer.set(nx, ny);
          // CRITICAL: Reset history on new touch so click starts new trail without jump vector
          slot.prevPointer.set(nx, ny);
          slot.prev2Pointer.set(nx, ny);
          slot.midPointer.set(nx, ny);
          slot.velocity.set(0, 0);
          slot.active = true;
          slot.activeLerp = 1.0;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.targetTouches.length; i++) {
        const touch = e.targetTouches[i];
        const { nx, ny } = normalizeCoord(touch.clientX, touch.clientY);
        const slot = touchSlots.current.find((s) => s.id === touch.identifier);
        if (slot) {
          slot.pointer.set(nx, ny);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const slot = touchSlots.current.find((s) => s.id === touch.identifier);
        if (slot) {
          slot.active = false;
          slot.id = -1;
        }
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        const { nx, ny } = normalizeCoord(e.clientX, e.clientY);
        const slot = touchSlots.current[0];
        slot.id = e.pointerId;
        slot.pointer.set(nx, ny);
        // CRITICAL: Reset history on new click so click starts new trail without jump vector
        slot.prevPointer.set(nx, ny);
        slot.prev2Pointer.set(nx, ny);
        slot.midPointer.set(nx, ny);
        slot.velocity.set(0, 0);
        slot.active = true;
        slot.activeLerp = 1.0;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        const slot = touchSlots.current[0];
        slot.active = false;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointerleave', handlePointerUp);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [gl]);

  useFrame((state) => {
    // If no touch active, slot 0 tracks mouse position
    const hasActiveTouch = touchSlots.current.some((s) => s.active && s.id !== -1);
    if (!hasActiveTouch) {
      const slot0 = touchSlots.current[0];
      const targetX = (state.pointer.x + 1) / 2;
      const targetY = (state.pointer.y + 1) / 2;

      const dist = slot0.pointer.distanceTo(new THREE.Vector2(targetX, targetY));
      if (dist > 0.35) {
        // Pointer jump detected: reset history
        slot0.prevPointer.set(targetX, targetY);
        slot0.prev2Pointer.set(targetX, targetY);
      }

      slot0.pointer.set(targetX, targetY);
      slot0.activeLerp = THREE.MathUtils.lerp(slot0.activeLerp, 0.8, 0.15);
    }

    // Process all touch slots
    for (let i = 0; i < MAX_TOUCHES; i++) {
      const slot = touchSlots.current[i];

      if (!slot.active && hasActiveTouch) {
        slot.activeLerp = THREE.MathUtils.lerp(slot.activeLerp, 0, 0.15);
      }

      const delta1 = new THREE.Vector2().subVectors(slot.pointer, slot.prevPointer);
      const delta2 = new THREE.Vector2().subVectors(slot.prevPointer, slot.prev2Pointer);
      const curveOffset = delta1.clone().add(delta2).multiplyScalar(0.25);

      slot.midPointer.copy(slot.prevPointer).add(curveOffset);
      slot.velocity.copy(delta1);

      uPointerArray[i].copy(slot.pointer);
      uMidPointerArray[i].copy(slot.midPointer);
      uPrevPointerArray[i].copy(slot.prevPointer);
      uVelocityArray[i].copy(slot.velocity);
      uActiveArray[i] = slot.activeLerp;

      slot.prev2Pointer.copy(slot.prevPointer);
      slot.prevPointer.copy(slot.pointer);
    }

    // Pass 1: Paint Pass
    paintMaterial.uniforms.tLowRes.value = prevLowRes.current.texture;
    paintMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    paintMaterial.uniforms.uRadius.value = radius;
    paintMaterial.uniforms.uStrength.value = strength;
    paintMaterial.uniforms.uDissipation.value = dissipation;
    paintMaterial.uniforms.uMixRatio.value = mixRatio;
    paintMaterial.uniforms.uCurlStrength.value = curlStrength;
    paintMaterial.uniforms.uCurlFreq.value = curlFreq;

    state.gl.setRenderTarget(currentPaint.current);
    state.gl.render(paintQuad, orthographicCamera);

    // Pass 2: Downsample/Blur Pass
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
  });

  return <>{children(prevPaint.current.texture)}</>;
};
