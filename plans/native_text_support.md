# PRD: Native Text Layer Support

## Overview
Update `TextCounter` and `TextShimmer` to support native Framer text layers by injecting overlays directly into the sibling `RichTextContainer`.

## Objectives
- Use `createPortal` to move the UI layer into the sibling's DOM.
- Mirror typography and layout from the native text node.
- Maintain zero visual presence in the Code Component's own container.

## Success Criteria (OKR)
- Animated text appears exactly where the native text layer is.
- Native text is hidden (`opacity: 0`) while the injector is active.
- Native text visibility is restored when the injector is removed.

## ADR: Architectural Design
- **Portal Injection**: We render into `target.parentElement` (the `RichTextContainer`) using `createPortal`.
- **Discovery**: We use the sibling discovery logic to find the `RichTextContainer`.
- **Cleanup**: On unmount, we reset the sibling container's style.

## TODO
- [ ] Update `framer/TextCounter.tsx` with Portal logic.
- [ ] Update `framer/TextShimmer.tsx` with Portal logic.
- [ ] Verify discovery and injection cycles.
