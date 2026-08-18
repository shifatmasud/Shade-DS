# Tech Spec 

1. **Objective**
- **Problem Statement**: The `mode` property control (`"Capture"` vs `"Play"`) is redundant and cumbersome for cross-page morph transitions. A unified "Auto" mode allows the component to simultaneously handle automatic capture on click/interaction and automatic playback when landing on a page with an active snapshot.
- **Solution Overview**: Remove the `mode` property control and unify the `ArticleTransition` component into a fully automatic cross-morph & capture system.
- **Scope**: Modifications confined to `/framer/ArticleImageTransition.tsx`.
- **Context**: Framer standalone code component for seamless cross-page view morph transitions.

2. **Success Criteria**
- **Key Results**:
  - `mode` property control and enum options removed from `addPropertyControls` and `defaultProps`.
  - Component automatically checks for and plays active snapshots on mount/navigation.
  - Component automatically captures source container snapshots on clicks/pointer interactions with matching target elements.
  - Component automatically synchronizes reverse snapshots on navigation/exit for bidirectional morphing.
  - Clean build with zero TypeScript or bundling errors.
- **Non-Negotiables**:
  - Standalone component integrity in `/framer/ArticleImageTransition.tsx`.
  - No disruption to `Dock.tsx` or `README.md`.

3. **Project Requirements**
- [x] Create plan tech spec in `/plans/auto_cross_morph_capture.md`.
- [x] Update `framer/ArticleImageTransition.tsx` to unify capture and playback into an automatic workflow.
- [x] Remove `mode` control from `addPropertyControls` and `defaultProps`.
- [x] Verify build with `compile_applet`.

4. **Architecture Decisions**
- **Unified Lifecycle**: Instead of branching on `mode === "Capture"` or `mode === "Play"`, `useEffect` executes both play detection (if snapshot exists in `sessionStorage`) and active capture event listeners on targets and exit triggers.
- **Bidirectional Parity**: Automatic synchronization ensures forward and reverse page transitions work out of the box without manual configuration per page.

5. **Pseudo Code**
```shade-dsl
COMPONENT ArticleTransition
  DATA
    props: { snapshotId, targetName, transition }
    state: currentSnapshotId = snapshotId ?? STORAGE_KEY
    ref: activeAnimationsRef, hasPlayedRef, lastPlayedUrlRef
  LOGIC
    effect: onMount/propsChange
      action: autoCheckAndPlaySnapshot()
      action: bindCaptureListeners(targets)
      action: bindExitReverseSyncListeners()
      cleanup: unbindAllListenersAndAnimations()
  RENDER
    SEMANTIC HTML JSX TAGS
      div [style: { width: 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }]
```
