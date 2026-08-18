# Tech Spec 

1. **Objective**
- **Problem Statement**: When multiple elements with the same `data-framer-name="${targetName}"` exist in the DOM (e.g., card lists, responsive desktop/mobile duplicates, related articles on destination pages), morph transitions glitch and break because:
  1. Responsive duplicates and hidden DOM clones skew the element index.
  2. Forward transitions incorrectly apply `snapshot.cardIndex` on destination pages (e.g. card #3 on index page wrongly matches related article #3 in destination footer instead of the destination Hero).
  3. Capture listeners compute `cardIndex` against all query selector elements including hidden/0-size responsive clones.
- **Solution Overview**:
  1. Implement visibility and geometry filtering (`isElementVisible`) to filter out 0-size, display:none, and hidden responsive clones.
  2. For **forward** transitions (`direction === "forward"`): Target the primary visible hero container on the destination page (top-most / largest prominent visible target) rather than index-matching footer/related items.
  3. For **backward** transitions (`direction === "backward"`): Accurately resolve `visibleElements[snapshot.cardIndex]`, falling back gracefully to the best visible card.
  4. Compute `cardIndex` during capture strictly over visible interactive elements.
- **Scope**: Changes in `/framer/ArticleImageTransition.tsx`.
- **Context**: Framer standalone cross-morph transition component.

2. **Success Criteria**
- **Key Results**:
  - Pages with multiple cards (lists, grids, related article sections) smoothly transition forward to the main hero without glitches.
  - Returning backward lands accurately on the exact visible card that was clicked.
  - Multi-breakpoint responsive layouts (desktop & mobile DOM instances) do not glitch or corrupt target selection.
  - `compile_applet` passes cleanly.
- **Non-Negotiables**:
  - Adhere to AGENTS.md and standalone component architecture.
  - No changes to `Dock.tsx` or `README.md`.

3. **Project Requirements**
- [x] Create plan in `/plans/fix_multiple_target_morph.md`.
- [x] Implement `isElementVisible` helper.
- [x] Refactor target resolution in `checkReady`:
  - [x] Separate forward (hero priority) and backward (index-matched) target strategies.
  - [x] Filter visible elements for stable bounding box checking.
- [x] Refactor `tryCaptureSnapshot` to compute `cardIndex` over visible targets only.
- [x] Verify build with `compile_applet`.

4. **Architecture Decisions**
- **Direction-Aware Target Selection**:
  - `direction: "forward"`: Destination is a single focus/hero page. We select the best visible hero (top-most, visible, largest area among matching targets).
  - `direction: "backward"`: Destination is a list/grid. We select `visibleTargets[cardIndex]` so the user returns to the exact card they clicked.
- **Visibility Guard**: Elements with `display: none`, `visibility: hidden`, `width === 0`, `height === 0`, or disconnected from layout are pruned before indexing or animating.

5. **Pseudo Code**
```shade-dsl
FUNCTION isElementVisible(el)
  IF NOT el RETURN false
  rect = el.getBoundingClientRect()
  IF rect.width <= 0 OR rect.height <= 0 RETURN false
  style = window.getComputedStyle(el)
  IF style.display == "none" OR style.visibility == "hidden" OR style.opacity == "0" RETURN false
  RETURN true

FUNCTION resolveBestTarget(targetElements, snapshot)
  visible = targetElements.FILTER(isElementVisible)
  IF visible.length == 0 RETURN null
  
  IF snapshot.direction == "forward":
    // Destination hero: pick top-most largest visible target
    RETURN visible.SORT((a, b) => {
      rectA = a.getBoundingClientRect()
      rectB = b.getBoundingClientRect()
      // Prioritize top of page, then largest area
      IF rectA.top != rectB.top RETURN rectA.top - rectB.top
      RETURN (rectB.width * rectB.height) - (rectA.width * rectA.height)
    })[0]
  ELSE:
    // Returning backward: match cardIndex
    index = snapshot.cardIndex ?? 0
    IF index >= 0 AND index < visible.length:
      RETURN visible[index]
    RETURN visible[0]
```
