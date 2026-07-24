# PRD: SystemSpec Layout Refactor

## Overview
Refactor the `SystemSpec.tsx` component to utilize a "Holy Grail" layout (Fixed Header, Scrollable Body, Fixed Footer). This improves usability within a `FloatingWindow` context by preventing event coordinate mismatches and ensuring interaction handles are not obstructed.

## OKR
- **Success Criteria**: 
  - Header remains visible at the top.
  - Footer remains visible at the bottom.
  - Body content scrolls independently.
  - 12px additional padding added to the footer's bottom to clear resize handles.
  - Zero redundant scrollbars on the root panel.

## ADR
- **Architecture**: Flexbox column layout on the root container.
- **Scrolling**: `overflow: hidden` on root, `overflow-y: auto` on the body segment.
- **Interactions**: Use `flex-shrink: 0` for header/footer to prevent collapse.
- **Tokens**: Strictly adhere to `Theme.tsx` space tokens (`Space.XL`).

## TODO
- [ ] Read `SystemSpec.tsx` and extract sections.
- [ ] Define wrapper styles for Header, Body, and Footer.
- [ ] Update Footer padding with `calc(theme.space['Space.XL'] + 12px)`.
- [ ] Verify layout stability and scroll behavior.
- [ ] Perform lint and build check.
