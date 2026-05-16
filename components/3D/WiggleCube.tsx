import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
// @ts-ignore
import { WiggleBone } from 'wiggle';

/**
 * COMPONENT: WigglingBox
 * Renders a physics-enabled cube that jiggles using WiggleBone.
 * Architecture:
 * DATA -> Skeleton + SkinnedGeometry
 * LOGIC -> WiggleBone updates on each frame
 * RENDER -> SkinnedMesh
 */
export const WigglingBox = ({ color, size = 1 }: { color: string, size?: number }) => {
  const meshRef = useRef<THREE.SkinnedMesh>(null);
  const wiggleBones = useRef<any[]>([]);

  const { geometry, skeleton, root } = useMemo(() => {
    // 1. Create Bones: A linear chain from bottom to top
    const rootBone = new THREE.Bone();
    const b1 = new THREE.Bone();
    const b2 = new THREE.Bone();
    const b3 = new THREE.Bone();

    // LOGIC: Divide the cube height (size) into 3 segments
    const interval = size / 3;
    
    // Root bone at the very bottom
    rootBone.position.set(0, -size / 2, 0);
    // Chain going upwards
    b1.position.set(0, interval, 0);
    b2.position.set(0, interval, 0);
    b3.position.set(0, interval, 0);

    rootBone.add(b1);
    b1.add(b2);
    b2.add(b3);

    const bones = [rootBone, b1, b2, b3];
    const skeleton = new THREE.Skeleton(bones);

    // 2. Create Skinned Geometry with skin weights mapped to height
    const geo = new THREE.BoxGeometry(size, size, size, 12, 12, 12);
    
    const skinIndices = [];
    const skinWeights = [];
    const posAttr = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      const y = v.y; // Range: [-size/2, size/2]
      
      // Normalize y to [0, 1] range for skinning (0 at bottom, 1 at top)
      const u = (y + size / 2) / size;
      
      if (u < 1/3) {
        // Between root(0) and b1(1)
        const t = u * 3;
        skinIndices.push(0, 1, 0, 0);
        skinWeights.push(1 - t, t, 0, 0);
      } else if (u < 2/3) {
        // Between b1(1) and b2(2)
        const t = (u - 1/3) * 3;
        skinIndices.push(1, 2, 0, 0);
        skinWeights.push(1 - t, t, 0, 0);
      } else {
        // Between b2(2) and b3(3)
        const t = Math.min((u - 2/3) * 3, 1);
        skinIndices.push(2, 3, 0, 0);
        skinWeights.push(1 - t, t, 0, 0);
      }
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    return { geometry: geo, skeleton, root: rootBone };
  }, [size]);

  // LOGIC: Initialize WiggleBones
  useEffect(() => {
    // Only child bones wiggle; root stays attached to the "input" body
    const wb1 = new WiggleBone(skeleton.bones[1], { velocity: 0.25, damping: 0.15, stiffness: 0.1 });
    const wb2 = new WiggleBone(skeleton.bones[2], { velocity: 0.25, damping: 0.15, stiffness: 0.1 });
    const wb3 = new WiggleBone(skeleton.bones[3], { velocity: 0.25, damping: 0.15, stiffness: 0.1 });
    
    wiggleBones.current = [wb1, wb2, wb3];

    return () => {
      wiggleBones.current = [];
    };
  }, [skeleton]);

  // EFFECT: Update wiggle bones per frame
  useFrame(() => {
    wiggleBones.current.forEach(wb => wb.update());
  });

  return (
    <group>
      <skinnedMesh 
        ref={meshRef}
        geometry={geometry}
        skeleton={skeleton}
        castShadow
        receiveShadow
      >
        <primitive object={root} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.6} 
          roughness={0.2} 
          emissive={color}
          emissiveIntensity={0.1}
        />
      </skinnedMesh>
    </group>
  );
};
