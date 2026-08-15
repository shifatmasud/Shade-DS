# Shared Element Page Transitions via ScrollSectionRef & animateView

## Concept

Create smooth, native app-like page transitions between Framer routes that morph shared elements across pages while seamlessly choreographing non-shared page content without requiring a full document reload.

Shared elements between routes are designated on the Framer canvas using **`ControlType.ScrollSectionRef`**. Elements that share the same scroll section (or matching section identifier) between pages are automatically matched and morphed from their outgoing geometry to their incoming geometry using Framer Motion's `animateView`.

```
Outgoing Page (Route A)                         Incoming Page (Route B)
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│ Non-Shared Header               │             │ Non-Shared Detail Header        │
│ [Fade Out + Blur + Slide Down]  │             │ [Fade In + De-blur + Slide Up]  │
│                                 │   animate   │                                 │
│ ┌─────────────────────────────┐ │   View()    │ ┌─────────────────────────────┐ │
│ │ Shared Hero / Card Section  │─┼────────────►│ │ Expanded Shared Hero Card   │ │
│ │ (ScrollSectionRef "Hero")   │ │   Morph     │ │ (ScrollSectionRef "Hero")   │ │
│ └─────────────────────────────┘ │  Geometry   │ └─────────────────────────────┘ │
│                                 │             │                                 │
│ Non-Shared Body Content         │             │ Non-Shared Detail Content       │
│ [Fade Out + Blur + Slide Down]  │             │ [Fade In + De-blur + Slide Up]  │
└─────────────────────────────────┘             └─────────────────────────────────┘
                 │                                               ▲
                 └───────── History API (pushState) ─────────────┘
```

---

## The 6-Step Transition Model

The entire transition lifecycle follows six distinct stages:

```
1. Detect Navigation (Click / popstate interception)
               │
               ▼
2. Identify Shared Elements (Match ScrollSectionRef / section ID)
               │
               ▼
3. Morph Shared Elements (animateView(update).add(fromEl, toEl))
               │
               ▼
4. Exit Non-Shared Content (Fade out + blur + slide down translateY)
               │
               ▼
5. Enter Non-Shared Content (Fade in + de-blur + slide up translateY)
               │
               ▼
6. Update History & State (history.pushState without full reload)
```

### 1. Detect Navigation
Intercept internal link clicks (`<a href="...">`) or `popstate` events. Prevent the default browser full-page reload when navigating between internal Framer routes:
```typescript
const handleAnchorClick = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest("a")
    if (!anchor || anchor.target === "_blank") return
    
    const targetUrl = new URL(anchor.href, window.location.origin)
    if (targetUrl.origin !== window.location.origin) return // Ignore external links
    if (targetUrl.pathname === window.location.pathname) return // Ignore same-page links
    
    e.preventDefault()
    performTransition(targetUrl.pathname + targetUrl.search)
}
```

### 2. Identify Shared Elements
Query the DOM for the outgoing shared element designated by `ScrollSectionRef` (or matching `data-framer-name` / `id` / `data-scroll-section`). Before updating the DOM, capture the element reference:
```typescript
const fromElement = section?.current || document.querySelector(`[data-framer-name="${sectionName}"]`)
```

### 3. Morph Shared Element
During the `animateView` update callback, swap the page content and query the incoming shared element on the new page, adding both to the morph pipeline:
```typescript
animateView(async () => {
    // 1. Fetch & swap page DOM
    await swapPageContent(destinationUrl)
    // 2. Query target element on newly mounted page
    const toElement = document.querySelector(`[data-framer-name="${sectionName}"]`)
    // 3. Register morph pair
    if (fromElement && toElement) {
        return { from: fromElement, to: toElement }
    }
}).add(fromElement, toElement)
```

### 4. Exit Non-Shared Content
Choreograph all non-shared outgoing page content to fade out, blur, and translate vertically downwards:
```typescript
animateView(update)
    .old({
        opacity: 0,
        y: exitOffset, // e.g. 40px down
        filter: `blur(${blurAmount}px)`,
    })
```

### 5. Enter Non-Shared Content
Choreograph incoming non-shared page content to fade in, clear blur, and translate into its natural resting position from an offset:
```typescript
animateView(update)
    .new({
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
    })
```

### 6. Update Browser History
Update browser history via `window.history.pushState` and manage scroll restoration without triggering a full document reload:
```typescript
window.history.pushState({ path: destinationUrl }, "", destinationUrl)
```

---

## `animateView` Syntax & Integration

`animateView` wraps the asynchronous DOM mutation and configures element morphing, crossfades, and transition curve options.

### 1. Morph Shared Elements
```typescript
// Morph shared elements between old and new snapshots
animateView(update).add(fromElement, toElement)
```

### 2. Crossfade Page Transition
```typescript
// Fade + blur + vertical translation for page content
animateView(update)
    .old({ 
        opacity: 0, 
        y: 40, 
        filter: "blur(10px)" 
    })
    .new({ 
        opacity: 1, 
        y: 0, 
        filter: "blur(0px)" 
    })
```

