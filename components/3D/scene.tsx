/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Sky } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';

gsap.registerPlugin(useGSAP);
import { usePhysicsStore } from '../../services/physicsStore';
import { JellyBox } from './WiggleCube';
import AnimatedCounter from '../Core/AnimatedCounter';

const NormalBox = ({ color, size = 1 }: { color: string, size?: number }) => (
  <mesh castShadow receiveShadow>
    <boxGeometry args={[size, size, size]} />
    <meshPhysicalMaterial 
      color={color} 
      metalness={0.0} 
      roughness={0.15} 
      transmission={0.8} 
      thickness={1.5}
      ior={1.45}
      transparent
      opacity={0.8}
    />
  </mesh>
);

const PhysicsCube = ({ color, position, id, onDragStart, onDragEnd }: { color: string; position: [number, number, number]; id: string; onDragStart?: () => void; onDragEnd?: () => void }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [hovered, setHover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    onDragStart?.();
    e.target.setPointerCapture(e.pointerId);

    // LOGIC: Create a drag plane parallel to the camera at the depth of the object
    const camera = e.camera;
    const planeNormal = new THREE.Vector3().subVectors(camera.position, e.point).normalize();
    dragPlane.current.setFromNormalAndCoplanarPoint(planeNormal, e.point);
    
    // Store offset for smooth pickup without centering jump
    const currentPos = rigidBodyRef.current?.translation();
    if (currentPos) {
      dragOffset.current.set(currentPos.x - e.point.x, currentPos.y - e.point.y, currentPos.z - e.point.z);
    }
  };

  const handlePointerUp = (e: any) => {
    setIsDragging(false);
    onDragEnd?.();
    e.target.releasePointerCapture(e.pointerId);
    
    // UI: Clear velocities on release to prevent physical explosions
    rigidBodyRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rigidBodyRef.current?.setAngvel({ x: 0, y: 0, z: 0 }, true);
  };

  useFrame((state) => {
    if (isDragging && rigidBodyRef.current) {
      const intersection = new THREE.Vector3();
      state.raycaster.ray.intersectPlane(dragPlane.current, intersection);
      
      const targetPos = intersection.add(dragOffset.current);
      
      // SYNC: Direct cursor-following through kinematic translation
      rigidBodyRef.current.setNextKinematicTranslation(targetPos);
    }
  });

  return (
      <RigidBody 
        ref={rigidBodyRef} 
        position={position} 
        type={isDragging ? "kinematicPosition" : "dynamic"}
        colliders="cuboid" 
        restitution={0.7}
        friction={0.5}
        ccd={true}
        name={`cube-${id}`}
      >
        <group
          onPointerOver={() => setHover(true)} 
          onPointerOut={() => setHover(false)}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <JellyBox color={hovered ? '#fff' : color} />
        </group>
      </RigidBody>
  );
};

