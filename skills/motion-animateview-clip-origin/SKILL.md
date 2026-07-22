---
name: motion-animateview-clip-origin
description: Guide for debugging and fixing clip-path coordinate offsets in Framer Motion's animateView transitions.
---

# Motion animateView Clip Origin Debugging Skill

## Problem Pattern

When using Framer Motion's `animateView().new()` with CSS `clipPath` (e.g., `circle(0% at ${x}px ${y}px)`), the reveal animation may start from an incorrect origin (like the top-left of the screen or offset from the click/trigger location).

### Root Causes
1. **Viewport Coordinate Space vs. Document Space**: `animateView().new()` animates snapshot-based View Transition pseudo-elements. The snapshot overlay exists in the viewport coordinate space.
2. **Absolute/Fixed Positioning Conflict**: Passing local element-relative or scroll-uncompensated coordinates to a viewport-fixed animation layer causes major offsets.
3. **Scroll Offsets**: Adding `window.scrollX` or `window.scrollY` inappropriately when the target is viewport-fixed, or failing to add them when the target is document-bound.

---

## Debugging and Resolution Strategy

### Step 1: Use clientX / clientY for Direct Clicks
If the transition is triggered by a pointer event (click, touch, mouse down), prefer using the pointer's viewport coordinates directly without adding any scroll offsets:

```tsx
const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
  const x = e.clientX;
  const y = e.clientY;

  animateView(() => {
    flushSync(() => {
      setThemeState();
    });
  }).new({
    clipPath: [
      `circle(0% at ${x}px ${y}px)`,
      `circle(150% at ${x}px ${y}px)`
    ],
  }, {
    duration: 1.2,
    ease: "easeInOut"
  });
};
```

---

### Step 2: Convert to Viewport Percentages (Highly Robust)
If pixel coordinates result in offsets due to high-DPI scaling, browser zooms, nested layout bounds, or iframe containment, normalize the center of the triggering element to viewport-relative percentages. This is the most bulletproof way to animate coordinate-based clip paths on full-screen View Transition overlays:

```tsx
const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  
  // Normalize viewport coordinate to exact percentage
  const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
  const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;

  animateView(() => {
    flushSync(() => {
      setThemeState();
    });
  }).new({
    clipPath: [
      `circle(0% at ${x}% ${y}%)`,
      `circle(150% at ${x}% ${y}%)`
    ],
  }, {
    duration: 1.2,
    ease: "easeInOut"
  });
};
```

---

### Step 3: Handle Scroll Compensation (When Document-Bound)
If the Transition or target element layout is bound to the document's scrolling flow instead of the static viewport:

```tsx
const rect = e.currentTarget.getBoundingClientRect();
const x = rect.left + rect.width / 2 + window.scrollX;
const y = rect.top + rect.height / 2 + window.scrollY;
```

---

### Step 4: Recommended Fallback (Custom Motion Overlay)
If standard `animateView` does not respect the dynamic clip-path origins or breaks in specific mobile browsers, fall back to a high-performance, custom-positioned `<motion.div>` element acting as an overlay:

```tsx
// 1. Maintain local trigger coordinate state
// 2. Render a fixed layout overlay
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: calculatedDiagonal }}
  style={{
    position: "fixed",
    left: x,
    top: y,
    transform: "translate(-50%, -50%)",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    backgroundColor: targetThemeColor,
    pointerEvents: "none",
    zIndex: 9999
  }}
/>
```

---

## Architectural Rules

- **Rule 1**: Never hardcode coordinate offsets when adjusting animations.
- **Rule 2**: View Transition snapshots are viewport-based. Align coordinates with the viewport unless specifically building document-flow wrappers.
- **Rule 3**: If percentage-based conversion does not align perfectly, switch immediately to a lightweight `<motion.div>` circle overlay to preserve perfect visual precision.
- **Rule 4**: Ensure immediate visual interaction feedback on both desktop cursors and touch devices.
