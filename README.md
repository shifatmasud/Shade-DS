# Jelly GPGPU Cube

Replaced skeletal `WiggleBone` animation with a high-performance GPGPU-driven vertex shader jelly effect.

## Summary
- **Upgrade**: Switched from SkinnedMesh/WiggleBone to GPGPU-based vertex deformation.
- **Performance**: Reduced CPU overhead by moving physics calculation to GPU via FBO simulation.
- **Aesthetic**: Improved gelatinous fluidity using spring-mass simulation in textures.
- **Architecture**: Modular Shader-based approach integrated with React Three Fiber.

## Architecture (IPO)
- **Input**: Interaction forces, velocity vectors, and local time.
- **Process**: GPGPU Simulation (FBO) computes vertex offsets using spring-mass logic in a position/velocity texture.
- **Output**: Subdivided BoxGeometry deformed by vertex shader sampling.

## Actions
- [x] Create GPGPU simulation logic for vertex physics.
- [x] Implement Vertex/Fragment shaders for jelly effect.
- [x] Replace `JellyBox` in `WiggleCube.tsx` with `JellyGPGPUBox`.
- [x] Integrate with `scene.tsx`.
