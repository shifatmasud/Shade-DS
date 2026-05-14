# Bug Report Log

Tracking all issues, from critical bugs to minor suggestions.

## Critical (App Breaking)

-   ...

## Warning (Unexpected Behavior)

- [x] UI Mode Transition: Lean Mode window lacked exit animations when switching modes or closing due to placement outside `AnimatePresence`. Relocated to main animation loop in `Home.tsx`.
- [ ] Physics: RigidBody tunneling may occur at very high velocities or low framerates. Consider implementing CCD (Continuous Collision Detection) if cubes frequently escape the floor.
- [x] URL segments now support tracking all active states simultaneously (e.g., /tokens/3d). Fixed 404 error on direct navigation by implementing a full-stack Express server with index.html fallback and adding `vercel.json` for Vercel deployments.
- ...

## Suggestion (Improvements)

-   [ ] Add more interactive SVG animations to the System Spec window for each rule.
-   ...
