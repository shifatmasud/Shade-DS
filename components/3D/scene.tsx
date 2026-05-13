/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Sky } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';

gsap.registerPlugin(useGSAP);
import { usePhysicsStore } from '../../services/physicsStore';

// STYLE: JS object style for overlay
const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  pointerEvents: 'none',
  zIndex: 10,
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  color: 'white',
  fontSize: '12px',
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  pointerEvents: 'auto',
  transition: 'all 0.2s ease',
};

const PhysicsCube = ({ color, position, id }: { color: string; position: [number, number, number]; id: string }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [hovered, setHover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // LOGIC: Action for dragging
  // In a real production app, we'd use a mouse joint. 
  // For this "tiny" implementation, we'll just set next kinematic translation if we were kinematic,
  // but since we want physics interaction, we'll just let it be dynamic and maybe "lift" it on click.
  
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    
    // Apply an upward impulse when picked up
    rigidBodyRef.current?.applyImpulse({ x: 0, y: 5, z: 0 }, true);
  };

  const handlePointerUp = (e: any) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  useFrame((state) => {
    if (isDragging && rigidBodyRef.current) {
      // Move towards pointer position in 3D space
      const vector = new THREE.Vector3(
        (state.pointer.x * state.viewport.width) / 2,
        (state.pointer.y * state.viewport.height) / 2,
        0
      );
      
      const currentPos = rigidBodyRef.current.translation();
      const dx = vector.x - currentPos.x;
      const dy = vector.y - currentPos.y;
      
      // Apply force towards mouse
      rigidBodyRef.current.applyImpulse({ x: dx * 0.5, y: dy * 0.5, z: 0 }, true);
    }
  });

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      position={position} 
      colliders="cuboid" 
      restitution={0.7}
      friction={0.5}
      name={`cube-${id}`}
    >
      <mesh 
        onPointerOver={() => setHover(true)} 
        onPointerOut={() => setHover(false)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={color} 
          emissive={hovered ? color : 'black'} 
          emissiveIntensity={hovered ? 0.5 : 0}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
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

const RotatingBox = ({ color = '#4f46e5', speed = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHover] = useState(false);
  
  useGSAP(() => {
    if (!meshRef.current || !materialRef.current) return;
    const targetScale = hovered ? 1.5 : 1;
    gsap.to(meshRef.current.scale, { 
      x: targetScale, 
      y: targetScale, 
      z: targetScale, 
      duration: 0.4,
      ease: 'back.out(1.7)'
    });
    
    gsap.to(materialRef.current.color, {
      r: new THREE.Color(hovered ? '#ff0055' : color).r,
      g: new THREE.Color(hovered ? '#ff0055' : color).g,
      b: new THREE.Color(hovered ? '#ff0055' : color).b,
      duration: 0.4
    });
  }, { dependencies: [hovered, color] });

  useFrame((state, delta) => {
    if (rigidBodyRef.current) {
      // Manual kinematic rotation for physics interaction
      const curRotation = rigidBodyRef.current.rotation();
      const quaternion = new THREE.Quaternion(curRotation.x, curRotation.y, curRotation.z, curRotation.w);
      const euler = new THREE.Euler().setFromQuaternion(quaternion);
      
      euler.y += delta * speed;
      euler.x += delta * speed * 0.8; // Increased X rotation speed for "auto x rotate" focus
      euler.z += delta * speed * 0.2; // Added slight Z for more dynamic look
      
      rigidBodyRef.current.setNextKinematicRotation(new THREE.Quaternion().setFromEuler(euler));
    }
  });

  return (
    <RigidBody ref={rigidBodyRef} type="kinematicVelocity" position={[0, 1, 0]} colliders="cuboid">
      <mesh 
        ref={meshRef} 
        onPointerOver={() => setHover(true)} 
        onPointerOut={() => setHover(false)} 
        castShadow
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial ref={materialRef} color={color} metalness={0.8} roughness={0.1} />
      </mesh>
    </RigidBody>
  );
};

const Scene3D: React.FC<{ showSky?: boolean }> = ({ showSky = true }) => {
  const { cubes, addCube } = usePhysicsStore();

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
          Spawn Cube
        </button>
      </div>

      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={50} />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 20, 10]} angle={0.3} penumbra={1} intensity={1500} castShadow />
        
        <Physics gravity={[0, -9.81, 0]}>
          <RotatingBox />
          {cubes.map((cube) => (
            <PhysicsCube key={cube.id} {...cube} />
          ))}
          <Floor />
        </Physics>
        
        <ContactShadows position={[0, -1.45, 0]} opacity={0.6} scale={20} blur={2} far={4.5} />
        {showSky && <Sky sunPosition={[100, 20, 100]} />}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default Scene3D;
