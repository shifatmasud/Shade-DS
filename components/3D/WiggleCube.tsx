import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * COMPONENT: JellyBox
 * Renders a physics-enabled cube with a GPGPU-driven vertex shader jelly effect.
 * Architecture:
 * DATA -> FBOs for vertex simulation, Subdivided BoxGeometry
 * LOGIC -> Spring-mass simulation on GPU (GPGPU)
 * RENDER -> ShaderMaterial sampling simulation texture
 */

const SIM_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const SIM_FRAGMENT_SHADER = `
  uniform sampler2D uOldPos;
  uniform sampler2D uOldVel;
  uniform sampler2D uRestPos;
  uniform float uStiffness;
  uniform float uDamping;
  uniform float uDelta;
  uniform vec3 uForce;
  varying vec2 vUv;

  void main() {
    vec4 oldPosData = texture2D(uOldPos, vUv);
    vec4 oldVelData = texture2D(uOldVel, vUv);
    vec3 rest = texture2D(uRestPos, vUv).xyz;

    vec3 pos = oldPosData.xyz;
    vec3 vel = oldVelData.xyz;

    // Hooke's Law: F = -k * x
    vec3 displacement = pos - rest;
    vec3 force = -displacement * uStiffness;
    
    // External force (momentum/drag)
    force += uForce;

    // Semi-Implicit Euler
    vel += force * uDelta;
    vel *= uDamping;
    pos += vel * uDelta;

    // Pack both for now or just position
    gl_FragColor = vec4(pos, 1.0);
  }
`;

const VEL_FRAGMENT_SHADER = `
  uniform sampler2D uOldPos;
  uniform sampler2D uOldVel;
  uniform sampler2D uRestPos;
  uniform float uStiffness;
  uniform float uDamping;
  uniform float uDelta;
  uniform vec3 uForce;
  varying vec2 vUv;

  void main() {
    vec3 pos = texture2D(uOldPos, vUv).xyz;
    vec3 vel = texture2D(uOldVel, vUv).xyz;
    vec3 rest = texture2D(uRestPos, vUv).xyz;

    vec3 displacement = pos - rest;
    vec3 force = -displacement * uStiffness;
    force += uForce;

    vel += force * uDelta;
    vel *= uDamping;

    gl_FragColor = vec4(vel, 1.0);
  }
`;

