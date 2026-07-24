# Plan: Parasitic Text Counter (Modern Layout-Replacing Architecture)

## PRD (Overview & Objectives)

The **Parasitic Text Counter** is a high-performance, self-aware Framer code component. Rather than relying on React Portals, absolute coordinate syncing, or external overlays (which often break when resizing, changing layouts, or running inside nested Framer stacks), this component implements a **layout-replacing model**:

1. **Locate Target**: Finds the adjacent or nearest text element on the Framer canvas.
2. **Read Style & Rect**: Dynamically reads computed font size, line height, styles, margins, and bounding dimensions from the original element.
3. **Hide Original**: Sets `display: none` (or visual equivalent) on the original text element so it is completely hidden but still exists in the DOM for SEO, semantics, and original sizing info.
4. **Become the Replacement**: Inserts itself right next to (or in place of) the hidden text, adopting the exact physical position, margins, layout model (flex, block, inline-block), and typography styles of the original element.
5. **Animate Reels**: High-performance, character-by-character counter reels, with customizable trigger conditions (mount, scroll-into-view, scroll-driven-progress).

This solves all coordinate syncing lag, clipping bugs, layout shifts, responsive scaling issues, and stack insertion bugs standard portals suffer from.

---

## OKR (Success Criteria)

- **Objective 1**: Ensure rock-solid visual fidelity and stability in all responsive views and stack layouts.
  - *KR 1.1*: No absolute position syncing lag during scrolls, window resizes, or layout transitions.
  - *KR 1.2*: No layout shift when replacement occurs. The replaced component should occupy the exact same layout bounding box as the original text.
- **Objective 2**: Zero-configuration, robust DOM discovery.
  - *KR 2.1*: Gracefully discovers target element on mount and dynamically handles lazy-rendered DOM trees in Framer.
  - *KR 2.2*: SEO and accessibility preservation — original text node remains in the DOM (hidden) so screen readers and web crawlers can still parse it.
- **Objective 3**: Rich, high-performance animation capabilities.
  - *KR 3.1*: Sub-millisecond animation frame response, bypassing React re-render cycles by animating custom reels using Framer Motion’s optimized transforms.
  - *KR 3.2*: Clean wrapping around numbers, decimal support, comma styling, and direction-aware staggers.

---

## ADR (Architectural Design)

### 1. Sibling Discovery & Lifecycle
- The component will render a zero-size anchor or use a direct element reference in the DOM.
- Using `useLayoutEffect` and a polling fallback, it will climb up or search siblings to locate the closest text node inside the Framer container wrapper (targeting `data-framer-component-type="RichTextContainer"` or tags like `p, span, h1-h6`).
- It registers a `MutationObserver` on the target text to automatically update the count target if the original text changes dynamically on the canvas or via other interactions.

### 2. Styling Adoption & layout parity
- Compute the original styles using `window.getComputedStyle(target)`:
  - Font: `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `color`, `textTransform`.
  - Layout: `display` (inline-block vs. flex/block), `margin`, `padding`, `alignSelf`, `flexGrow`.
  - Dimensions: We read the width/height of the original text rect if needed, but since we insert our replacement element *in the same layout flow* as an inline/block element, standard CSS layout rules will naturally position it exactly where the original was.
- Instead of keeping the original text visible at `opacity: 0` (which still occupies space, forcing us to use absolute coordinates for the replacement), we set `display: none` on the original text and let our replacement container occupy the exact layout footprint.

### 3. Reel Rendering Structure
To animate individual digits without layout shifts:
- Divide the formatted target number into tracks (e.g., individual digits vs commas/periods/symbols).
- Non-digits are rendered as standard characters.
- Digits are rendered as a vertical roll/reel container with an `overflow: hidden` mask of height `1em`.
- The numeric track translate is driven by a `MotionValue<number>` linked to a standard Framer Motion animation.

---

## TODO (Action Plan)

- [ ] Create `/framer/ParasiticTextCounter.tsx`.
- [ ] Implement `useLayoutEffect` for finding the target text container.
- [ ] Add robust computed style inheritance (fontSize, lineHeight, color, spacing, fonts, alignments).
- [ ] Set up the DOM Replacement operation:
  - Back up target's original `display` style.
  - Set `target.style.display = "none"`.
  - Render the component in-flow matching the target's outer layout properties (margins, inline/block status).
- [ ] Implement dynamic reel rendering and digit wrapping calculations.
- [ ] Support trigger options (`"mount"`, `"scroll"`).
- [ ] Expose standard Framer component property controls via `addPropertyControls`.
