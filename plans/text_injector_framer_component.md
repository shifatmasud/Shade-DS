# PRD: TextInjector Framer Component

## Overview
A bidirectional "Parasitic" Framer component that discovers sibling text nodes and injects advanced animation systems (Counters, Typewriters, Shimmer effects) without requiring the user to wrap their text in a specific component.

## Objectives
- Follow the `SVGPathInjector` pattern for discovery and UI feedback.
- Integrate `AnimatedCounter` logic as a preset.
- Integrate `DoubleLayeredText` (shimmer + typewriter) logic as a preset.
- Support `mount`, `scroll`, and `prop` triggers.

# OKR: Success Criteria
- [ ] Component successfully hides sibling text and renders animated replacement.
- [ ] Presets ("Counter", "Shimmer") correctly apply respective logic.
- [ ] Scroll-linked counting/drawing works via `useScroll`.
- [ ] Visual feedback in Framer Canvas (Found/Searching states).

# ADR: Architectural Design

## Discovery Strategy
- Use the "Shared Parent" scan: Climb until a parent with multiple children is found.
- Target `[data-framer-component-type="RichTextContainer"]`.
- Resolve the raw text from the target node to use as the base for animations.

## Rendering Pipeline
- **Host Hide**: The injector hides the target sibling via `visibility: hidden` and `position: absolute`.
- **Portal/Overlay**: The injector renders the replacement component inside its own bounds (or as a portal if needed, but standard relative positioning usually works for sibling overlays).
- **MotionValue Sync**: Use Framer Motion `MotionValue` threads to bypass React re-renders during high-frequency scroll or prop updates.

## Presets
1. **Counter**: 
   - Parses number from sibling text.
   - Uses digit-by-digit spring-based rolling animation.
2. **Shimmer**:
   - Performs letter-by-letter typing.
   - Applies a horizontal light sweep with a volumetric glow once complete.

# TODO
- [ ] Create `framer/TextInjector.tsx`.
- [ ] Implement `useHostText` logic for discovery and text extraction.
- [ ] Port `AnimatedCounter` logic into the `Counter` mode.
- [ ] Port `DoubleLayeredText` logic into the `Shimmer` mode.
- [ ] Add Framer Property Controls for presets, triggers, and styling.
- [ ] Add visual "Injector" status UI for the editor.
