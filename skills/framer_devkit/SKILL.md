---
name: framer-devkit
description: Create Framer Code Components and Code Overrides. Use when building custom React components for Framer, writing Code Overrides (HOCs) to modify canvas elements, implementing property controls, working with Framer Motion animations, handling WebGL/shaders in Framer, or debugging Framer-specific issues like hydration errors and font handling.
---

# Framer Code Development

## Code Components vs Code Overrides

**Code Components**: Custom React components added to canvas. Support `addPropertyControls`.

**Code Overrides**: Higher-order components wrapping existing canvas elements. Do NOT support `addPropertyControls`.

## Required Annotations

Always include at minimum:
```typescript
/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 100
 * @framerIntrinsicHeight 100
 */
```

Full set:
- `@framerDisableUnlink` — Prevents unlinking when modified
- `@framerIntrinsicWidth` / `@framerIntrinsicHeight` — Default dimensions
- `@framerSupportedLayoutWidth` / `@framerSupportedLayoutHeight` — `any`, `auto`, `fixed`, `any-prefer-fixed`

## Code Override Pattern

```typescript
import type { ComponentType } from "react"
import { useState, useEffect } from "react"

/**
 * @framerDisableUnlink
 */
export function withFeatureName(Component): ComponentType {
    return (props) => {
        // State and logic here
        return <Component {...props} />
    }
}
```

Naming: Always use `withFeatureName` prefix.

## Code Component Pattern

```typescript
import { motion } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 200
 */
export default function MyComponent(props) {
    const { style } = props
    return <motion.div style={{ ...style }}>{/* content */}</motion.div>
}

MyComponent.defaultProps = {
    // Always define defaults
}

addPropertyControls(MyComponent, {
    // Controls here
})
```

## Critical: Font Handling

**Never access font properties individually. Always spread the entire font object.**

```typescript
// ❌ BROKEN - Will not work
style={{
    fontFamily: props.font.fontFamily,
    fontSize: props.font.fontSize,
}}

// ✅ CORRECT - Spread entire object
style={{
    ...props.font,
}}
```

Font control definition:
```typescript
font: {
    type: ControlType.Font,
    controls: "extended",
    defaultValue: {
        fontFamily: "Inter",
        fontWeight: 500,
        fontSize: 16,
        lineHeight: "1.5em",
    },
}
```

## Critical: Wrap State Updates in startTransition

All React state updates in Framer must be wrapped in `startTransition()`:

```typescript
import { startTransition } from "react"

// ❌ WRONG - May cause issues in Framer's rendering pipeline
setCount(count + 1)

// ✅ CORRECT - Always wrap state updates
startTransition(() => {
    setCount(count + 1)
})
```

This is Framer-specific and prevents performance issues with concurrent rendering.

## Critical: Hydration Safety

Framer pre-renders on server. Browser APIs unavailable during SSR.

**Two-phase rendering pattern:**
```typescript
const [isClient, setIsClient] = useState(false)

useEffect(() => {
    setIsClient(true)
}, [])

if (!isClient) {
    return <Component {...props} /> // SSR-safe fallback
}

// Client-only logic here
```

**Never access directly at render time:**
- `window`, `document`, `navigator`
- `localStorage`, `sessionStorage`
- `window.innerWidth`, `window.innerHeight`

## Critical: Canvas vs Preview Detection

```typescript
import { RenderTarget } from "framer"

const isOnCanvas = RenderTarget.current() === RenderTarget.canvas

// Show debug only in editor
{isOnCanvas && <DebugOverlay />}
```

Use for:
- Debug overlays
- Disabling heavy effects in editor
- Preview toggles

## Variant Control in Overrides

Cannot read variant names from props (may be hashed). Manage internally:

```typescript
export function withVariantControl(Component): ComponentType {
    return (props) => {
        const [currentVariant, setCurrentVariant] = useState("variant-1")

        // Logic to change variant
        setCurrentVariant("variant-2")

        return <Component {...props} variant={currentVariant} />
    }
}
```

