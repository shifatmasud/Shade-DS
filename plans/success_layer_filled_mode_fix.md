# Plan: Fix SuccessLayer Not Filling 100% of Parent in Mask Growth Filled Mode

## PRD (Overview & Objectives)
The `SuccessLayer` component is designed as a parasitic overlay layer that animates a circular mask expansion (success flash/mask growth) to cover the parent element (host). However, under certain layout configurations, the success layer fails to span 100% of its parent's dimensions when the mask expands (filled mode). In contrast, the `StateLayer` and `RippleLayer` successfully fill 100% of their parents because their wrapper containers explicitly declare `width: 100%` and `height: 100%` alongside `position: absolute; inset: 0`.

The objective is to make the `SuccessLayer` robustly fill 100% of its parent element under all layout contexts by:
1. Adding explicit `width: "100%"` and `height: "100%"` properties to the root container of `SuccessLayer`.
2. Adding explicit `width: "calc(100% + 2px)"` and `height: "calc(100% + 2px)"` to the absolute positioned `motion.div` representing the success instances inside the layer to guarantee perfect coverage.
3. Adding a safety scale/buffer multiplier to `safeRadius` calculation (e.g. `1.2x - 1.5x`) to ensure that any coordinate subpixel rounding, touch position offsets, or container size changes are safely covered by the clipping mask.

## OKR (Success Criteria)
- **Objective**: Ensure the success mask covers the button completely (100% parent dimensions) on success trigger with no un-masked gaps.
- **Key Result 1**: The outer wrapper container of `SuccessLayer` is styled with `width: "100%"` and `height: "100%"`.
- **Key Result 2**: The inner `motion.div` representing the expanding circle mask has explicit sizing (`width: "calc(100% + 2px)"` and `height: "calc(100% + 2px)"`) alongside `inset: -1`.
- **Key Result 3**: The expanded `circle` radius in the `clipPath` animation uses a robust buffer (e.g., `Math.hypot(rect.width, rect.height) * 1.5`) to eliminate any potential micro-gaps at the furthest corners.
- **Key Result 4**: The application builds/compiles successfully without any type errors or linter warnings.

## ADR (Architectural Design)
We will modify `/components/Core/sub-components/SuccessLayer.tsx`.
- Modify `safeRadius` calculation to include a safety multiplier of `1.5` to ensure any corner coordinates are 100% covered.
- Explicitly set `width: "100%"` and `height: "100%"` on the wrapper `div` in the return block of `SuccessLayer`.
- Explicitly set `width: "calc(100% + 2px)"` and `height: "calc(100% + 2px)"` on the expanding `motion.div`.

## TODO
- [ ] Read and analyze `/components/Core/sub-components/SuccessLayer.tsx`.
- [ ] Modify `SuccessLayer.tsx` style properties and `safeRadius` calculation.
- [ ] Lint the codebase to ensure no syntax/import errors.
- [ ] Compile the applet to verify the build is fully green.
