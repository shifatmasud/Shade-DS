/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float, Sky } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface Scene3DProps {
  boxColor?: string;
  rotationSpeed?: number;
  onBoxClick?: () => void;
  showSky?: boolean;
}

const RotatingBox = ({ color = '#4f46e5', speed = 1, onClick }: { color?: string; speed?: number; onClick?: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  
  // Drag state
  const rotationRef = useRef({ x: 0, y: 0 });
  const lastRotationRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });

  // GSAP Animations for interaction
  useGSAP(() => {
    if (!meshRef.current || !materialRef.current) return;

    // Scale animation
    const targetScale = (hovered || pressed) ? 1.25 : 1;
    gsap.to(meshRef.current.scale, {
      x: targetScale,
      y: targetScale,
      z: targetScale,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    // Color animation
    const targetColor = pressed ? '#00ff88' : (hovered ? '#ff0055' : color);
    gsap.to(materialRef.current.color, {
      r: new THREE.Color(targetColor).r,
      g: new THREE.Color(targetColor).g,
      b: new THREE.Color(targetColor).b,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  }, { dependencies: [hovered, pressed, color] });

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Calculate velocity while dragging for a smoother inertia start
      if (pressed) {
        velocityRef.current.x = (rotationRef.current.x - lastRotationRef.current.x) / delta;
        velocityRef.current.y = (rotationRef.current.y - lastRotationRef.current.y) / delta;
      }
      
      lastRotationRef.current.x = rotationRef.current.x;
      lastRotationRef.current.y = rotationRef.current.y;

      // Apply the accumulated rotation
      meshRef.current.rotation.x = rotationRef.current.x;
      meshRef.current.rotation.y = rotationRef.current.y;
      
      // Add a tiny bit of auto-rotation if not being dragged AND not being tweened by GSAP
      const isTweening = gsap.isTweening(rotationRef.current);
      if (!pressed && !isTweening) {
        rotationRef.current.x += delta * speed * 0.2;
        rotationRef.current.y += delta * speed * 0.1;
      }
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setPressed(true);
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
    
    // Kill any active inertia tween
    gsap.killTweensOf(rotationRef.current);
    
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: any) => {
    setPressed(false);
    e.target.releasePointerCapture(e.pointerId);
    
    // Simple tween instead of inertia
    gsap.to(rotationRef.current, {
      duration: 2,
      ease: 'power3.out',
      overwrite: true
    });
  };

  const handlePointerMove = (e: any) => {
    if (pressed) {
      const deltaX = e.clientX - lastPointerRef.current.x;
      const deltaY = e.clientY - lastPointerRef.current.y;
      
      // Update rotation
      rotationRef.current.y += deltaX * 0.005;
      rotationRef.current.x += deltaY * 0.005;
      
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  return (
    <Float speed={pressed ? 0 : 2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setPressed(false)}
        onClick={onClick}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={materialRef} color={color} metalness={0.5} roughness={0.2} />
      </mesh>
    </Float>
  );
};

const Scene3D: React.FC<Scene3DProps> = ({ boxColor, rotationSpeed, onBoxClick, showSky = true }) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative', overflow: 'hidden' }}>
      <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={1} />
        
        <RotatingBox color={boxColor} speed={rotationSpeed} onClick={onBoxClick} />
        
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
        {showSky && <Sky sunPosition={[100, 20, 100]} />}
        <Environment preset="city" background={true} />
        <OrbitControls makeDefault enablePan={false} enableZoom={true} enableRotate={false} />
      </Canvas>
    </div>
  );
};

export default Scene3D;
