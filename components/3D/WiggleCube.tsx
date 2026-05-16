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
    // 1. Create Star-Rig Bones: Root centered, 2 bones per axis (total 13 bones)
    const bones: THREE.Bone[] = [];
    const rootBone = new THREE.Bone();
    rootBone.name = "root";
    bones.push(rootBone);

    const axes = [
      { name: 'up', dir: [0, 1, 0] },
      { name: 'down', dir: [0, -1, 0] },
      { name: 'left', dir: [-1, 0, 0] },
      { name: 'right', dir: [1, 0, 0] },
      { name: 'front', dir: [0, 0, 1] },
      { name: 'back', dir: [0, 0, -1] }
    ];

    axes.forEach(axis => {
      const b1 = new THREE.Bone();
      const b2 = new THREE.Bone();
      
      const step = size / 4;
      b1.position.set(axis.dir[0] * step, axis.dir[1] * step, axis.dir[2] * step);
      b2.position.set(axis.dir[0] * step, axis.dir[1] * step, axis.dir[2] * step);
      
      rootBone.add(b1);
      b1.add(b2);
      bones.push(b1, b2);
    });

    const skeleton = new THREE.Skeleton(bones);

    // 2. Create Skinned Geometry with axis-aligned weights
    const geo = new THREE.BoxGeometry(size, size, size, 12, 12, 12);
    
    const skinIndices = [];
    const skinWeights = [];
    const posAttr = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      
      // Find primary axis for weighting
      const absX = Math.abs(v.x);
      const absY = Math.abs(v.y);
      const absZ = Math.abs(v.z);
      const max = Math.max(absX, absY, absZ);
      
      let boneIdx1 = 0;
      let boneIdx2 = 0;
      let weight = 0;

      const halfSize = size / 2;

      if (max === absY) {
        const isPos = v.y > 0;
        boneIdx1 = isPos ? 1 : 3;
        boneIdx2 = isPos ? 2 : 4;
        weight = absY / halfSize;
      } else if (max === absX) {
        const isPos = v.x > 0;
        boneIdx1 = isPos ? 7 : 5;
        boneIdx2 = isPos ? 8 : 6;
        weight = absX / halfSize;
      } else {
        const isPos = v.z > 0;
        boneIdx1 = isPos ? 11 : 9;
        boneIdx2 = isPos ? 12 : 10;
        weight = absZ / halfSize;
      }

      // Linear blend: 0 -> 0.5 (Root to B1), 0.5 -> 1.0 (B1 to B2)
      if (weight < 0.5) {
        const t = weight / 0.5;
        skinIndices.push(0, boneIdx1, 0, 0);
        skinWeights.push(1 - t, t, 0, 0);
      } else {
        const t = (weight - 0.5) / 0.5;
        skinIndices.push(boneIdx1, boneIdx2, 0, 0);
        skinWeights.push(1 - t, t, 0, 0);
      }
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    return { geometry: geo, skeleton, root: rootBone };
  }, [size]);

  // LOGIC: Initialize WiggleBones for all 12 dynamic joints
  useEffect(() => {
    const instances = skeleton.bones
      .slice(1) // Skip root
      .map(bone => new WiggleBone(bone, { 
        velocity: 0.25, 
        damping: 0.3, 
        stiffness: 0.15 
      }));
    
    wiggleBones.current = instances;

    return () => {
      instances.forEach(wb => wb.dispose?.());
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
