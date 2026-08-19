# Tech Spec 

1. **Objective**
- **Problem Statement**: Page navigation often tears down the DOM immediately or transitions before the outgoing page exit animation (blurring, translating, and fading non-shared elements, plus shared snapshot capture) finishes playing, causing visual jank or abrupt jumps.
- **Solution Overview**: Integrate the modern browser Navigation API (`window.navigation`) via `navigate` event interception (`event.intercept({ handler })` / `event.transitionWhile()`) to asynchronously hold navigation until the outgoing page exit animation promise resolves. Provide graceful fallback for environments where Navigation API is polyfilled or unsupported.
- **Scope**: Implemented in `/framer/ArticleImageTransition.tsx`.
- **Context**: Standalone Framer Code Component for seamless shared element and page content transitions.

2. **Success Criteria**
- **Key Results**:
  - `window.navigation` `navigate` event listener registered during component lifecycle.
  - Page exit animation (`animateSurroundingExit` & morph snapshot prep) produces a clean, trackable `Promise` with timeout protection.
  - `event.intercept({ handler: async () => { await exitAnimationPromise } })` delays navigation completion until the exit animation finishes cleanly.
  - Backward compatibility with `event.transitionWhile()` for older Navigation API drafts.
  - Safe cleanup on abort/cancel signal (`event.signal`).
  - No stuck styles, memory leaks, or unhandled promise rejections.
  - Full TypeScript compilation and verification.
- **Non-Negotiables**:
  - Maintain standalone component portability in `/framer/ArticleImageTransition.tsx`.
  - Preserve Dock and README immunity.

3. **Project Requirements**
- [x] Create tech spec plan in `/plans/navigation_api_page_exit_animation.md`.
- [x] Refactor `animateSurroundingExit` to return an explicit `Promise<void>` alongside its cancellation handle.
- [x] Track `activeExitAnimationPromise` at the transition controller level.
- [x] Implement `window.navigation` event listener with `canIntercept` checks and `event.intercept({ handler })`.
- [x] Connect `event.signal` abort handling to `cancelGlobalTransition` to cleanly handle user-aborted navigations.
- [x] Ensure click handlers and navigation interceptors synchronize without duplicate snapshot creation or animation conflicts.
- [x] Verify build via `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
- **Navigation API Interception**: The modern Navigation API (`window.navigation`) provides standard `navigate` events with `intercept({ handler })`. By passing an async handler that awaits the exit animation, the browser keeps the outgoing document interactive and rendered until all exit transforms, blurs, and fades finish.
- **Promise-Based Exit Controller**: `animateSurroundingExit` returns a Promise that settles either when the Framer Motion animation finishes or after a safety timeout (e.g. animation duration + 50ms buffer), ensuring navigation is never indefinitely held even if an element is detached mid-animation.
- **AbortSignal Integration**: Modern `NavigateEvent` instances provide an `event.signal` (`AbortSignal`). If the navigation is aborted by user action (e.g. clicking stop or another link), the signal abort listener automatically calls `cancelGlobalTransition()` and restores styles.

5. **Pseudo Code**
```shade-dsl
COMPONENT ArticleTransition
  DATA
    global state:
      activeExitPromise: Promise<void> | null
      activeGlobalTransition: { id, stop, promise } | null
  LOGIC
    action animateSurroundingExit(elements, transition):
      backups = backupStyles(elements)
      anim = animate(elements, { opacity: 0, filter: "blur(12px)", transform: "translateY(16px)" }, transition)
      promise = Promise.race([
        anim.then(),
        timeout(transition.duration || 350 + 50)
      ])
      return { stop: () => { anim.stop(); restoreStyles(backups); }, promise }

    effect navigationApiListener:
      if (typeof window !== "undefined" && "navigation" in window):
        const nav = window.navigation
        const handleNavigate = (event):
          if (!event.canIntercept || event.hashChange || event.downloadRequest) return
          
          if (activeExitPromise):
            event.intercept({
              handler: async () => {
                await activeExitPromise
              }
            })
          else:
            // Check if leaving to another page and capture exit
            candidate = findBestVisualCandidate(...)
            if candidate:
              { promise } = captureCandidateSnapshot(candidate, ...)
              if promise:
                event.intercept({
                  handler: async () => {
                    await promise
                  }
                })
          
          if event.signal:
            event.signal.addEventListener("abort", () => {
              cancelGlobalTransition()
            })
        
        nav.addEventListener("navigate", handleNavigate)
        cleanup: nav.removeEventListener("navigate", handleNavigate)
  RENDER
    SEMANTIC HTML JSX TAGS
      div [style: { width: 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }]
```
