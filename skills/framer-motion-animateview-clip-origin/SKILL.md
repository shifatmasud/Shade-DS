---
name: framer-motion-animateview-clip-origin
description: >
  Debug and fix Framer Motion animateView clip-path transition origin offsets.
  Handles viewport coordinate systems, DOM measurements, pointer events, and
  fallback overlay strategies.
---

# Motion animateView Clip Origin Skill

## Objective

Ensure radial clip-path transitions originate from the true trigger location.

Common symptoms:

- Reveal starts from top-left corner
- Reveal is shifted from button position
- Works on desktop but breaks on scroll/mobile
- Offset changes after resizing or zooming

---

# Core Principle

`animateView().new()` operates on View Transition snapshots.

The snapshot layer is:

Viewport Coordinate Space

Therefore transition origins must also be:

Viewport Coordinate Space

Never mix:

Viewport pixels | Document pixels | Component-local pixels

---

# Coordinate Decision Tree

## Case 1 — Direct Pointer Interaction

Use when transition starts from:

- click
- pointerdown
- touch event

Preferred source:

```ts
event.clientX
event.clientY
```

Because these are already viewport coordinates.

Example:

```ts
const x = event.clientX;
const y = event.clientY;
```

Do NOT:

```ts
x += window.scrollX;
y += window.scrollY;
```

---

## Case 2 — Trigger Element Position

Use when transition originates from a button/icon without pointer coordinates.

Measure:

```ts
const rect = element.getBoundingClientRect();

const centerX = rect.left + rect.width / 2;
const centerY = rect.top + rect.height / 2;
```

Convert to viewport percentages:

```ts
const x = (centerX / window.innerWidth) * 100;
const y = (centerY / window.innerHeight) * 100;
```

Use:

```ts
circle(0% at ${x}% ${y}%)
```

↓

```ts
circle(150% at ${x}% ${y}%)
```

Why percentages?

They survive:

- responsive resizing
- browser zoom
- viewport scaling
- dynamic layouts

---

## Case 3 — Document-Based Animation

Only use scroll offsets when the animation surface itself follows document coordinates.

Example:

```ts
const x = rect.left + rect.width / 2 + window.scrollX;
const y = rect.top + rect.height / 2 + window.scrollY;
```

Warning:

Do not use this with:

- fixed overlays
- View Transition snapshots
- viewport-sized transition layers

---

# Debug Procedure

## Step 1 — Identify coordinate space

Ask:

Where does the animated element live?

Options:

- **fixed viewport layer**: use client coordinates
- **DOM element overlay**: use rect coordinates
- **document canvas**: use scroll compensated coordinates

---

## Step 2 — Log coordinates

Before animation:

```ts
console.table({
  rect,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
  x,
  y
});
```

Expected:

- x/y should match visual button location
- origin should not be negative
- origin should not exceed viewport bounds

---

## Step 3 — Clamp Values

```ts
const clamp = (v: number) => Math.min(Math.max(v, 0), 100);
```

Apply:

```ts
const x = clamp(normalizedX);
const y = clamp(normalizedY);
```

---

# Fallback Strategy

If `animateView` ignores dynamic clip-path origins:

Use a custom viewport-fixed overlay.

Architecture:

```
Trigger
   ↓
Calculate center
   ↓
Render fixed circle
   ↓
Scale outward
   ↓
Remove
```

Example:

```tsx
<motion.div
  style={{
    position: "fixed",
    left: x,
    top: y,
    translateX: "-50%",
    translateY: "-50%"
  }}
/>
```

This gives absolute visual control.

---

# Anti Patterns

### Wrong
```ts
rect.left + window.scrollX
```
when using viewport snapshots.

Reason: viewport + document = wrong coordinate system.

---

### Wrong
```ts
circle(150% at 50% 50%)
```
when origin should follow a button.

---

### Wrong
Measuring after state update. Always measure before:
```ts
flushSync()
```

---

# Final Rule

For Framer Motion View Transitions:

Priority order:
1. **Pointer event** → `clientX`/`clientY`
2. **Element trigger** → `getBoundingClientRect()` → viewport %
3. **Document canvas** → scroll compensated pixels
4. **If unreliable** → custom fixed overlay

Always animate inside the coordinate space you measured from.