const Floor = () => (
  <RigidBody type="fixed" position={[0, -2, 0]}>
    <mesh receiveShadow>
      <boxGeometry args={[20, 1, 20]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
    </mesh>
  </RigidBody>
);

const RotatingBox = ({ color = '#4f46e5', speed = 1, onDragStart, onDragEnd }: { color?: string; speed?: number; onDragStart?: () => void; onDragEnd?: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const [hovered, setHover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());
  const currentTranslation = useRef(new THREE.Vector3(0, 1, 0));

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    onDragStart?.();
    e.target.setPointerCapture(e.pointerId);

    const camera = e.camera;
    const planeNormal = new THREE.Vector3().subVectors(camera.position, e.point).normalize();
    dragPlane.current.setFromNormalAndCoplanarPoint(planeNormal, e.point);
    
    const currentPos = rigidBodyRef.current?.translation();
    if (currentPos) {
      dragOffset.current.set(currentPos.x - e.point.x, currentPos.y - e.point.y, currentPos.z - e.point.z);
    }
  };

  const handlePointerUp = (e: any) => {
    setIsDragging(false);
    onDragEnd?.();
    e.target.releasePointerCapture(e.pointerId);
  };
  
  useGSAP(() => {
    if (!materialRef.current) return;
    
    // UI: Semantic color and emissive intensity shift
    gsap.to(materialRef.current, {
      emissiveIntensity: (hovered || isDragging) ? 0.6 : 0,
      duration: 0.4
    });

    gsap.to(materialRef.current.color, {
      r: new THREE.Color(hovered ? '#6366f1' : color).r,
      g: new THREE.Color(hovered ? '#6366f1' : color).g,
      b: new THREE.Color(hovered ? '#6366f1' : color).b,
      duration: 0.4
    });
  }, { dependencies: [hovered, color, isDragging] });

  useFrame((state, delta) => {
    if (rigidBodyRef.current) {
      // LOGIC: Stable rotation accumulation to avoid physical feedback jitter
      rotationRef.current.x += delta * speed * (isDragging ? 2 : 0.8);
      rotationRef.current.y += delta * speed * (isDragging ? 2 : 1);
      rotationRef.current.z += delta * speed * 0.2;
      
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          rotationRef.current.x,
          rotationRef.current.y,
          rotationRef.current.z
        )
      );

      // Translation logic
      if (isDragging) {
        const intersection = new THREE.Vector3();
        state.raycaster.ray.intersectPlane(dragPlane.current, intersection);
        currentTranslation.current.copy(intersection.add(dragOffset.current));
      } else {
        // Return to resting position smoothly
        currentTranslation.current.lerp(new THREE.Vector3(0, 1, 0), 0.1);
      }
      
      // SYNC: Smooth kinematic updates
      rigidBodyRef.current.setNextKinematicTranslation(currentTranslation.current);
      rigidBodyRef.current.setNextKinematicRotation(quat);
    }
  });

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      type="kinematicPosition" 
      position={[0, 1, 0]} 
      colliders="cuboid"
      ccd={true}
    >
      <group
        onPointerOver={() => setHover(true)} 
        onPointerOut={() => setHover(false)} 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <NormalBox color={color} size={2} />
      </group>
    </RigidBody>
  );
};

import { useTheme } from '../../Theme';

const Scene3D: React.FC<{ showSky?: boolean }> = ({ showSky = true }) => {
  const { theme } = useTheme();
  const { cubes, addCube } = usePhysicsStore();
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [fps, setFps] = useState(0);

  // STYLE: Derived from theme
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: theme.space['Space.L'],
    left: theme.space['Space.L'],
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.S'],
    pointerEvents: 'none',
    zIndex: 10,
  };

  const fpsStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: theme.space['Space.L'],
    right: theme.space['Space.L'],
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#ffffff',
    padding: `${theme.space['Space.XS']} ${theme.space['Space.M']}`,
    borderRadius: '12px',
    ...theme.Type.Readable.Body.M,
    fontSize: '12px',
    pointerEvents: 'none',
    zIndex: 100,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: theme.space['Space.2XS'],
  };

  const buttonStyle: React.CSSProperties = {
    padding: `12px 20px`,
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '14px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    ...theme.Type.Readable.Body.M,
    cursor: 'pointer',
    pointerEvents: 'auto',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let requestId: number;

    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      requestId = requestAnimationFrame(loop);
    };

    requestId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestId);
  }, []);

  const spawnCube = () => {
    const randomColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    addCube({
      id: Math.random().toString(36),
      color: randomColor,
      position: [(Math.random() - 0.5) * 4, 10, (Math.random() - 0.5) * 4],
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative', overflow: 'hidden', background: '#050505' }}>
      <div style={overlayStyle}>
        <button style={buttonStyle} onClick={spawnCube}>
          Spawn Jelly Cube
        </button>
      </div>

      <Canvas 
        shadows={{ type: THREE.PCFShadowMap }} 
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          powerPreference: 'high-performance'
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={50} />
        <OrbitControls 
          makeDefault 
          enabled={controlsEnabled}
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2.1} 
        />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 10, 5]} angle={0.3} penumbra={1} intensity={1200} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        
        <Physics gravity={[0, -9.81, 0]}>
          <RotatingBox 
            onDragStart={() => setControlsEnabled(false)} 
            onDragEnd={() => setControlsEnabled(true)} 
          />
          {cubes.map((cube) => (
            <PhysicsCube 
              key={cube.id} 
              {...cube} 
              onDragStart={() => setControlsEnabled(false)} 
              onDragEnd={() => setControlsEnabled(true)} 
            />
          ))}
          <Floor />
        </Physics>
        
        {showSky && <Sky sunPosition={[1, 0.2, 1]} />}
        <Environment preset="city" />
      </Canvas>
      
      <div style={fpsStyle}>
        <span style={{ opacity: 0.6 }}>FPS</span>
        <AnimatedCounter value={fps} useFormatting={false} />
      </div>
    </div>
  );
};

export default Scene3D;
