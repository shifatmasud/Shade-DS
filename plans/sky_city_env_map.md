# Tech Spec - Optimized Sky & City Environment Map

1. **Objective**
   - Implement a high-performance "Sky & City" environment map following `r3f-3d-optimization` guidelines.
   - Eliminate startup lag caused by HDRI processing (PMREM generation).
   - Provide a cohesive visual atmosphere for the 3D jelly physics scene.

2. **Success Criteria**
   - **Zero-Freeze Mounting**: Environment map loads only after UI stabilizes using `requestIdleCallback`.
   - **Visual Quality**: A visible city-scape background providing realistic reflections to jelly cubes.
   - **Performance**: Maintaining 60FPS with optimized shadow maps and simplified materials.

3. **Project Requirements**
   - [ ] Refactor `ProgressiveEnvironment` in `scene.tsx` to include `background` rendering.
   - [ ] Set `Environment` resolution to `256` for a balance between clarity and memory.
   - [ ] Remove or integrate the basic `Sky` component to avoid redundant atmospheric rendering.
   - [ ] Optimize `Floor` material by reducing `clearcoat` costs as per the performance skill.

4. **Architecture Decisions**
   - **Environment Mapping**: Leverage `@react-three/drei`'s built-in presets to avoid external asset loading bottlenecks.
   - **Progressive Hydration**: Use a 2-frame delay + `requestIdleCallback` to ensure the main thread is free for UI layout before starting WebGL heavy lifting.
   - **Material Simplification**: Minimize `MeshPhysicalMaterial` features like `clearcoat` on large surface areas (floor) to reduce fragment shader complexity.

5. **Pseudo Code**
```tsx
// Inside scene.tsx
const ProgressiveEnvironment = () => {
  const [shouldMount, setShouldMount] = useState(false);
  
  useFrame((state, delta) => {
    // Wait for frame 2, then schedule mount on idle
    if (frameCount === 2) {
      requestIdleCallback(() => setShouldMount(true));
    }
  });

  return shouldMount ? (
    <Environment 
      preset="city" 
      background 
      resolution={256} 
      frames={Infinity} // Allow dynamic updates if scene changes, but low res
    />
  ) : null;
};
```
