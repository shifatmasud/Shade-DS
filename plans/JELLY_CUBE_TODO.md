# JELLY_CUBE_TODO

- [ ] Implement `JellyBox` in `/components/3D/WiggleCube.tsx` using custom `MeshPhysicalMaterial` with vertex shader deformation and normal reconstruction.
- [ ] Implement mouse raycast local hit point and drag offset tracking in `scene.tsx`.
- [ ] Bind analytical spring-mass calculations (Damped Harmonic Oscillator) in `scene.tsx`'s render loop.
- [ ] Connect momentum vectors (body-wide speed & collision impact) to the shader uniforms to wobble the entire body when cubes drop or collide.
- [ ] Verify that all cubes (both spawned jelly cubes and the central rotating cube) wobble beautifully.
- [ ] Compile and verify execution at 60 FPS.
