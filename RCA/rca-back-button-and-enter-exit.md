# Root Cause Analysis: Browser Back Button Morph Failure & Enter/Exit Animation Control

## 1. Issue Summary
- **Symptom 1**: On clicking the browser Back button, shared-element morphing fails (card does not morph back into list item like `product-2`), while the full-page fade/blur animation (`animateView.old()` / `animateView.new()`) still runs.
- **Symptom 2**: When `enableEnterExit` is set to `false`, fade blur and root view transition crossfade are not disabled properly, causing unwanted crossfades or flashes.

## 2. Root Cause Analysis

### Root Cause 1: Browser Back Button Direction Detection & Identity Tagging Failure
1. **Asynchronous History Event State**: When a user clicks the browser Back button, the browser immediately updates `window.location.href` to the destination URL (e.g. `/`) before firing the `popstate` event.
2. **Direction Inversion**: `detectNavigationDirection()` inspected `window.location.href` looking for `memory.slug`. Because `window.location.href` had already changed from `/product-2` to `/`, `detectNavigationDirection()` failed the memory slug match and defaulted to `"forward"`.
3. **Mismatched Tagging**:
   - In forward mode, `performViewTransition` called `tagForwardDestinationElements` instead of `tagActiveOriginCardInNewDOM`.
   - `tagActiveOriginCardInNewDOM` was never executed on the newly mounted list DOM.
   - The originating list card (e.g. `product-2`) was never tagged with `data-morphine-id="${uid}-reverse-0"`.
   - Motion's `animateView.add(fromTarget, toSelector)` could not find the target element in the new DOM, causing shared-element morphing to fail.
   - However, because `animateView` root snapshots (`old` and `new`) executed independently, the page-level fade/blur animation ran, creating the illusion that only the page fade worked.

### Root Cause 2: `enableEnterExit: false` Not Disabling Root Reset & Invoking Opacity Keyframes
1. **Default Browser Crossfade Not Suppressed**: In standard CSS View Transitions, the browser automatically applies default crossfade animations (`::view-transition-old(root)` opacity 1 -> 0, `::view-transition-new(root)` opacity 0 -> 1) unless explicitly disabled via CSS rules (`::view-transition-old(root), ::view-transition-new(root) { animation: none !important; }`).
2. **Unconditional Snapshot Animations**: In `framer/test/Morphine.tsx`, when `enableEnterExit` was false (or `isEnterExitActive === false`), the code called `animation.old({ opacity: 0 })` and `animation.new({ opacity: 1 })`. This forced programmatic opacity animations even when enter/exit animations were explicitly disabled.
3. **Contrast with `framer/Morphine.tsx`**: In `framer/Morphine.tsx`, root transition animations are suppressed via injected CSS (`ROOT_VIEW_TRANSITION_CSS`), and `animation.old()` / `animation.new()` are completely omitted so that only pure shared-element morph transitions occur without any page-level crossfade or blur.

## 3. Corrective Actions
1. **URL History Tracking**:
   - Maintain `lastKnownUrl` across navigation lifecycles.
   - On `popstate`, compare `lastKnownUrl` against the incoming `window.location.href`. If `lastKnownUrl` contained `memory.slug` or had higher path depth than `window.location.href`, force `direction = "reverse"`.
   - Pass `lastKnownUrl` as `currentUrlBeforeNav` to `tagActiveOriginCardInNewDOM()`.
2. **Strict `enableEnterExit` Enforcement**:
   - When `enableEnterExit === false` (or `disableEnterExit === true`), omit all `animation.old()` and `animation.new()` calls entirely.
   - Dynamically inject root view-transition reset CSS (`::view-transition-old(root), ::view-transition-new(root), ::view-transition-group(root) { animation: none !important; }`) when `enableEnterExit` is false, ensuring zero browser crossfade.
