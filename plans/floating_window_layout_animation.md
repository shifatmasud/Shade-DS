# PRD: Smooth Layout Transitions for Floating Windows

## Overview
Implement fluid, smooth layout transitions for the `FloatingWindow` component, ensuring that size changes (especially during tab switches in Lean mode) are animated rather than abrupt.

## Objectives
- Enable Framer Motion `layout` animations for `FloatingWindow`.
- Ensure `TabbedPanel` content changes trigger these layout animations.
- Use `LayoutGroup` to scope layout animations and prevent conflicts.
- Maintain existing drag and focus functionality.

# OKR: Success Criteria
- [ ] `FloatingWindow` height animates smoothly when switching tabs in Lean mode.
- [ ] No layout "jumps" when switching between contents of different heights.
- [ ] Transitions feel "physical" and responsive (Spring-based).

# ADR: Architectural Design

## 1. FloatingWindow.tsx
- Add `layout` prop to the root `motion.div`.
- Add `layout` to the header and footer to ensure they stay pinned correctly during height transitions.
- Use a `transition` that includes layout properties.

## 2. TabbedPanel.tsx
- Add `layout` to the content wrapper.
- Use `LayoutGroup` to ensure all children participate in the same layout context.
- Consider removing `mode="wait"` if a cross-fade/simultaneous resize is preferred, or keep it if "popLayout" fits better. The user asked for "smooth size changes", which usually implies the container should grow/shrink as content arrives.

## 3. Home.tsx
- Wrap the windows section in a `LayoutGroup` to coordinate any potential shared layout animations.

# TODO
- [ ] Modify `FloatingWindow.tsx` to include `layout` and `LayoutGroup` if necessary.
- [ ] Modify `TabbedPanel.tsx` to enable layout animations on content change.
- [ ] Verify transition quality and adjust spring settings.
