# Bug Report Log

Tracking all issues, from critical bugs to minor suggestions.

## Critical (App Breaking)

-   ...

## Warning (Unexpected Behavior)

- [x] ColorPicker: Blobs shifted z-index on hover. Resolved by disabling dynamic layering.
- [ ] Physics: RigidBody tunneling may occur at very high velocities or low framerates. Consider implementing CCD (Continuous Collision Detection) if cubes frequently escape the floor.
- [x] UI Mode Transition: Lean Mode window lacked exit animations. Fixed by relocating to `AnimatePresence` loop.
- [x] URL segments / Direct navigation: Fixed 404s via Express fallback and `vercel.json`.
- ...

## Suggestion (Improvements)
- [x] Range Slider Tooltip: Heavy mechanical lag (60° tilt) with bouncy spring physics and precise handle anchoring.
- [ ] Add more interactive SVG animations to the System Spec window for each rule.
-   ...
