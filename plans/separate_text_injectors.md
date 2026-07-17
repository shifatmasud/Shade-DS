# PRD: Separate Text Injectors

## Overview
Decompose the multi-purpose `TextInjector.tsx` into two specialized, high-performance components: `TextCounter.tsx` and `TextShimmer.tsx`. This promotes modularity, reduces bundle size for specific use cases, and simplifies property control management.

## Objectives
- Create `framer/TextCounter.tsx` for numeric animations.
- Create `framer/TextShimmer.tsx` for text reveal and shimmer effects.
- Both components must strictly follow the "UI Layers (Visible)" pattern for root containers.
- Maintain existing discovery logic and styling inheritance.

## Success Criteria (OKR)
- Two standalone files created with zero dependency on each other's logic.
- Clean property controls for each specific effect.
- Zero-UI footprint (injector pattern) maintained.

## ADR: Architectural Design
- **Discovery Logic**: Duplicate the core discovery and text extraction logic in both files (or move to a utility if it becomes complex, but for now, duplication keeps them truly standalone).
- **Styling**: Continue using the JS-object style pattern with `Theme.tsx` alignment where applicable.
- **Hierarchy**: Both belong to the `Package` or `framer/` (Framer component) level.

## TODO
- [x] Create `framer/TextCounter.tsx`
- [x] Create `framer/TextShimmer.tsx`
- [x] Delete `framer/TextInjector.tsx` (replaced by specialized components)
- [x] Verify both build correctly and respect the UI Layer pattern.
