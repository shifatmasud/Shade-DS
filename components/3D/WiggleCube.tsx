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
    // 1. Create Bones: Centered 5-bone structure (Root -> Top Chain, Root -> Bottom Chain)
    const rootBone = new THREE.Bone();
    const up1 = new THREE.Bone();
    const up2 = new THREE.Bone();
    const down1 = new THREE.Bone();
    const down2 = new THREE.Bone();

    // Position bones exactly relative to cube bounds [ -size/2, size/2 ]
    rootBone.position.set(0, 0, 0);
    up1.position.set(0, size / 4, 0);
    up2.position.set(0, size / 4, 0); // World Y: size/2
    down1.position.set(0, -size / 4, 0);
    down2.position.set(0, -size / 4, 0); // World Y: -size/2

    rootBone.add(up1);
    up1.add(up2);
    rootBone.add(down1);
    down1.add(down2);

    const bones = [rootBone, up1, up2, down1, down2];
    const skeleton = new THREE.Skeleton(bones);

    // 2. Create Skinned Geometry with uniform segments
    const geo = new THREE.BoxGeometry(size, size, size, 8, 8, 8);
    
    const skinIndices = [];
    const skinWeights = [];
    const posAttr = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      const y = v.y; // [-size/2, size/2]
      
      if (y >= 0) {
        // Upper half: root(0), up1(1), up2(2)
        if (y < size / 4) {
          const t = y / (size / 4);
          skinIndices.push(0, 1, 0, 0);
          skinWeights.push(1 - t, t, 0, 0);
        } else {
          const t = (y - size / 4) / (size / 4);
          skinIndices.push(1, 2, 0, 0);
          skinWeights.push(1 - t, t, 0, 0);
        }
      } else {
        // Lower half: root(0), down1(3), down2(4)
        const ay = Math.abs(y);
        if (ay < size / 4) {
          const t = ay / (size / 4);
          skinIndices.push(0, 3, 0, 0);
          skinWeights.push(1 - t, t, 0, 0);
        } else {
          const t = (ay - size / 4) / (size / 4);
          skinIndices.push(3, 4, 0, 0);
          skinWeights.push(1 - t, t, 0, 0);
        }
      }
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    return { geometry: geo, skeleton, root: rootBone };
  }, [size]);

  // LOGIC: Initialize WiggleBones
  useEffect(() => {
    // We create wiggle bones for all active joints in the symmetrical chain
    const wb1 = new WiggleBone(skeleton.bones[1], { velocity: 0.2, damping: 0.2, stiffness: 0.1 });
    const wb2 = new WiggleBone(skeleton.bones[2], { velocity: 0.2, damping: 0.2, stiffness: 0.1 });
    const wb3 = new WiggleBone(skeleton.bones[3], { velocity: 0.2, damping: 0.2, stiffness: 0.1 });
    const wb4 = new WiggleBone(skeleton.bones[4], { velocity: 0.2, damping: 0.2, stiffness: 0.1 });
    
    wiggleBones.current = [wb1, wb2, wb3, wb4];

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
      <primitive object={root} />
      <skinnedMesh 
        ref={meshRef}
        geometry={geometry}
        skeleton={skeleton}
        castShadow
        receiveShadow
      >
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
