---
name: framer-motion-gsap-bridge
description: Architecture and coding patterns for combining Framer Motion's physics/spring transitions (including Framer Property Controls ControlType.Transition) with GSAP's specialized plugins (MorphSVG, DrawSVG, SplitText, MotionPath) via reactive MotionValue timeline scrubbing.
---

# Framer Property Controls & GSAP Reactive Bridge

This skill defines the definitive architecture for bridging **Framer Motion's physics transitions** (including designer controls from Framer's Property Panel via `ControlType.Transition`) with **GSAP's specialized vector and DOM plugins** (`MorphSVGPlugin`, `DrawSVGPlugin`, `MotionPathPlugin`, `SplitText`).

---

# Core Architectural Concept

```
┌────────────────────────────────────────────────────────┐
│  Framer Property Panel                                 │
│  ControlType.Transition (Spring / Ease / Inertia)      │
└──────────────────────────┬─────────────────────────────┘
                           │ (transition prop)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Framer Motion Engine                                  │
│  animate(progressMotionValue, target, transition)      │
└──────────────────────────┬─────────────────────────────┘
                           │ (0.00 ──► 1.00 stream)
                           │ .on("change", (v) => tl.progress(v))
                           ▼
┌────────────────────────────────────────────────────────┐
│  GSAP Normalized Timeline (paused: true, ease: "none") │
│  ├── MorphSVGPlugin (Shape interpolation)              │
│  ├── DrawSVGPlugin  (Vector stroke trimming)           │
│  └── MotionPath     (Vector path tracking)             │
└────────────────────────────────────────────────────────┘
```

1. **Framer Motion as Physics / Timing Engine**: Framer handles the transition curves (spring physics, stiffness, damping, mass, velocity preservation, custom cubic beziers) passed from props or state.
2. **GSAP as Mutation Engine**: GSAP calculates sub-pixel SVG path morphs, stroke offsets, and DOM mutations in a paused, linear timeline (`ease: "none"`).
3. **Zero Re-Render Bridge**: Framer's `MotionValue` updates GSAP's timeline progress synchronously on every animation frame, completely bypassing React virtual DOM reconciliation.

---

# Standard Framer Code Component Pattern

Here is the exact production implementation for a Framer Code Component exposing `ControlType.Transition` in the property panel:

