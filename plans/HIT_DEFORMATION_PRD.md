# Product Requirement Document (PRD) - Hit & Velocity-Based 3D Jelly Deformation

## 1. Executive Summary & Goals
The objective of this upgrade is to replace the current basic momentum wobble of the 3D Jelly Cubes with a high-fidelity, highly physical **hit and velocity-based deformation system**. Currently, cubes only deform from mouse drag gestures and general vertical shear, ignoring actual physical contact positions and impact velocities during collision with other cubes or the floor.

### Core Goals:
- **Collision-Aware Squishing**: When a jelly cube impacts the floor or another cube, it must deform *from the exact contact point* rather than a general body-wide bend.
- **Velocity-Responsive Intensity**: The amplitude, frequency, and decay of the impact deformation must scale proportionally with the impact velocity.
- **Multi-Impact Support**: The shader must track and animate up to 3 simultaneous or overlapping impact ripples to support dense multi-cube collisions beautifully.
- **Physical Volume Preservation**: The cube must compress along the collision axis and expand/bulge along the orthogonal axes on impact (Poisson-like squish & spread), preserving visual mass.
- **Maintain 60+ FPS & Glass Refraction**: The deformation must run entirely in the vertex shader, keeping the analytical normal reconstruction pristine to maintain glossy translucent refraction and clearcoat highlights.

## 2. Functional Requirements

### R1: Rapier Collision Contact Extraction
- Extract physical contact point coordinates (`manifold.contactPoint(0)`) and collision normals (`manifold.normal()`) inside the `onCollisionEnter` callback of the `@react-three/rapier` RigidBody.
- Calculate the relative impact velocity or impulse at the contact point.

### R2: Multi-Impact Uniform Pipeline
- Pass an array of 3 active impact structures (`uImpacts`) to the vertex shader.
- Each impact contains:
  - Local contact position (`vec3 point`)
  - Local impact normal direction (`vec3 normal`)
  - Local impact force vector (`vec3 force`)
  - Time since impact occurred (`float time`)
  - Initial velocity scale / intensity (`float intensity`)
  - Active status (`float active`)

### R3: Vertex Shader Analytical Deformation Graph
Implement three distinct layers of deformation per active impact:
1. **Localized Contact Squish (Gaussian Dent)**: Creates an instant localized indentation at the contact region that springs back.
2. **Propagating Ripple Shockwave**: A concentric sine wave that propagates outward from the contact point across the geometry, decaying over time.
3. **Volume-Preserving Bulge (Squish & Spread)**: Compresses the cube along the collision normal and expands it radially in the orthogonal plane to preserve mass.

### R4: Analytical Normal Reconstruction
- Recalculate vertex normals on-the-fly using finite-differences of the newly upgraded multi-impact deformation function, ensuring reflections warp smoothly with the impact waves.

## 3. Performance & Stability Criteria
- **Zero React Re-renders**: Impact state and uniform updates must be written directly to the Three.js material uniform references in the `useFrame` loop, bypassing the React component state.
- **Cap dt & Force**: Cap delta time and impact velocity scales to prevent vertex explosion under extreme collisions.
- **Gradual Fade & Garbage Collection**: Automatically decay and deactivate impact entries in the uniform array when their intensity drops below a threshold.
