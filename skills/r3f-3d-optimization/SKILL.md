---
name: r3f-3d-optimization
description: Guidelines and production-ready patterns for maximizing performance and avoiding UI freezes in React Three Fiber (R3F) and Three.js scenes.
---

# React Three Fiber (R3F) 3D Performance Optimization Guide

This skill provides verified, highly effective optimization techniques for rendering interactive 3D WebGL scenes smoothly on both desktop and mobile web devices without blocking the main rendering thread.

---

## 1. Zero-Freeze Environment Mounting (Progressive Hydration)
Loading environment maps (HDRs) at startup can freeze the UI while the GPU compiles Prefiltered Mipmapped Radiance Environment Maps (PMREM). To prevent this, use a progressive loader that waits for the initial flat DOM/UI frame cycles to stabilize, then schedules mounting using `requestIdleCallback`. Lower environment resolution to `128` for mobile performance budgeting.

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

## 2. Low-Cost Post-Processed Anti-Aliasing & Canvas DPR Budgeting
By default, WebGL leverages multi-sample anti-aliasing (MSAA), which is computationally heavy on mobile devices.
- **Zero MSAA**: Set `antialias: false` on the Canvas context.
- **Balanced SMAA**: Wrap the scene in an `<EffectComposer>` using `<SMAA preset={SMAAPreset.MEDIUM} />`.
- **DPR Capping**: Cap device pixel ratio dynamically to `[0.75, 1.25]` to avoid fill-rate bottlenecks on high-density mobile displays.

```tsx
import { Canvas } from '@react-three/fiber';
import { EffectComposer, SMAA } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing';

export const OptimalCanvas = ({ children }) => (
  <Canvas 
    gl={{ antialias: false, powerPreference: 'high-performance' }}
    dpr={[0.75, 1.25]} // Capped DPR range prevents 4K/3X density render stalls
  >
    {children}
    
    <EffectComposer>
      <SMAA preset={SMAAPreset.MEDIUM} />
    </EffectComposer>
  </Canvas>
);
```

---

## 3. Light, Shadow & Material Overhead Budgeting
- **Shadow Maps**: Keep shadow map resolution scaled to budget (e.g. `512x512` with `PCFShadowMap`).
- **Eliminate Unnecessary Transmission**: `transmission` in `MeshPhysicalMaterial` causes Three.js to render an extra offscreen screen-pass copy per frame. Remove transmission from background elements (like floors, walls, planes) and replace them with standard `MeshStandardMaterial`.
- **Simplify Material Effects**: Turn off `clearcoat` (`clearcoat: 0.0`) and keep roughness stable to prevent shader re-compilation.

```tsx
// Floor / Plane Optimization (Zero offscreen buffer copy overhead)
<mesh receiveShadow>
  <boxGeometry args={[20, 1, 20]} />
  <meshStandardMaterial color="#08080c" roughness={0.2} metalness={0.4} />
</mesh>
```

---

## 4. Geometry Subdivision Budgeting & Physics Optimization
- **Geometry Segment Caps**: Reduce geometry subdivisions to the minimum necessary. For example, scale down `BoxGeometry` from `8x8x8` (384 vertices) to `5x5x5` (150 vertices) for a ~60% reduction in vertex shader operations.
- **Physics CCD (Continuous Collision Detection)**: Disable `ccd={true}` on Rapier/PhysX bodies unless high-speed anti-tunneling is strictly necessary. CCD adds CPU ray-casting overhead every physics sub-step.
- **Eliminate Per-Frame Web Worker IPC**: Avoid sending `postMessage` to Web Workers every frame inside `useFrame` for simple timeline or animation updates. Main-thread array iteration inside `useFrame` takes < 0.01ms and completely avoids JSON serialization and thread IPC overhead.

