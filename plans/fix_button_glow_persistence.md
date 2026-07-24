# Plan - Fix Button Success Glow Persistence

## PRD (Overview & Objectives)
- **Objective**: Fix the bug where the success glow (green shadow) persists after the success state has ended.
- **Root Cause Analysis**: 
  - In `staged/Button.tsx`, the success shadow has 4 layers, while the idle shadow has 3 layers (`b1`, `b2`, and `drop` which is 1 layer).
  - This layer count mismatch causes Framer Motion interpolation to fail or "snap," leading to visual artifacts where the success glow might "stick" or stay visible.
  - Additionally, the `SuccessLayer` click listener might call `onComplete` even if `isSuccess` is false due to stale DOM attributes, though the button's state checks should catch this.
- **Fix Strategy**:
  1. Harmonize `boxShadow` layer counts in `staged/Button.tsx` to exactly 4 layers across all states.
  2. Guard the `onComplete` call in `SuccessLayer.tsx` to only trigger if `isSuccess` is true.
  3. Ensure `showGlow` is reset precisely when `isSuccess` becomes false.

## OKR (Success Criteria)
- **O1**: Success glow disappears immediately when the success state ends.
- **O2**: Shadow transitions are smooth and don't flicker or snap.
- **O3**: Zero regressions in button interaction.

## TODO List
1. [ ] Modify `components/staged/Button.tsx` to ensure 4 shadow layers.
2. [ ] Modify `components/Core/sub-components/SuccessLayer.tsx` to guard `onComplete` and clean up `click` handler logic.
3. [ ] Run `lint_applet` and `compile_applet`.
