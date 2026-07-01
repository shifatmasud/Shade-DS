# PRD: Wiggle Cubes Optimization and Web Worker Physics Offloading

## Overview & Objectives
Enhance the performance, interactiveness, and physical correctness of the React Three Fiber (R3F) 3D Wiggle Cubes scene. This includes offloading heavy spring-mass and deformation timelines to a Web Worker, implementing touch/mouse click-based ripples, dampening movement-based leaning/acceleration deformations, and fixing the ground collision clamping bug.

## OKR (Success Criteria)
1. **Web Worker Integration**: 100% of the active spring-mass integrations (drag-wobble and momentum-lean) and collision lifetime counters run in a separate Web Worker thread.
2. **Main Thread Fluidity**: Zero UI stuttering during spawning and dragging of multiple cubes, with FPS remaining steady (60+ FPS target on compatible screens).
3. **Interactive Click Ripples**: Tapping/clicking on a cube triggers a satisfying localized soft-body deform ripple at the exact pointer-down location.
4. **Subtle Leaning**: Inertial and acceleration leaning deformations are scaled down by 90% (to 10% of their original magnitude) to feel heavy, stable, and gelatinous rather than paper-thin.
5. **Ground Physics Correction**: Wiggle cubes fall freely into the abyss if they tumble or are dragged off the static floor bounds, with their mesh correctly following the rigid body instead of clipping or visually floating at the floor plane.

---

# ADR: Architectural Design

## 1. Web Worker Integration via Blob URL
- **Problem**: Vite and sandbox iframe environments have strict path resolution and origin constraints, making external worker script imports prone to network or bundle errors.
- **Solution**: We will implement an **inline Web Worker** using a dynamically created `Blob` URL. This keeps the entire worker codebase self-contained, compile-safe, and instantly executable.
- **Mechanism**:
  - Each `JellyBox` component spins up a dedicated worker on mount and terminates it on unmount.
  - The main thread pushes variables (`dt`, `isDragging`, `dragOffset`, `rigidBodyData`, `stiffness`, `damping`, `size`) to the worker.
  - The worker computes:
    1. Grab wobble spring-mass solvers.
    2. Inertial momentum lean/dampening calculations.
    3. Collision impact elapsed timelines.
  - The worker posts the resulting vectors and timers back to the main thread, which instantly updates the shader uniforms.

## 2. Click-Based Ripples
- **Problem**: Users want to poke and prod the jelly cubes directly without needing high-speed collisions.
- **Solution**: Capture the `onPointerDown` events on the 3D meshes.
  - Retrieve the exact world intersection point (`e.point`) and the face normal.
  - Transform the face normal to world space using the mesh's normal matrix.
  - Invoke `triggerImpact(worldPoint, worldNormal, intensity)` using a custom click intensity (e.g. `1.2`).

## 3. Scaled Movement Deformation
- **Solution**: Scale down velocity and acceleration deformation multipliers by 90%:
  - `leanIntensity` scaled from `0.006` to `0.0006`.
  - `accelIntensity` scaled from `0.002` to `0.0002`.
  - Fallback inertia accumulation scaled from `-0.01` to `-0.001`.

## 4. Ground Clamping Bounds Detection
- **Problem**: The vertex shader unconditionally clamps vertex y-coordinates to `uGroundY` (-1.5) to avoid clipping. This stretches the mesh infinitely when the cube's physics body falls off the floor edge.
- **Solution**:
  - Track the cube's horizontal position in world coordinates (`x`, `z`).
  - Compare with the floor boundaries (radius of `10.0` units + a small buffer for half the cube size).
  - If the cube is over the floor, set `uGroundY` to `-1.5` to enable squish clamping.
  - If the cube falls off the edge, set `uGroundY` to `-100.0` (virtually disabling clamping) to allow the vertices to fall completely naturally under gravity.

---

# TODO List

- [ ] Create inline Web Worker template in `components/3D/WiggleCube.tsx`.
- [ ] Connect `JellyBox` state logic to pass parameters to/from the Worker.
- [ ] Implement click-based pointerdown event listener in `components/3D/scene.tsx` for both rotating and spawned cubes.
- [ ] Adjust the velocity and acceleration deformation scalars in both the Worker code and `JellyBox` by 90%.
- [ ] Add floor boundaries bounds detection to set `uGroundY` dynamically.
- [ ] Verify the application builds and runs correctly via compiling and linting.
