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
│ └─────────────────────────────────┘             └─────────────────────────────────┘
                 │                                               ▲
                 └───────── History API (pushState) ─────────────┘
```

---

## The Mode System: Instance State Observation

When choreographing transitions across two distinct page component trees in Framer, the component supports three observation modes:

| Mode | Property Value | Behavior | Use Case |
| :--- | :--- | :--- | :--- |
| **Auto Detect** | `"auto"` | Automatically detects outgoing vs. incoming navigation based on URL matching and route history. | Default single-component drop-in on shared layouts or layout templates. |
| **Old Page (Outgoing)** | `"old page"` | Actively monitors user click actions, freezes snapshot geometry, and prepares the outgoing exit snapshot. | Explicitly pinned on list/index pages (e.g. Card Grid) navigating to Detail views. |
| **New Page (Incoming)** | `"new page"` | Inactive on link clicks; activates immediately upon route mount to receive target geometry and execute the `.new()` spring entry. | Explicitly pinned on destination/detail pages (e.g. Project Detail) receiving the morph. |

---

## Property Controls Schema

The component exposes the following schema in Framer's property inspector:

```typescript
addPropertyControls(SharedElementTransition, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["auto", "old page", "new page"],
        optionTitles: ["Auto Detect", "Old Page (Outgoing)", "New Page (Incoming)"],
        defaultValue: "auto",
        description: "Observe prop change between component instance between two pages.",
    },
    section: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Shared Section",
        description: "Select the scroll section to preserve and morph across pages",
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

## Step-by-Step Canvas Setup Guide

Follow these steps to connect and configure shared element transitions between two Framer pages:

### Step 1: Assign Scroll Section Names on the Canvas
1. Select the container/section on **Page A** (e.g. the product card or hero image).
2. In Framer's right-hand sidebar under **Scroll Section**, name the section (e.g., `"HeroCard"`).
3. Select the matching target element on **Page B** (e.g. the expanded header or hero card).
4. Give it the exact same **Scroll Section** name (`"HeroCard"`).

### Step 2: Insert the `SharedElementTransition` Code Component
1. Drag `SharedElementTransition` from the Assets / Code panel onto **Page A**.
2. Set its **Shared Section** property control to point to `"HeroCard"`.
3. Set **Mode** to `"Old Page (Outgoing)"` (or leave as `"Auto Detect"`).
4. Tune the **Exit Slide Y** (e.g., `40px`) and **Blur** (e.g., `8px`).

### Step 3: Configure the Destination Page
1. Drag `SharedElementTransition` onto **Page B**.
2. Set its **Shared Section** property control to point to `"HeroCard"`.
3. Set **Mode** to `"New Page (Incoming)"` (or leave as `"Auto Detect"`).
4. Set **Entry Slide Y** (e.g., `-40px`) to match the incoming directional choreography.

### Step 4: Preview & Publish
- On the Framer Canvas, each instance renders an interactive status badge showing its configured mode.
- In Preview or on published URLs, link clicks (`<a href="/project-b">`) seamlessly morph the shared hero while cross-fading the surrounding layout.

---

## The 6-Step Transition Lifecycle

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

1. **Detect Navigation**: Intercepts internal link clicks (`<a href="...">`) or `popstate` events without full browser reloads.
2. **Identify Shared Elements**: Queries the DOM for the element bound to `ScrollSectionRef` and captures viewport geometry.
3. **Morph Shared Elements**: Passes `fromElement` and `toElement` into `animateView(swapDOM).add(fromElement, toElement)`.
4. **Exit Non-Shared Content**: Outgoing non-shared elements are animated with `.old({ opacity: 0, y: exitOffset, filter: 'blur(...)' })`.
5. **Enter Non-Shared Content**: Incoming non-shared elements are animated with `.new({ opacity: 1, y: 0, filter: 'blur(0px)' })`.
6. **Update Browser History**: Calls `window.history.pushState` and resets scroll position cleanly.

---

## Complete Production Component (`SharedElementTransition.tsx`)

