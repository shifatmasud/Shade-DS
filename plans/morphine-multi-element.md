# Tech Spec - Morphine Active Item & Multi-Element Support

1. **Objective**
- Enable `Morphine` to handle both:
  1. **Focused Active Container Morphing**: When a user clicks a specific item in a collection (e.g. `product-2` among `product-1`, `product-2`, `product-3`), ensure `product-2/list` morphs directly into `product-2/detail` on Forward, and `product-2/detail` morphs back into `product-2/list` on Reverse.
  2. **Global Multi-Element Transitions**: When no specific item is clicked, automatically pair all elements sharing the same `data-framer-name` based on ascending document index.

2. **Root Cause Analysis (RCA)**
- **Previous Failure**:
  - `resolveBidirectionalPairs` blindly looped through all elements on the list page and tagged them `m-xxx-0-0` (`product-1`), `m-xxx-0-1` (`product-2`), etc.
  - On the Detail page, only **1** product exists, so `tagElements` tagged it as `m-xxx-0-0`.
  - Motion's `animateView` bound the first pair (`product-1`, index 0) to the detail card (`m-xxx-0-0`), while `product-2` was mapped to a non-existent `m-xxx-0-1`.
  - On Reverse navigation, `product-2/detail` (index 0) was mapped to `m-yyy-0-0`, which `tagElements` assigned to `product-1` on the list page.
- **Result**: Forward started from `product-1`'s position instead of `product-2`, and Reverse returned to `product-1`'s position instead of `product-2`.

3. **Solution Architecture**
- **Mode 1: Forward with Active Container (`product-2` clicked)**:
  - Scopes source elements specifically to the clicked `activeContainer` (`product-2`) and its nested children (`Image`, `Title`).
  - Tags source with `data-morphine-id="${uid}-active-${listIndex}"` and targets `[data-morphine-id="${uid}-active-${listIndex}"]`.
  - Post-navigation hook tags destination elements on the Detail page with `${uid}-active-${listIndex}`.
- **Mode 2: Reverse Navigation (Detail &rarr; List)**:
  - Tags detail page source elements with `data-morphine-id="${uid}-reverse-${listIndex}"`.
  - In incoming List DOM, `tagActiveOriginCardInNewDOM` matches the exact originating card (`product-2`) via `slug`, `href`, or `activeOriginMemory.index` (`1`).
  - Tags `product-2` with `${uid}-reverse-0` and its children with `${uid}-reverse-${listIndex}`.
- **Mode 3: Multi-Element Global Transitions**:
  - If no active container was clicked, uses index-based multi-element tagging (`${uid}-${listIndex}-${i}`).

4. **Pseudo Code**
```typescript
// Forward click on product-2
if (direction === "forward" && activeContainer) {
    fromElement = activeContainer;
    fromElement.setAttribute("data-morphine-id", `${uid}-active-0`);
    pairs.push({ fromTarget: fromElement, toSelector: `[data-morphine-id="${uid}-active-0"]` });
}

// Post navigation to Detail
tagForwardDestinationElements(toNames, uid); // Tags DetailCard with ${uid}-active-0

// Reverse navigation from Detail to List
if (direction === "reverse") {
    tagActiveOriginCardInNewDOM(memory, fromNames, prevUrl, uid);
    // Matches product-2 (index 1 / slug "product-2") and tags it with ${uid}-reverse-0
}
```

