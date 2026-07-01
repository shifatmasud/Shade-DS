# Architectural Decision Record (ADR) - Hit & Velocity-Based Multi-Impact Shader Integration

## Context
We need to upgrade the 3D Jelly Cube deformation from a simple vertical shear to a highly realistic, collision-aware, and velocity-responsive soft-body deformation. 

To achieve this, we need to solve:
1. **Collision Detection & Contact Points**: How to retrieve the exact contact coordinate and normal when a Rapier rigid body collides.
2. **Data Pipeline**: How to transfer this collision data (impact point, force, time) into the custom WebGL vertex shader of a `MeshPhysicalMaterial`.
3. **Simulation Stability**: How to manage multiple overlapping collisions simultaneously without exploding the vertex shader or causing visual jitter/performance drops.

## Proposed Options

### Option A: CPU-side Vertex Manipulation
- Compute all soft-body math in JS per frame and write back to the geometry's buffer attribute.
- **Pros**: Easy to write in pure TS.
- **Cons**: Severe performance bottleneck. Uploading new vertex data to the GPU on every frame for multiple cubes ruins framerate, especially on mobile.

### Option B: Single-Impact Shader Uniforms
- Feed a single hit point, normal, and force into the vertex shader.
- **Pros**: Low overhead, simple shader logic.
- **Cons**: If a cube hits the floor and is hit by another cube at the same time, the first impact is immediately overridden, causing sudden popping and visual jitter.

### Option C: Multi-Impact Uniform Buffer Array (Selected)
- Implement an array of up to 3 `Impact` structures in the vertex shader. Maintain an impact queue/ring-buffer in the React hook, decaying and recycling slots as impacts fade.
- **Pros**: Stunning visual continuity. Supports multiple simultaneous hits, realistic ripples crossing each other, and fluid integration with Rapier's manifold contact list.
- **Cons**: Requires more sophisticated uniform management and slightly more complex GLSL compilation, but highly optimized on modern GPUs.

## Decision
We select **Option C: Multi-Impact Uniform Buffer Array**.
We will define an `Impact` struct in GLSL, configure a ring buffer of 3 items in `WiggleCube.tsx` to handle impact physics, and extract the real contact manifold from Rapier's `onCollisionEnter`.

## Mathematical & Shader Strategy
- **Concentric Shockwave**: `sin(d * wave_number - t * speed) * exp(-d * spatial_decay) * envelope(t)`
- **Orthogonal Bulge (Poisson Ratio)**: Pushes vertices outwards along directions perpendicular to the impact normal based on the compression depth.
- **Harmonic Spring Oscillator in `useFrame`**: Tracks each impact's elapsed time and oscillating intensity, fading them to zero and recycling them when they are fully decayed.
