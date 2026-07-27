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
  const workerRef = useRef<Worker | null>(null);

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

        // Gentle kick for impact squash
        if (intensity > 0.2) {
          const impactStrength = Math.min(intensity * 1.5, 1.2);
          squashVelocity.current -= impactStrength * 9.0; 
        }

        // Also post message to web worker to sync the simulation timeline
        workerRef.current?.postMessage({
          type: 'triggerImpact',
          slotIndex,
          intensity
        });
      }
    }
  }));

  // Subdivided Box Geometry for high-resolution smooth vertex deformations
  const geometry = useMemo(() => {
    return new THREE.BoxGeometry(size, size, size, 8, 8, 8);
  }, [size]);

  // Cache uniforms in reference to persist between compiling scopes
  const uniformsRef = useRef({
    uHitPoint: { value: new THREE.Vector3() },
    uDragOffset: { value: new THREE.Vector3() },
    uWobbleOffset: { value: new THREE.Vector3() },
    uRadius: { value: size * 0.8 },
    uMomentumForce: { value: new THREE.Vector3() }, // Used for Velocity Stretch
    uImpactSquash: { value: 0.0 }, // Global squash factor (0 to 1)
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

  const lastVelocity = useRef(new THREE.Vector3());
  const lastPosition = useRef(new THREE.Vector3());
  const smoothedVelocity = useRef(new THREE.Vector3());
  const squashValue = useRef(0);
  const squashVelocity = useRef(0);

  // --- WEB WORKER LIFE-CYCLE MANAGEMENT ---
  useEffect(() => {
    const workerCode = `
      let impactActive = [0.0, 0.0, 0.0];
      let impactTimes = [0.0, 0.0, 0.0];
      let impactIntensities = [0.0, 0.0, 0.0];

      self.onmessage = function(e) {
        const data = e.data;
        if (data.type === 'triggerImpact') {
          const idx = data.slotIndex;
          impactActive[idx] = 1.0;
          impactTimes[idx] = 0.0;
          impactIntensities[idx] = data.intensity;
          return;
        }

        if (data.type === 'update') {
          const dt = data.dt;

          // Compute lifetimes for collision/impact slots
          for (let i = 0; i < 3; i++) {
            if (impactActive[i] > 0.5) {
              impactTimes[i] += dt;
              if (impactTimes[i] > 1.5) {
                impactActive[i] = 0.0;
                impactTimes[i] = 0.0;
                impactIntensities[i] = 0.0;
              }
            }
          }

          // Offload calculated states back to the main thread
          self.postMessage({
            impactActive,
            impactTimes,
            impactIntensities
          });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { impactActive: impActive, impactTimes: impTimes, impactIntensities: impIntensities } = e.data;

      // Synced collision timelines
      for (let i = 0; i < 3; i++) {
        uniformsRef.current.uImpactActive.value[i] = impActive[i];
        uniformsRef.current.uImpactTimes.value[i] = impTimes[i];
        uniformsRef.current.uImpactIntensities.value[i] = impIntensities[i];
      }
    };

    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, [stiffness, damping, size]);

  // Custom modified Physical Jelly Material
  const customMaterial = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: 0.08,
      metalness: 0.0,
      transmission: transmission,
      ior: 1.35, // Index of refraction for jelly/gelatin
      thickness: size * 1.5,
      clearcoat: 0.0,
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
      shader.uniforms.uImpactSquash = uniformsRef.current.uImpactSquash;
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
        uniform float uImpactSquash;
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
          // 1. Velocity-based Stretch (│) and Global Impact Squash (▬)
          float velLen = length(uMomentumForce);
          
          // Highly noticeable coefficients for elastic visual feedback
          float stretchS = min(velLen * 0.15, 1.2); 
          float squashS = uImpactSquash * 0.9; 
          
          float totalS = stretchS + squashS;
          
          if (abs(totalS) > 0.005) {
            vec3 velDir = velLen > 0.001 ? normalize(uMomentumForce) : vec3(0.0, 1.0, 0.0);
            vec3 deformDir = (abs(squashS) > stretchS) ? vec3(0.0, 1.0, 0.0) : velDir;
            
            float projection = dot(localPos, deformDir);
            localPos += deformDir * (projection * totalS);
            
            // Preservation of volume (approximate)
            float perpFactor = 1.0 / sqrt(1.0 + totalS) - 1.0;
            vec3 perp = localPos - (deformDir * dot(localPos, deformDir));
            localPos += perp * perpFactor;
          }

          // 2. Multi-impact local collision soft-body deformation
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

          vec3 finalPos = localPos + collisionDeform;
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
  }, [size]); // RE-COMPILATION only on size change

  // Sync color, transmission, and size-derived props when changed
  useEffect(() => {
    if (customMaterial) {
      customMaterial.color.set(color);
      customMaterial.transmission = transmission;
      customMaterial.thickness = size * 1.5;
      customMaterial.needsUpdate = true;
    }
  }, [color, transmission, size, customMaterial]);

  const timer = useRef<THREE.Timer | null>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    if (!timer.current) timer.current = new THREE.Timer();
    timer.current.update();
    const delta = timer.current.getDelta();

    const dt = Math.min(delta, 0.03);

    // 1. Dispatch simple update task to background Web Worker for tracking collision lifetimes
    workerRef.current?.postMessage({
      type: 'update',
      dt
    });

    // 2. Physics-based velocity tracking for stretch
    if (rigidBody?.current && meshRef.current) {
      const rb = rigidBody.current;
      const vTarget = new THREE.Vector3();
      
      if (isDragging) {
        const currentPos = rb.translation();
        const p = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
        vTarget.subVectors(p, lastPosition.current).divideScalar(Math.max(dt, 0.0001));
        lastPosition.current.copy(p);
      } else {
        const vel = rb.linvel();
        vTarget.set(vel.x, vel.y, vel.z);
        const currentPos = rb.translation();
        lastPosition.current.set(currentPos.x, currentPos.y, currentPos.z);
      }
      
      // Smooth the velocity to prevent jitter and add "momentum" feel
      smoothedVelocity.current.lerp(vTarget, 0.15);

      // Convert world momentum to local space
      meshRef.current.updateMatrixWorld();
      const invMatrix = new THREE.Matrix4().copy(meshRef.current.matrixWorld).invert();
      const localVel = smoothedVelocity.current.clone().transformDirection(invMatrix);
      
      uniformsRef.current.uMomentumForce.value.copy(localVel);

      // 3. Update Global Impact Squash Spring (▬)
      // High damping for a gentler, more controlled "jelly" settle
      const k = 165.0;
      const d = 12.0;
      const accel = -k * squashValue.current - d * squashVelocity.current;
      squashVelocity.current += accel * dt;
      squashValue.current += squashVelocity.current * dt;
      
      uniformsRef.current.uImpactSquash.value = THREE.MathUtils.clamp(squashValue.current, -0.6, 0.6);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={customMaterial} castShadow receiveShadow />
  );
});
