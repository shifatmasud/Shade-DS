---
name: parasitic-splittext-mask-slide
description: Architecture and implementation pattern for parasitic SplitText double-masking text animations (TextMaskSlide). Combines GSAP SplitText two-tier DOM splitting with Framer Motion spring orchestration, zero-duration cache synchronization, and scroll scrubbing for CMS/RichText without breaking DOM hierarchy.
---

# Parasitic SplitText & Double-Masking Architecture (TextMaskSlide)

This skill provides the definitive blueprint for **Parasitic Text Mask Animations**, bridging GSAP's `SplitText` DOM-partitioning engine with Framer Motion's physical spring transition and scroll engines.

---

# Engine Responsibilities & Bridge Mechanics

### 1. What GSAP Does (Structural Partitioning & Layout Masking)
GSAP acts as the **DOM Restructuring & Masking Engine**:
- **Parasitic Sibling Extraction**: Crawls adjacent DOM nodes to locate `h1`–`h6`, `p`, `span`, or `RichTextContainer` without requiring text to be passed as raw string props.
- **Two-Tier SplitText Partitioning**:
  1. **Inner Split (`childSplit`)**: Slices text into individual lines, words, or characters as hardware-accelerated animation targets (`willChange: "transform, opacity, filter"`).
  2. **Outer Split (`parentSplit`)**: Slices the inner elements a second time to wrap each character/word inside an individual parent mask container (`overflow: "hidden"`, `lineHeight: "inherit"`, `verticalAlign: "bottom"`).
- **DOM Lifecycle Management**: Uses `useGSAP` to manage resize recalculations and safely executes `parentSplit.revert()` and `childSplit.revert()` on unmount, preserving CMS bindings and DOM integrity.

### 2. What Framer Motion Does (Physics, Springs & Scroll Engine)
Framer Motion acts as the **Temporal Physics & Interaction Engine**:
- **Designer Spring Physics (`ControlType.Transition`)**: Ingests designer-configured transition curves (stiffness, damping, mass, bounce) from Framer's Property Panel and drives physical movement.
- **Micro-Level Staggered Orchestration**: Executes staggered entrance and exit transitions across all split segments using `animate(el, targetValues, { ...transition, delay })`.
- **Viewport Scroll Tracking (`useScroll` + `useMotionValueEvent`)**: Tracks window or element scroll progress as a reactive `MotionValue` (`scrollYProgress`) and computes multi-zone interpolation curves.
- **Velocity-Preserving Interrupts**: Seamlessly carries over physical momentum from active coordinates when rapid triggers interrupt animations mid-flight.

### 3. How the Bridge Handshake Works
```
┌─────────────────────────────────────────────────────────────┐
│ 1. GSAP SplitText (Restructuring & Masking)                │
│    • Slices target text into inner targets & outer masks    │
│    • Injects DOM elements with overflow clipping envelopes  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Newly Created DOM Targets
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. The Bridge: Zero-Duration Cache Priming                  │
│    animate(el, startCoords, { duration: 0 })                │
│    • Synchronizes Framer Motion's internal transform cache  │
│      with GSAP's newly generated DOM nodes                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Synchronized Targets
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Framer Motion Execution (Springs & Scrubbing)            │
│    • Staggered animate() for prop-driven springs            │
│    • useMotionValueEvent(scrollYProgress) for scroll scrub  │
│    • Resets filter: "none" at rest for sharp typography     │
└─────────────────────────────────────────────────────────────┘
```

1. **DOM Generation $\rightarrow$ Target Handoff**: GSAP `SplitText` creates the nested DOM structure and exposes the array of inner target elements (`splitRef.current.child[splitMode]`).
2. **Zero-Duration Cache Priming**: Because the DOM elements were created by GSAP outside React's virtual DOM tree, Framer Motion's internal transform tracker has no baseline record. The bridge executes `animate(el, startValues, { duration: 0 })` to prime Framer's internal cache.
3. **Physical Animation Execution**: Framer Motion's `animate()` takes direct control of each element's `y`, `opacity`, and `filter`, executing staggered spring trajectories while GSAP's outer wrappers clip the overflow.
4. **Clean Restitution**: Once Framer Motion finishes animating, it clears `filter: "none"` to preserve sub-pixel font sharpness. If the screen resizes or the component unmounts, GSAP cleanly reverts the DOM.

---

# Core Principles & Architectural Pillars

### 1. Parasitic DOM Discovery
Rather than requiring text to be passed as a raw string or wrapped inside custom JSX (which breaks CMS bindings, inline formatting, rich text styling, and SEO), the component sits as a sibling and parasitically inspects adjacent DOM nodes (`RichTextContainer`, `<h1>`–`<h6>`, `<p>`, `<span>`).

