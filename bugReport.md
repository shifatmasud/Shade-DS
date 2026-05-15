# Bug Report Log

Tracking all issues, from critical bugs to minor suggestions.

## Critical (App Breaking)

-   ...

## Warning (Unexpected Behavior)

- [ ] Physics: RigidBody tunneling may occur at very high velocities or low framerates. Consider implementing CCD (Continuous Collision Detection) if cubes frequently escape the floor.
- [x] UI Mode Transition: Lean Mode window lacked exit animations. Fixed by relocating to `AnimatePresence` loop.
- [x] URL segments / Direct navigation: Fixed 404s via Express fallback and `vercel.json`.
- ...

## Suggestion (Improvements)
- [x] Range Slider Tooltip: Handle now shows current value with animated counter and velocity rotation.
- [ ] Add more interactive SVG animations to the System Spec window for each rule.
-   ...