### 3. Framer `ControlType.Transition` Compatibility
`animateView` accepts standard Framer Motion transition parameters directly from Framer's `ControlType.Transition`:
```typescript
animateView(update, {
    duration: transition.duration ?? 0.5,
    ease: transition.ease ?? [0.16, 1, 0.3, 1],
    ...transition,
})
```

---

## Property Controls Definition

When building the Framer Code Component, expose `ScrollSectionRef`, `viewport`, `transition`, and motion tuning parameters:

```typescript
import { addPropertyControls, ControlType } from "framer"

addPropertyControls(SharedElementTransition, {
    section: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Shared Section",
        description: "Select the scroll section to preserve and morph across pages",
    },
    viewport: {
        type: ControlType.Enum,
        title: "Viewport",
        displaySegmentedControl: true,
        options: ["top", "center", "bottom"],
        optionTitles: [
            "Top (Viewport Top)",
            "Center (Viewport Center)",
            "Bottom (Viewport Bottom)",
        ],
        // @ts-ignore
        optionIcons: ["align-top", "align-middle", "align-bottom"],
        defaultValue: "top",
    },
    sectionIdentifier: {
        type: ControlType.String,
        title: "Section ID",
        defaultValue: "hero-section",
        description: "Fallback name or data-framer-name matching the destination element",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: {
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.6,
        },
    },
    exitOffset: {
        type: ControlType.Number,
        title: "Exit Slide Y",
        min: -200,
        max: 200,
        step: 5,
        defaultValue: 40,
        unit: "px",
    },
    entryOffset: {
        type: ControlType.Number,
        title: "Entry Slide Y",
        min: -200,
        max: 200,
        step: 5,
        defaultValue: -40,
        unit: "px",
    },
    blurAmount: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 30,
        step: 1,
        defaultValue: 8,
        unit: "px",
    },
})
```

---

## Production-Ready Component Implementation

Below is a complete, hydration-safe Framer Code Component for seamless shared element page transitions.

```tsx
import type { ComponentType } from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Type definition for undocumented ScrollSectionRef
interface ScrollSectionRef {
    current: HTMLElement | null
}

interface TransitionProps {
    section?: ScrollSectionRef
    viewport?: "top" | "center" | "bottom"
    sectionIdentifier?: string
    transition?: any
    exitOffset?: number
    entryOffset?: number
    blurAmount?: number
    style?: React.CSSProperties
}

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 100
 * @framerIntrinsicHeight 100
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function SharedElementPageTransition(props: TransitionProps) {
    const {
        section,
        viewport = "top",
        sectionIdentifier = "shared-hero",
        transition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        exitOffset = 40,
        entryOffset = -40,
        blurAmount = 8,
        style,
    } = props

    const [isClient, setIsClient] = useState(false)
    const isNavigating = useRef(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    // Find the target element on the current or new DOM
    const resolveTargetElement = useCallback(
        (doc: Document | HTMLElement = document): HTMLElement | null => {
            if (section?.current && doc === document) {
                return section.current
            }
            if (sectionIdentifier) {
                return (
                    doc.querySelector(`[data-framer-name="${sectionIdentifier}"]`) ||
                    doc.querySelector(`[data-scroll-section="${sectionIdentifier}"]`) ||
                    doc.querySelector(`#${sectionIdentifier}`)
                )
            }
            return null
        },
        [section, sectionIdentifier]
    )

    // Execute the choreographed transition
    const performPageTransition = useCallback(
        async (destinationUrl: string) => {
            if (isNavigating.current) return
            isNavigating.current = true

            const fromElement = resolveTargetElement(document)

            try {
                // Fetch destination HTML
                const response = await fetch(destinationUrl)
                const htmlText = await response.text()
                const parser = new DOMParser()
                const newDoc = parser.parseFromString(htmlText, "text/html")

                // Helper to perform DOM swap
                const swapDOM = async () => {
                    const currentRoot = document.querySelector("[data-framer-root]") || document.body
                    const newRoot = newDoc.querySelector("[data-framer-root]") || newDoc.body

                    if (currentRoot && newRoot) {
                        currentRoot.innerHTML = newRoot.innerHTML
                    }

                    // Update document title and history
                    document.title = newDoc.title
                    window.history.pushState({ path: destinationUrl }, "", destinationUrl)
                    window.scrollTo(0, 0)
                }

                // Check for animateView or browser View Transition API
                if (typeof (window as any).animateView === "function") {
                    const updateTransition = (window as any).animateView(swapDOM, transition)

                    if (fromElement) {
                        const toElement = resolveTargetElement(document)
                        if (toElement) {
                            updateTransition.add(fromElement, toElement)
                        }
                    }

                    updateTransition
                        .old({
                            opacity: 0,
                            y: exitOffset,
                            filter: `blur(${blurAmount}px)`,
                        })
                        .new({
                            opacity: 1,
                            y: 0,
                            filter: "blur(0px)",
                        })

                    await updateTransition.finished
                } else if (document.startViewTransition) {
                    // Browser native View Transitions fallback
                    if (fromElement) {
                        fromElement.style.viewTransitionName = "shared-element-morph"
                    }

                    const viewTransition = document.startViewTransition(async () => {
                        await swapDOM()
                        const toElement = resolveTargetElement(document)
                        if (toElement) {
                            toElement.style.viewTransitionName = "shared-element-morph"
                        }
                    })

                    await viewTransition.finished
                    if (fromElement) fromElement.style.viewTransitionName = ""
                } else {
                    // Direct swap fallback
                    await swapDOM()
                }
            } catch (error) {
                console.error("[SharedElementTransition] Navigation failed:", error)
                window.location.href = destinationUrl
            } finally {
                isNavigating.current = false
            }
        },
        [resolveTargetElement, transition, exitOffset, entryOffset, blurAmount]
    )

    // Intercept internal link clicks and popstate events
    useEffect(() => {
        if (!isClient) return
        if (RenderTarget.current() === RenderTarget.canvas) return // Skip inside Framer Canvas editor

        const handleAnchorClick = (e: MouseEvent) => {
            const anchor = (e.target as HTMLElement).closest("a")
            if (!anchor) return

            const href = anchor.getAttribute("href")
            if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return
            if (anchor.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return

            const targetUrl = new URL(anchor.href, window.location.origin)
            if (targetUrl.origin !== window.location.origin) return
            if (targetUrl.pathname === window.location.pathname) return

            e.preventDefault()
            performPageTransition(targetUrl.pathname + targetUrl.search)
        }

        const handlePopState = () => {
            performPageTransition(window.location.pathname + window.location.search)
        }

        document.addEventListener("click", handleAnchorClick, { capture: true })
        window.addEventListener("popstate", handlePopState)

        return () => {
            document.removeEventListener("click", handleAnchorClick, { capture: true })
            window.removeEventListener("popstate", handlePopState)
        }
    }, [isClient, performPageTransition])

    if (!isClient) {
        return <div style={{ display: "none", ...style }} />
    }

    const isOnCanvas = RenderTarget.current() === RenderTarget.canvas

    return (
        <div
            style={{
                display: isOnCanvas ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
                borderRadius: 8,
                background: "rgba(0, 153, 255, 0.08)",
                border: "1px dashed rgba(0, 153, 255, 0.4)",
                color: "#0099ff",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                ...style,
            }}
        >
            Shared Page Transition ({sectionIdentifier})
        </div>
    )
}

