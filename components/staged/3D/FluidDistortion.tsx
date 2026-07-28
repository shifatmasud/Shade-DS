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
  uniform vec2 uMidPointer;
  uniform vec2 uPrevPointer;
  uniform vec2 uVelocity;
  uniform float uTime;
  uniform float uRadius;
  uniform float uStrength;
  uniform float uDissipation;
  uniform float uMixRatio;
  uniform float uAspect;
  uniform float uActive;
  uniform float uCurlStrength;
  uniform float uCurlFreq;
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

    // 3. Aspect-ratio corrected pointer Bezier distance
    vec2 p = vUv;
    p.x *= uAspect;
    vec2 a = uPrevPointer;
    a.x *= uAspect;
    vec2 mid = uMidPointer;
    mid.x *= uAspect;
    vec2 b = uPointer;
    b.x *= uAspect;

    // Clean distance to smooth curved trajectory for active trailing area
    float distClean = sdBezier(p, a, mid, b);

    // Active fluid metaball bell-curve splat falloff
    float radius = uRadius * mix(1.0, 1.5, uActive);
    float rNorm = clamp(distClean / max(radius, 0.0001), 0.0, 1.0);
    float splat = 1.0 - rNorm * rNorm;
    splat = splat * splat; // Smooth organic liquid curve

    // Fetch previous low-res density to calculate dissipation area
    vec4 prevLowResRaw = texture2D(tLowRes, vUv);
    float prevDensity = prevLowResRaw.b;

    // Dissipation area mask: high in aging/advected wake, low in active fresh trailing area
    float activeTrailMask = clamp(splat * mix(1.0, 1.25, uActive), 0.0, 1.0);
    float dissipationArea = clamp(prevDensity * (1.0 - activeTrailMask * 0.9), 0.0, 1.0);

    // 1. Hydrodynamic domain warping: active trailing area stays curvy & stable; dissipation area gets organic liquid warping, swirls & vortices
    float speed = length(uVelocity);
    vec2 flowDir = speed > 0.0001 ? uVelocity / speed : vec2(1.0, 0.0);
    vec2 perpDir = vec2(-flowDir.y, flowDir.x);

    // Multi-octave liquid turbulence field
    float n1 = snoise(vUv * uCurlFreq * 2.2 + vec2(uTime * 0.7, uTime * 0.4));
    float n2 = snoise(vUv * uCurlFreq * 4.8 - vec2(uTime * 1.1, uTime * 0.8));

    // Serpentine liquid surface wave undulation
    float waveUndulation = sin(dot(p, flowDir) * 35.0 - uTime * 6.5) * cos(dot(p, perpDir) * 22.0 + uTime * 4.2);

    // Swirling rotational noise for dissipation domain warping
    float swirlAngle = snoise(vUv * 3.2 + uTime * 0.6) * 6.28318;
    vec2 swirlDomainVec = vec2(cos(swirlAngle), sin(swirlAngle));

    // Combined domain offset: strictly concentrated in dissipation area (0 in active trail)
    float curlMult = max(uCurlStrength, 0.0) / 0.25;
    vec2 fluidDomainOffset = (perpDir * (n1 * 0.045 + waveUndulation * 0.028) + flowDir * (n2 * 0.03) + swirlDomainVec * 0.035) * (1.0 + curlMult * 0.9);
    vec2 pWarp = p + fluidDomainOffset * dissipationArea;

    float localSplatEdge = smoothstep(0.05, 0.5, splat) * (1.0 - smoothstep(0.5, 0.95, splat));
    float totalSlopesFactor = max(trailEdgeFactor, localSplatEdge);

    // 2. Liquid-directed curl noise with stream-aligned stretching (concentrated in dissipation area)
    float flowSpeed = length(lowResVel);
    float flowStretch = clamp(flowSpeed * 5.0, 0.0, 1.5);
    
    vec2 curl1 = liquidCurlNoise(vUv, uTime, uCurlFreq, 1.0 + flowStretch);
    vec2 curl2 = liquidCurlNoise(vUv, uTime * 1.5, uCurlFreq * 2.2, 0.5 + flowStretch * 0.5);
    vec2 combinedCurl = curl1 * 0.7 + curl2 * 0.3;

    // Curl noise injection: 0 in active trail area; strong in dissipation area
    float baseCurlStrength = 0.01 * curlMult;
    float dissipationCurlBoost = 0.35 * dissipationArea * curlMult;
    float edgeCurlBoost = 0.18 * totalSlopesFactor * dissipationArea * curlMult;
    
    vec2 injectedCurl = combinedCurl * (baseCurlStrength + dissipationCurlBoost + edgeCurlBoost);

    // 3. Wind Force Motion in Dissipation Area (ambient liquid wind force drifting across water surface)
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

    // Mouse velocity impulse
    vec2 pointerVel = uVelocity * uStrength * mix(2.5, 5.2, uActive);

    // 5. Swirl & Counter-Rotating Dipole Wake Vorticity in Dissipation Area
    vec2 segDir = b - a;
    float segLen = length(segDir);
    vec2 wakeVorticity = vec2(0.0);
    if (segLen > 0.00001) {
      vec2 normDir = segDir / segLen;
      vec2 normPerp = vec2(-normDir.y, normDir.x);
      vec2 pa = pWarp - a;
      float side = sign(dot(pa, normPerp));

      // Dipole wake: counter-rotating vortex pairs on opposite sides of liquid trail
      float vortexFalloff = exp(-distClean * 18.0 / max(radius, 0.001));
      vec2 dipole = normPerp * side * vortexFalloff * segLen * 12.0 * sin(distClean * 28.0 - uTime * 5.0);

      // Serpentine undulation lingering in wake
      vec2 serpentine = normPerp * sin(dot(pa, normDir) * 38.0 - uTime * 6.0) * vortexFalloff * 0.45;

      // Vortex is kept subtle in active trailing area and expands in dissipation area
      wakeVorticity = (dipole + serpentine) * dissipationArea;
    }

    vec2 inputVel = (pointerVel + wakeVorticity) * splat;

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

