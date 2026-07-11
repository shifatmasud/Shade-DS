# PRD: Layout Shift Prevention for Content-Changing Elements

## Overview
Ensure all interactive components that change their contents (labels, states, loading indicators) maintain a stable layout by adhering to the `width: "100%"` (or `flex: 1`) constraint. This prevents jitter and unexpected resizing when content transitions occur.

## Objectives
- Audit all core interactive components for content-driven layout shifts.
- Standardize `width: "100%"` or equivalent flex behaviors on these components.
- Ensure parent containers respect these widths to provide a fixed boundary for dynamic content.

# OKR: Success Criteria
- [ ] `Button.tsx` strictly enforces `width: "100%"`.
- [ ] `Toggle.tsx` container enforces `width: "100%"`.
- [ ] `SegmentedControl.tsx` items use `flex: 1` to maintain equal, fixed width regardless of label expansion.
- [ ] `Select.tsx` and `Input.tsx` enforce `width: "100%"`.
- [ ] Layout shift during content transitions (e.g., Toggle labels, Button loading states) is eliminated.

# ADR: Architectural Design
- **Core Components**: Apply `width: "100%"` to the base container of interactive primitives.
- **Flexbox Strategies**: Use `flex: 1` for grouped elements (like segments) to ensure they share space predictably.
- **Content Masking**: For components with expanding labels (like `SegmentedControl`), consider absolute positioning or fixed-width containers if `flex: 1` isn't sufficient, though `flex: 1` is preferred for responsiveness.

# TODO
- [ ] Audit `components/Core/index.tsx` exports.
- [ ] Update `SegmentedControl.tsx` to use `flex: 1` for items.
- [ ] Verify `Button.tsx` already has `width: "100%"`.
- [ ] Verify `Toggle.tsx` already has `width: "100%"`.
- [ ] Check `Select.tsx` and apply `width: "100%"`.
- [ ] Check `Input.tsx` and apply `width: "100%"`.
- [ ] Check `SegmentedTab.tsx` and apply `flex: 1`.
- [ ] Run `lint_applet` and `compile_applet`.
