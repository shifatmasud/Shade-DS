# ADR: JellyBox Shader-Physics Coupling

## Context
The current `JellyBox` implements its own spring-mass oscillators in `useFrame`, which sometimes "fights" with the Rapier physics engine, leading to visual desync or unrealistic "perpetual wobble".

## Decision
We will switch to a **Physics-Driven (Rapier Commander)** model for the vertex shader.

## Details
1.  **Uniform Source**: Instead of internal oscillators, the shader uniforms (`uMomentumForce`, `uWobbleOffset`) will be driven directly by the delta of Rapier's linear and angular velocity.
2.  **Squish-on-Impact**: When Rapier reports a collision, we will use the manifold normal and impact velocity to set the `uImpact` uniforms.
3.  **Ground Clamping**: We will pass the world position of the floor to the shader or use a local-space height clamp in the `getDeformedPos` function to ensure vertices never dip below the `minY` threshold (adjusted for world rotation).
4.  **Proximity Logic**: Implement a `useFrame` check for mouse proximity to trigger a subtle "attraction/repulsion" deformation uniform.

## Consequences
- **Pros**: Perfectly synced physics and visuals. No more "floating" jelly behavior.
- **Cons**: Slightly more complex mapping between world-space physics vectors and local-space shader vectors.
- **Mitigation**: Use `matrixWorld` and `inverseNormalMatrix` to correctly transform vectors before passing them to uniforms.
