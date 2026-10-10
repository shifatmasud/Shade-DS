---
name: decoupled-kinetic-scrub
description: Decouple onScroll input from rigid 1:1 scrubbing using virtual target anchors, spring dynamics, and kinetic momentum carry-over for organic scroll-triggered animations.
---

# Decoupled Kinetic Scrub

This skill defines the architectural pattern and implementation standards for **Decoupled Kinetic Scrub** (also known as *Target-Anchor Elastic Scrubbing* or *Spring-Decoupled Scroll*).

Instead of binding visual properties 1:1 directly to scrollbar pixels (which feels robotic, abrupt, and lifeless), this pattern uses scroll progress merely as an **invisible destination anchor**, while the actual UI elements are driven by **virtual spring physics with simulated mass, stiffness, and damping**. Every scroll gesture—whether a gentle nudge, rapid flick, or trackpad swipe—acts as an impulse trigger that unleashes kinetic momentum, organic follow-through, and natural settling.

---

# Core Philosophy & The Mechanics of Sensation

## 1. Why Rigid 1:1 Scrubbing Feels "Stiff"
In standard scroll scrub implementations:
- Scroll down 5px $\rightarrow$ element moves exactly 5px.
- Finger stops moving $\rightarrow$ element stops moving instantaneously with 0ms deceleration.
- Result: The user feels like they are dragging a heavy, dead weight with zero tactile personality.

## 2. The Decoupled Kinetic Scrub Paradigm
- **The Scroll Bar is NOT the Motor**: The scroll position only positions an invisible, weightless target anchor $x_{\text{target}}$.
- **The Visual Elements are Physical Bodies**: The visual node is attached to $x_{\text{target}}$ by a virtual spring with mass ($m$), stiffness ($k$), and damping ($c$).
- **Kinetic Accumulation**: When the user scrolls fast, the target pulls ahead of the visual node, creating a spring extension gap $\Delta x = x_{\text{target}} - x_{\text{current}}$. This gap exerts a restoring force $F = -k \Delta x$, causing acceleration and accumulated velocity.
- **Inertial Follow-Through**: When the scroll abruptly halts, the stored momentum causes the visual node to overshoot the target slightly before soft-settling into place.

```
[ User Scroll Gesture / Wheel / Touch ]
                  │
                  ▼
      [ Normalized Scroll Progress ] (0.00 ──► 1.00)
                  │
                  ▼
         [ Target Anchor (X_target) ]  <── Moves instantly with scroll
                  │
             [ Virtual Spring ] (Stiffness, Damping, Mass)
                  │
                  ▼
       [ Visual Property Value (X_current) ] <── Kinetic lag, overshoot & settle
                  │
                  ▼
[ Stagger / Cascading Wave ] ──► [ Individual UI Child Elements ]
```

---

# Universal Component Archetypes

This pattern elevates almost any interactive component from a mechanical slider to an organic delight:

| Component Type | 1:1 Rigid Scrub (Banned) | Decoupled Kinetic Scrub (Standard) |
| :--- | :--- | :--- |
| **Number & Stat Counters** | Digits crawl linearly with scroll pixels. | Scroll flicks digits into an accelerating roll that smoothly decelerates and clicks into place. |
| **Hero Typography / Split Text** | Letters clip open uniformly like window blinds. | Scroll injects an elastic velocity wave where characters ripple, overshoot vertical alignment, and snap down. |
| **3D & 2.5D Tilt Cards** | Tilt angle stops dead when scroll stops. | Cards pitch forward aggressively during scroll bursts, then gently pendulum back to rest. |
| **SVG Path / Progress Rings** | Stroke dashes follow exact wheel clicks. | The stroke whips forward with rubber-band tension and bounces slightly when coming to rest. |
| **Image Zoom / Parallax Masks** | Static scale multiplier tied to viewport offset. | The image expands dynamically with scroll speed and breathes back to its resting scale. |

---

# Implementation Recipes

## 1. React + Framer Motion (The Modern Declarative Standard)

Using `useScroll`, `useTransform`, and `useSpring` creates a fully reactive, 60/120fps hardware-accelerated pipeline without re-rendering the React component body:

```tsx
import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface KineticScrubProps {
  targetValue?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
}

export const DecoupledKineticElement: React.FC<KineticScrubProps> = ({
  targetValue = 100,
  stiffness = 140,
  damping = 18,
  mass = 0.8,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Observe scroll progress relative to target container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"], // Triggers when entering bottom until leaving top
  });

  // 2. Map scroll progress (0..1) to destination value (Invisible Target Anchor)
  const rawTargetAnchor = useTransform(scrollYProgress, [0, 1], [0, targetValue]);

  // 3. Decouple target anchor with spring dynamics
  const springValue = useSpring(rawTargetAnchor, {
    stiffness, // Higher = snappier snap-back
    damping,   // Lower = more bounciness / overshoot
    mass,      // Higher = more inertial carry-over
  });

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", position: "relative" }}>
      <motion.div
        style={{
          // Apply spring-interpolated value directly to transform properties
          scale: useTransform(springValue, [0, targetValue], [0.8, 1.2]),
          rotate: useTransform(springValue, [0, targetValue], [-10, 10]),
          y: useTransform(springValue, [0, targetValue], [50, -50]),
        }}
      >
        {/* Visual Content */}
      </motion.div>
    </div>
  );
};
```

---

## 2. Multi-Element Stagger Wave Pattern (Cascading Spring Chains)

When animating compound elements (such as letters in a word, digits in a counter, or cards in a grid), pass the decoupled spring through a staggered time delay or indexed offset:

```tsx
import React from "react";
import { motion, MotionValue, useTransform } from "framer-motion";

interface StaggerItemProps {
  index: number;
  total: number;
  masterSpring: MotionValue<number>;
}

export const StaggeredColumn: React.FC<StaggerItemProps> = ({
  index,
  total,
  masterSpring,
}) => {
  // Center-outward or directional micro-offset
  const staggerOffset = (index / total) * 0.15; // 15% phase lag

  // Transform master spring with personal stagger window
  const columnProgress = useTransform(
    masterSpring,
    (latest) => {
      // Lag calculation clamped between 0 and 1
      const lagged = Math.max(0, Math.min(1, latest - staggerOffset));
      return lagged;
    }
  );

  const translateY = useTransform(columnProgress, [0, 1], [40, 0]);
  const opacity = useTransform(columnProgress, [0, 0.3, 1], [0, 1, 1]);

  return (
    <motion.div style={{ y: translateY, opacity }}>
      {/* Individual digit / letter / card item */}
    </motion.div>
  );
};
```

---

## 3. High-Precision Physics Tuning Guide

The feel of the kinetic animation is governed by the triangle of **Stiffness**, **Damping**, and **Mass**:

| Desired Personality | Stiffness ($k$) | Damping ($c$) | Mass ($m$) | Perceptual Feel |
| :--- | :--- | :--- | :--- | :--- |
| **Snappy / Crisp UI** | `200`–`300` | `24`–`30` | `0.4`–`0.6` | Immediate response, zero sloppiness, tight micro-bounce. |
| **Organic & Weighted (Counters/Dials)** | `120`–`160` | `14`–`18` | `0.8`–`1.0` | Satisfying mechanical rolling inertia, visible overshoot. |
| **Fluid / Liquid Float** | `60`–`90` | `10`–`14` | `1.2`–`1.8` | Dreamy, drifting underwater deceleration for ambient visuals. |
| **Heavy Kinetic Metal** | `240`–`320` | `12`–`16` | `1.5`–`2.2` | High momentum, intense spring oscillation upon stopping. |

---

# Critical Rules & Anti-Patterns

1. **Never Bind Directly to React State (`useState`) in Scroll Listeners**:
   - ❌ Triggering `setState(window.scrollY)` causes 60+ component re-renders per second, causing layout thrashing and dropped frames.
   - ✅ Always use reactive motion values (`useScroll`, `MotionValue`, GSAP QuickSetter, or RAF loops) that mutate transform matrices directly in the DOM.

2. **Always Use Normalized Coordinates (0.0 to 1.0)**:
   - Calculate all physics against normalized offsets ($0 \dots 1$) rather than raw screen pixel counts ($0 \dots 4829\text{px}$). This guarantees identical kinetic behavior across 4K displays and mobile phones.

3. **Touch Scrub vs. Wheel Scrub Parity**:
   - Ensure the scroll container has `touch-action: pan-y` and momentum scrolling enabled on iOS (`-webkit-overflow-scrolling: touch`) so finger flicks produce natural physics curves.

4. **Clamp Target Bounds to Avoid Infinity Drift**:
   - When calculating velocity multipliers or custom target offsets, always clamp the virtual target within $[ \min, \max ]$ bounds so rapid scroll stops do not launch the spring off-screen into an unrecoverable state.
