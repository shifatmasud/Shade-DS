# Tech Spec - TextMaskSlide Refactor

1. **Objective**
Refactor the `TextMaskSlide.tsx` component to cleanly handle direction-based animation types (`animeType`), remove old `direction` and `delay` controls, introduce custom `scrollsectionref` targeting for scroll animations, and clean up unnecessary props and code path logic.

2. **Success Criteria**
- **Clean Interface**: Completely remove unused props and variables like `direction` and `delay`.
- **Directional Animations (`animeType`)**: Support `slideUp`, `slideLeft`, `slideRight`, and `slideDown` directions directly.
- **Scroll Improvements**:
  - Integrate `scrollsectionref` to support scrolling relative to a specified section element.
  - Support `scrollOffsetStart` and `scrollOffsetEnd` configurations.
  - Fallback to window/viewport scroll when no scroll section is provided.
- **Flawless Transition Logic**: Keep fade and blur inputs fully functional on both entering and exiting animations.
- **Zero Build/Lint Errors**: Maintain clean compilation.

3. **Project Requirements**
- [ ] Implement `animeType` with values `"slideUp" | "slideLeft" | "slideRight" | "slideDown"`.
- [ ] Add `scrollsectionref`, `scrollOffsetStart`, and `scrollOffsetEnd` to the props and Framer property controls.
- [ ] Use `scrollsectionref` (safely resolving refs/elements) in `useScroll` target, or default to the window scroll if not specified.
- [ ] Calculate `getCoordinates(zone, animeType)` returning coordinates `{ x, y, opacity, blurVal }` dynamically.
- [ ] Clean up redundant variables, effects, and styles.

4. **Architecture Decisions**
- **Scroll Tracking**: Support both custom container/section references and global window scroll seamlessly. If `scrollsectionref` is set, we resolve it to the underlying element to feed into `useScroll`.
- **Coordinate Multiplexing**: Instead of complex conditional branching per direction, we centralize coordinate computation in a single mapper function `getCoordinates` to make adding more easing/physics simple in the future.

5. **Pseudo Code**
```
FUNCTION getCoordinates(zone, type, fade, blur)
  x = 0, y = 0, opacity = 1, blurVal = none
  if zone is stationary: return defaults

  opacity = fade ? 0 : 1
  blurVal = blur > 0 ? blur : none

  switch type:
    "slideUp": y = (zone is entering) ? 110% : -110%
    "slideDown": y = (zone is entering) ? -110% : 110%
    "slideLeft": x = (zone is entering) ? 110% : -110%
    "slideRight": x = (zone is entering) ? -110% : 110%
  
  return { x, y, opacity, blurVal }
```