```tsx
import React, { useRef, useEffect } from "react"
import { motion, useMotionValue, animate, type Transition } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin"
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"

// 1. Register GSAP Plugins safely
if (typeof window !== "undefined") {
    gsap.registerPlugin(useGSAP, MorphSVGPlugin, DrawSVGPlugin)
}

interface MorphComponentProps {
    isToggled?: boolean
    transition?: Transition
    startColor?: string
    endColor?: string
    strokeWidth?: number
}

export default function MorphComponent(props: MorphComponentProps) {
    const {
        isToggled = false,
        transition = {
            type: "spring",
            stiffness: 800,
            damping: 60,
        },
        startColor = "#3b82f6",
        endColor = "#ec4899",
        strokeWidth = 3,
    } = props

    const containerRef = useRef<SVGSVGElement>(null)
    const morphPathRef = useRef<SVGPathElement>(null)
    const timelineRef = useRef<gsap.core.Timeline | null>(null)

    // 2. Normalized Progress MotionValue (0 -> State A, 1 -> State B)
    const progress = useMotionValue(0)

    // 3. Build paused, linear GSAP Timeline scoped to containerRef
    useGSAP(
        () => {
            const tl = gsap.timeline({
                paused: true,
                defaults: { ease: "none" }, // MANDATORY: Framer controls the easing
            })

            // Define specialized GSAP sequence
            tl.to(
                morphPathRef.current,
                {
                    duration: 1.0,
                    morphSVG: "#target-morph-shape",
                    drawSVG: "0% 100%",
                    stroke: endColor,
                },
                0
            )

            timelineRef.current = tl

            // 4. Reactive subscription: scrub GSAP timeline on MotionValue update
            const unsubscribe = progress.on("change", (latest) => {
                // Safeguard against extreme spring overshoot (< 0 or > 1) if desired
                const clamped = Math.max(0, Math.min(1, latest))
                tl.progress(clamped)
            })

            return () => {
                unsubscribe()
                tl.kill()
            }
        },
        { scope: containerRef, dependencies: [endColor] }
    )

    // 5. Animate progress when props or state change using Framer's transition
    useEffect(() => {
        const targetValue = isToggled ? 1 : 0
        const controls = animate(progress, targetValue, transition)

        return () => controls.stop()
    }, [isToggled, transition, progress])

    return (
        <svg
            ref={containerRef}
            viewBox="0 0 100 100"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
            fill="none"
            stroke={startColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {/* Origin Active Path (e.g. Hamburger / Search / Play) */}
            <path
                ref={morphPathRef}
                d="M 20,30 L 80,30 M 20,50 L 80,50 M 20,70 L 80,70"
            />

            {/* Hidden Morph Target Path (e.g. Close X / Checkmark) */}
            <defs>
                <path
                    id="target-morph-shape"
                    d="M 25,25 L 75,75 M 25,75 L 75,25"
                />
            </defs>
        </svg>
    )
}

// Default property control values
MorphComponent.defaultProps = {
    isToggled: false,
    transition: {
        type: "spring",
        stiffness: 800,
        damping: 60,
    },
    startColor: "#3b82f6",
    endColor: "#ec4899",
    strokeWidth: 3,
}

// Framer Property Panel Configuration
addPropertyControls(MorphComponent, {
    isToggled: {
        type: ControlType.Boolean,
        title: "Toggled",
        defaultValue: false,
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
    },
    startColor: {
        type: ControlType.Color,
        title: "Start Color",
        defaultValue: "#3b82f6",
    },
    endColor: {
        type: ControlType.Color,
        title: "End Color",
        defaultValue: "#ec4899",
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Stroke Width",
        defaultValue: 3,
        min: 1,
        max: 20,
    },
})
```

---

# Interactive Triggers (Hover, Press, Scrub)

This architecture easily adapts to interactive gestures while retaining the designer's transition controls:

### 1. Hover / Press Interactive Card with Morphing Accent
```tsx
export function InteractiveHoverMorph({ transition }: { transition: Transition }) {
    const progress = useMotionValue(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const pathRef = useRef<SVGPathElement>(null)

    useGSAP(() => {
        const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } })
        tl.to(pathRef.current, {
            duration: 1.0,
            morphSVG: "#target-active-shape",
            drawSVG: "20% 80%",
        })

        const unsub = progress.on("change", (v) => tl.progress(Math.max(0, Math.min(1, v))))
        return () => {
            unsub()
            tl.kill()
        }
    }, { scope: containerRef })

    return (
        <motion.div
            ref={containerRef}
            onHoverStart={() => animate(progress, 1, transition)}
            onHoverEnd={() => animate(progress, 0, transition)}
            onTapStart={() => animate(progress, 1, { ...transition, stiffness: 1000 })}
            style={{ width: 200, height: 200, cursor: "pointer" }}
        >
            <svg viewBox="0 0 100 100">
                <path ref={pathRef} d="M10 50 Q 50 10 90 50" />
            </svg>
        </motion.div>
    )
}
```

### 2. Multi-Segment Sequences with Relative Time Labels
```tsx
useGSAP(() => {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } })
    
    // Stage 1: Draw icon (0.00 -> 0.50 progress)
    tl.fromTo(pathRef.current, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5 }, 0)
    
    // Stage 2: Morph shape (0.50 -> 1.00 progress)
    tl.to(pathRef.current, { morphSVG: "#star-shape", duration: 0.5 }, 0.5)

    const unsub = progress.on("change", (v) => tl.progress(v))
    return () => {
        unsub()
        tl.kill()
    }
}, { scope: containerRef })
```

---

# Critical Rules & Guidelines

### 1. Mandatory `ease: "none"`
- **Rule**: Every tween and timeline track in the GSAP timeline MUST have `ease: "none"`.
- **Reason**: Framer Motion is the single authority of temporal easing. If GSAP also has easing enabled (e.g. `power1.out`), the resulting animation will suffer from **composite easing distortion**.

