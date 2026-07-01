# Architecture Decision Record (ADR) - Vertex-Shader Deformed Physical Material for Jelly Cubes

## Context
We need to simulate realistic, squishy jelly-like cubes in a WebGL-based React environment (using React Three Fiber and Rapier).
Traditional methods like GPGPU (General-Purpose GPU spring-mass lattices using ping-pong framebuffers) can render deforming geometry, but:
1. They require floating-point texture formats (`FloatType` or `HalfFloatType`) for rendering, which are frequently unsupported or restricted in browser iframes or on older mobile devices (resulting in rendering failure, black boxes, or crashes).
2. It's difficult to integrate them with Three.js's native high-end physically based materials (like `MeshPhysicalMaterial` with transmission, refraction, and clearcoat) because they require writing custom shaders from scratch, losing built-in lighting, shadow maps, environment maps, and tone-mapping features.

## Decision
We choose to implement vertex deformation directly inside Three.js's native `MeshPhysicalMaterial` via `onBeforeCompile` vertex shader injection, combined with:
1. An analytical spring-mass damping physics solver running in React Three Fiber's `useFrame` loop.
2. Direct mouse raycasting to compute the exact mesh-local intersection point and real-time cursor drag vector.
3. On-the-fly finite-difference normal reconstruction in the vertex shader to warp specular highlights.

## Consequences
- **Visuals**: stunning, wet, refractive, glassy gelatin appearance that perfectly interacts with the sky, lights, and shadows.
- **Interactivity**: grabbing a cube literally stretches and bends it from that point, then lets it snap back and wobble elastically.
- **Stability**: 100% robust on all mobile and desktop web browsers since it uses standard vertex displacement and standard MeshPhysicalMaterial, completely bypassing risky floating-point FBOs.
- **Performance**: negligible overhead because the math is computed per-vertex in the GPU rather than per-texel or in a separate render pass.
