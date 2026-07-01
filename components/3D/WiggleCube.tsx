import React, { useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RapierRigidBody } from '@react-three/rapier';

/**
 * COMPONENT: JellyBox
 * Renders a highly interactive, physically-based 3D soft-body jelly cube.
 * 
 * Method: Vertex Shader Deformation inside custom-modified MeshPhysicalMaterial
 * with analytical normal reconstruction and multi-dimensional spring-mass oscillators.
 * This ensures stunning glassy refraction, reflection warping, and 100% stability.
 */

interface JellyBoxProps {
  color: string;
  size?: number;
  isDragging?: boolean;
  localHitPoint?: THREE.Vector3;
  localDragOffset?: THREE.Vector3;
  rigidBody?: React.RefObject<RapierRigidBody | null>;
  pointerPos?: THREE.Vector3;
  stiffness?: number;
  damping?: number;
  transmission?: number;
}

export const JellyBox = forwardRef<any, JellyBoxProps>(({
  color,
  size = 1,
  isDragging = false,
  localHitPoint,
  localDragOffset,
  rigidBody,
  pointerPos,
  stiffness = 20.0,
  damping = 0.94,
  transmission = 0.90
}, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Trigger collision impact via exposed ref
  useImperativeHandle(ref, () => ({
    triggerImpact(worldPoint: THREE.Vector3, worldNormal: THREE.Vector3, intensity: number) {
      if (!meshRef.current) return;

      // 1. Convert world impact point to local geometry space
      const localPoint = meshRef.current.worldToLocal(worldPoint.clone());

      // 2. Convert world normal to local normal (using normal matrix of mesh)
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(meshRef.current.matrixWorld);
      const localNormal = worldNormal.clone().applyMatrix3(normalMatrix).normalize();

      // 3. Register inside ring buffer (up to 3 concurrent slots)
      const pts = uniformsRef.current.uImpactPoints.value;
      const nms = uniformsRef.current.uImpactNormals.value;
      const ints = uniformsRef.current.uImpactIntensities.value;
      const tms = uniformsRef.current.uImpactTimes.value;
      const acts = uniformsRef.current.uImpactActive.value;

      // Find an inactive slot, or the oldest/lowest intensity slot to recycle
      let slotIndex = -1;
      for (let i = 0; i < 3; i++) {
        if (acts[i] < 0.5) {
          slotIndex = i;
          break;
        }
      }

      // If all are active, find the one with the maximum elapsed time (oldest)
      if (slotIndex === -1) {
        let maxTime = -1;
        for (let i = 0; i < 3; i++) {
          if (tms[i] > maxTime) {
            maxTime = tms[i];
            slotIndex = i;
          }
        }
      }

      if (slotIndex !== -1) {
        pts[slotIndex].copy(localPoint);
        nms[slotIndex].copy(localNormal);
        ints[slotIndex] = intensity;
        tms[slotIndex] = 0.0;
        acts[slotIndex] = 1.0;
      }
    }
  }));

  // Subdivided Box Geometry for high-resolution smooth vertex deformations
  const geometry = useMemo(() => {
    return new THREE.BoxGeometry(size, size, size, 16, 16, 16);
  }, [size]);

  // Spring-mass solver states for grab-point wobble
  const wobbleOffset = useRef(new THREE.Vector3());
  const wobbleVelocity = useRef(new THREE.Vector3());
  const wobbleTime = useRef(0);

  // Spring-mass solver states for global body-wide momentum wobble
  const momentumForce = useRef(new THREE.Vector3());
  const momentumVelocity = useRef(new THREE.Vector3());
  const momentumTime = useRef(0);

  // World trackers for inertia/collision force detection
  const lastWorldPos = useRef(new THREE.Vector3());
  const lastSpeed = useRef(new THREE.Vector3());
  const initializedPosition = useRef(false);

  // Cache uniforms in reference to persist between compiling scopes
  const uniformsRef = useRef({
    uHitPoint: { value: new THREE.Vector3() },
    uDragOffset: { value: new THREE.Vector3() },
    uWobbleOffset: { value: new THREE.Vector3() },
    uRadius: { value: size * 0.8 },
    uMomentumForce: { value: new THREE.Vector3() },
    uProximityPos: { value: new THREE.Vector3() },
    uProximityWeight: { value: 0.0 },
    uGroundY: { value: -1.5 },
    // Multi-impact local collision arrays (fully compatible with any Three.js version)
    uImpactPoints: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
    uImpactNormals: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
    uImpactIntensities: { value: [0.0, 0.0, 0.0] },
    uImpactTimes: { value: [0.0, 0.0, 0.0] },
    uImpactActive: { value: [0.0, 0.0, 0.0] }
  });

  // Custom modified Physical Jelly Material
  const customMaterial = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: 0.03,
      metalness: 0.0,
      transmission: transmission,
      ior: 1.35, // Index of refraction for jelly/gelatin
      thickness: size * 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      transparent: true,
      opacity: 0.95,
      depthWrite: true,
    });

    mat.onBeforeCompile = (shader) => {
      // Connect JS uniforms directly
      shader.uniforms.uHitPoint = uniformsRef.current.uHitPoint;
      shader.uniforms.uDragOffset = uniformsRef.current.uDragOffset;
      shader.uniforms.uWobbleOffset = uniformsRef.current.uWobbleOffset;
      shader.uniforms.uRadius = uniformsRef.current.uRadius;
      shader.uniforms.uMomentumForce = uniformsRef.current.uMomentumForce;
      shader.uniforms.uProximityPos = uniformsRef.current.uProximityPos;
      shader.uniforms.uProximityWeight = uniformsRef.current.uProximityWeight;
      shader.uniforms.uGroundY = uniformsRef.current.uGroundY;
      shader.uniforms.uImpactPoints = uniformsRef.current.uImpactPoints;
      shader.uniforms.uImpactNormals = uniformsRef.current.uImpactNormals;
      shader.uniforms.uImpactIntensities = uniformsRef.current.uImpactIntensities;
      shader.uniforms.uImpactTimes = uniformsRef.current.uImpactTimes;
      shader.uniforms.uImpactActive = uniformsRef.current.uImpactActive;

      // 1. Inject custom Uniform declarations and deformation function at the top of Vertex Shader
      shader.vertexShader = `
        uniform vec3 uHitPoint;
        uniform vec3 uDragOffset;
        uniform vec3 uWobbleOffset;
        uniform float uRadius;
        uniform vec3 uMomentumForce;
        uniform vec3 uProximityPos;
        uniform float uProximityWeight;
        uniform float uGroundY;

        // Upgraded multi-impact uniforms for physical collision deformation
        uniform vec3 uImpactPoints[3];
        uniform vec3 uImpactNormals[3];
        uniform float uImpactIntensities[3];
        uniform float uImpactTimes[3];
        uniform float uImpactActive[3];

        vec3 getDeformedPos(vec3 localPos) {
          // Local grab-point stretch deformation (Gaussian falloff)
          float d = distance(localPos, uHitPoint);
          float w = exp(-(d * d) / (2.0 * uRadius * uRadius));
          vec3 localDeform = (uDragOffset + uWobbleOffset) * w;
          
          // Global body-wide momentum lean (proportional to velocity/acceleration from Rapier)
          float heightFactor = (localPos.y + ${(size / 2.0).toFixed(4)}) / ${(size).toFixed(4)}; 
          vec3 globalDeform = uMomentumForce * heightFactor;

          // Proximity-based subtle deformation (mouse magnetism)
          vec4 worldPos4 = modelMatrix * vec4(localPos, 1.0);
          float proxDist = distance(worldPos4.xyz, uProximityPos);
          float proxW = exp(-(proxDist * proxDist) / 0.5) * uProximityWeight;
          vec3 proxDeform = normalize(uProximityPos - worldPos4.xyz) * proxW * 0.02; // Dampened proximity
          
          // Multi-impact local collision soft-body deformation
          vec3 collisionDeform = vec3(0.0);
          for (int i = 0; i < 3; i++) {
            if (uImpactActive[i] > 0.5) {
              float t = uImpactTimes[i];
              float intensity = uImpactIntensities[i];
              
              // 1. Localized Contact Squish (Gaussian Dent) - Stronger
              float dist = distance(localPos, uImpactPoints[i]);
              float spatialFalloff = exp(-(dist * dist) / 0.22);
              float dentAmp = intensity * 0.55 * exp(-3.0 * t) * sin(t * 18.0);
              vec3 dentDeform = -uImpactNormals[i] * spatialFalloff * dentAmp;
              
              // 2. Propagating Ripple Shockwave - Increased Amplitude
              float rippleAmp = intensity * 0.28 * exp(-2.2 * t) * sin(dist * 15.0 - t * 25.0) * exp(-1.0 * dist);
              vec3 rippleDeform = uImpactNormals[i] * rippleAmp;
              
              // 3. Volume-Preserving Bulge (Poisson expansion)
              vec3 relativePos = localPos - uImpactPoints[i];
              float dotNorm = dot(relativePos, uImpactNormals[i]);
              vec3 projNormal = uImpactNormals[i] * dotNorm;
              vec3 radialVec = relativePos - projNormal;
              float radialDist = length(radialVec);
              vec3 radialDir = radialDist > 0.001 ? radialVec / radialDist : vec3(0.0);
              
              float bulgeAmp = abs(dentAmp) * 0.75 * exp(-(radialDist * radialDist) / 0.35);
              vec3 bulgeDeform = radialDir * bulgeAmp;
              
              collisionDeform += dentDeform + rippleDeform + bulgeDeform;
            }
          }

          vec3 finalPos = localPos + localDeform + globalDeform + proxDeform + collisionDeform;
          
          // GROUND CLAMPING: Prevent vertices from clipping through the floor
          vec4 finalWorldPos = modelMatrix * vec4(finalPos, 1.0);
          if (finalWorldPos.y < uGroundY) {
            float diff = uGroundY - finalWorldPos.y;
            finalWorldPos.y = uGroundY;
            // Push outwards slightly when squished (volume preservation)
            vec2 flatPos = finalWorldPos.xz;
            if (length(flatPos) > 0.0001) {
                finalWorldPos.xz += normalize(flatPos) * diff * 0.4;
            }
            return (inverse(modelMatrix) * finalWorldPos).xyz;
          }
          
          return finalPos;
        }
      ` + shader.vertexShader;

      // 2. Recompute surface normals using finite differences for correct specular/glass reflections
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `
        #include <beginnormal_vertex>

        // Create local tangent and bitangent space
        vec3 localTangent;
        if (abs(objectNormal.x) > 0.9) {
          localTangent = vec3(0.0, 1.0, 0.0);
        } else {
          localTangent = vec3(1.0, 0.0, 0.0);
        }
        localTangent = normalize(localTangent - objectNormal * dot(localTangent, objectNormal));
        vec3 localBitangent = cross(objectNormal, localTangent);

        // Displace tangent and bitangent offsets
        float eps = 0.01;
        vec3 displacedPos = getDeformedPos(position);
        vec3 displacedTangent = getDeformedPos(position + localTangent * eps);
        vec3 displacedBitangent = getDeformedPos(position + localBitangent * eps);

        vec3 tangentVector = (displacedTangent - displacedPos) / eps;
        vec3 bitangentVector = (displacedBitangent - displacedPos) / eps;

        // Mathematical cross product to find exact normal of deformed plane
        objectNormal = normalize(cross(tangentVector, bitangentVector));
        `
      );

      // 3. Displace positions
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = getDeformedPos(position);
        `
      );
    };

    return mat;
  }, [color, size, transmission]);

  // Sync color and transmission props when changed
  useEffect(() => {
    if (customMaterial) {
      customMaterial.color.set(color);
      customMaterial.transmission = transmission;
    }
  }, [color, transmission, customMaterial]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const dt = Math.min(delta, 0.03);

    // 1. Rapier Integration: Drive deformation from physical state
    if (rigidBody?.current) {
      const rb = rigidBody.current;
      const linvel = rb.linvel();
      const velocity = new THREE.Vector3(linvel.x, linvel.y, linvel.z);
      
      // Calculate acceleration from speed change
      const speed = velocity.length();
      const acceleration = velocity.clone().sub(lastSpeed.current).divideScalar(dt || 0.016);
      lastSpeed.current.copy(velocity);

      // Leaning deformation: Proportional to velocity and acceleration (trailing effect)
      const leanIntensity = 0.006;
      const accelIntensity = 0.002;
      
      const accel = acceleration.clone();
      const maxAccInfluence = 15.0;
      if (accel.length() > maxAccInfluence) accel.setLength(maxAccInfluence);

      const targetMomentum = velocity.clone().multiplyScalar(-leanIntensity);
      targetMomentum.addScaledVector(accel, -accelIntensity);
      
      const maxLean = size * 0.25;
      if (targetMomentum.length() > maxLean) {
        targetMomentum.setLength(maxLean);
      }
      
      // Much smoother interpolation (inertia feel)
      momentumForce.current.lerp(targetMomentum, 0.05);
      uniformsRef.current.uMomentumForce.value.copy(momentumForce.current);
    } else {
      // Fallback for non-rigid bodies
      const currentWorldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(currentWorldPos);

      if (!initializedPosition.current) {
        lastWorldPos.current.copy(currentWorldPos);
        initializedPosition.current = true;
      }

      const currentSpeed = currentWorldPos.clone().sub(lastWorldPos.current).divideScalar(dt || 0.016);
      const currentAcceleration = currentSpeed.clone().sub(lastSpeed.current).divideScalar(dt || 0.016);

      lastWorldPos.current.copy(currentWorldPos);
      lastSpeed.current.copy(currentSpeed);

      momentumVelocity.current.addScaledVector(currentAcceleration, -0.01);
      const kmom = stiffness * 0.5;
      const cmom = (1.0 - damping) * 6.0;
      const totalMomForce = momentumForce.current.clone().multiplyScalar(-kmom).add(momentumVelocity.current.clone().multiplyScalar(-cmom));
      momentumVelocity.current.addScaledVector(totalMomForce, dt);
      momentumForce.current.addScaledVector(momentumVelocity.current, dt);
      
      uniformsRef.current.uMomentumForce.value.copy(momentumForce.current);
    }

    // 2. Proximity Detection
    if (pointerPos) {
      const ray = state.raycaster.ray;
      const objectWorldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(objectWorldPos);
      
      const pointOnRay = new THREE.Vector3();
      ray.closestPointToPoint(objectWorldPos, pointOnRay);
      
      const dist = objectWorldPos.distanceTo(pointOnRay);
      // Gentler proximity: falls off sooner
      const proxWeight = THREE.MathUtils.smoothstep(dist, 2.0, 0.2);
      
      uniformsRef.current.uProximityPos.value.copy(pointOnRay);
      uniformsRef.current.uProximityWeight.value = proxWeight;
    }

    // 3. Local mouse grab & drag physics integration
    if (isDragging) {
      wobbleOffset.current.set(0, 0, 0);
      wobbleVelocity.current.set(0, 0, 0);

      if (localHitPoint) {
        uniformsRef.current.uHitPoint.value.copy(localHitPoint);
      }
      if (localDragOffset) {
        const maxDrag = size * 1.8; // Reduced visual drag stretch
        const drag = localDragOffset.clone();
        const currentLen = drag.length();
        
        if (currentLen > maxDrag) {
          // Asymptotic drag: feels like high resistance instead of a hard wall
          const extra = currentLen - maxDrag;
          const softenedExtra = (extra * size * 0.5) / (extra + size * 0.5); // Stiffer sigmoid
          drag.setLength(maxDrag + softenedExtra);
        }
        
        uniformsRef.current.uDragOffset.value.copy(drag);
      }
    } else {
      if (uniformsRef.current.uDragOffset.value.lengthSq() > 0) {
        wobbleOffset.current.copy(uniformsRef.current.uDragOffset.value);
        wobbleVelocity.current.copy(uniformsRef.current.uDragOffset.value).multiplyScalar(-8.0);
        uniformsRef.current.uDragOffset.value.set(0, 0, 0);
      }

      const k = stiffness;
      const c = (1.0 - damping) * 15.0;
      const totalWobbleForce = wobbleOffset.current.clone().multiplyScalar(-k).add(wobbleVelocity.current.clone().multiplyScalar(-c));

      wobbleVelocity.current.addScaledVector(totalWobbleForce, dt);
      wobbleOffset.current.addScaledVector(wobbleVelocity.current, dt);

      if (wobbleOffset.current.lengthSq() < 0.0001 && wobbleVelocity.current.lengthSq() < 0.0001) {
        wobbleOffset.current.set(0, 0, 0);
        wobbleVelocity.current.set(0, 0, 0);
      }

      uniformsRef.current.uWobbleOffset.value.copy(wobbleOffset.current);
    }

    // 4. Update multi-impact active lifetimes
    const activeArr = uniformsRef.current.uImpactActive.value;
    const timesArr = uniformsRef.current.uImpactTimes.value;
    const intensitiesArr = uniformsRef.current.uImpactIntensities.value;

    for (let i = 0; i < 3; i++) {
      if (activeArr[i] > 0.5) {
        timesArr[i] += dt;
        if (timesArr[i] > 1.5) {
          activeArr[i] = 0.0;
          timesArr[i] = 0.0;
          intensitiesArr[i] = 0.0;
        }
      }
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={customMaterial} castShadow receiveShadow />
  );
});