const DISPLAY_VERTEX_SHADER = `
  uniform sampler2D uPosTex;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    // Map vertex index to texture pixel
    vec3 displaced = texture2D(uPosTex, uv).xyz;
    
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const JellyBox = ({ color, size = 1 }: { color: string, size?: number }) => {
  const { gl } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  
  // 1. Setup Geometry and Vertex Mapping
  const { geometry, simSize, restTexture } = useMemo(() => {
    // High tessellation for smooth jelly feel
    const geo = new THREE.BoxGeometry(size, size, size, 24, 24, 24);
    const count = geo.attributes.position.count;
    const simSize = Math.ceil(Math.sqrt(count));
    
    const data = new Float32Array(simSize * simSize * 4);
    const posAttr = geo.attributes.position;
    
    for (let i = 0; i < count; i++) {
        data[i * 4 + 0] = posAttr.getX(i);
        data[i * 4 + 1] = posAttr.getY(i);
        data[i * 4 + 2] = posAttr.getZ(i);
        data[i * 4 + 3] = 1.0;
        
        // Map UVs to Grid
        const x = ((i % simSize) + 0.5) / simSize;
        const y = (Math.floor(i / simSize) + 0.5) / simSize;
        geo.attributes.uv.setXY(i, x, y);
    }
    
    const tex = new THREE.DataTexture(data, simSize, simSize, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    
    return { geometry: geo, simSize, restTexture: tex };
  }, [size]);

  // 2. Setup FBOs for Ping-Pong
  const fbos = useMemo(() => {
    const createFBO = () => new THREE.WebGLRenderTarget(simSize, simSize, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });

    const f = {
      pos: [createFBO(), createFBO()],
      vel: [createFBO(), createFBO()],
      current: 0
    };

    // Initialize with rest data
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: restTexture }));
    const scene = new THREE.Scene().add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    gl.setRenderTarget(f.pos[0]);
    gl.render(scene, cam);
    gl.setRenderTarget(f.pos[1]);
    gl.render(scene, cam);
    
    gl.setRenderTarget(null);
    return f;
  }, [simSize, restTexture, gl]);

  // 3. Simulation Shaders
  const simPasses = useMemo(() => {
    const posMat = new THREE.ShaderMaterial({
      uniforms: {
        uOldPos: { value: null },
        uOldVel: { value: null },
        uRestPos: { value: restTexture },
        uStiffness: { value: 1.8 }, // Reduced for extreme jiggle
        uDamping: { value: 0.88 }, // Lower damping for more oscillation
        uDelta: { value: 0.016 },
        uForce: { value: new THREE.Vector3() }
      },
      vertexShader: SIM_VERTEX_SHADER,
      fragmentShader: SIM_FRAGMENT_SHADER
    });

    const velMat = new THREE.ShaderMaterial({
      uniforms: {
        uOldPos: { value: null },
        uOldVel: { value: null },
        uRestPos: { value: restTexture },
        uStiffness: { value: 1.8 },
        uDamping: { value: 0.88 },
        uDelta: { value: 0.016 },
        uForce: { value: new THREE.Vector3() }
      },
      vertexShader: SIM_VERTEX_SHADER,
      fragmentShader: VEL_FRAGMENT_SHADER
    });

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), posMat);
    scene.add(quad);
    
    return { scene, cam, quad, posMat, velMat };
  }, [restTexture]);

  // 4. Update Loop
  const lastTime = useRef(0);
  const positionRef = useRef(new THREE.Vector3());
  const momentum = useRef(new THREE.Vector3());

  useFrame((state) => {
    if (!meshRef.current) return;

    // Momentum detection
    const currentWorldPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(currentWorldPos);
    
    const delta = state.clock.getDelta();
    const speed = currentWorldPos.clone().sub(positionRef.current).divideScalar(delta || 0.016);
    momentum.current.lerp(speed, 0.1);
    positionRef.current.copy(currentWorldPos);

    const writeIdx = 1 - fbos.current;
    const readIdx = fbos.current;

    // Simulation Step
    simPasses.posMat.uniforms.uDelta.value = Math.min(delta, 0.032);
    // Increased force multiplier for high responsiveness to motion
    simPasses.posMat.uniforms.uForce.value.copy(momentum.current).multiplyScalar(-0.15); 
    
    // Pass 1: Update Velocity
    simPasses.quad.material = simPasses.velMat;
    simPasses.velMat.uniforms.uOldPos.value = fbos.pos[readIdx].texture;
    simPasses.velMat.uniforms.uOldVel.value = fbos.vel[readIdx].texture;
    simPasses.velMat.uniforms.uForce.value.copy(simPasses.posMat.uniforms.uForce.value);
    
    gl.setRenderTarget(fbos.vel[writeIdx]);
    gl.render(simPasses.scene, simPasses.cam);

    // Pass 2: Update Position
    simPasses.quad.material = simPasses.posMat;
    simPasses.posMat.uniforms.uOldPos.value = fbos.pos[readIdx].texture;
    simPasses.posMat.uniforms.uOldVel.value = fbos.vel[writeIdx].texture;
    
    gl.setRenderTarget(fbos.pos[writeIdx]);
    gl.render(simPasses.scene, simPasses.cam);

    fbos.current = writeIdx;
    gl.setRenderTarget(null);

    // Sync Display Material
    if (meshRef.current.material instanceof THREE.ShaderMaterial) {
      meshRef.current.material.uniforms.uPosTex.value = fbos.pos[writeIdx].texture;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <shaderMaterial 
        attach="material"
        uniforms={{
          uPosTex: { value: null },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: 0.75 }
        }}
        transparent
        depthWrite={false} // Better for translucent overlap
        vertexShader={DISPLAY_VERTEX_SHADER}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            
            // Lighting calculations
            vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
            float diff = dot(normal, lightDir) * 0.5 + 0.5;
            
            // Fresnel / Rim effect for jelly look
            float rim = 1.0 - max(0.0, dot(normal, vec3(0.0, 0.0, 1.0)));
            rim = pow(rim, 4.0);
            
            // Subsurface scattering approximation
            float sss = pow(1.0 - max(0.0, dot(normal, lightDir)), 2.0) * 0.5;
            
            vec3 color = uColor * diff + rim * vec3(1.0) + sss * uColor;
            
            // Specular
            vec3 halfVector = normalize(lightDir + viewDir);
            float spec = pow(max(0.0, dot(normal, halfVector)), 32.0) * 0.5;
            
            gl_FragColor = vec4(color + spec, uOpacity + rim * 0.2);
          }
        `}
      />
    </mesh>
  );
};

