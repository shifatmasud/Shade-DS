/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float, Sky } from '@react-three/drei';
import * as THREE from 'three';

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

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed;
      meshRef.current.rotation.y += delta * speed * 0.5;
      
      // Lerp scale
      const targetScale = hovered ? 1.2 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 10);
    }
    
    if (materialRef.current) {
      // Lerp color
      const targetColor = new THREE.Color(hovered ? '#ff0055' : color);
      materialRef.current.color.lerp(targetColor, delta * 10);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
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
    <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={1} />
        
        <RotatingBox color={boxColor} speed={rotationSpeed} onClick={onBoxClick} />
        
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
        {showSky && <Sky sunPosition={[100, 20, 100]} />}
        <Environment preset="city" background={false} />
        <OrbitControls makeDefault enablePan={false} enableZoom={true} />
      </Canvas>
    </div>
  );
};

export default Scene3D;
