# PRD: JellyBox Deformation Refinement

## 1. Goal
Refine the 3D JellyBox (WiggleCube) component to provide a more responsive, physically-accurate, and subtle interactive experience. The deformation should feel like an extension of the physics engine (Rapier) rather than a separate isolated animation.

## 2. Requirements
### 2.1. Visuals & Interaction
- **No Color Shift**: Remove the white color change on hover.
- **Proximity-Based Deformation**: Subtle geometry deformation when the mouse/pointer is near the cube.
- **Touch/Drag Deformation**: Responsive deformation during active drag.
- **Subtle Motion**: Avoid extreme or jagged mesh distortions.

### 2.2. Physics Integration (Rapier Commander)
- **Rapier as Source of Truth**: The vertex shader must derive its primary deformation signals from Rapier's state (linear velocity, angular velocity, acceleration).
- **Directional Awareness**: Deformation should lean or squish in the direction of travel.
- **Impact Sensitivity**: Large impulses from Rapier collisions should trigger proportional ripple effects.
- **Speed & Acceleration**: Higher speeds/accelerations should cause more significant "leaning" or "stretching".

### 2.3. Shader Logic
- **No Infinite Loops**: Remove self-sustaining oscillation loops in the shader. Deformation should decay naturally or stop when the physical body is at rest.
- **Collision Safety**: The vertex shader must be aware of the floor plane (or world boundaries) to prevent the "jelly" from visually clipping through solid ground during heavy squishing.
- **Performance**: Maintain high performance with analytical normal reconstruction.

## 3. Success Criteria
- The cube feels "soft" and responsive to touch.
- Motion feels physically grounded (e.g., squishes on impact, leans on acceleration).
- No visual clipping through the floor.
- Clean code with clear separation between physics logic and shader uniforms.