// Post-Processing Refraction Shader (5-Tap Balanced Gaussian Kernel + Rim Smoothstep Blur & Chromatic Dispersion)
export const DISTORTION_FRAG = `
  uniform sampler2D tFluid;
  uniform float uRefractStrength;
  uniform float uDispersionScale;
  uniform float uBlurRadius;
  uniform float uJitterStrength;

  // High-frequency pseudo blue noise hash
  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // 1. Instant Early-Exit: Bypass all math & loops if fluid density is zero
    vec4 fluidSample = texture2D(tFluid, uv);
    float mainDensity = fluidSample.b;

    if (mainDensity < 0.0005) {
      outputColor = inputColor;
      return;
    }

    float mask = smoothstep(0.0001, 0.25, mainDensity);
    vec2 mainVel = (fluidSample.rg - 0.5) * 2.0;

    // Compute spatial gradient of density to target trail slopes and bounds in high-res space
    float dX = texture2D(tFluid, uv + vec2(0.003, 0.0)).b - texture2D(tFluid, uv - vec2(0.003, 0.0)).b;
    float dY = texture2D(tFluid, uv + vec2(0.0, 0.003)).b - texture2D(tFluid, uv - vec2(0.0, 0.003)).b;
    vec2 densitySlope = vec2(dX, dY);
    float slopeMag = length(densitySlope);

    // Dynamic slope and bounds intensity profile for art directed scaling
    float slopeFactor = smoothstep(0.02, 0.45, slopeMag);
    float boundsFactor = smoothstep(0.005, 0.35, mainDensity) * (1.0 - smoothstep(0.35, 0.9, mainDensity));
    float trailEdgeIntensity = max(slopeFactor, boundsFactor);

    // 5-Tap Balanced Cross Kernel offsets and weights (60% fewer texture fetches than 9-tap)
    vec2 tapOffsets[5];
    tapOffsets[0] = vec2( 0.0,  0.0);
    tapOffsets[1] = vec2(-1.0,  0.0);
    tapOffsets[2] = vec2( 1.0,  0.0);
    tapOffsets[3] = vec2( 0.0, -1.0);
    tapOffsets[4] = vec2( 0.0,  1.0);

    float weights[5];
    weights[0] = 0.36;
    weights[1] = 0.16;
    weights[2] = 0.16;
    weights[3] = 0.16;
    weights[4] = 0.16;

    // Distortion blur radius increases along the rims/slopes/bounds via spatial density gradient
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

    for (int i = 0; i < 5; i++) {
      // 5-Tap noise jitter offset
      vec2 noiseUV = uv * 480.0 + tapOffsets[i] * 13.37;
      float jitterVal = (0.0022 + 0.0055 * trailEdgeIntensity) * jitterMult;
      vec2 jitter = (hash22(noiseUV) - 0.5) * jitterVal;

      vec2 sampleUv = clamp(uv + tapOffsets[i] * rimBlurRadius, 0.0, 1.0);
      vec4 tapFluid = texture2D(tFluid, sampleUv);
      vec2 tapVel = (tapFluid.rg - 0.5) * 2.0;
      float tapDensity = tapFluid.b;

      // Soft rim refraction displacement
      float refractVal = (0.12 + 0.32 * trailEdgeIntensity) * refractMult;
      vec2 refractOffset = tapVel * refractVal * tapDensity * mask;
      float tapVelMag = length(tapVel);

      // Chromatic dispersion (RGB shift)
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

  // Optimized FBO budget: Paint FBO capped at max 160x160 & Low-Res FBO capped at max 80x80
  const paintWidth = Math.min(160, Math.max(96, Math.round(size.width / 5)));
  const paintHeight = Math.min(160, Math.max(96, Math.round(size.height / 5)));
  const lowResWidth = Math.min(80, Math.max(48, Math.round(paintWidth / 2)));
  const lowResHeight = Math.min(80, Math.max(48, Math.round(paintHeight / 2)));

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
      uMidPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPrevPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uVelocity: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uRadius: { value: radius },
      uStrength: { value: strength },
      uDissipation: { value: dissipation },
      uMixRatio: { value: mixRatio },
      uAspect: { value: size.width / Math.max(size.height, 1) },
      uActive: { value: 0.0 },
      uCurlStrength: { value: curlStrength },
      uCurlFreq: { value: curlFreq },
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
  const midPointer = useRef(new THREE.Vector2(0.5, 0.5));
  const prevPointer = useRef(new THREE.Vector2(0.5, 0.5));
  const prev2Pointer = useRef(new THREE.Vector2(0.5, 0.5));
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

    // Compute quadratic Bezier control midpoint for curved trajectory
    const delta1 = new THREE.Vector2().subVectors(pointer.current, prevPointer.current);
    const delta2 = new THREE.Vector2().subVectors(prevPointer.current, prev2Pointer.current);
    
    // Smooth control midpoint B = prevPointer + curvature blend
    const curveOffset = delta1.clone().add(delta2).multiplyScalar(0.25);
    midPointer.current.copy(prevPointer.current).add(curveOffset);

    const velocity = delta1.clone();
    
    // Smooth transition for active drag state
    activeLerp.current = THREE.MathUtils.lerp(activeLerp.current, isDown.current ? 1 : 0, 0.15);

    // Pass 1: Paint Pass (mouse input + velocity impulse + carry previous low-res velocity)
    paintMaterial.uniforms.tLowRes.value = prevLowRes.current.texture;
    paintMaterial.uniforms.uPointer.value.copy(pointer.current);
    paintMaterial.uniforms.uMidPointer.value.copy(midPointer.current);
    paintMaterial.uniforms.uPrevPointer.value.copy(prevPointer.current);
    paintMaterial.uniforms.uVelocity.value.copy(velocity);
    paintMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    paintMaterial.uniforms.uRadius.value = radius;
    paintMaterial.uniforms.uStrength.value = strength;
    paintMaterial.uniforms.uDissipation.value = dissipation;
    paintMaterial.uniforms.uMixRatio.value = mixRatio;
    paintMaterial.uniforms.uCurlStrength.value = curlStrength;
    paintMaterial.uniforms.uCurlFreq.value = curlFreq;
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

    prev2Pointer.current.copy(prevPointer.current);
    prevPointer.current.copy(pointer.current);
  });

  return <>{children(prevPaint.current.texture)}</>;
};


