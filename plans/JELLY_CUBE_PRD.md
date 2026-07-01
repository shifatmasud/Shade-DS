# Product Requirement Document (PRD) - Interactive 3D Jelly Cube Soft Body Simulation

## 1. Overview & Goals
The objective is to implement a highly realistic, interactive, and visually stunning 3D soft-body "jelly-like" simulation for the cubes in the application's viewport slot. The method must be robust, performant (60 FPS on mobile), and integrated with physically-based rendering (transmission, glass refraction, reflections).

### Key Goals:
- **Satisfying Tactile squishiness**: Grabbing and pulling a cube should physically stretch it from the exact grab point.
- **Realistic Elastic Wobbling**: Releasing a dragged cube or letting a cube fall/impact should trigger damped harmonic oscillations across the entire body.
- **Pristine Physical Visuals**: Cubes must look like translucent, wet, glossy, gelatin blocks with beautiful glass refraction, clearcoat specular highlights, and subsurface scattering.
- **Perfect Normals**: Deformations must warp reflections and highlights dynamically on the mesh surface.

## 2. Technical Solution: Custom Shader Modified MeshPhysicalMaterial
Instead of explicit CPU tetrahedral solvers (which bottlenecks JavaScript) or GPGPU float texture ping-pong buffers (which suffer from mobile/iframe driver incompatibility), we use a **hybrid vertex-shader deformation engine with analytical normal reconstruction**.

### Architecture:
- **Physics**: Rapier is used for rigid body dynamics (translation, rotation, gravity, floor collision).
- **Vertex Deformation**: Standard subdivided BoxGeometry vertices are deformed on-the-fly in the vertex shader.
  - *Localized Stretch*: Multi-dimensional Gaussian falloff centered at the grab point (`uHitPoint`).
  - *Dynamic Wobble*: Decaying sine waves driven by an analytical damped spring oscillator model ($F = -kx - cv$).
  - *Global Momentum*: Momentum-based whole-body inertia wobble when the rigid body collides or shifts.
- **Normal Reconstruction**: Recomputed using local tangent/bitangent finite differences inside the shader to warp specular reflections perfectly.
- **Material**: Three.js `MeshPhysicalMaterial` with native transmission ($0.85$-$0.95$), index of refraction ($1.35$), roughness ($0.05$), and clearcoat ($1.0$).

## 3. Scope of Implementation
1. **Enhance `WiggleCube.tsx`**: Replace the FBO GPGPU simulation with the robust custom `MeshPhysicalMaterial` shader-deformed `JellyBox`.
2. **Upgrade `scene.tsx`**: Update the interactive `PhysicsCube` and `RotatingBox` to leverage the new interactive grab-and-pull vertex deformation.
3. **Control Panel Integration**: Bind controls (stiffness, damping, viscosity, glass transmission) so users can customize the jelly in real-time.
