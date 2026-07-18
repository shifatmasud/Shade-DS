# Plan: Ultra-Smooth, Zero-Jitter TextCounter Animation

## 1. PRD (Overview & Objectives)

The objective of this plan is to eliminate all forms of jitter, stutter, layout jumps, and frozen-digit bugs in the `TextCounter` component, achieving a buttery-smooth 60fps/120fps hardware-accelerated odometer roll.

### Identified Bottlenecks & Causes of Jitter

1. **React State Mutation Mid-Animation (Frame Drops)**:
   - On every frame of the central count animation, `handleValueChange` parses the raw float, formats it, and builds a structure of "tracks". 
   - When crossing digit boundaries (e.g., `9` to `10`, `999` to `1,000`), the structure changes, which triggers `setTracks()`.
   - Calling React state updates inside high-frequency animation callbacks causes full Virtual DOM re-renders, blocking the main thread and causing noticeable micro-stutter/dropped frames.

2. **Frozen Digit Bug (Desynchronization)**:
   - When a new digit track is added mid-animation (e.g. crossing a power of 10), it mounts with a freshly created `motionValue`.
   - Since the main stagger animation was triggered once at the start of the transition, this new track missed the trigger and is never animated to the target value. It remains frozen or jumps instantly.

3. **Sub-pixel Layout Snapping (Text Shaking)**:
   - The current code uses `em` units (`-10em` to `-19em`) for vertical translation.
   - Since `em` is relative to font size, fractional `em` values result in fractional pixel offsets (e.g. `11.23em` = `179.68px`). Browsers round these values during sub-pixel layout rendering, causing the numbers to vibrate or shake vertically.

4. **Lack of GPU Compositing Promotion**:
   - The vertical slider `motion.div` does not utilize `willChange: "transform"` or 3D transform hints. The browser is forced to rasterize the text container on the CPU during every frame.

5. **Vertical Font Metric Drift**:
   - Displaying raw numbers within inline block spans of `1em` height does not guarantee perfect vertical centering due to variation in font baseline metrics.

---

## 2. OKR (Success Criteria)

* **KR1 (Performance)**: Zero React state updates (`setTracks`) during active spring/scroll transitions. The component's track list remains completely static.
* **KR2 (Visual Fidelity)**: 100% consistent rendering with zero vertical vibrations ("shaking") on both high-DPI (Retina) and standard displays.
* **KR3 (Mathematical Sync)**: All digit reels are perfectly synchronized to the parent value, with zero frozen digit bugs when crossing boundaries (e.g. `9` -> `100`).
* **KR4 (Layout Fluidity)**: Horizontal adjustments (when commas/separators appear) interpolate smoothly using Framer Motion's layout engine instead of snapping.

---

## 3. ADR (Architectural Design)

We propose four core structural changes to the animation pipeline:

### A. Pre-Padding & Static Track Layout
* **Strategy**: At the start of an animation transition, determine the maximum number of digits required to represent the larger of the starting value and the target value.
* **Benefit**: Pre-padding the tracks ensures the track list structure remains completely static during the entire duration of the animation.
* **Implementation**: If animating from `0` to `125`, we pre-pad the tracks to 3 digits. Leading zero digits are rendered with `opacity: 0` (or hidden in layout) until they transition to non-zero, preventing layout shifts and eliminating mid-animation re-renders.

### B. Single Source of Truth Animation (Perfect Sync)
* **Strategy**: Use a single central `countMV` as the sole driver.
* **Benefit**: Every `Digit` component uses a direct, reactive `useTransform` derived from `countMV`.
* **Implementation**:
  - The ones digit listens to `countMV` and transforms via `val % 10`.
  - The tens digit listens to `countMV` and transforms via `(val / 10) % 10`.
  - This guarantees that even if a digit is mounted, its transform is computed instantly from the exact current state of `countMV`, preventing any desync or frozen tracks.

### C. Pixel-Based Precise Translates
* **Strategy**: Read the target element's exact `lineHeight` in pixels (`lineHeightPx`) during style extraction.
* **Benefit**: Convert the fractional offsets to precise pixel measurements (e.g. `offset * lineHeightPx`) and pass raw numbers to Framer Motion's `y` property.
* **Implementation**: Framer Motion optimizes numeric values to hardware-accelerated 3D matrices (e.g., `translate3d(0px, -240px, 0px)`), which bypasses sub-pixel layout rounding.

### D. GPU Promotion & Baseline Centering
* **Strategy**: Promote the digit columns to their own GPU compositing layer and center the glyphs.
* **Implementation**:
  - Apply `willChange: "transform"`, `transformStyle: "preserve-3d"`, and `backfaceVisibility: "hidden"` to the rolling track `motion.div`.
  - Style each digit span inside the reel with `display: "flex"`, `alignItems: "center"`, and `justifyContent: "center"` within the pixel `lineHeight` box to center characters perfectly regardless of font baseline differences.

---

## 4. TODO List

### Step 1: Extract Precise Pixel Line-Height
- [ ] Parse `extractedStyles.lineHeight` to a float `lineHeightPx` in pixels (with a robust fallback to `fontSize * 1.2` if normal/undefined).
- [ ] Pass `lineHeightPx` down to the `Digit` component.

### Step 2: Refactor Digit Component for Pixel Offsets & GPU Layering
- [ ] Update `Digit` to receive `lineHeightPx` and map `yTranslate` to pixel values: `return offset * lineHeightPx`.
- [ ] Apply `willChange: "transform"`, `transformStyle: "preserve-3d"`, and `backfaceVisibility: "hidden"` to `<motion.div>`.
- [ ] Style each digit span to flex-center the numbers inside the height.

### Step 3: Implement Static Track Structuring (Pre-Padding)
- [ ] Compute the maximum length required for the integer part upfront.
- [ ] Ensure `tracks` remains stable during animation, and use the `layout` prop on track wrapper `span` elements to smoothly animate width changes (like comma insertions).

### Step 4: Verification
- [ ] Verify there are zero console errors and compile/build succeeds.
- [ ] Benchmark rendering performance under 60fps profiling.