addPropertyControls(SharedElementPageTransition, {
    section: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Shared Section",
    },
    viewport: {
        type: ControlType.Enum,
        title: "Viewport",
        displaySegmentedControl: true,
        options: ["top", "center", "bottom"],
        optionTitles: [
            "Top (Viewport Top)",
            "Center (Viewport Center)",
            "Bottom (Viewport Bottom)",
        ],
        // @ts-ignore
        optionIcons: ["align-top", "align-middle", "align-bottom"],
        defaultValue: "top",
    },
    sectionIdentifier: {
        type: ControlType.String,
        title: "Identifier",
        defaultValue: "shared-hero",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: {
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.6,
        },
    },
    exitOffset: {
        type: ControlType.Number,
        title: "Exit Slide Y",
        min: -150,
        max: 150,
        step: 5,
        defaultValue: 40,
        unit: "px",
    },
    entryOffset: {
        type: ControlType.Number,
        title: "Entry Slide Y",
        min: -150,
        max: 150,
        step: 5,
        defaultValue: -40,
        unit: "px",
    },
    blurAmount: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 24,
        step: 1,
        defaultValue: 8,
        unit: "px",
    },
})
```

---

## Best Practices & Critical Rules

### 1. Canvas vs. Published Behavior
Never intercept links or execute `history.pushState` on the Framer canvas (`RenderTarget.current() === RenderTarget.canvas`). Show a subtle indicator box in the editor and activate the routing interceptor only on published or preview sites.

### 2. Scroll Section Reference Resolution
Always check `section?.current` first. If the component instance is duplicated or loaded across separate canvas page trees where the ref is not directly bound, fall back to matching `data-framer-name` or `data-scroll-section`.

### 3. Coordinate Space & Snapshot Stability
`animateView` captures snapshot bitmaps in **viewport coordinate space**. Do not apply document-scroll offsets (`window.scrollY`) to snapshot layer styles.

### 4. Hydration Safety
Ensure all DOM event listeners and `window.history` operations are initialized inside `useEffect` under the `isClient` guard.

---

## Agent Rule

When building or updating page transition components in Framer:
1. Always use `ControlType.ScrollSectionRef` alongside a `viewport` enum control for selecting shared elements on the canvas.
2. Structure page transitions using `animateView(update).add(fromElement, toElement)` for shared elements, `.old({ opacity: 0, y: exitOffset, filter: "blur(...) "})` for exit, and `.new({ opacity: 1, y: 0, filter: "blur(0px)" })` for entry.
3. Pass Framer `ControlType.Transition` configuration directly to `animateView`.
4. Keep navigation listeners gated behind `isClient` and `RenderTarget.current() !== RenderTarget.canvas`.
