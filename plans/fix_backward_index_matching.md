# Tech Spec 

1. **Objective**
- **Problem Statement**:
  1. In `handleExitPointerDown`, backward snapshot capture hardcoded `cardIndex: 0`, destroying the origin card index when navigating back to a list/grid.
  2. When navigating between pages where an item has different indices (e.g. Index 1 on Page A is Index 2 on Page B, or related lists with different orderings), pure numeric index matching fails to find the corresponding card.
- **Solution Overview**:
  1. **Preserve Origin Card Index**: During backward snapshot capture, retain the `cardIndex` / `originCardIndex` from the forward snapshot instead of hardcoding `0`.
  2. **Multi-Signal Semantic Card Matching**: Implement intelligent matching that checks across multiple priority tiers:
     - **Tier 1 (URL/Href Match)**: Check if any visible card contains a link matching the article's URL or snapshot's `href`.
     - **Tier 2 (Origin URL Match)**: Check if any visible card's link matches the origin page URL.
     - **Tier 3 (Image / Background Match)**: Check if any visible card contains an image or background image with the same `src`/URL as the snapshot.
     - **Tier 4 (Title / Text Fingerprint Match)**: Check if any visible card contains the same heading or primary text snippet as the snapshot.
     - **Tier 5 (Preserved Index Match)**: Fall back to `visibleElements[snapshot.cardIndex]`.
     - **Tier 6 (First Visible Card)**: Fall back to `visibleElements[0]`.
  3. **Rich Snapshot Metadata**: Capture `title`, `href`, `imageSrc`, `originUrl`, and `originCardIndex` in the snapshot so target resolution can match across different page layouts and different card index positions.
- **Scope**: Changes in `/framer/ArticleImageTransition.tsx`.
- **Context**: Framer standalone cross-morph transition component.

2. **Success Criteria**
- **Key Results**:
  - Clicking any card (e.g. Card 1, Card 2, Card N) and navigating back accurately morphs to that exact card on the source page.
  - Navigating from Page A (where an item is at index 1) to Page B (where the item is at index 2) accurately morphs to index 2 on Page B via semantic title/href/image matching.
  - No glitches, flickers, or regressions on forward or direct loads.
  - `compile_applet` passes cleanly.
- **Non-Negotiables**:
  - Adhere to AGENTS.md and standalone component architecture.
  - No changes to `Dock.tsx` or `README.md`.

3. **Project Requirements**
- [x] Create plan in `/plans/fix_backward_index_matching.md`.
- [x] Update `Snapshot` and `VisualCandidate` types with semantic metadata (`title`, `href`, `imageSrc`, `originUrl`, `originCardIndex`).
- [x] Update `getVisualCandidateFromElement` and `captureCandidateSnapshot` to extract title text, hrefs, and image sources.
- [x] Refactor `resolveBestTargetElement` with multi-tier semantic matching:
  - [x] Tier 1: Href / URL matching.
  - [x] Tier 2: Origin URL matching.
  - [x] Tier 3: Image src / background-image matching.
  - [x] Tier 4: Title / text snippet matching.
  - [x] Tier 5: Preserved index matching (`visible[cardIndex]`).
- [x] Refactor `handleExitPointerDown` to read and preserve the existing forward snapshot's cardIndex and metadata when creating a backward snapshot.
- [x] Verify build with `compile_applet`.

4. **Architecture Decisions**
- **Semantic Signature over Blind Indices**: While numeric indices work when page structures are identical, real-world apps feature dynamic lists, reordered filters, related carousels, and multi-page layouts where the same article appears at different positions. Semantic fingerprinting (href -> image -> title -> index) guarantees the morph always hits the correct item.
- **Snapshot Chain Memory**: The component preserves `originCardIndex` across the navigation lifecycle so exit triggers know which card index the user came from.
