# PRD: Animated Counter Layer Framer Component

## Overview
Create a high-performance, style-inheriting animated counter component for Framer. This component acts as a "layer" that latches onto a sibling text element, inherits its typography, and replaces its content with smoothly animating digit columns.

## Objectives
- **Style Parity**: Automatically match the font, color, and size of a sibling text container.
- **Visual Stability**: Prevent layout shifts during transitions (e.g., from 1 digit to 2 digits, or 9 to 10).
- **Ease of Use**: A single-file component that works by being placed next to a text layer in Framer.
- **High Performance**: Use Framer Motion values for direct DOM manipulation of digit columns.

## OKR (Success Criteria)
- [ ] Component successfully finds sibling `RichTextContainer` in Framer.
- [ ] Computed styles from sibling `<p>` or `<span>` are applied to the counter.
- [ ] Transition from 9 to 10 happens without horizontal jumping of existing digits.
- [ ] Property controls allow overriding the value and decimals.

## ADR (Architectural Design)
- **Pattern**: Parasitic Sibling Binding.
- **Discovery**: Use `useHost` logic (shared-parent mode) to scan for `RichTextContainer`.
- **Styling**: `window.getComputedStyle` used to capture and mirror the sibling's visual identity.
- **Animation**: `motion.div` with `y` transform for digit columns [0-9].
- **Stable Tracking**: Digit tracks are keyed by their position from the right (units, tens, etc.).

## TODO
- [ ] Create `/framer/AnimatedCounter.tsx`.
- [ ] Implement inlined `useHost` and `findSiblingByType` logic.
- [ ] Implement style inheritance logic with `useLayoutEffect`.
- [ ] Implement digit track management logic.
- [ ] Add property controls for Framer integration.
- [ ] Verify SSR/Hydration safety.
