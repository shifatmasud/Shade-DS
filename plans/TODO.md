# TODO: FillSlider & Counter Implementation

## Tasks
1. [ ] **FillSlider Architecture Update**:
   - [ ] Refactor `styles` in `FillSlider.tsx` to use the `base`/`variant`/`size` pattern.
   - [ ] Add `isHovered` state to track hover interaction.
2. [ ] **Implement Thumb**:
   - [ ] Add a `motion.div` for the thumb.
   - [ ] Bind thumb `x` position to the `widthStyle` or a derived motion value.
   - [ ] Implement visibility logic: `opacity` should transition based on `isDragging`, `isHovered`, or pointer interaction.
   - [ ] Set thumb height to `80%`.
3. [ ] **Refine Value Display**:
   - [ ] Locate the `<span>0.</span>` in `FillSlider.tsx`.
   - [ ] Remove it to satisfy the "Remove 0.n prefix" requirement.
4. [ ] **Verification**:
   - [ ] Verify hover state transitions.
   - [ ] Verify drag behavior.
   - [ ] Verify prefix removal.
