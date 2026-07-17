# PRD: Animated Counter Layer Component

## Overview
Create a "Parasitic" Animated Counter that latches onto a sibling Rich Text component in Framer, inherits its typography, and provides smooth, layout-stable digit animations.

## Objectives
- **Parasitic Binding**: Automatically find and "take over" a sibling `RichTextContainer`.
- **Style Inheritance**: Mirror `fontFamily`, `fontSize`, `fontWeight`, `color`, `letterSpacing`, and `lineHeight` from the target.
- **No Layout Shift**: 
    - Use `tabular-nums` for digit alignment.
    - Implement a stable digit track system (keyed from right-to-left).
    - Handle digit count changes (e.g., 9 -> 10) without jarring jumps.
- **Motion**: Snap-to-place springs for digit rolls.

# ADR: Architectural Design

## Discovery Strategy
Use `useLayoutEffect` to climb to the nearest structural parent and scan for a `RichTextContainer`. This is more robust than `previousSibling` in the complex Framer DOM.

## Style Mirroring
Use `window.getComputedStyle(targetP)` to grab the exact rendered styles. Apply these to a hidden "sizer" or directly to the counter container to ensure visual parity.

## Component Structure
- **Digit Layer**: A vertical column of 0-9.
- **Track Layer**: Splits the number into digits and separators.
- **Sizer**: (Optional) If the user wants zero layout shift during transitions like 9->10, we can calculate the width based on the *original* content's width OR provide a fixed-width mode. However, typically, "no layout shift" refers to the monospaced nature of digits within the counter.

## Framer Compatibility
Ensure it handles `data-framer-component-type` and works within the Framer hydration cycle (mutation observer + polling).

# TODO
1.  Define `AnimatedCounter` with robust sibling discovery.
2.  Implement `useStyleInheritance` hook to sync styles from the detected sibling.
3.  Rewrite `Digit` and `getTracks` to ensure structural stability.
4.  Add a MutationObserver to the target sibling to update the counter value when the sibling's text changes.
5.  Ensure the target sibling is hidden (`opacity: 0` or `visibility: hidden`) while the counter is active.
