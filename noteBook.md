# Development Notebook - Jelly GPGPU Transition

## 2026-05-16: Architecture Shift
- **Issue**: `WiggleBone` relies on CPU-side bone updates which scale poorly with complex geometry and high instance counts.
- **Solution**: GPGPU (General-Purpose GPU) simulation. 
- **Implementation**:
    - Use two FBOs (Frame Buffer Objects) to ping-pong vertex positions and velocities.
    - Each pixel in the FBO maps to a vertex index on the `BoxGeometry`.
    - Simulation shader (compute) applies Hooke's Law (springs) and Damping.
    - Vertex shader displaces vertices based on FBO data.

## Physics Parameters
- **Stiffness**: 0.8 (Snappy return)
- **Damping**: 0.95 (Stable settling)
- **Mass**: 1.0