```tsx
function findSiblingTextElement(container: HTMLElement | null): HTMLElement | null {
    if (!container) return null
    const parent = container.parentElement
    if (!parent) return null

    // Look for previous or next sibling with text content
    let sibling = container.previousElementSibling || container.nextElementSibling
    while (sibling) {
        if (sibling.tagName.match(/^(P|H[1-6]|SPAN|DIV)$/i) && sibling.textContent?.trim()) {
            return sibling as HTMLElement
        }
        sibling = sibling.nextElementSibling
    }
    return null
}
```

### 2. Two-Tier Double-Split Masking
Standard single-layer clipping on a container cuts off line wraps or ascenders/descenders. Double-splitting creates individual clipping envelopes for each line, word, or character:
- **`childSplit` (Inner)**: The actual text element undergoing 3D transforms (`translate3d`, `opacity`, `filter: blur`).
- **`parentSplit` (Outer)**: The protective envelope element with `overflow: hidden`, `vertical-align: bottom`, and `line-height: inherit`.

```tsx
// 1. Inner Split (Animation Targets)
const childSplit = new SplitText(targetElement, {
    type: splitMode, // "lines" | "words" | "chars"
    tag: "div",
    wordsClass: "split-word-inner",
    charsClass: "split-char-inner",
    linesClass: "split-line-inner",
})

// 2. Outer Split (Mask Wrappers)
const parentSplit = new SplitText(childSplit[splitMode], {
    type: splitMode,
    tag: "div",
    wordsClass: "split-word-outer",
    charsClass: "split-char-outer",
    linesClass: "split-line-outer",
})

// Optimize Inner Targets
childSplit[splitMode].forEach((el) => {
    el.style.display = "inline-block"
    el.style.willChange = "transform, opacity, filter"
    el.style.backfaceVisibility = "hidden"
})

// Enforce Outer Masking
parentSplit[splitMode].forEach((el) => {
    el.style.display = splitMode === "lines" ? "block" : "inline-block"
    el.style.overflow = mask ? "hidden" : "visible"
    el.style.verticalAlign = "bottom"
    el.style.lineHeight = "inherit"
})
```

---

# Execution Engines (Prop Springs vs. Scroll Scrubbing)

## Mode A: Prop-Driven Staggered Springs (`animate()`)

### 1. Zero-Duration Cache Priming
When new DOM nodes are created dynamically by GSAP, Framer Motion's internal transform tracking is uninitialized. Executing a zero-duration `animate()` call primes internal transform caches before initiating transitions:

```tsx
if (isNewElements) {
    animate(el, initialTransformValues, { duration: 0 })
}
```

### 2. Staggered Spring Animation with Property Controls
```tsx
const isReversed = targetState === "entering"
const itemDelay = isReversed
    ? (targets.length - 1 - index) * stagger
    : index * stagger

const controls = animate(
    el,
    targetTransformValues,
    {
        ...transition, // Designer spring from Framer Property Panel (stiffness, damping, mass)
        delay: itemDelay,
        onComplete: () => {
            // Prevent subpixel font rendering blurriness at rest
            if (targetState === "stationary") {
                requestAnimationFrame(() => {
                    el.style.filter = "none"
                })
            }
        }
    }
)
```

### 3. State Continuity & Interrupt Safety
Track state across rapid prop toggles (`"entering"` $\rightarrow$ `"stationary"` $\rightarrow$ `"exiting"`). When an animation is interrupted mid-flight, Framer Motion's velocity-preserving spring calculations continue smoothly from the active sub-pixel position instead of snapping to origin.

---

## Mode B: Scroll-Driven Continuous Scrubbing (`useScroll`)

```tsx
// 1. Framer Motion Viewport Tracker
const { scrollYProgress } = useScroll({
    target: scrollTargetRef || undefined,
    offset: [scrollOffsetStart, scrollOffsetEnd], // e.g. ["start end", "end start"]
})

// 2. Reactive Frame-Level Update
useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!isClient) return
    applyScrollScrub(latest)
})

function applyScrollScrub(progress: number) {
    const targets = splitInstancesRef.current?.child[splitMode] || []
    const enterStart = 0.0
    const enterEnd = 0.4
    const exitStart = 0.6
    const exitEnd = 1.0

    targets.forEach((el, index) => {
        const itemShift = Math.min(0.2, index * (stagger * 0.5))
        
        // Entering threshold interpolation
        const itemStart = Math.min(enterEnd - 0.05, enterStart + itemShift)
        const tEnter = progress < itemStart ? 0 : progress < enterEnd ? (progress - itemStart) / (enterEnd - itemStart) : 1
        
        // Exiting threshold interpolation
        const itemExitStart = Math.min(exitEnd - 0.05, exitStart + itemShift)
        const tExit = progress > exitEnd ? 1 : progress > itemExitStart ? (progress - itemExitStart) / (exitEnd - itemExitStart) : 0

        const styles = computeInterpolatedTransform(tEnter, tExit, animeType, fade, blur)
        el.style.transform = styles.transform
        el.style.opacity = String(styles.opacity)
        el.style.filter = styles.filter
    })
}
```

