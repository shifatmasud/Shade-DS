# Root Cause Analysis: Browser Back Button Morph Failure & Debug Overlay Integration

## 1. Issue Summary
- **Symptom 1**: Clicking the browser Back button does not trigger the shared element morph (e.g. `DetailCard`/`DetailImage` morphing back into `Card`/`Image` in the list).
- **Symptom 2**: Lack of runtime visibility into active transition state, navigation type, resolved pairs, and origin memory during development/debugging.

## 2. Root Cause Analysis

### Root Cause 1: Modern Chromium Navigation API Intercepting History Traversal (`traverse`) with Unspecified Direction
1. In Chromium-based browsers, the `navigation` API (`window.navigation`) is available.
2. When the user clicks the browser Back button:
   - `window.navigation.addEventListener("navigate", handleNavigate)` fires with `event.navigationType === "traverse"`.
   - In `handleNavigate()`, `detectNavigationDirection(fromList, toList, null, null, currentUrl, targetUrlStr)` was called.
   - However, for in-app history traversals, `event.destination.url` is the list URL and `window.location.href` is the detail URL.
   - If the origin memory slug was not matched (or URL formats slightly differed), `detectNavigationDirection` could default to `"forward"`.
   - When evaluated as `"forward"` on a Back action, `tagForwardDestinationElements` was called instead of `tagActiveOriginCardInNewDOM`, preventing the list card from receiving the matching UID.
3. Crucially, when `event.navigationType === "traverse"`, or when `event.destination.index < window.navigation.currentEntry.index`, it is explicitly a backwards history traversal.
4. Furthermore, on browsers falling back to `popstate` (or when `handleNavigate` does not intercept), `tagActiveOriginCardInNewDOM` needs to ensure that if `data-morphine-id` is assigned to `fromElement` on the detail page, the reverse tag `toSelector` matches in the newly mounted list DOM.

## 3. Corrective Actions
1. **Explicit History Traversal Direction Mapping**:
   - In `handleNavigate`, inspect `event.navigationType === "traverse"`. If `event.destination.index < nav.currentEntry?.index` or navigating to an ancestor/list path, explicitly assign `direction = "reverse"`.
   - In `handlePopState`, evaluate `lastKnownUrl` vs `window.location.href` and enforce `reverse` direction whenever navigating from detail to list.
2. **Debug Overlay**:
   - Add property control `showDebugOverlay?: boolean` (default `false`) and in-component heads-up display overlay rendering real-time telemetry:
     - Transition state (`idle` vs `transitioning`)
     - Active direction (`forward` | `reverse`)
     - Last event type (`click` | `navigate` | `popstate`)
     - Discovered pairs count & element names
     - Origin Memory snapshot (card index, slug, url)
     - `enableEnterExit` status and blur radius
3. **Stand-alone Framer Integrity**:
   - Ensure `/framer/test/Morphine.tsx` remains completely standalone with zero external dependencies beyond `framer` and `framer-motion`.