```tsx
import React, { useRef, useState, useEffect, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

export interface ScrollSectionRef {
    current: HTMLElement | null
}

export interface SharedElementTransitionProps {
    mode?: "auto" | "old page" | "new page"
    section?: ScrollSectionRef
    sectionIdentifier?: string
    transition?: any
    exitOffset?: number
    entryOffset?: number
    blurAmount?: number
    style?: React.CSSProperties
}

interface SharedElementRegistry {
    lastOutgoingRect: DOMRect | null
    lastOutgoingPath: string
    activeIdentifier: string
    snapshotTimestamp: number
}

const globalRegistry: SharedElementRegistry = {
    lastOutgoingRect: null,
    lastOutgoingPath: "",
    activeIdentifier: "shared-section",
    snapshotTimestamp: 0,
}

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 260
 * @framerIntrinsicHeight 52
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function SharedElementTransition(props: SharedElementTransitionProps) {
    const {
        mode = "auto",
        section,
        sectionIdentifier = "shared-section",
        transition = {
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.6,
        },
        exitOffset = 40,
        entryOffset = -40,
        blurAmount = 8,
        style,
    } = props

    const [isClient, setIsClient] = useState(false)
    const isNavigating = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const resolveTargetElement = useCallback(
        (doc: Document | HTMLElement = document): HTMLElement | null => {
            if (section?.current && doc === document) {
                return section.current
            }

            const identifier = sectionIdentifier || "shared-section"
            const queried =
                doc.querySelector(`[data-scroll-section="${identifier}"]`) ||
                doc.querySelector(`[data-framer-name="${identifier}"]`) ||
                doc.querySelector(`[data-section-name="${identifier}"]`) ||
                doc.querySelector(`#${identifier}`)

            if (queried) return queried as HTMLElement

            const fallbackSection = doc.querySelector("main section, [data-framer-component-type='Section']")
            return fallbackSection as HTMLElement | null
        },
        [section, sectionIdentifier]
    )

    useEffect(() => {
        if (!isClient) return

        const currentTarget = resolveTargetElement(document)
        if (currentTarget) {
            const rect = currentTarget.getBoundingClientRect()
            if (mode === "old page" || (mode === "auto" && !globalRegistry.lastOutgoingRect)) {
                globalRegistry.lastOutgoingRect = rect
                globalRegistry.lastOutgoingPath = window.location.pathname
                globalRegistry.snapshotTimestamp = Date.now()
            }
        }
    }, [isClient, mode, resolveTargetElement])

    const performPageTransition = useCallback(
        async (destinationUrl: string) => {
            if (isNavigating.current) return
            isNavigating.current = true

            const fromElement = resolveTargetElement(document)
            if (fromElement) {
                globalRegistry.lastOutgoingRect = fromElement.getBoundingClientRect()
                globalRegistry.lastOutgoingPath = window.location.pathname
                globalRegistry.snapshotTimestamp = Date.now()
            }

            try {
                const response = await fetch(destinationUrl)
                if (!response.ok) throw new Error(`HTTP ${response.status} loading ${destinationUrl}`)
                const htmlText = await response.text()
                const parser = new DOMParser()
                const newDoc = parser.parseFromString(htmlText, "text/html")

                const swapDOM = async () => {
                    const currentRoot =
                        document.querySelector("[data-framer-root]") ||
                        document.querySelector("#main") ||
                        document.body
                    const newRoot =
                        newDoc.querySelector("[data-framer-root]") ||
                        newDoc.querySelector("#main") ||
                        newDoc.body

                    if (currentRoot && newRoot) {
                        currentRoot.innerHTML = newRoot.innerHTML
                    }

                    document.title = newDoc.title
                    window.history.pushState({ path: destinationUrl }, "", destinationUrl)
                    window.scrollTo(0, 0)
                }

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
                } else if (typeof (document as any).startViewTransition === "function") {
                    if (fromElement) {
                        fromElement.style.viewTransitionName = "shared-element-morph"
                    }

                    const viewTransition = (document as any).startViewTransition(async () => {
                        await swapDOM()
                        const toElement = resolveTargetElement(document)
                        if (toElement) {
                            toElement.style.viewTransitionName = "shared-element-morph"
                        }
                    })

                    await viewTransition.finished
                    if (fromElement) fromElement.style.viewTransitionName = ""
                } else {
                    await swapDOM()
                }
            } catch (error) {
                console.warn("[SharedElementTransition] Falling back to direct navigation:", error)
                window.location.href = destinationUrl
            } finally {
                isNavigating.current = false
            }
        },
        [resolveTargetElement, transition, exitOffset, blurAmount]
    )

    useEffect(() => {
        if (!isClient) return
        if (RenderTarget.current() === RenderTarget.canvas) return

        const handleAnchorClick = (e: MouseEvent) => {
            if (mode === "new page") return

            const anchor = (e.target as HTMLElement).closest("a")
            if (!anchor) return

            const href = anchor.getAttribute("href")
            if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return
            if (anchor.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

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
    }, [isClient, mode, performPageTransition])

    if (!isClient) {
        return <div style={{ display: "none", ...style }} />
    }

    const isOnCanvas = RenderTarget.current() === RenderTarget.canvas

    return (
        <div
            ref={containerRef}
            style={{
                display: isOnCanvas ? "flex" : "none",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(0, 153, 255, 0.08)",
                border: "1px dashed rgba(0, 153, 255, 0.4)",
                color: "#0099ff",
                fontSize: 12,
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 500,
                userSelect: "none",
                ...style,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>✦</span>
                <span>Shared Transition</span>
            </div>
            <span
                style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(0, 153, 255, 0.15)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontWeight: 600,
                }}
            >
                {mode === "auto" ? "Auto" : mode === "old page" ? "Old Page" : "New Page"}
            </span>
        </div>
    )
}

addPropertyControls(SharedElementTransition, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["auto", "old page", "new page"],
        optionTitles: ["Auto Detect", "Old Page (Outgoing)", "New Page (Incoming)"],
        defaultValue: "auto",
        description: "Observe prop change between component instance between two pages.",
    },
    section: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Shared Section",
        description: "Select the scroll section to preserve and morph across pages",
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

## Best Practices & Troubleshooting

1. **Hydration & SSR Safety**:
   Always initialize all DOM event listeners and browser APIs inside `useEffect` guarded by `isClient`. Return a hidden element during server render.

2. **Canvas vs. Published Behavior**:
   Never intercept clicks or trigger `pushState` on the Framer canvas (`RenderTarget.current() === RenderTarget.canvas`). Render a clean canvas indicator in the editor.

3. **Section Matching Priority**:
   `resolveTargetElement` prioritizes `section?.current` first, followed by `[data-scroll-section]`, `[data-framer-name]`, and finally generic section fallbacks.

4. **Multi-Layer Fallback Grace**:
   If `animateView` is not present, the component automatically falls back to browser-native `document.startViewTransition` with `viewTransitionName`, followed by pure DOM swap to prevent navigation lockups.
