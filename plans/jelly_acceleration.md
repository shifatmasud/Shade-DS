# Plan: Jelly Acceleration Squash & Stretch

## PRD (Overview & Objectives)
The user wants to add a "soft jelly square & stretch" effect to the 3D cubes based on acceleration. 
The core of this is calculating acceleration ($a = \frac{v_f - v_i}{dt}$) and using it to deform the cube's geometry.
This will complement the existing impact-based ripples with a global physical deformation that reacts to movement changes.

## OKR (Success Criteria)
- [ ] Calculate acceleration for each cube in real-time.
- [ ] Implement global squash and stretch in the vertex shader.
- [ ] Ensure the effect feels natural (e.g., squashing on impact, stretching when falling).
- [ ] Maintain 60fps performance with multiple cubes.

## ADR (Architectural Design)
- **Velocity Tracking**: We will store the previous frame's velocity in a `useRef` within `JellyBox`.
- **Acceleration Calculation**: In `useFrame`, we'll compute acceleration as the difference in linear velocity divided by delta time.
- **Uniform Mapping**: We'll pass a smoothed version of this acceleration vector to the vertex shader via `uMomentumForce`.
- **Shader Deformation**: The vertex shader will use the acceleration vector to stretch the vertices along the direction of acceleration and squash them in the perpendicular axes (to maintain approximate volume).

## TODO
1. [ ] Update `JellyBoxProps` and uniforms in `WiggleCube.tsx` to include smoothed momentum/acceleration.
2. [ ] Implement velocity tracking and acceleration calculation in `WiggleCube.tsx`'s `useFrame`.
3. [ ] Update the vertex shader in `WiggleCube.tsx` to apply the squash/stretch logic.
4. [ ] Tune the intensity and smoothing constants for a "jelly" feel.