---

# Complete Reference Implementation

```tsx
import React, { useRef, useState, useEffect } from "react"
import { animate, useScroll, useMotionValueEvent, type Transition } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { SplitText } from "gsap/SplitText"

if (typeof window !== "undefined") {
    gsap.registerPlugin(useGSAP, SplitText)
}

interface TextMaskSlideProps {
    trigger?: "fromProp" | "scroll"
    isTriggered?: boolean
    splitMode?: "lines" | "words" | "chars"
    animeType?: "bottomToTop" | "topToBottom" | "leftToRight" | "rightToLeft"
    mask?: boolean
    fade?: boolean
    blur?: boolean
    stagger?: number
    transition?: Transition
}

export default function TextMaskSlide(props: TextMaskSlideProps) {
    const {
        trigger = "fromProp",
        isTriggered = true,
        splitMode = "words",
        animeType = "bottomToTop",
        mask = true,
        fade = true,
        blur = false,
        stagger = 0.04,
        transition = {
            type: "spring",
            stiffness: 400,
            damping: 35,
        },
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const targetElRef = useRef<HTMLElement | null>(null)
    const splitRef = useRef<{ child: SplitText | null; parent: SplitText | null }>({ child: null, parent: null })
    const [resizeKey, setResizeKey] = useState(0)

    // 1. Setup SplitText with useGSAP scoping
    useGSAP(
        () => {
            const el = findSiblingText(containerRef.current)
            if (!el) return
            targetElRef.current = el

            const child = new SplitText(el, { type: splitMode, tag: "div" })
            const parent = new SplitText(child[splitMode], { type: splitMode, tag: "div" })
            splitRef.current = { child, parent }

            child[splitMode].forEach((item) => {
                item.style.display = "inline-block"
                item.style.willChange = "transform, opacity, filter"
            })

            parent[splitMode].forEach((item) => {
                item.style.display = splitMode === "lines" ? "block" : "inline-block"
                item.style.overflow = mask ? "hidden" : "visible"
                item.style.verticalAlign = "bottom"
                item.style.lineHeight = "inherit"
            })

            return () => {
                parent.revert()
                child.revert()
            }
        },
        { scope: containerRef, dependencies: [splitMode, mask, resizeKey] }
    )

    // 2. Animate when triggered via prop
    useEffect(() => {
        if (trigger !== "fromProp" || !splitRef.current.child) return
        const targets = splitRef.current.child[splitMode] || []
        
        targets.forEach((el, index) => {
            const targetY = isTriggered ? "0%" : "110%"
            const targetOpacity = isTriggered ? 1 : fade ? 0 : 1
            const delay = index * stagger

            animate(el, { y: targetY, opacity: targetOpacity }, { ...transition, delay })
        })
    }, [isTriggered, trigger, splitMode, stagger, transition, fade])

    return (
        <div
            ref={containerRef}
            style={{ display: "none" }}
            aria-hidden="true"
        />
    )
}

function findSiblingText(container: HTMLElement | null): HTMLElement | null {
    if (!container || !container.parentElement) return null
    let sibling = container.previousElementSibling || container.nextElementSibling
    while (sibling) {
        if (sibling.textContent?.trim()) return sibling as HTMLElement
        sibling = sibling.nextElementSibling
    }
    return null
}

addPropertyControls(TextMaskSlide, {
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["fromProp", "scroll"],
        optionTitles: ["From Prop", "On Scroll"],
        defaultValue: "fromProp",
    },
    isTriggered: {
        type: ControlType.Boolean,
        title: "Animate",
        defaultValue: true,
        hidden: (props) => props.trigger !== "fromProp",
    },
    splitMode: {
        type: ControlType.Enum,
        title: "Split By",
        options: ["lines", "words", "chars"],
        optionTitles: ["Lines", "Words", "Characters"],
        defaultValue: "words",
    },
    mask: {
        type: ControlType.Boolean,
        title: "Overflow Mask",
        defaultValue: true,
    },
    stagger: {
        type: ControlType.Number,
        title: "Stagger",
        min: 0,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.04,
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
    },
})
```

---

# Critical Guidelines & Best Practices

1. **Re-split on Viewport Resize for Lines**:
   When `splitMode === "lines"`, line breaks change as the screen narrows. Implement a debounced resize listener that increments `resizeKey` to trigger a safe `revert()` and fresh `SplitText` pass.
2. **Sub-pixel Filter Reset**:
   Always clear `filter: "none"` on animation completion for stationary text to maintain crisp typography across Retina/high-DPI displays.
3. **Clean Teardown with `revert()`**:
   Always revert `parentSplit` first, then `childSplit` during cleanup to prevent residual wrapped div artifacts in the host document.
4. **Framer Motion Transition Compatibility**:
   Pass designer-configured `transition` props directly into `animate(el, target, { ...transition, delay })` to guarantee natural spring velocity and damping.
