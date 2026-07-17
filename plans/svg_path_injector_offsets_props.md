# PRD - SVGPathInjector useScroll Offsets Upgrade

## Overview & Objectives
The `SVGPathInjector` component currently has hardcoded scroll offsets (`["start end", "end start"]`). The objective is to expose these offsets as configurable props to allow designers to fine-tune when the drawing animation triggers and finishes relative to the viewport.

## OKR (Success Criteria)
- Designers can set start and end scroll offsets via Framer Property Controls.
- The `useScroll` hook in `SVGPathInjector` respects these custom offsets.
- Default values match the current behavior to ensure backward compatibility.

## ADR (Architectural Design)
- **Data**: Add `scrollOffsetStart` and `scrollOffsetEnd` to the component props.
- **Logic**: Update the `useScroll` configuration to use `[props.scrollOffsetStart, props.scrollOffsetEnd]`.
- **Render**: Add `ControlType.String` property controls for these offsets in `addPropertyControls`.

## TODO
- [ ] Read `framer/SVGPathInjector.tsx` (Done).
- [ ] Implement prop-based offsets in `SVGPathInjector`.
- [ ] Add property controls for `scrollOffsetStart` and `scrollOffsetEnd`.
- [ ] Verify compilation.
