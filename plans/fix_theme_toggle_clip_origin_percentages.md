# Planning Document: Fix Theme Toggle Clip Origin to Use Percentages

## PRD (Overview & Objectives)
- **Problem**: The clip-path origin for `animateView` when toggling the theme is offset and does not originate from the center of the theme toggle button.
- **Root Cause**: View Transitions operate on a snapshot overlay of the viewport. Pixel-based coordinates (whether from pointer event clientX/clientY or viewport rect.left/rect.top) can sometimes be offset in certain layout/scale situations in the View Transition pseudo-elements.
- **Solution**: Follow Step 2 of the debugging instructions: convert coordinates to viewport percentage-based coordinates (`%`), which are robust and match the snapshot container boundaries accurately.

## OKR (Success Criteria)
- **Key Result 1**: Theme toggle animation transition circle originates exactly from the center of the `ThemeToggleButton` element, even after dragging the button around.
- **Key Result 2**: Linter passes completely and app compiles with no errors.

## ADR (Architectural Design)
- **Coordinate Mapping**: Compute center of button using `getBoundingClientRect()`, then normalize against `window.innerWidth` and `window.innerHeight` to get percentage values `x` and `y` from `0` to `100`.
- **Clip-Path Interpolation**: Pass percentage-based `clipPath` keyframes to `animateView().new()`:
  - `circle(0% at ${x}% ${y}%)` -> `circle(150% at ${x}% ${y}%)`

## TODO List
- [ ] Read current state and confirm code layout (completed)
- [ ] Edit `/components/Core/ThemeToggleButton.tsx` to calculate percentage-based coordinates for `clipPath` in `toggleTheme`.
- [ ] Run `compile_applet` and `lint_applet` to verify no regressions or syntax issues.
