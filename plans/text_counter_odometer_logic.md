# PRD: TextCounter Odometer Logic Upgrade

## Overview
Refactor `TextCounter.tsx` to implement a mathematically driven odometer logic. Instead of independent digit tracks with "shortest path" jump logic, every digit will be a deterministic transform of a single central `countMV`. This ensures perfect directional consistency and realistic gear-like behavior.

## Objectives
- **Directional Consistency**: Eliminate jitter and backwards flips.
- **Odometer Behavior**: Units spin 10x faster than Tens, 100x faster than Hundreds, etc.
- **Parasitic Discovery**: Preserve the ability to find and overlay RichText nodes in Framer.
- **Style Parity**: Maintain flipped digit sets and large strips for "infinite" scrolling feel.

# OKR (Success Criteria)
- [ ] No "shortest path" logic (digits always spin forward when count increases).
- [ ] Digit $10^p$ rotates exactly $Total / 10^p$ times.
- [ ] Support for decimal digits ($10^{-1}$, $10^{-2}$) following the same logic.
- [ ] Smooth transitions between characters when the counter structure changes (e.g., 99 -> 100).

# ADR (Architectural Design Record)

## 1. Central Motion Source
A single `useMotionValue(0)` called `countMV` will act as the source of truth for the entire component.

## 2. Digit Power Mapping
Each digit track will be assigned a "power" relative to the decimal point.
- Units: $p = 0$
- Tens: $p = 1$
- Decimals: $p = -1, -2, \dots$

The `Digit` component will receive `mv={useTransform(countMV, v => v / Math.pow(10, p))}`.

## 3. Structural Stability
We will continue to use the `tracks` state to render the digits. When the number of digits changes, the tracks will update.

## 4. Visuals
The `Digit` component uses a triply-duplicated set of digits (0-9) to handle wrapping. We will maintain the "Even/Odd" flip requested by the user.

# TODO
- [ ] Read `TextCounter.tsx` to identify all props and state.
- [ ] Implement `getPower` helper to calculate the power of 10 for each track.
- [ ] Refactor `useEffect` for `countMV` to handle `mount`, `prop`, and `scroll` triggers.
- [ ] Remove `updateDigitAnimations` and individual `digitMVs` references.
- [ ] Test with `npm run lint`.