### 2. Normalized Timeline Duration (`duration: 1.0`)
- **Rule**: Set total timeline duration to `1.0` second.
- **Reason**: Keeps $1.0\text{s duration} = 1.0\text{ progress} = 1.0\text{ MotionValue}$, making calculations straightforward.

### 3. Spring Overshoot Protection
- **Rule**: Spring transitions in Framer Motion with low damping can bounce past $1.0$ (e.g., $1.08$) or below $0.0$ (e.g., $-0.05$).
- **Handling**:
  - For `MorphSVGPlugin`: Clamp with `Math.max(0, Math.min(1, latest))` if complex path extrapolation causes visual artifacts.
  - For `DrawSVGPlugin`: Unclamped values create interesting elastic over-draw bounces that are safe to render.

### 4. Hydration and SSR Safety
- **Rule**: Wrap plugin registration in `if (typeof window !== "undefined")` to ensure safety inside Framer's Server-Side Rendering and Canvas compilation pipeline.

---

# Parasitic SplitText & Double-Masking Pattern (TextMaskSlide)

The **Parasitic SplitText & Double-Masking** pattern (as proven in `framer/TextMaskSlide.tsx`) is an advanced GSAP x Framer Motion hybrid architecture for animating typography, rich text, and CMS content without breaking DOM hierarchy or styling.

```
┌────────────────────────────────────────────────────────┐
│  Target Sibling Text Element (P / H1 / RichText)       │
└──────────────────────────┬─────────────────────────────┘
                           │ (Parasitic DOM Discovery)
                           ▼
┌────────────────────────────────────────────────────────┐
│  GSAP SplitText (Two-Tier Double-Masking)              │
│  ├── parentSplit: Outer Mask Wrappers (overflow: hidden)│
│  └── childSplit:  Inner Text Targets (will-change)     │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│ Trigger: "fromProp"     │ │ Trigger: "scroll"       │
│ Framer Motion animate() │ │ Framer useScroll()      │
│ • Zero-duration init    │ │ • useMotionValueEvent   │
│ • Staggered springs     │ │ • Interpolated scrub    │
│ • State continuity      │ │ • Multi-zone thresholds │
└─────────────────────────┘ └─────────────────────────┘
```

---

## Architectural Breakdown

### 1. Parasitic DOM Discovery (`findSiblingTextElement`)
Rather than requiring text to be passed as a string or wrapped inside custom JSX, the component operates parasitically:
- Crawls sibling elements and parent containers to locate rich text nodes (`RichTextContainer`, `p`, `span`, `h1`-`h6`).
- Leaves the original Framer CMS bindings and typography settings completely intact.

### 2. Two-Tier Double-Split Masking
Standard CSS masking on the entire block clips ascenders/descenders or multiline wraps incorrectly. This architecture uses a **nested two-tier split**:

```tsx
// 1. Inner Split: Generates the animated target elements
const childSplit = new SplitText(siblingElement, {
    type: splitMode, // "lines" | "words" | "chars"
    tag: "div",
    wordsClass: "split-word-inner",
    charsClass: "split-char-inner",
    linesClass: "split-line-inner",
})

// 2. Outer Split: Wraps each child in an overflow mask container
const parentSplit = new SplitText(childSplit[splitMode], {
    type: splitMode,
    tag: "div",
    wordsClass: "split-word-outer",
    charsClass: "split-char-outer",
    linesClass: "split-line-outer",
})

// Apply clipping masks and hardware acceleration
animateTargets.forEach((el) => {
    el.style.display = "inline-block"
    el.style.willChange = "transform, opacity, filter"
    el.style.backfaceVisibility = "hidden"
})

parentTargets.forEach((el) => {
    el.style.display = splitMode === "lines" ? "block" : "inline-block"
    el.style.overflow = mask ? "hidden" : "visible"
    el.style.verticalAlign = "bottom"
    el.style.lineHeight = "inherit"
})
```

---

## Animation Strategy & Execution

### A. Prop-Driven Staggered Springs (`animate()`)

