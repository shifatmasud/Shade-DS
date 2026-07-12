# Plan: Double Layered Typewriter & Shimmer Text Component

## PRD (Overview & Objectives)
- **Objective**: Create a highly polished, responsive, and performance-optimized React component that performs double-layered typewriter text animations followed by a soft, diffused, glowing horizontal shimmer light sweep clipped to the text boundaries.
- **Context**: Used primarily for console logs (making terminal outputs feel dynamic and visually striking) and extensible to other display texts.
- **Key Features**:
  1. **Double-Layered Rendering**: A backdrop text layer combined with an absolutely positioned overlay layer that hosts the glowing shimmer gradient.
  2. **Typewriter Animation**: Character-by-character staggered letter revelation using Framer Motion.
  3. **Diffused Shimmer Sweep**: A horizontal light sweep across the text that triggers immediately upon typewriter completion, styled with a soft diffused glow and clipped perfectly to the text shapes.

## OKR (Success Criteria)
- **OKR 1**: Successfully animate text character-by-character with adjustable typing speed.
- **OKR 2**: Smooth horizontal shimmer sweep after typewriter finishes.
- **OKR 3**: Seamless styling using JS Style objects integrated with the Design Tokens in `Theme.tsx`.
- **OKR 4**: Clean typing support and zero infinite re-renders on status changes or logs appending.

## ADR (Architectural Design)
- **Component Placement**: `/components/Core/DoubleLayeredText.tsx`
- **Typing Mechanics**:
  - Split text into characters.
  - Wrap each character in an inline `<motion.span>` or `<span style={{ display: 'inline-block' }}>` block to prevent layout disruption.
  - Stagger typing using a standard Framer Motion staggered transition.
- **Double-Layered Shimmer Mechanics**:
  - **Layer 1 (Backdrop)**: Text with the primary log state color (content-based color from theme).
  - **Layer 2 (Shimmer Glow Overlay)**: Placed exactly on top of Layer 1. Uses `-webkit-background-clip: text` and `-webkit-text-fill-color: transparent` to clip a moving gradient to the text contour.
  - **Glow Aspect**: Add a secondary offset or filtered blur shadow layer (`textShadow` or blur filter) to produce a soft glowing halo around the letters as the shimmer sweeps.
- **Integration**:
  - Replace/upgrade the text message inside `LogEntry.tsx` to use `DoubleLayeredText` so console messages typing out look beautiful!

## TODO
1. Create `/components/Core/DoubleLayeredText.tsx`.
2. Export it from `/components/Core/index.tsx`.
3. Integrate `DoubleLayeredText` into `/components/Core/LogEntry.tsx`.
4. Compile, lint, and verify execution.
