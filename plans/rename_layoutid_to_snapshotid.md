# Tech Spec 

1. **Objective**
- **Problem Statement**: In `framer/ArticleImageTransition.tsx`, the prop and property control identifier for the shared transition ID is named `layoutId`, but it represents the snapshot identifier for cross-page morph capture/playback.
- **Solution Overview**: Rename `layoutId` to `snapshotId` cleanly in `framer/ArticleImageTransition.tsx` across component props, defaultProps, property controls, internal references, and dependency arrays with no fallback to layoutId.
- **Scope**: Targeted modification exclusively to `/framer/ArticleImageTransition.tsx`.
- **Context**: Framer standalone code component for article image/container view transitions.

2. **Success Criteria**
- **Key Results**:
  - `addPropertyControls` registers `snapshotId` with title `"SNAPSHOT ID"`.
  - `ArticleTransition.defaultProps` has `snapshotId: "article-card"`.
  - Component parameter destructuring extracts `snapshotId`.
  - Internal storage key resolution uses `snapshotId || propStorageKey || STORAGE_KEY`.
  - Component remains fully standalone and passes build/lint validation.
- **Non-Negotiables**:
  - No syntax or TypeScript errors.
  - Standalone Framer component integrity preserved.
  - Zero disruption to `Dock.tsx` or `README.md`.

3. **Project Requirements**
- [x] Create plan tech spec in `/plans/`.
- [x] Update `framer/ArticleImageTransition.tsx` to rename `layoutId` to `snapshotId` across props, property controls, defaults, and internal identifiers.
- [x] Remove legacy `layoutId` fallback references.
- [x] Verify build and linter passes with `compile_applet`.

4. **Architecture Decisions**
- **Clean Naming**: Exclusively use `snapshotId` for the prop name and property controls in `ArticleTransition`.
- **Standalone Component Integrity**: Keep all imports, property controls, and animations self-contained inside `framer/ArticleImageTransition.tsx`.

5. **Pseudo Code**
```shade-dsl
COMPONENT ArticleTransition
  DATA
    props: { mode, snapshotId, targetName, transition }
    derived: currentSnapshotId = snapshotId ?? STORAGE_KEY
    ref: activeAnimationsRef, hasPlayedRef, lastPlayedUrlRef
  LOGIC
    effect: onMount/propsChange
      action: captureCandidateSnapshot (when mode == "Capture")
      action: executeMorphWithAnimateView (when mode == "Play")
  RENDER
    SEMANTIC HTML JSX TAGS
      div [style: { width: 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }]
```
