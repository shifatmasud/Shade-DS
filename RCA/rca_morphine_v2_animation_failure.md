# Root Cause Analysis: Morphine V2 Animation Failure

## 1. Problem Statement
In `framer/test/Morphine V2.tsx`, animations failed during Framer page transitions when implementing the architecture "Framer owns navigation, Morphine owns the transition."

## 2. Root Cause Findings

### Finding 1: Missing `style.viewTransitionName` assignments on matched elements
- In `Morphine V2.tsx`, elements were tagged only with `setAttribute("data-morphine-id", ...)`.
- The browser View Transition API and `framer-motion`'s `animateView` require explicit CSS `view-transition-name` on DOM elements to capture them as separate snapshot layers rather than blending into the root snapshot.
- Without `element.style.viewTransitionName = tagId`, the browser generated 0 shared element pairs, causing animations to fail silently.

### Finding 2: `event.intercept()` hijacked the navigation lifecycle
- `Navigation API`'s `event.intercept({ async handler() { ... } })` intercepts the browser's navigation and expects the handler to execute the URL change and DOM mutation.
- When `event.intercept` was used, Framer's internal router lifecycle was desynchronized or delayed, preventing the destination page from mounting within the timeout window.

### Finding 3: `animateView` API mismatch with `framer-motion`
- `animateView` in `framer-motion` returns a `ViewTransitionBuilder` whose chainable methods are `get()`, `layout()`, `new()`, `old()`, `enter()`, `exit()`, `crossfade()`.
- Calling non-existent `.add(from, to)` failed silently.
- Proper shared-element transitions work by setting matching `style.viewTransitionName` on the OLD element before `animateView`, and setting the identical `style.viewTransitionName` on the NEW element inside the `update()` callback before it resolves.

### Finding 4: Timing of Snapshot Capture for OLD and NEW elements
- View Transition snapshots of OLD elements MUST be established before the `update()` callback begins unmounting them.
- When navigation is initiated (via link click capture, popstate capture, or navigation start), the OLD elements must have `style.viewTransitionName` applied synchronously.
- Inside `animateView(update)`, `waitForTargetElements` waits for Framer to mount the destination DOM, applies `style.viewTransitionName` to the NEW elements, and resolves, allowing the browser to capture the NEW snapshot and execute the morph.
- On completion, all `style.viewTransitionName` values are safely removed to restore clean DOM state.

## 3. Remediation Plan
1. **Synchronous `viewTransitionName` Tagging**:
   - Tag OLD elements with unique `viewTransitionName` (e.g. `morph-card-0`, `morph-img-1`) before calling `animateView()`.
   - In `update()`, await destination DOM mounting and tag NEW matching elements with the identical `viewTransitionName`.
2. **Remove Navigation Interception**:
   - Remove `event.intercept()` so Framer's router retains 100% control of navigation, URL routing, and DOM mounting.
   - Listen to link clicks in capture phase and popstate/navigation events passively to trigger the transition alongside Framer's DOM update.
3. **Correct `animateView` integration**:
   - Pass transition options `{ duration, ease }` to `animateView(update, transition)`.
   - Apply `.old()` and `.new()` for root fade/blur enter/exit effects.
   - Clean up all `style.viewTransitionName` in the `finally` / `.finished` lifecycle.
