# Root Cause Analysis: Browser Back/Forward Support & Post-Enter Blur Burst in Morphine

## 1. Problem Description
Two critical bugs identified in `/framer/test/Morphine.tsx`:
1. **Browser Back/Forward Button Support Needed**: Navigating via browser history (Back and Forward buttons) did not execute view transitions or reverse shared-element morphing back to the origin card.
2. **Post-Enter Blur Burst**: After the new page entrance animation finished, a sudden "burst of blur" occurred, re-animating blur over the newly loaded page.

---

## 2. Root Cause Analysis

### Bug 1: Browser Back/Forward History Traversal
* **Cause A (Navigation API Traverse Interception Flaw)**: In Chromium with `window.navigation`, `handleNavigate` intercepted `traverse` events using `event.intercept({ async handler() { ... } })` with an empty `async () => {}` DOM updater. In Framer SPAs, Framer's router listens to `popstate` and does not run its React state update inside `event.intercept`. Intercepting the event prevented the DOM update from happening inside `animateView`'s callback.
* **Cause B (Missing Popstate Listener for Universal History Traversal)**: In browsers without the Navigation API (Safari, Firefox, iOS, Edge legacy) and standard SPA history events, `Morphine.tsx` had no `popstate` listener to capture browser Back/Forward navigation.

### Bug 2: Post-Enter Blur Burst
* **Cause A (Re-entrant / Secondary Transition Triggering)**: When a link was clicked, `handleClick` initiated a view transition with `isNavigating = true`. Inside the transition lifecycle, `nav.navigate(targetUrl)` or `link.click()` updated the URL, followed by `syncCanonicalRouteUrl()` calling `window.history.replaceState()`. When the first view transition finished, `isNavigating` was set to `false`. Subsequent router lifecycle events or trailing navigation/popstate events triggered `handleNavigate` / `popstate` a *second* time on the newly mounted page.
* **Cause B (Second Entrance Animation on Rendered Page)**: Because the second transition was triggered on the already mounted page, `animation.new()` ran its enter keyframes (`filter: ["blur(20px)", "blur(0px)"]`), causing the user to see the page appear and then immediately get blurred again in a "burst of blur".

---

## 3. Resolution Strategy
1. **Universal Browser History Navigation (`popstate` & `navigate`)**:
   * Add a unified history traversal handler that detects `popstate` across all browsers and handles `navigation` traverse events without blocking DOM updates.
   * Determine navigation direction (`reverse` when traversing back from detail to list, `forward` when traversing forward).
   * Utilize `OriginMemory` to retrieve the originating card (`data-morphine-active-card`) and tag elements in the new DOM for seamless reverse morphing.
2. **Global Navigation Lock & Debounce / Cooldown**:
   * Implement a global navigation lock timestamp (`lastNavigationTime`) and mutex (`isTransitioning`) to prevent secondary transition triggering from trailing events, `replaceState`, or component remounts.
   * Guarantee that once an entrance animation completes, NO subsequent view transition or blur animation is triggered.
3. **Pure Motion WAAPI Animation**:
   * Rely strictly on `animateView`'s `.old()` and `.new()` without manual CSS `<style>` injection or conflicting keyframes.
   * Ensure `enterAnimation` settles cleanly at `opacity: 1` and `filter: "blur(0px)"`.
