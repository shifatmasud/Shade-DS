# OKR - Hit & Velocity-Based Jelly Deformation

## Objective 1: Deliver highly satisfying, tactile, and physically realistic collision feedback for 3D Jelly Cubes.

### Key Results:
- **KR 1.1**: 100% of physical collisions (with floor, walls, or other cubes) register a local impact deformation starting precisely at the contact point.
- **KR 1.2**: Impact squish amplitude scales dynamically from 0.0 to 0.4 of cube size based on impact velocity (preventing geometry folding/clipping).
- **KR 1.3**: Propagating shockwave ripples through the cube surface and completely dissipates within 1.5 seconds under damped harmonic oscillation.
- **KR 1.4**: Incorporate real-time volume preservation (transverse expansion) where vertical squish triggers horizontal bulge on ground impact.

## Objective 2: Ensure pristine performance and visual fidelity under heavy collision scenarios.

### Key Results:
- **KR 2.1**: Maintain 60+ FPS (or maximum device frame rate) in the viewport with at least 5 active spawned jelly cubes bouncing and colliding simultaneously.
- **KR 2.2**: 0 instances of React re-renders triggered by physics collisions, achieved by piping contact uniform updates directly through the `useFrame` loop.
- **KR 2.3**: Analytical normal reconstruction remains stable without NaN or infinity artifacts, keeping glassy clearcoat reflections perfectly smooth during high-impact squishes.
