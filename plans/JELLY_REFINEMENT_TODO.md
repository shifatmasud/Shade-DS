# TODO: JellyBox Refinement

- [ ] **Phase 1: Cleanup & Proximity**
    - [x] Remove `color` hover logic in `scene.tsx`.
    - [ ] Implement `uProximity` uniform in `WiggleCube.tsx`.
    - [ ] Add proximity detection logic in `PhysicsCube` component.

- [ ] **Phase 2: Rapier Integration**
    - [ ] Extract velocity and acceleration directly from `rigidBodyRef.current.linvel()`.
    - [ ] Map velocity to "leaning" deformation (`uMomentumForce`).
    - [ ] Map collision impulses to impact ripples.

- [ ] **Phase 3: Shader Hardening**
    - [ ] Remove independent sine loops from vertex shader.
    - [ ] Implement height-based ground clamping in `getDeformedPos`.
    - [ ] Verify normal reconstruction stability.

- [ ] **Phase 4: Validation**
    - [ ] Run `npm run lint`.
    - [ ] Verify in preview.
