# Tech Spec - Bidirectional Morphine View Transition Controller with Active Origin Tagging

1. **Objective**
- **Problem Statement**: 
  1. In reverse transitions (Detail &rarr; List), the destination List view contains multiple elements sharing the same `data-framer-name` (e.g. 10 items named `Card`). Motion's `animateView().add(fromElement, toSelector)` resolves `toSelector = '[data-framer-name="Card"]'` by querying all matching elements in the new DOM. The first element (`elements[0]`) always receives the primary transition snapshot name (`forcedNames[0]`), causing the Detail view to erroneously morph into the first item in the grid instead of the user's originating card.
  2. Nested child elements (`DetailImage &rarr; Image`, `DetailTitle &rarr; Title`) also default to the first image/title in the list rather than the matching card's children.
- **Solution Overview**: 
  1. Implement **Active Origin Tagging & Target Disambiguation**:
     - On Forward navigation (List &rarr; Detail), capture and persist the active card's metadata: `pathname`, URL `slug`, element index, and parent hierarchy in a lightweight memory cache (`activeOriginMemory`).
     - On Reverse navigation (Detail &rarr; List), generate unique scoped target selectors (e.g. `[data-morphine-active-card]`) for the container and its nested children (`[data-morphine-active-card] [data-framer-name="Image"]`).
     - Immediately after the DOM update callback renders the incoming List page, execute the **Active Target Binder**: query candidate cards, match against the origin URL/slug/index (or deep-link path), and tag the exact originating card with `data-morphine-active-card`.
     - Motion resolves the selector to ONLY the originating card and its scoped children, guaranteeing 100% accurate reverse morphing into the correct grid slot.
- **Scope**: Update `/framer/test/Morphine.tsx` and maintain technical spec in `/plans/morphine-animateview.md`.
- **Context**: Framer templates with CMS collections, project grids, and catalog layouts.

2. **Success Criteria**
- **Key Results**:
  - Reverse navigation (Detail &rarr; List) morphs directly into the originating card (e.g. Card #3), never defaulting to the first card.
  - Scoped child elements (`Image`, `Title`, `Tag`) morph back into the matching card's specific child nodes.
  - Deep-link back navigation (landing directly on `/detail/3` then clicking back to `/list`) correctly identifies Card #3 via pathname/slug matching.
  - Zero duplicate `view-transition-name` errors in browser console.
  - Root View Transition fade is completely suppressed (`animation: none !important`).
- **Non-Negotiables**:
  - Standalone Framer code component with zero unpublished external dependencies.
  - Strictly use `animateView` from `framer-motion`.
  - SSR safe, canvas editor safe (`RenderTarget.canvas`), and clean attribute cleanup.

3. **Project Requirements**
- [x] Document Active Origin Tagging design in `/plans/morphine-animateview.md`.
- [ ] Implement `activeOriginMemory` tracking with URL, pathname, slug, and index.
- [ ] Implement `tagActiveOriginInNewDOM(originMemory, fallbackUrl, containerName)` helper.
- [ ] Update `resolveBidirectionalPairs` to assign unique scoped selectors on reverse transitions.
- [ ] Inject the DOM tagger directly inside the `update` handler of `performViewTransition`.
- [ ] Clean up temporary tracking attributes after animation settles.
- [ ] Verify standalone compilation and build stability.

4. **Architecture Decisions**
- **Active Origin Tagging via Synchronous Post-DOM-Update Hook**:
  - *Decision*: In `animateView(async () => { await performNavigation(); tagActiveOriginInNewDOM(); })`, tag the exact card instance in the incoming DOM before Motion resolves selectors and before browser snapshot capture occurs.
  - *Why*: The browser View Transition API invokes the update callback, waits for its returned Promise to resolve, and *then* takes the snapshot of the new DOM. Tagging the specific card inside the update callback ensures `document.querySelectorAll('[data-morphine-active-card]')` returns exactly one element—the correct originating card.
- **Multi-Level Card Matcher**:
  - *Level 1 (Direct Link Match)*: Matches `a[href]` matching exact `pathname` or URL `slug` (works across SPA navigations and direct deep links).
  - *Level 2 (Index Match)*: Uses stored click index among siblings if cards do not use standard `<a>` links.
  - *Level 3 (Fallback)*: Safely falls back to index 0 if no match is found.

5. **Pseudo Code**
```shade
Component Morphine:
  Data:
    props: { targetFromNames: "Card", targetToNames: "DetailCard", transition }
    memory: { cardName, url, pathname, slug, index, timestamp }

  Logic:
    onForwardClick(cardEl, linkEl):
      record origin memory:
        url = linkEl.href
        slug = extractSlug(linkEl.href)
        index = indexOf(cardEl, allCards)

    tagActiveOriginInNewDOM(memory, currentUrl):
      allCards = queryAll('[data-framer-name="' + memory.cardName + '"]')
      targetCard = null
      
      // Match by slug or href
      for card in allCards:
        if card contains a[href*="slug"]: targetCard = card; break
      
      if not targetCard and memory.index != null:
        targetCard = allCards[memory.index]

      if targetCard:
        targetCard.setAttribute("data-morphine-active-card", "true")

    performViewTransition(pairs, navFn):
      animateView(async () => {
        await navFn()
        if isReverse:
          tagActiveOriginInNewDOM(originMemory, prevUrl)
      }, transition).add(pair.fromTarget, pair.toSelector)

  Render:
    <style dangerouslySetInnerHTML={{ __html: ROOT_VIEW_TRANSITION_CSS }} />
    <div style={{ display: "none" }} aria-hidden="true" />
```


