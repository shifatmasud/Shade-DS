# Root Cause Analysis: Intermittent Browser Back Button Morph Failures

## 1. Problem Statement
The user reported that the browser Back button morphing is fragile: "sometimes back button fails morph. sometimes works perfectly."

## 2. Root Cause Analysis

### Primary Root Cause: Race Condition in `waitForDomChange` vs React Component Lifecycle
1. When navigating backwards (via `navigation.navigate(traverse)` or `popstate`), `performViewTransition` runs `animateView(async () => { await performNavigation(); tagActiveOriginCardInNewDOM(); })`.
2. Inside `performNavigation()`, `waitForDomChange(350)` was used. `waitForDomChange` had a `MutationObserver` that triggered on the **first DOM mutation**.
3. In React / Framer SPA applications:
   - When navigation begins, React starts unmounting the Detail page (triggering a mutation).
   - `waitForDomChange`'s observer fired immediately on the unmount mutation and resolved.
   - `tagActiveOriginCardInNewDOM` immediately ran `document.querySelectorAll('[data-framer-name="Card"]')`.
   - If React had not yet finished mounting the List page cards (which occurs several milliseconds or microtasks later), `allCards.length === 0`.
   - `tagActiveOriginCardInNewDOM` exited prematurely without tagging the card with `data-morphine-id`.
   - The `animateView` callback resolved before any elements were tagged.
   - `animateView` captured the new snapshot without matching `data-morphine-id` selectors, resulting in a dropped shared element morph.
4. **Why it occurred intermittently ("sometimes works, sometimes fails")**:
   - If the browser / React rendered the list synchronously within the same microtask before the unmount mutation observer fired, `allCards` was found and the morph worked.
   - If rendering took 1-2 frames or if React batched state updates asynchronously, `allCards.length` was 0 at the exact moment of execution and the morph failed.

### Secondary Root Cause: History Traversal Direction Ambiguity & Pair Fallbacks
- In `handleNavigate`, if `event.navigationType === "traverse"`, index comparisons between `event.destination.index` and `nav.currentEntry.index` must explicitly force `reverse` direction if moving backwards in history.
- In `resolveBidirectionalPairs`, when searching for the source element on the Detail page in reverse mode (`direction === "reverse"`), if `targetToNames` was not found (e.g. slight naming mismatch), the system needed a fallback query to prevent `hasDiscovered === false`.

## 3. Corrective & Preventative Actions
1. **Implement `waitForTargetElements(names, timeoutMs)`**:
   - Instead of resolving on arbitrary DOM mutations, actively wait for the expected target elements (`[data-framer-name="..."]`) to exist in the DOM.
   - Uses `MutationObserver` + `requestAnimationFrame` polling to detect the exact millisecond the destination elements are mounted.
   - If elements are already present, resolves synchronously (0ms delay).
   - If elements mount after a frame, resolves the instant they are inserted.
2. **Deterministic Reverse Tagging**:
   - In `performViewTransition`, `await waitForTargetElements(fromNames, 400)` before invoking `tagActiveOriginCardInNewDOM`.
   - In `tagActiveOriginCardInNewDOM`, query across all configured name aliases if primary name is not found.
3. **Standalone Framer Component Safety**:
   - All improvements remain self-contained within `/framer/test/Morphine.tsx` with zero external dependencies.