1. **Zero-Duration Framer Cache Sync**:
   When new DOM nodes are created dynamically by GSAP `SplitText`, Framer Motion's internal transform caches are uninitialized. Running a zero-duration `animate()` call primes the internal values before initiating physical spring transitions:
   ```tsx
   if (isNewElements) {
       animate(el, startValues, { duration: 0 })
   }
   ```

2. **Staggered Spring Playback with Transition Props**:
   Each split segment is animated with proportional delays based on designer-configured `transition` props:
   ```tsx
   const isReversed = targetState === "entering"
   const itemDelay = isReversed
       ? (animateTargets.length - 1 - index) * stagger
       : index * stagger

   const controls = animate(
       el,
       targetValues,
       {
           ...transition, // Spring, Stiffness, Damping from Framer Property Panel
           delay: itemDelay,
           onComplete: () => {
               // Prevent browser subpixel blurriness by resetting filter at rest
               if (targetState === "stationary") {
                   requestAnimationFrame(() => {
                       el.style.filter = "none"
                   })
               }
           }
       }
   )
   ```

3. **State Continuity & Interrupt Handling**:
   `lastStateRef` tracks whether elements are `"entering"`, `"stationary"`, or `"exiting"`. Rapid toggle interruptions smoothly transition from the active coordinate state instead of jumping back to origin.

---

### B. Scroll-Driven Continuous Scrubbing (`useScroll` + `useMotionValueEvent`)

For scroll-driven triggers, Framer Motion’s `useScroll` provides the progress `MotionValue`, while a continuous interpolation function calculates staggered per-character or per-word entry/exit transforms:

```tsx
// 1. Framer Motion Scroll Progress Hook
const { scrollYProgress } = useScroll({
    target: resolvedScrollTarget || undefined,
    offset: [scrollOffsetStart, scrollOffsetEnd],
})

// 2. Reactive Frame-Level Scrubbing
useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!isClient || !isScrollTrigger) return
    applyScrollScrub(latest)
})

function applyScrollScrub(latest: number) {
    const targets = splitInstancesRef.current?.child[splitMode] || []
    const enterStart = 0.0
    const enterEnd = 0.4
    const exitStart = 0.6
    const exitEnd = 1.0

    targets.forEach((el, index) => {
        const itemShift = Math.min(0.2, index * (stagger * 0.5))
        
        // Calculate enter progress (0 -> 1)
        const itemStart = Math.min(enterEnd - 0.05, enterStart + itemShift)
        const tEnter = latest < itemStart ? 0 : latest < enterEnd ? (latest - itemStart) / (enterEnd - itemStart) : 1
        
        // Calculate exit progress (0 -> 1)
        const itemExitStart = Math.min(exitEnd - 0.05, exitStart + itemShift)
        const tExit = latest > exitEnd ? 1 : latest > itemExitStart ? (latest - itemExitStart) / (exitEnd - itemExitStart) : 0

        const styles = interpolateStyle(tEnter, tExit, animeType, fade, blur)
        el.style.transform = styles.transform
        el.style.opacity = styles.opacity
        el.style.filter = styles.filter
    })
}
```

---

## Lifecycle Safety & Line Splitting Resizes

When splitting by `lines`, layout wrapping changes on viewport resize. The pattern combines debounced resize listeners with `useGSAP`'s `revertOnUpdate: true`:

```tsx
// Automatic cleanup & re-split on dependency changes
useGSAP(() => {
    // Splits text and binds targets...
    return () => {
        splitInstances.parent?.revert()
        splitInstances.child?.revert()
    }
}, {
    dependencies: [isClient, splitMode, mask, resizeKey],
    revertOnUpdate: true,
})

// Debounced resize trigger for dynamic line recalculations
useEffect(() => {
    if (!isClient || splitMode !== "lines") return
    let timer: NodeJS.Timeout
    const handleResize = () => {
        clearTimeout(timer)
        timer = setTimeout(() => setResizeKey((prev) => prev + 1), 250)
    }
    window.addEventListener("resize", handleResize)
    return () => {
        window.removeEventListener("resize", handleResize)
        clearTimeout(timer)
    }
}, [splitMode, isClient])
```

