---
name: r3f-3d-optimization
description: Guidelines and production-ready patterns for maximizing performance and avoiding UI freezes in React Three Fiber (R3F) and Three.js scenes.
---

# React Three Fiber (R3F) 3D Performance Optimization Guide

This skill provides verified, highly effective optimization techniques for rendering interactive 3D WebGL scenes smoothly on both desktop and mobile web devices without blocking the main rendering thread.

---

## 1. Zero-Freeze Environment Mounting (Progressive Hydration)
Loading environment maps (HDRs) at startup can freeze the UI while the GPU compiles Prefiltered Mipmapped Radiance Environment Maps (PMREM). To prevent this, use a progressive loader that waits for the initial flat DOM/UI frame cycles to stabilize, then schedules mounting using `requestIdleCallback`.

### Implementation Pattern
```tsx
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, useEnvironment } from '@react-three/drei';

// Preload the environment texture early at module initialization
useEnvironment.preload({ preset: 'city' });

const ProgressiveEnvironment: React.FC = () => {
  const [shouldMount, setShouldMount] = useState(false);
  const frameCountRef = useRef(0);

  useFrame(() => {
    if (frameCountRef.current < 2) {
      frameCountRef.current++;
      if (frameCountRef.current === 2) {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            setShouldMount(true);
          }, { timeout: 1000 });
        } else {
          // Fallback for browsers that don't support requestIdleCallback
          setTimeout(() => {
            setShouldMount(true);
          }, 200);
        }
      }
    }
  });

  return shouldMount ? <Environment preset="city" resolution={128} /> : null;
};
```

---

## 2. Low-Cost Post-Processed Anti-Aliasing (SMAA)
By default, WebGL leverages multi-sample anti-aliasing (MSAA), which is computationally heavy on mobile devices. Replacing MSAA with a post-processing SMAA (Subpixel Morphological Anti-Aliasing) pass provides sharp lines and UI edges at a fraction of the performance cost.

### Steps
1. Install post-processing dependencies:
   ```bash
   npm install @react-three/postprocessing postprocessing
   ```
2. Disable default Canvas anti-aliasing: `<Canvas gl={{ antialias: false }}>`
3. Wrap the scene with an `<EffectComposer>` containing `<SMAA>`:

```tsx
import { Canvas } from '@react-three/fiber';
import { EffectComposer, SMAA } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing';

export const OptimalCanvas = ({ children }) => (
  <Canvas 
    gl={{ antialias: false, powerPreference: 'high-performance' }}
    dpr={[1, 1.5]} // Cap DPR at 1.5x on high-density screens
  >
    {children}
    
    <EffectComposer>
      <SMAA preset={SMAAPreset.HIGH} />
    </EffectComposer>
  </Canvas>
);
```

---

## 3. Light & Shadow Map Budgets
High-resolution shadow maps are one of the most common causes of low frame rates. Always scale maps proportionally to the scene requirements.

- **Bad**: `shadow-mapSize={[2048, 2048]}`
- **Optimal**: `shadow-mapSize={[512, 512]}` paired with a soft filter like `PCFShadowMap`.

```tsx
<spotLight 
  position={[5, 10, 5]} 
  castShadow 
  shadow-mapSize-width={512} 
  shadow-mapSize-height={512} 
/>
```

---

## 4. Geometry and Material Simplification
- **Geometry Resolution**: Keep subdivision segments to a minimum. For example, scale down standard `BoxGeometry` subdivisions from `16x16x16` to `8x8x8` unless high precision is strictly necessary for vertex shader deformations.
- **Physical Material Costs**: Avoid compounding highly expensive parameters inside `MeshPhysicalMaterial`:
  - Turn off `clearcoat` (`clearcoat: 0.0`) and `clearcoatRoughness` to drastically simplify specular specular reflections.
  - Set a stable `roughness` value (e.g., `0.08` or higher) to avoid tiny micro-facet highlights that trigger render pipeline recalculations.
