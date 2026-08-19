# Tech Spec 

1. **Objective**
- **Problem Statement**: Navigation is committing prematurely before the exit page animation finishes (causing flashy cutoffs and jitter). The duplicate invocation of `pointerdown` and `click` causes `cancelGlobalTransition()` to resolve `exitPromise` prematurely in ~50ms instead of the full duration (~650ms), and non-Navigation API environments commit immediately on link click without waiting for the exit animation.
- **Solution Overview**:
  1. De-duplicate `pointerdown` and `click` captures: If an exit animation is already running for the active candidate/interaction, preserve it and do not cancel/restart.
  2. Fix `cancel()` so it does not falsely resolve `exitPromise` early.
  3. Ensure `event.intercept({ handler: async () => { await exitPromise } })` holds the Navigation API commit until the full animation duration finishes.
  4. Provide fallback link-click navigation deferral for browsers/environments without Navigation API by preventing default and executing navigation only after `await exitPromise` finishes.
- **Scope**: Changes in `/framer/ArticleImageTransition.tsx`.
- **Context**: Standalone Framer Code Component for seamless, flicker-free shared element and page transitions.

2. **Success Criteria**
- **Key Results**:
  - Outgoing page exit animation plays to completion matching its full duration (0.65s) before navigation commits.
  - No premature abort or flash on `click` after `pointerdown`.
  - Full compatibility across both Navigation API (`window.navigation`) and standard anchor click navigation.
  - Incoming page smoothly enters with fade and blur without flash.
- **Non-Negotiables**:
  - Standalone component portability in `/framer/ArticleImageTransition.tsx`.
  - Preserve Dock and README immunity.

3. **Project Requirements**
- [x] Create tech spec plan in `/plans/stop_commit_navigation_until_exit_anim_finishes.md`.
- [x] Prevent duplicate capture and premature cancellation across `pointerdown` and `click`.
- [x] Ensure `animateSurroundingExit` promise waits for full animation duration without early cancellation resolution.
- [x] Intercept Navigation API commit with `event.intercept({ handler })` awaiting the exit promise.
- [x] Intercept standard link navigation in fallback environments to defer commit until exit animation resolves.
- [x] Verify build via `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
- **Idempotent Capture**: Track `isCapturing` or check if `activeGlobalTransition` is already running with an active `exitPromise` during the same click gesture (within a timestamp window) so `click` does not wipe out `pointerdown`'s transition.
- **Navigation Commit Hold**: Hold the navigation lifecycle synchronously via `event.intercept()` in Navigation API, or via `event.preventDefault()` + deferred `window.location.assign()` for fallback links.

5. **Pseudo Code**
```shade-dsl
COMPONENT ArticleTransition
  LOGIC
    action tryCapture(event, direction):
      if activeGlobalTransition is already running and active within 1000ms:
        return // Avoid restarting and prematurely resolving promise on click
      
      handle = animateSurroundingExit(elements, transitionOptions)
      activeGlobalTransition = { id, exitPromise: handle.promise }

    action onNavigate(event):
      if event.canIntercept and activeGlobalTransition.exitPromise:
        event.intercept({
          handler: async () => {
            await activeGlobalTransition.exitPromise
          }
        })
```
