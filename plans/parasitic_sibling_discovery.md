# PRD: Parasitic Sibling Discovery

## Overview
Enable a Framer Code Component to target and manipulate its siblings (Text and SVG) within the published DOM, bypassing Framer's container nesting and dynamic class names.

## Objectives
- Access "untouchable" canvas elements (RichText, SVG) from a sibling code component.
- Use robust selectors (`data-framer-component-type`) to ensure stability across builds.
- Provide a reusable pattern for "Parasitic" components that augment existing canvas UI.

# OKR
- **Targeting Accuracy**: 100% success in finding `p` and `svg` elements within the shared parent.
- **Zero-Config**: Component works immediately when placed inside the same Framer Frame as the targets.

# ADR: Parasitic Discovery Strategy

## 1. DOM Hierarchy Navigation
The component will use a `useLayoutEffect` to access its own DOM node, then move to the `parentElement`. In Framer, the direct parent is often a shared `layout` container (e.g., a Frame or Stack).

## 2. Robust Selectors
Framer generates dynamic class names (e.g., `framer-1hu7q98`). We will ignore these and use `[data-framer-component-type]` attributes:
- `[data-framer-component-type="RichTextContainer"]` for text blocks.
- `[data-framer-component-type="SVG"]` for graphic elements.

## 3. Deep Targeting
Once the wrapper containers are found, we query for the actual semantic nodes (`p`, `span`, `svg`) to perform manipulations like color overrides or custom animations.

# TODO
- [ ] Create `/components/Core/ParasiticTargeter.tsx` with discovery logic.
- [ ] Integrate discovery into the component's internal state/refs.
- [ ] Provide an example effect (e.g., syncing a hover state from the targeter to the text).