## Scroll Detection Constraint

Framer's scroll detection uses viewport-based IntersectionObserver. Applying `overflow: scroll` to containers breaks this detection.

For scroll-triggered animations, use:
```typescript
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && !hasEntered) {
                setHasEntered(true)
            }
        })
    },
    { threshold: 0.1 }
)
```

## WebGL in Framer

Shader implementation patterns including transparency handling are covered in the extended documentation.

## NPM Package Imports

Standard import (preferred):
```typescript
import { Component } from "package-name"
```

Force specific version via CDN when Framer cache is stuck:
```typescript
import { Component } from "https://esm.sh/package-name@1.2.3?external=react,react-dom"
```

Always include `?external=react,react-dom` for React components.

## HLS Video Streaming (.m3u8)

Chrome/Firefox do **not** natively support HLS streams. Use HLS.js via dynamic import with silent fallback:

```typescript
let HlsModule = null
let hlsImportAttempted = false

async function loadHls() {
    if (hlsImportAttempted) return HlsModule
    hlsImportAttempted = true
    try {
        const mod = await import("https://esm.sh/hls.js@1?external=react,react-dom")
        HlsModule = mod.default || mod
    } catch {
        HlsModule = null // Fallback to native video
    }
    return HlsModule
}

function attachHls(videoEl, src) {
    if (typeof window === "undefined") return null // SSR guard
    const Hls = HlsModule
    if (src.includes(".m3u8") && Hls?.isSupported()) {
        const hls = new Hls({ startLevel: -1, capLevelToPlayerSize: true })
        hls.loadSource(src)
        hls.attachMedia(videoEl)
        hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(() => {}))
        return hls
    }
    videoEl.src = src // MP4/webm or Safari native HLS
    videoEl.play().catch(() => {})
    return null
}
```

## Common Pitfalls

| Issue | Cause | Fix |
|-------|-------|-----|
| Font styles not applying | Accessing font props individually | Spread entire font object: `...props.font` |
| Hydration mismatch | Browser API in render | Use `isClient` state pattern |
| Override props undefined | Expecting property controls | Overrides don't support `addPropertyControls` |
| Scroll animation broken | `overflow: scroll` on container | Use IntersectionObserver on viewport |
| Component display name | Need custom name in Framer UI | `Component.displayName = "Name"` |
| HLS video pixelated | `.m3u8` in Chrome without HLS.js | Use HLS.js dynamic import pattern |

## CMS Content Timing

CMS content loads asynchronously. Add delay before processing CMS data:
```typescript
useEffect(() => {
    if (isClient && props.children) {
        const timer = setTimeout(() => {
            processContent(props.children)
        }, 100)
        return () => clearTimeout(timer)
    }
}, [isClient, props.children])
```

## Text Manipulation in Overrides

Framer text uses deeply nested structure. Process recursively:

```typescript
const processChildren = (children) => {
    if (typeof children === "string") {
        return processText(children)
    }
    if (isValidElement(children)) {
        return cloneElement(children, {
            ...children.props,
            children: processChildren(children.props.children)
        })
    }
    return children
}
```

## Z-Index Stacking Context & Portals

Use React Portal to render at `document.body` level for overlays, modals, and tooltips to break out of parent stacking contexts.

## Loading States with Scroll Lock

Prevent page scroll until content is ready using `document.body.style.overflow = "hidden"` in a `useEffect` hooked to an `isLoading` state.

## Property Controls Reference

### Types:
- `String`, `Number`, `Boolean`, `Color`, `Enum`, `Image`, `ResponsiveImage`, `File`, `Font`, `Transition`, `ComponentInstance`, `Array`, `Object`.

**Critical**: `ControlType.ResponsiveImage` and `ControlType.File` do NOT support `defaultValue`. Use parameter destructuring in the component instead.

```typescript
function MyComponent({ image = { src: "default.jpg" } }) {
    return <img {...image} />
}
```
