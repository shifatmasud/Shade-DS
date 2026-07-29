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
  /** Temporal blend weight for density history (default: 0.3) */
  temporalBlend?: number;
  /** Subpixel blue noise jitter strength (default: 1.0) */
  jitterStrength?: number;
  /** Density history clamp threshold to prevent ghosting (default: 0.15) */
  historyClamp?: number;
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

  float snoise(vec2 v) {
    return texture2D(uNoiseTex, v).r * 2.0 - 1.0;
  }

  float liquidPotential(vec2 p, float time, float freq, float stretch) {
    // Smoother, larger frequency scale for gentle curls
    vec2 coord = p * freq * 0.7;
    coord.x += sin(p.y * 1.0 + time * 0.05) * 0.04;
    coord.y += cos(p.x * 1.0 + time * 0.04) * 0.04;
    
    vec2 tOffset = vec2(time * 0.02, time * 0.01);
    float n = snoise(coord + tOffset);
    return n * 1.2;
  }

  vec2 liquidCurlNoise(vec2 p, float time, float freq, float stretch) {
    // Larger epsilon acts as a spatial low-pass filter, making curl noise incredibly smooth and gentle
    float eps = 0.035;
    
    float valR = liquidPotential(p + vec2(eps, 0.0), time, freq, stretch);
    float valL = liquidPotential(p - vec2(eps, 0.0), time, freq, stretch);
    float valU = liquidPotential(p + vec2(0.0, eps), time, freq, stretch);
    float valD = liquidPotential(p - vec2(0.0, eps), time, freq, stretch);
    
    float d_dx = (valR - valL) / (2.0 * eps);
    float d_dy = (valU - valD) / (2.0 * eps);
    
    return vec2(d_dy, -d_dx) * 0.55;
  }

  float sdSegment(vec2 p, vec2 a, vec2 b, out float outT) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    outT = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000001), 0.0, 1.0);
    return length(pa - ba * outT);
  }

  float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C, out float outT) {    
    vec2 a = B - A;
    vec2 b = A - 2.0*B + C;
    vec2 c = a * 2.0;
    vec2 d = A - pos;

    float bb = dot(b,b);
    if (bb < 0.000001) {
      return sdSegment(pos, A, C, outT);
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
      outT = clamp(uv.x + uv.y - kx, 0.0, 1.0);
      vec2 qpos = d + (c + b*outT)*outT;
      res = dot(qpos,qpos);
    } else {
      float z = sqrt(-p);
      float v = acos( clamp(q/(p*z*2.0), -1.0, 1.0) ) / 3.0;
      float m = cos(v);
      float n = sin(v)*1.732050808;
      vec3 tVec = clamp(vec3(m+m, -n-m, n-m)*z - kx, 0.0, 1.0);
      vec2 qpos1 = d + (c + b*tVec.x)*tVec.x;
      vec2 qpos2 = d + (c + b*tVec.y)*tVec.y;
      vec2 qpos3 = d + (c + b*tVec.z)*tVec.z;
      float d1 = dot(qpos1,qpos1);
      float d2 = dot(qpos2,qpos2);
      float d3 = dot(qpos3,qpos3);
      if (d1 < d2 && d1 < d3) {
        res = d1;
        outT = tVec.x;
      } else if (d2 < d3) {
        res = d2;
        outT = tVec.y;
      } else {
        res = d3;
        outT = tVec.z;
      }
    }

    return sqrt(res);
  }

  void main() {
    // 1. Core Physical Semi-Lagrangian Back-Advection (Low Viscosity)
    vec4 lowResRaw = texture2D(tLowRes, vUv);
    vec2 lowResVel = (lowResRaw.rg - 0.5) * 2.0;

    // Trace back coordinate strictly based on low-res velocity field
    vec2 advectUv = vUv - lowResVel * 0.022;
    vec4 advectedSample = texture2D(tLowRes, clamp(advectUv, 0.0, 1.0));
    
    // Advect velocity with dissipation decay (low viscosity)
    vec2 advectedVel = (advectedSample.rg - 0.5) * 2.0 * uDissipation;
    // Advect fluid density
    float advectedDensity = advectedSample.b * uDissipation;

    vec2 p = vUv;
    p.x *= uAspect;

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

        float tSeg = 0.0;
        float distClean = sdBezier(p, a, mid, b, tSeg);
        
        // Dynamic taper: Brush path start is thinner than the trail end
        float radFactor = mix(0.45, 1.0, tSeg);
        float rad = uRadius * mix(1.0, 1.5, act) * radFactor;
        
        float rNorm = clamp(distClean / max(rad, 0.0001), 0.0, 1.0);
        float s_i = 1.0 - rNorm * rNorm;
        s_i = s_i * s_i;

        // Scale down splat density when cursor is stationary.
        // As speed goes to 0, splat intensity goes to 0, letting the existing fluid
        // naturally dissipate and be moved by wind and curl turbulence forces.
        float speed = length(uVelocity[i]);
        float splatIntensity = clamp(speed * 180.0, 0.0, 1.0);
        float s_i_density = s_i * splatIntensity;

        splat = max(splat, s_i_density);
        maxActive = max(maxActive, act);

        vec2 pointerVel_i = uVelocity[i] * uStrength * mix(2.5, 5.2, act);

        // Continuous steady wake that preserves path continuity without droplet breakup
        vec2 segDir = b - a;
        float segLen = length(segDir);
        vec2 wakeVorticity_i = vec2(0.0);
        if (segLen > 0.00001) {
          vec2 normDir = segDir / segLen;
          float vortexFalloff = exp(-distClean * 6.0 / max(rad, 0.001));
          
          // Uniform continuous flow: forward momentum and a slow, gentle swirl
          vec2 forwardThrust = normDir * segLen * 6.0;
          vec2 gentleSwirl = vec2(-normDir.y, normDir.x) * (snoise(vUv * 2.5 + uTime * 0.3) * 0.15) * segLen * 4.0;
          
          wakeVorticity_i = (forwardThrust + gentleSwirl) * vortexFalloff;
        }

        totalPointerVel += (pointerVel_i + wakeVorticity_i) * s_i;
      }
    }

    float activeVal = maxActive;

    // 2. Stream-Aligned Analytical Curl Noise
    float flowSpeed = length(advectedVel);
    float flowStretch = clamp(flowSpeed * 5.0, 0.0, 1.5);
    vec2 curl1 = liquidCurlNoise(vUv, uTime, uCurlFreq, 1.0 + flowStretch);
    vec2 curl2 = liquidCurlNoise(vUv, uTime * 1.5, uCurlFreq * 2.2, 0.5 + flowStretch * 0.5);
    vec2 combinedCurl = curl1 * 0.75 + curl2 * 0.25;

    // Inject curl noise directly into physical velocity
    float curlMult = max(uCurlStrength, 0.0);
    vec2 curlForce = combinedCurl * curlMult * 0.28;

    // 3. Smooth, gentle ambient wind force (drift) that moves fluid slowly in a natural direction,
    // ensuring that any static or decaying density/velocity field continues to move and disperse smoothly.
    vec2 windDir = normalize(vec2(0.35, 0.6) + vec2(sin(uTime * 0.15) * 0.12, cos(uTime * 0.1) * 0.12));
    float windNoise = snoise(vUv * 1.5 + vec2(uTime * 0.05, -uTime * 0.03)) * 0.5 + 0.5;
    vec2 windForce = windDir * (0.012 + windNoise * 0.018);

    // Combine advected velocity, pointer input velocity, curl force, and gentle wind drift
    vec2 mixedVel = advectedVel + totalPointerVel * 4.2 + curlForce + windForce;

    // Add subtle micro-turbulence noise for organic details
    float noise = sin(vUv.x * 35.0 + uTime * 3.0) * cos(vUv.y * 35.0 + uTime * 3.0) * 0.0015;
    mixedVel += vec2(noise, -noise);

    // Speed clamping for physical & numerical stability
    float speedCap = length(mixedVel);
    if (speedCap > 1.45) {
      mixedVel = (mixedVel / speedCap) * 1.45;
    }

    // 3. Fluid Density Update
    float newDensity = splat * mix(0.85, 1.0, activeVal);
    float finalDensity = clamp(max(advectedDensity, newDensity), 0.0, 1.0);

    // Pack 8-bit velocity into RG channels, fluid density into B channel
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

