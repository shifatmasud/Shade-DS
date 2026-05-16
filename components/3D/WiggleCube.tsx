import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
// @ts-ignore
import { WiggleBone } from 'wiggle';

/**
 * COMPONENT: SimpleBox
 * UPDATED: Replaces WiggleCube for main rotating element. Normal cube geometry.
 * To undo: Swap back to GellyBox/WigglingBox in scene.tsx
 */
export const SimpleBox = ({ color, size = 1 }: { color: string, size?: number }) => {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial 
        color={color} 
        metalness={0.6} 
        roughness={0.2} 
        emissive={color}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
};

/**
 * COMPONENT: GellyBox
 * UPDATED: Enhanced jiggle physics and cuboid geometry for premium feel.
 * To undo: Restore WigglingBox signature and simpler physics.
 */
export const GellyBox = ({ color, size = 1, width = 1, height = 1.5, depth = 1 }: { color: string, size?: number, width?: number, height?: number, depth?: number }) => {
  const meshRef = useRef<THREE.SkinnedMesh>(null);
  const wiggleBones = useRef<any[]>([]);

  // Scale based on size prop if provided, otherwise use explicit dimensions
  const w = size !== 1 ? size : width;
  const h = size !== 1 ? size * 1.5 : height;
  const d = size !== 1 ? size : depth;

  const { geometry, skeleton, bonesGroup } = useMemo(() => {
    // 1. Create Bones: A linear chain of 7 bones for smoother deformation
    const numBones = 7;
    const bones: THREE.Bone[] = [];
    
    const totalHeight = h;
    const interval = totalHeight / (numBones - 1);

    for (let i = 0; i < numBones; i++) {
      const bone = new THREE.Bone();
      if (i === 0) {
        bone.position.set(0, -totalHeight / 2, 0);
      } else {
        bone.position.set(0, interval, 0);
        bones[i - 1].add(bone);
      }
      bones.push(bone);
    }

    const bonesGroup = new THREE.Group();
    bonesGroup.add(bones[0]);

    const skeleton = new THREE.Skeleton(bones);

    // 2. Create Skinned Geometry (Subdivided for jelly look)
    const geo = new THREE.BoxGeometry(w, h, d, 4, 16, 4);
    
    const skinIndices = [];
    const skinWeights = [];
    const posAttr = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      const y = v.y; // Range: [-h/2, h/2]
      
      const u = Math.max(0, Math.min(1, (y + h / 2) / h));
      
      const segmentHeight = 1 / (numBones - 1);
      const rawSegment = u / segmentHeight;
      const segmentIndex = Math.floor(rawSegment);
      const t = rawSegment - segmentIndex;

      const idx1 = Math.min(segmentIndex, numBones - 2);
      const idx2 = idx1 + 1;

      skinIndices.push(idx1, idx2, 0, 0);
      skinWeights.push(1 - t, t, 0, 0);
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    return { geometry: geo, skeleton, bonesGroup };
  }, [w, h, d]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.bind(skeleton);
    }
  }, [skeleton]);

  useEffect(() => {
    // Premium Configuration: High stiffness but enough damping for that "gelly" settle
    const config = { velocity: 0.1, damping: 0.25, stiffness: 0.4 };
    wiggleBones.current = skeleton.bones.slice(1).map(bone => new WiggleBone(bone, config));

    return () => {
      wiggleBones.current.forEach(wb => wb.dispose?.());
      wiggleBones.current = [];
    };
  }, [skeleton]);

  useFrame(() => {
    wiggleBones.current.forEach(wb => wb.update());
  });

  return (
    <group>
      <primitive object={bonesGroup} />
      <skinnedMesh 
        ref={meshRef}
        geometry={geometry}
        skeleton={skeleton}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial 
          color={color} 
          metalness={0.4} 
          roughness={0.1} 
          emissive={color}
          emissiveIntensity={0.2}
          transparent={true}
          opacity={0.9}
        />
      </skinnedMesh>
    </group>
  );
};
