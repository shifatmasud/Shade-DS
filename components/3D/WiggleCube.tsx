import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
// @ts-ignore
import { WiggleBone } from 'wiggle';

/**
 * COMPONENT: JellyBox
 * Renders a physics-enabled cube that behaves like jelly (gelatinous) using WiggleBone.
 * Architecture:
 * DATA -> Skeleton + Highly subdivided SkinnedGeometry
 * LOGIC -> WiggleBone updates on each frame with "premium" spring constants
 * RENDER -> SkinnedMesh
 */
export const JellyBox = ({ color, size = 1 }: { color: string, size?: number }) => {
  const meshRef = useRef<THREE.SkinnedMesh>(null);
  const wiggleBones = useRef<any[]>([]);

  const { geometry, skeleton, bonesGroup } = useMemo(() => {
    // 1. Create Bones: A linear chain for vertical jiggle
    const numBones = 8; // Increased for "premium" smoothness
    const bones: THREE.Bone[] = [];
    
    const chainHeight = size * 0.9;
    const interval = chainHeight / (numBones - 1);

    for (let i = 0; i < numBones; i++) {
      const bone = new THREE.Bone();

      if (i === 0) {
        bone.position.set(0, -chainHeight / 2, 0);
      } else {
        bone.position.set(0, interval, 0);
        bones[i - 1].add(bone);
      }

      bones.push(bone);
    }

    const bonesGroup = new THREE.Group();
    bonesGroup.add(bones[0]);

    const skeleton = new THREE.Skeleton(bones);

    // 2. Create Skinned Geometry with high tessellation
    const geo = new THREE.BoxGeometry(size, size, size, 4, 20, 4);
    
    const skinIndices = [];
    const skinWeights = [];
    const posAttr = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      const y = v.y;
      const u = Math.max(0, Math.min(1, (y + size / 2) / size));
      
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
  }, [size]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.bind(skeleton);
    }
  }, [skeleton]);

  useEffect(() => {
    // "Premium" Jiggle: 99% reduction in velocity intensity.
    // Higher stiffness for more control, while maintaining the "gelly" feel.
    const config = { 
      velocity: 0.0015, // Decreased by 99% (from 0.15)
      damping: 0.35,    // More stable settling
      stiffness: 0.8    // Snappier return to original state
    };
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
        <meshPhysicalMaterial 
          color={color} 
          metalness={0.1} 
          roughness={0.1} 
          transmission={0.4} // Jelly-like translucency
          thickness={0.5}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </skinnedMesh>
    </group>
  );
};
