# Tech Spec 

1. **Objective**
- **Problem Statement**: On first page load (and on navigating/refreshing), the application exhibits jitter, flicker, and flash. This is caused by:
  1. `syncReverseHeroSnapshot` writing a pseudo-snapshot to `sessionStorage` on idle initial mount and in `onFinished` cleanup, keeping `sessionStorage` perpetually dirty and causing new page loads to erroneously trigger morph animations.
  2. Document-level exit listeners (`handleExitPointerDown`) matching source card links (`target.closest("a")`), colliding with forward card clicks and overwriting `sessionStorage` with backward snapshots.
  3. Destination elements being hidden (`opacity: 0, visibility: hidden`) and page roots blurred (`filter: blur(20px)`) when no legitimate forward navigation was initiated.
- **Solution Overview**:
  1. Clean `sessionStorage` on initial/direct page visits: only trigger morph if a snapshot was legitimately created within a short valid window (`MAX_SNAPSHOT_AGE_MS = 6000ms`) and consume/clear it immediately.
  2. Completely eliminate proactive idle snapshot writes (`syncReverseHeroSnapshot(0)` on idle mount or post-morph cleanup).
  3. Ensure capture listeners only write to `sessionStorage` when an explicit click/interaction occurs.
  4. Disambiguate card clicks from exit/back navigation clicks so they never collide.
  5. Prevent duplicate or false-positive animation executions on page mount.
- **Scope**: Fixes strictly within `/framer/ArticleImageTransition.tsx`.
- **Context**: Framer standalone cross-morph transition component.

2. **Success Criteria**
- **Key Results**:
  - Direct first-time page loads, page refreshes, and unlinked page visits render instantly with zero jitter, flicker, flash, or blur.
  - Forward card clicks smoothly morph the card into the destination hero without colliding with exit triggers.
  - Backward/exit navigation smoothly returns with clear cleanup.
  - `sessionStorage` is cleanly purged after each transition and never populated during idle state.
  - `compile_applet` builds with zero errors.
- **Non-Negotiables**:
  - Adhere to AGENTS.md and standalone component architecture.
  - No changes to `Dock.tsx` or `README.md`.

3. **Project Requirements**
- [x] Create plan in `/plans/fix_initial_load_flicker.md`.
- [x] Refactor `framer/ArticleImageTransition.tsx` to:
  - [x] Remove idle `syncReverseHeroSnapshot` calls on initial mount and animation completion.
  - [x] Lower `MAX_SNAPSHOT_AGE_MS` to 6000ms for strict freshness.
  - [x] Guard snapshot consumption: consume and remove snapshot from `sessionStorage` immediately upon beginning the morph to prevent re-triggering.
  - [x] Disambiguate card capture from exit triggers: exit triggers should only fire if NOT clicking on a source card (`target.closest([data-framer-name=...])`).
  - [x] Ensure zero opacity/visibility mutations occur unless a valid, unconsumed snapshot is being actively animated.
- [x] Verify build with `compile_applet`.

4. **Architecture Decisions**
- **Ephemeral Snapshot Lifecycle**: `sessionStorage` is treated strictly as an ephemeral transfer bus for user-initiated navigation. It is populated ONLY on explicit user click/tap events (`pointerdown`/`click`) and is cleared as soon as the target page picks it up.
- **Mutual Exclusion for Handlers**: Card target containers (`data-framer-name="${targetName}"`) have dedicated forward capture handlers. Document-level exit triggers explicitly ignore clicks originating from within target containers.

5. **Pseudo Code**
```shade-dsl
COMPONENT ArticleTransition
  DATA
    props: { snapshotId, targetName, transition }
    key: snapshotId ?? STORAGE_KEY
  LOGIC
    effect: onMount
      snapshot = readSnapshot(key)
      IF snapshot AND age <= 6000 AND NOT hasPlayedRef.current:
        hasPlayedRef.current = true
        clearSnapshot(key) // Consume immediately to prevent duplicate runs
        executeMorphWithAnimateView(bestTarget, snapshot, transition)
      ELSE:
        clearSnapshot(key) // Ensure clean slate for first load/stale state
      
      // Bind click/tap capture on target cards
      bindCardCapture(targets, "forward")

      // Bind exit back navigation ONLY on non-target exit elements
      bindExitCapture(elements, "backward")
  RENDER
    div [style: { width: 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }]
```