// Pass 3: Temporal Reconstruction Pass Shader (TAA style subpixel blue noise jitter & density history accumulation)
const TEMPORAL_RECONSTRUCT_FRAG = `
  uniform sampler2D tCurrent;
  uniform sampler2D tPrevious;
  uniform sampler2D uNoiseTex;
  uniform float uFrameIndex;
  uniform float uTemporalBlend;
  uniform float uJitterStrength;
  uniform float uHistoryClamp;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  void main() {
    // Blue noise temporal jitter
    vec2 noiseSeed = vUv * 240.0 + mod(uFrameIndex, 64.0);
    vec2 jitter = (hash22(noiseSeed) - 0.5) * uJitterStrength * uTexelSize;

    vec4 currentSample = texture2D(tCurrent, vUv);
    
    // Sample previous frame using jittered UV offset
    vec2 prevUv = clamp(vUv + jitter, 0.0, 1.0);
    vec4 prevSample = texture2D(tPrevious, prevUv);

    // Velocity: use current frame only (no temporal smoothing for instantaneous response)
    vec2 currentVel = currentSample.rg;

    // Density: apply temporal accumulation with history rejection & difference clamp
    float currentDensity = currentSample.b;
    float prevDensity = prevSample.b;

    float diff = abs(currentDensity - prevDensity);
    float weightReduction = smoothstep(uHistoryClamp * 0.5, uHistoryClamp * 2.0, diff);
    float historyWeight = uTemporalBlend * (1.0 - weightReduction);

    float reconstructedDensity = mix(currentDensity, prevDensity, historyWeight);

    gl_FragColor = vec4(currentVel, reconstructedDensity, 1.0);
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

    // Sharp threshold to define a well-bounded fluid trail zone
    float threshold = 0.08;
    float trailMask = smoothstep(threshold - 0.005, threshold + 0.005, mainDensity);

    // Strictly limit distortion to the inside of the trail zone
    // Absolutely NO neighbor elements outside the trail are distorted or blurred!
    if (trailMask < 0.001) {
      outputColor = inputColor;
      return;
    }

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
    
    // Uniform smooth blur across the fluid flow zone scaled by trailMask
    float rimBlurRadius = uBlurRadius * trailMask;

    float jitterMult = max(uJitterStrength, 0.0) / 0.005;
    float refractMult = max(uRefractStrength, 0.0) / 0.35;
    float dispersionMult = max(uDispersionScale, 0.0) / 0.15;

    vec3 accumulatedColor = vec3(0.0);

    // RGB Chromatic Dispersion Mixer pass followed by 9-tap blur pass & 9-tap blue noise jitter pass
    for (int i = 0; i < 9; i++) {
      vec2 noiseUV = uv * 480.0 + tapOffsets[i] * 13.37;
      float jitterVal = 0.004 * jitterMult;
      vec2 jitter = (hash22(noiseUV) - 0.5) * jitterVal;

      vec2 sampleUv = clamp(uv + tapOffsets[i] * rimBlurRadius, 0.0, 1.0);
      vec4 tapFluid = texture2D(tFluid, sampleUv);
      vec2 tapVel = (tapFluid.rg - 0.5) * 2.0;
      float tapDensity = tapFluid.b;

      // Boost refraction significantly at the edges where slopes are steep
      float refractVal = (0.24 + 1.25 * trailEdgeIntensity * (1.0 + slopeMag * 2.5)) * refractMult;
      // Refraction combines velocity flow and density slope normal for realistic water-lens effect.
      // -densitySlope pushes coordinates toward high-density areas (lensing magnification).
      // Refraction is scaled perfectly by trailMask to avoid any bleed outside.
      // We push the refraction vector to be heavily influenced by the slope gradients at the edges.
      vec2 refractOffset = (tapVel * 0.3 - densitySlope * (2.2 + slopeMag * 3.5)) * refractVal * tapDensity * trailMask;
      float tapVelMag = length(tapVel);

      float shiftScale = 0.06 * dispersionMult * (tapVelMag + 0.08);

      vec2 appliedJitter = jitter * trailMask;
      vec2 offsetR = refractOffset * (1.0 + shiftScale) + appliedJitter;
      vec2 offsetG = refractOffset + appliedJitter;
      vec2 offsetB = refractOffset * (1.0 - shiftScale) + appliedJitter;

      float r = texture2D(inputBuffer, clamp(uv + offsetR, 0.0, 1.0)).r;
      float g = texture2D(inputBuffer, clamp(uv + offsetG, 0.0, 1.0)).g;
      float b = texture2D(inputBuffer, clamp(uv + offsetB, 0.0, 1.0)).b;

      accumulatedColor += vec3(r, g, b) * weights[i];
    }

    // Blend the final refracted color with original background color using our sharp trailMask.
    // This gives beautifully anti-aliased crisp boundaries that isolate refraction inside the trail.
    outputColor = mix(inputColor, vec4(accumulatedColor, inputColor.a), trailMask);
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
  radius = 0.05,
  strength = 8,
  dissipation = 0.93,
  mixRatio = 0.88,
  curlStrength = 0.16,
  curlFreq = 1,
  temporalBlend = 0.3,
  jitterStrength = 1.0,
  historyClamp = 0.15,
}) => {
  const { size, gl } = useThree();

  const noiseTexture = useMemo(() => create32x32NoiseTexture(), []);

  const fboOptions = useMemo(() => ({
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  }), []);

  // Capped fixed FBO target allocation (128x128 for paint & temporal, 64x64 for lowRes)
  const paintTargetA = useFBO(PAINT_WIDTH, PAINT_HEIGHT, fboOptions);
  const paintTargetB = useFBO(PAINT_WIDTH, PAINT_HEIGHT, fboOptions);
  const lowResTargetA = useFBO(LOW_RES_WIDTH, LOW_RES_HEIGHT, fboOptions);
  const lowResTargetB = useFBO(LOW_RES_WIDTH, LOW_RES_HEIGHT, fboOptions);
  const temporalTargetA = useFBO(PAINT_WIDTH, PAINT_HEIGHT, fboOptions);
  const temporalTargetB = useFBO(PAINT_WIDTH, PAINT_HEIGHT, fboOptions);

  const currentPaint = useRef(paintTargetA);
  const prevPaint = useRef(paintTargetB);
  const currentLowRes = useRef(lowResTargetA);
  const prevLowRes = useRef(lowResTargetB);
  const currentReconstructed = useRef(temporalTargetA);
  const prevReconstructed = useRef(temporalTargetB);

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

  const temporalMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      tCurrent: { value: null },
      tPrevious: { value: null },
      uNoiseTex: { value: noiseTexture },
      uFrameIndex: { value: 0 },
      uTemporalBlend: { value: temporalBlend },
      uJitterStrength: { value: jitterStrength },
      uHistoryClamp: { value: historyClamp },
      uTexelSize: { value: new THREE.Vector2(1 / PAINT_WIDTH, 1 / PAINT_HEIGHT) },
    },
    vertexShader: COMMON_VERT,
    fragmentShader: TEMPORAL_RECONSTRUCT_FRAG,
  }), [noiseTexture, temporalBlend, jitterStrength, historyClamp]);

  const paintQuad = useMemo(() => {
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), paintMaterial);
  }, [paintMaterial]);

  const blurQuad = useMemo(() => {
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial);
  }, [blurMaterial]);

  const temporalQuad = useMemo(() => {
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), temporalMaterial);
  }, [temporalMaterial]);

  const orthographicCamera = useMemo(() => {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }, []);

  useEffect(() => {
    paintMaterial.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
    blurMaterial.uniforms.uTexelSize.value.set(1 / LOW_RES_WIDTH, 1 / LOW_RES_HEIGHT);
    temporalMaterial.uniforms.uTexelSize.value.set(1 / PAINT_WIDTH, 1 / PAINT_HEIGHT);
  }, [size, paintMaterial, blurMaterial, temporalMaterial]);

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

      const currentX = THREE.MathUtils.lerp(slot0.pointer.x, targetX, 0.25);
      const currentY = THREE.MathUtils.lerp(slot0.pointer.y, targetY, 0.25);
      slot0.pointer.set(currentX, currentY);
    }

    // Process all touch slots
    for (let i = 0; i < MAX_TOUCHES; i++) {
      const slot = touchSlots.current[i];

      const delta1 = new THREE.Vector2().subVectors(slot.pointer, slot.prevPointer);
      const delta2 = new THREE.Vector2().subVectors(slot.prevPointer, slot.prev2Pointer);
      const curveOffset = delta1.clone().add(delta2).multiplyScalar(0.25);

      slot.midPointer.copy(slot.prevPointer).add(curveOffset);

      const distMoved = delta1.length();
      const isHover = !hasActiveTouch && i === 0;
      const isActive = slot.active || isHover;

      if (isActive) {
        const targetActive = isHover ? 0.8 : 1.0;
        slot.activeLerp = THREE.MathUtils.lerp(slot.activeLerp, targetActive, 0.15);
      } else {
        slot.activeLerp = THREE.MathUtils.lerp(slot.activeLerp, 0.0, 0.15);
      }

      // Damp or zero velocity if movement is extremely micro/stationary to completely avoid inward vortices
      if (distMoved < 0.0005) {
        slot.velocity.set(0, 0);
      } else {
        slot.velocity.copy(delta1);
      }

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

    // Pass 3: Temporal Reconstruction Pass (TAA style subpixel jitter & density history accumulation)
    temporalMaterial.uniforms.tCurrent.value = currentPaint.current.texture;
    temporalMaterial.uniforms.tPrevious.value = prevReconstructed.current.texture;
    temporalMaterial.uniforms.uFrameIndex.value = state.clock.elapsedTime * 60.0;
    temporalMaterial.uniforms.uTemporalBlend.value = temporalBlend;
    temporalMaterial.uniforms.uJitterStrength.value = jitterStrength;
    temporalMaterial.uniforms.uHistoryClamp.value = historyClamp;

    state.gl.setRenderTarget(currentReconstructed.current);
    state.gl.render(temporalQuad, orthographicCamera);
    state.gl.setRenderTarget(null);

    // Ping-Pong Swaps
    const tempPaint = currentPaint.current;
    currentPaint.current = prevPaint.current;
    prevPaint.current = tempPaint;

    const tempLowRes = currentLowRes.current;
    currentLowRes.current = prevLowRes.current;
    prevLowRes.current = tempLowRes;

    const tempRec = currentReconstructed.current;
    currentReconstructed.current = prevReconstructed.current;
    prevReconstructed.current = tempRec;
  });

  return <>{children(prevReconstructed.current.texture)}</>;
};
