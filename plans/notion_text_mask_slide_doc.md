# TextMaskSlide: Parasitic DOM Masked Typography Component

## 1. Executive Summary & Overview
`TextMaskSlide.tsx` is an advanced Framer Code Component designed to produce high-end masked typography animations (e.g. words, lines, or characters emerging smoothly from behind invisible clipping masks) without requiring designers to manually construct nested frames for every text element.

It operates as a **Parasitic DOM Companion**: dropping this component onto the Framer canvas near any native text element automatically binds to that text, parses and splits its contents, injects a double-layered overflow mask structure, and drives the reveal sequence using **Framer Motion** physics or scroll progress.

---

## 2. Core Architecture & Mental Model

```
┌──────────────────────────────────────────────────────────┐
│              Parasitic Discovery (DOM Scan)              │
│    Inspects parent container & finds sibling text node   │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│           GSAP SplitText Double-Layer Injection          │
│   Replaces raw text with Outer Mask + Inner Moving Node  │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                Framer Motion Render Loop                 │
│      Applies Spring transitions, Stagger, Blur, & Y      │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│             Trigger & Interaction Handlers               │
│   • Load / Property-Driven (`start` ↔ `end`)             │
│   • Scroll Scrub (`useScroll` target offset tracking)    │
│   • Window Resize Re-calculation & Clean Revert          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. The Two-Layer DOM Injection

When `splitMode` is configured (e.g., `words`, `lines`, or `chars`), the plain DOM text structure is transformed into a nested two-layer layout:

### A. Before Injection
```html
<h1 class="framer-text">
  Design Systems
</h1>
```

### B. After Injection (Word Mode)
```html
<h1 class="framer-text">
  <!-- LAYER 1: The Outer Clipping Window (Mask) -->
  <div class="split-mask-word" style="overflow: hidden; display: inline-block; vertical-align: top;">
    
    <!-- LAYER 2: The Moving Element (Animated via Framer Motion) -->
    <div class="split-inner-word" style="display: inline-block; will-change: transform, opacity; transform: translateY(0%);">
      Design
    </div>
  </div>

  <div class="split-mask-word" style="overflow: hidden; display: inline-block; vertical-align: top;">
    <div class="split-inner-word" style="display: inline-block; will-change: transform, opacity; transform: translateY(0%);">
      Systems
    </div>
  </div>
</h1>
```

### Purpose of Each Layer:
1. **Outer Mask Layer (`.split-mask-*`)**:
   - `overflow: hidden`: Creates the strict bounding box / "curtain".
   - `display: inline-block`: Preserves inline document flow while enforcing clipping bounds.
2. **Inner Content Layer (`.split-inner-*`)**:
   - `transform: translate3d(...)`: Shifts initial position out of view (e.g. `translateY(100%)`).
   - `will-change: transform, opacity`: Ensures GPU layer promotion for 60/120fps stutter-free motion.
   - `opacity` & `filter: blur(...)`: Smoothly fades and unblurs text as it slides into the mask window.

---

## 4. Animation Modes & Triggers

### 1. Property-Driven / Load Mode (`mode: "fromProp"`)
- Transitions between two visual states: `start` (hidden below mask) and `end` (visible).
- Driven by customizable **Spring Physics** (Stiffness, Damping, Mass) or **Ease curves**.
- Supports sequential delay (**Stagger**) per line, word, or character.

### 2. Scroll-Scrub Mode (`mode: "scroll"`)
- Hooks into Framer Motion's `useScroll`.
- Tracks viewport entry and exit offsets (e.g., `"start end"` to `"end start"`).
- Smoothly interpolates transform, opacity, and blur values in real time based on scroll wheel/touch drag position.

---

## 5. Key Resilience & Performance Safeguards

1. **Window Resize & Line Wrap Recalculation**:
   - When text is split by `lines`, browser resizes naturally shift where words wrap.
   - A debounced `ResizeObserver` / `window.resize` handler calls `SplitText.revert()` and recalculates the line splits dynamically.
2. **Pre-split Flash Prevention**:
   - Applies an initial hidden style to the sibling text target immediately on mount, preventing unstyled text flash (FOUC) before GSAP finishes measuring and splitting.
3. **Accessibility (`prefers-reduced-motion`)**:
   - Respects operating system reduced motion preferences by skipping the slide/blur animation and presenting fully rendered text instantly.
4. **Lifecycle Cleanup**:
   - On component unmount, `SplitText.revert()` strips all generated divs and restores the original plain text DOM hierarchy cleanly without leaving orphan nodes.

---

## 6. Property Controls Cheat Sheet

| Property Control | Type | Description |
| :--- | :--- | :--- |
| `splitMode` | `"lines"` \| `"words"` \| `"chars"` | Granularity of the splitting and masking. |
| `direction` | `"slideUp"` \| `"slideDown"` \| `"slideLeft"` \| `"slideRight"` | Direction from which text enters the mask boundary. |
| `mode` | `"fromProp"` \| `"scroll"` | Trigger type: toggle/load based vs scroll scrub. |
| `stagger` | `Number (seconds)` | Delay offset between consecutive split items. |
| `blurAmount` | `Number (px)` | Initial Gaussian blur applied to entering items. |
| `springStiffness` | `Number` | Spring tension for prop-driven animations. |
| `springDamping` | `Number` | Spring resistance to control bounce and overshoot. |
