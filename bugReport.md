# Bug Report - Jelly GPGPU

## Resolved Issues
- **Uncaught Error: Maximum update depth exceeded**: Fixed infinite render loop caused by `ColorPicker` re-registering and syncing parent state callbacks inside `useEffect` on every render. Cleaned up state flow by computing live values and binding update handlers directly in `Home.tsx`'s render loop, ensuring `activePickers` only tracks open window configurations without feedback cycles.
- **Skeleton Overhead**: Removed `WiggleBone` and `Skeleton` boilerplate.
- **Edge cases**: Fixed vertex-to-pixel mapping for non-power-of-two geometry counts.
- **Floating Window Centering**: Resolved initial offset layout bug where Framer Motion drags would override the `-50%` CSS `transform` translate centering, causing the window to align by its top-left corner. Added standalone modern CSS `translate: '-50% -50%'` to bypass transform conflicts.

## Open Issues
- **Self-Collision**: The GPGPU simulation doesn't currently handle internal volume preservation/self-collision (standard for vertex shaders).
- **Shadow Mapping**: Custom depth material required for accurate shadows with deformed vertices (to be implemented).

## Style Verifications (2026-05-26)
- **Resolved generic flat borders**: Replaced flat 1px solid boundaries with double (outer + inset) box shadows featuring a 0px offset, 1px pristine blur, and crisp 0px spread across high-visibility components.
- **Resolved focus outline box alignment**: Upgraded 2px focus indicators to use native CSS `outline` and `outlineOffset: -2px` to secure accurate overlap rendering without layout shifting.
