# TODO - Hit & Velocity-Based Jelly Deformation Implementation Plan

- [ ] **Phase 1: Shader Structure Refactoring (`WiggleCube.tsx`)**
  - [ ] Add the `uImpacts` struct array to the custom vertex shader code inside `onBeforeCompile`.
  - [ ] Rewrite `getDeformedPos` to loop through the 3 impact slots and combine local dent, shockwave ripple, and volume preservation bulge.
  - [ ] Update normal reconstruction math to correctly compute finite differences with the new multi-impact `getDeformedPos` routine.

- [ ] **Phase 2: Uniform Pipeline & Impact Manager (`WiggleCube.tsx`)**
  - [ ] Declare and initialize uniforms in `uniformsRef` for 3 impact slots.
  - [ ] Add an API function or exposed ref callback on the component to allow registering an impact (`triggerImpact(localPoint, localNormal, impactVelocity)`).
  - [ ] In `useFrame`, step forward the time and spring decay math for all 3 impact slots. Fade out/recycle inactive impacts.

- [ ] **Phase 3: Rapier Integration & Event Wiring (`scene.tsx`)**
  - [ ] Add `onCollisionEnter` handler to `<RigidBody>` in `scene.tsx` for spawned cubes.
  - [ ] Add `onCollisionEnter` handler to `<RigidBody>` in `scene.tsx` for the rotating central box.
  - [ ] Retrieve contact point, normal, and relative velocity/impulse inside `onCollisionEnter`.
  - [ ] Convert the world contact point and normal to mesh-local coordinates.
  - [ ] Invoke the `triggerImpact` method on the matching `JellyBox` reference.

- [ ] **Phase 4: Verification & Polishing**
  - [ ] Verify compilation and solve any linting errors.
  - [ ] Fine-tune frequency, amplitude, and speed coefficients for maximum tactility.
