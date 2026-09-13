/**
 * @license
 * SPDX-License-Identifier: MIT
 * 
 * ViewTransitionInspector: Reverse-Engineering & Telemetry HUD for Framer View Transitions
 * Standalone Framer Code Component & Diagnostic Overlay
 * 
 * @framerDisableUnlink
 * @framerIntrinsicWidth 360
 * @framerIntrinsicHeight 480
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// -----------------------------------------------------------------------------
// TYPES & INTERFACES
// -----------------------------------------------------------------------------

export type LogCategory = "NAV" | "VT" | "MOTION" | "DOM" | "CSS" | "WARN" | "INFO"

export interface TelemetryLog {
    id: string
    timestamp: number
    timeString: string
    category: LogCategory
    title: string
    message: string
    details?: Record<string, any>
}

export interface ElementGeometry {
    name: string
    selector: string
    rect: {
        x: number
        y: number
        width: number
        height: number
        top: number
        left: number
        bottom: number
        right: number
    }
    computedStyle: {
        viewTransitionName?: string
        transform?: string
        opacity?: string
        borderRadius?: string
        zIndex?: string
        position?: string
    }
}

export interface TransitionPairCapture {
    fromName: string
    toName: string
    fromRect: ElementGeometry["rect"] | null
    toRect: ElementGeometry["rect"] | null
    delta: {
        dx: number
        dy: number
        scaleX: number
        scaleY: number
    }
}

export interface TransitionSession {
    id: string
    startTime: number
    endTime?: number
    durationMs?: number
    navigationType?: string
    fromUrl: string
    toUrl: string
    phaseTimings: {
        triggerTime: number
        updateCallbackStart?: number
        updateCallbackEnd?: number
        readyTime?: number
        finishedTime?: number
    }
    pairs: TransitionPairCapture[]
    typesApplied?: string[]
    status: "initiating" | "dom-updating" | "animating" | "finished" | "failed" | "skipped"
    error?: string
}

export interface ViewTransitionInspectorProps {
    showConsoleOverlay?: boolean
    overlayPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
    autoInspect?: boolean
    interceptNavigation?: boolean
    highlightDOMElements?: boolean
    theme?: "dark" | "light" | "system"
    maxLogEntries?: number
    transition?: any
    style?: React.CSSProperties
    className?: string
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS & EXPORTERS
// -----------------------------------------------------------------------------

const uid = () => "vt-" + Math.random().toString(36).substring(2, 8)

const formatTime = (ts: number = Date.now()) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`
}

const safeJsonStringify = (obj: any, indent: number = 2) => {
    const cache = new Set()
    return JSON.stringify(
        obj,
        (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (cache.has(value)) return "[Circular Reference]"
                cache.add(value)
            }
            if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`
            if (value instanceof HTMLElement) {
                return `[HTMLElement: <${value.tagName.toLowerCase()} data-framer-name="${value.getAttribute("data-framer-name") || ""}">]`
            }
            return value
        },
        indent
    )
}

// Generates an in-depth reverse engineering analysis markdown report
function generateReverseEngineeringReport(
    sessions: TransitionSession[],
    logs: TelemetryLog[],
    scannedElements: ElementGeometry[]
): string {
    const lastSession = sessions[sessions.length - 1]
    const totalTransitions = sessions.length

    return `# 🔬 Framer View Transition Reverse-Engineering Report
Generated at: ${new Date().toISOString()}
Session UUID: ${uid()}

---

## 1. Executive Architecture Summary
Framer's view transition mechanics orchestrate shared element morphing and layout continuity through a synchronized 5-stage pipeline:

1. **Navigation Interception Phase**:
   - Listens on \`window.navigation.addEventListener('navigate')\` (Chromium) and falls back to \`popstate\` & delegated \`click\` listeners on anchor elements (\`a[href]\`).
   - Determines navigation direction (\`forward\` vs \`reverse\`) using route path depth, origin memory cache, and back-button selectors.

2. **Pre-Transition Tagging & Coordinate Stash**:
   - Queries source elements via \`data-framer-name\` or \`data-morphine-id\`.
   - Records viewport bounding rects (\`clientX\`, \`clientY\`, \`width\`, \`height\`).
   - Assigns dynamic CSS \`view-transition-name\` to isolate individual shared elements into browser pseudo-element groups.

3. **DOM Snapshot & Reconciliation**:
   - Calls \`document.startViewTransition(async () => { ... })\` which freezes the outgoing page raster into \`::view-transition-old(*)\`.
   - Executes the React DOM reconciliation / page mount inside the update callback.

4. **Destination Binding & Projection**:
   - Awaits target elements mounting on the new page matching destination \`data-framer-name\` / UID.
   - Sets destination \`view-transition-name\` so the browser matches incoming geometry against outgoing geometry.
   - Browser automatically constructs \`::view-transition-group(*)\` with CSS \`transform\` and \`width\`/\`height\` keyframes.

5. **Motion Keyframe Overlay & Non-Shared Element Transition**:
   - Applies custom Motion keyframes (e.g. \`animateView().old({ opacity: [1, 0], filter: ['blur(0px)', 'blur(20px)'] })\`) to non-shared canvas backgrounds.
   - Cleans up temporary tracking attributes on \`transition.finished\`.

---

## 2. Telemetry & Transition Session Metrics
- **Total Recorded Transitions**: ${totalTransitions}
${
    lastSession
        ? `
- **Latest Transition ID**: \`${lastSession.id}\`
- **Direction / Navigation Type**: \`${lastSession.navigationType || "standard"}\`
- **Total Duration**: \`${lastSession.durationMs ? lastSession.durationMs.toFixed(1) + "ms" : "N/A"}\`
- **From Route**: \`${lastSession.fromUrl}\`
- **To Route**: \`${lastSession.toUrl}\`
- **Status**: \`${lastSession.status}\`

### Phase Waterfall:
- **Trigger**: \`${lastSession.phaseTimings.triggerTime.toFixed(1)}ms\`
- **Update Callback Start**: \`${(lastSession.phaseTimings.updateCallbackStart || 0).toFixed(1)}ms\`
- **Update Callback End**: \`${(lastSession.phaseTimings.updateCallbackEnd || 0).toFixed(1)}ms\`
- **DOM Ready (\`::view-transition\` created)**: \`${(lastSession.phaseTimings.readyTime || 0).toFixed(1)}ms\`
- **Animation Complete (\`finished\` promise)**: \`${(lastSession.phaseTimings.finishedTime || 0).toFixed(1)}ms\`

### Shared Element Geometry Deltas:
${
    lastSession.pairs.length > 0
        ? lastSession.pairs
              .map(
                  (p, idx) => `
#### Pair #${idx + 1}: \`${p.fromName}\` ➔ \`${p.toName}\`
- **Delta X**: \`${p.delta.dx.toFixed(1)}px\` | **Delta Y**: \`${p.delta.dy.toFixed(1)}px\`
- **Scale X**: \`${p.delta.scaleX.toFixed(3)}\` | **Scale Y**: \`${p.delta.scaleY.toFixed(3)}\`
- **From Rect**: \`[x:${p.fromRect?.x.toFixed(0)}, y:${p.fromRect?.y.toFixed(0)}, w:${p.fromRect?.width.toFixed(0)}, h:${p.fromRect?.height.toFixed(0)}]\`
- **To Rect**: \`[x:${p.toRect?.x.toFixed(0)}, y:${p.toRect?.y.toFixed(0)}, w:${p.toRect?.width.toFixed(0)}, h:${p.toRect?.height.toFixed(0)}]\`
`
              )
              .join("\n")
        : "*(No paired shared-elements tracked in this transition)*"
}
`
        : "*(No transition triggered yet)*"
}

---

## 3. Discovered Framer DOM Nodes (\`data-framer-*\`)
Total Detected Framer Nodes: ${scannedElements.length}

${scannedElements
    .slice(0, 15)
    .map(
        (el) =>
            `- **\`${el.name}\`** (\`${el.selector}\`): Rect \`[${el.rect.width.toFixed(0)}x${el.rect.height.toFixed(0)} at (${el.rect.x.toFixed(0)}, ${el.rect.y.toFixed(0)})]\` | \`view-transition-name: ${el.computedStyle.viewTransitionName || "none"}\``
    )
    .join("\n")}
${scannedElements.length > 15 ? `\n*... and ${scannedElements.length - 15} more nodes.*` : ""}

---

## 4. Reverse-Engineered Standalone Code Snippet
To implement this native Framer View Transition in custom code, use the following pattern:

\`\`\`typescript
import { animateView } from "framer-motion"

export async function performFramerViewTransition(
  sourceElement: HTMLElement, 
  targetSelector: string, 
  onDomUpdate: () => Promise<void> | void
) {
  // 1. Tag source element with unique transition name
  const transitionId = "morph-" + Math.random().toString(36).substring(2, 7)
  sourceElement.style.viewTransitionName = transitionId

  // 2. Start transition with non-shared crossfade & shared element pairing
  const transition = (animateView as any)(async () => {
    await onDomUpdate()
    
    // 3. Find target in new DOM and match viewTransitionName
    const targetEl = document.querySelector<HTMLElement>(targetSelector)
    if (targetEl) {
      targetEl.style.viewTransitionName = transitionId
    }
  }, { duration: 0.45, ease: [0.4, 0, 0.2, 1] })
    .old({ opacity: [1, 0], filter: ["blur(0px)", "blur(20px)"] })
    .new({ opacity: [0, 1], filter: ["blur(20px)", "blur(0px)"] })

  await transition.finished
  
  // 4. Cleanup
  sourceElement.style.viewTransitionName = ""
  const targetEl = document.querySelector<HTMLElement>(targetSelector)
  if (targetEl) targetEl.style.viewTransitionName = ""
}
\`\`\`
`
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export default function ViewTransitionInspector(props: ViewTransitionInspectorProps) {
    const {
        showConsoleOverlay = true,
        overlayPosition = "bottom-right",
        autoInspect = true,
        interceptNavigation = true,
        highlightDOMElements = false,
        theme = "dark",
        maxLogEntries = 100,
        style,
        className,
    } = props

    const [isClient, setIsClient] = useState(false)
    const [isExpanded, setIsExpanded] = useState(true)
    const [isMinimized, setIsMinimized] = useState(false)
    const [activeTab, setActiveTab] = useState<"stream" | "inspector" | "scanner" | "simulator" | "spec">("stream")
    const [categoryFilter, setCategoryFilter] = useState<LogCategory | "ALL">("ALL")
    const [searchQuery, setSearchQuery] = useState("")
    const [copiedFormat, setCopiedFormat] = useState<string | null>(null)

    // Telemetry State
    const [logs, setLogs] = useState<TelemetryLog[]>([])
    const [sessions, setSessions] = useState<TransitionSession[]>([])
    const [activeSession, setActiveSession] = useState<TransitionSession | null>(null)
    const [scannedElements, setScannedElements] = useState<ElementGeometry[]>([])
    const [hoveredElementSelector, setHoveredElementSelector] = useState<string | null>(null)

    // Simulator State
    const [simState, setSimState] = useState<"compact" | "expanded">("compact")
    const [simTransitionType, setSimTransitionType] = useState<"morph" | "clip-radial" | "crossfade">("morph")
    const [simDuration, setSimDuration] = useState(0.45)

    // Refs for API restoration
    const originalStartViewTransitionRef = useRef<any>(null)
    const originalPushStateRef = useRef<any>(null)
    const originalReplaceStateRef = useRef<any>(null)
    const observerRef = useRef<MutationObserver | null>(null)
    const isTransitioningRef = useRef(false)

    // Add log helper
    const addLog = useCallback(
        (category: LogCategory, title: string, message: string, details?: Record<string, any>) => {
            const entry: TelemetryLog = {
                id: uid(),
                timestamp: Date.now(),
                timeString: formatTime(),
                category,
                title,
                message,
                details,
            }
            setLogs((prev) => [entry, ...prev].slice(0, maxLogEntries))
        },
        [maxLogEntries]
    )

    // DOM Scanner helper
    const scanFramerElements = useCallback(() => {
        if (typeof document === "undefined") return []
        const elements: ElementGeometry[] = []

        const nodes = Array.from(
            document.querySelectorAll<HTMLElement>(
                '[data-framer-name], [data-framer-component-type], [data-framer-appear-id], [data-morphine-id], [style*="view-transition-name"]'
            )
        )

        nodes.forEach((el) => {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 && rect.height === 0) return

            const framerName = el.getAttribute("data-framer-name") || el.getAttribute("data-morphine-id") || el.tagName.toLowerCase()
            const compType = el.getAttribute("data-framer-component-type") || ""
            const vtName = el.style.viewTransitionName || window.getComputedStyle(el).viewTransitionName

            const selector = el.id
                ? `#${el.id}`
                : el.getAttribute("data-framer-name")
                ? `[data-framer-name="${el.getAttribute("data-framer-name")}"]`
                : el.getAttribute("data-morphine-id")
                ? `[data-morphine-id="${el.getAttribute("data-morphine-id")}"]`
                : el.tagName.toLowerCase()

            const compStyle = window.getComputedStyle(el)

            elements.push({
                name: framerName + (compType ? ` (${compType})` : ""),
                selector,
                rect: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left,
                    bottom: rect.bottom,
                    right: rect.right,
                },
                computedStyle: {
                    viewTransitionName: vtName !== "none" ? vtName : undefined,
                    transform: compStyle.transform !== "none" ? compStyle.transform : undefined,
                    opacity: compStyle.opacity,
                    borderRadius: compStyle.borderRadius,
                    zIndex: compStyle.zIndex !== "auto" ? compStyle.zIndex : undefined,
                    position: compStyle.position,
                },
            })
        })

        setScannedElements(elements)
        return elements
    }, [])

    // Hydration guard
    useEffect(() => {
        setIsClient(true)
    }, [])

    // -------------------------------------------------------------------------
    // API INTERCEPTION & HOOKS
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!isClient || typeof window === "undefined" || !autoInspect) return

        // Bypass in Framer canvas design mode if preferred
        if (RenderTarget.current() === RenderTarget.canvas) {
            addLog("INFO", "Canvas Mode Active", "Inspector mounted on Framer Canvas editor.")
        } else {
            addLog("INFO", "Preview Mode Active", "Inspector listening for live View Transitions.")
        }

        // 1. Intercept document.startViewTransition
        if (typeof document !== "undefined" && "startViewTransition" in document) {
            originalStartViewTransitionRef.current = (document as any).startViewTransition

            ;(document as any).startViewTransition = function (callback?: () => Promise<void> | void) {
                const startTime = performance.now()
                const sessionId = uid()
                const currentUrl = window.location.href

                // Pre-transition snapshot of DOM
                const preElements = scanFramerElements()
                const capturedPairs: TransitionPairCapture[] = []

                // Discover elements with explicit view-transition-name
                preElements.forEach((el) => {
                    if (el.computedStyle.viewTransitionName && el.computedStyle.viewTransitionName !== "none") {
                        capturedPairs.push({
                            fromName: el.name,
                            toName: el.name,
                            fromRect: el.rect,
                            toRect: null,
                            delta: { dx: 0, dy: 0, scaleX: 1, scaleY: 1 },
                        })
                    }
                })

                const session: TransitionSession = {
                    id: sessionId,
                    startTime,
                    fromUrl: currentUrl,
                    toUrl: currentUrl,
                    phaseTimings: {
                        triggerTime: startTime,
                    },
                    pairs: capturedPairs,
                    status: "initiating",
                }

                setActiveSession(session)
                setSessions((prev) => [session, ...prev].slice(0, 20))

                addLog(
                    "VT",
                    "document.startViewTransition invoked",
                    `Captured session [${sessionId}]. Freezing outgoing DOM snapshot into ::view-transition-old.`,
                    { sessionId, preElementCount: preElements.length, pairs: capturedPairs }
                )

                // Wrap user callback to track DOM update phase
                const wrappedCallback = async () => {
                    session.phaseTimings.updateCallbackStart = performance.now()
                    session.status = "dom-updating"
                    setActiveSession({ ...session })

                    addLog(
                        "DOM",
                        "Update Callback Executing",
                        "React DOM reconciliation and component swapping occurring now.",
                        { sessionId }
                    )

                    try {
                        if (typeof callback === "function") {
                            await callback()
                        }
                    } catch (err: any) {
                        session.status = "failed"
                        session.error = err?.message || String(err)
                        addLog("WARN", "Update Callback Error", err?.message || "Error during updateCallback", { error: err })
                        throw err
                    } finally {
                        session.phaseTimings.updateCallbackEnd = performance.now()
                        session.toUrl = window.location.href

                        // Post-transition DOM discovery
                        const postElements = scanFramerElements()
                        session.pairs.forEach((pair) => {
                            const foundPost = postElements.find((p) => p.name === pair.toName || p.computedStyle.viewTransitionName)
                            if (foundPost && pair.fromRect) {
                                pair.toRect = foundPost.rect
                                pair.delta = {
                                    dx: foundPost.rect.x - pair.fromRect.x,
                                    dy: foundPost.rect.y - pair.fromRect.y,
                                    scaleX: pair.fromRect.width > 0 ? foundPost.rect.width / pair.fromRect.width : 1,
                                    scaleY: pair.fromRect.height > 0 ? foundPost.rect.height / pair.fromRect.height : 1,
                                }
                            }
                        })

                        setActiveSession({ ...session })
                    }
                }

                // Invoke native startViewTransition
                const transition = originalStartViewTransitionRef.current.call(document, wrappedCallback)

                // Track transition.ready promise
                if (transition && transition.ready) {
                    transition.ready
                        .then(() => {
                            session.phaseTimings.readyTime = performance.now()
                            session.status = "animating"
                            setActiveSession({ ...session })
                            addLog(
                                "VT",
                                "::view-transition Pseudo-Elements Ready",
                                "Browser has generated ::view-transition-group, image-pair, old & new rasters. Animations running.",
                                {
                                    readyLatencyMs: (session.phaseTimings.readyTime - startTime).toFixed(2),
                                }
                            )
                        })
                        .catch((err: any) => {
                            session.status = "skipped"
                            addLog("WARN", "Transition Skipped/Aborted", err?.message || "Ready promise rejected", { error: err })
                        })
                }

                // Track transition.finished promise
                if (transition && transition.finished) {
                    transition.finished
                        .then(() => {
                            const endTime = performance.now()
                            session.phaseTimings.finishedTime = endTime
                            session.endTime = endTime
                            session.durationMs = endTime - startTime
                            session.status = "finished"

                            setActiveSession({ ...session })
                            setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...session } : s)))

                            addLog(
                                "VT",
                                "View Transition Completed (finished)",
                                `Total duration: ${(endTime - startTime).toFixed(1)}ms. Pseudo-element layers cleaned up.`,
                                { durationMs: (endTime - startTime).toFixed(1), pairsCount: session.pairs.length }
                            )
                        })
                        .catch((err: any) => {
                            session.status = "failed"
                            addLog("WARN", "Transition Failed on Finished", err?.message || "Finished promise rejected")
                        })
                }

                return transition
            }
        }

        // 2. Intercept window.navigation (Navigation API)
        const nav = (window as any).navigation
        const handleNavigation = (e: any) => {
            if (!interceptNavigation) return
            addLog(
                "NAV",
                `Navigation API Event: [${e.navigationType || "navigate"}]`,
                `Target: ${e.destination?.url || "unknown"} (canIntercept: ${e.canIntercept})`,
                {
                    navigationType: e.navigationType,
                    destinationUrl: e.destination?.url,
                    hashChange: e.hashChange,
                    downloadRequest: e.downloadRequest,
                }
            )
        }

        if (nav && typeof nav.addEventListener === "function") {
            nav.addEventListener("navigate", handleNavigation)
        }

        // 3. Intercept history.pushState & replaceState
        originalPushStateRef.current = window.history.pushState
        originalReplaceStateRef.current = window.history.replaceState

        window.history.pushState = function (...args) {
            addLog("NAV", "history.pushState", `Navigating to: ${args[2] || "same url"}`, { state: args[0], title: args[1], url: args[2] })
            return originalPushStateRef.current.apply(this, args)
        }

        window.history.replaceState = function (...args) {
            addLog("NAV", "history.replaceState", `Replaced URL: ${args[2] || "same url"}`, { state: args[0], title: args[1], url: args[2] })
            return originalReplaceStateRef.current.apply(this, args)
        }

        const handlePopState = (e: PopStateEvent) => {
            addLog("NAV", "window.popstate (Back/Forward)", `State: ${JSON.stringify(e.state || {})}`, { state: e.state })
        }
        window.addEventListener("popstate", handlePopState)

        // 4. Intercept link clicks
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null
            const link = target?.closest("a[href]") as HTMLAnchorElement | null
            if (link && link.href) {
                const framerParent = link.closest("[data-framer-name]")?.getAttribute("data-framer-name")
                addLog(
                    "NAV",
                    "Anchor Link Clicked",
                    `Target: ${link.href}${framerParent ? ` inside [${framerParent}]` : ""}`,
                    { href: link.href, framerParent }
                )
            }
        }
        document.addEventListener("click", handleClick, { capture: true })

        // 5. DOM Mutation Observer
        observerRef.current = new MutationObserver((mutations) => {
            let hasFramerChange = false
            mutations.forEach((m) => {
                if (m.type === "childList") {
                    m.addedNodes.forEach((node) => {
                        if (node instanceof HTMLElement && (node.hasAttribute("data-framer-name") || node.querySelector("[data-framer-name]"))) {
                            hasFramerChange = true
                        }
                    })
                } else if (m.type === "attributes" && m.attributeName?.startsWith("data-framer")) {
                    hasFramerChange = true
                }
            })

            if (hasFramerChange) {
                scanFramerElements()
            }
        })

        if (document.body) {
            observerRef.current.observe(document.body, { childList: true, subtree: true, attributes: true })
        }

        // Initial scan
        scanFramerElements()

        return () => {
            // Restore all patched browser APIs cleanly
            if (originalStartViewTransitionRef.current && typeof document !== "undefined") {
                ;(document as any).startViewTransition = originalStartViewTransitionRef.current
            }
            if (originalPushStateRef.current) {
                window.history.pushState = originalPushStateRef.current
            }
            if (originalReplaceStateRef.current) {
                window.history.replaceState = originalReplaceStateRef.current
            }
            if (nav && typeof nav.removeEventListener === "function") {
                nav.removeEventListener("navigate", handleNavigation)
            }
            window.removeEventListener("popstate", handlePopState)
            document.removeEventListener("click", handleClick, { capture: true })
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [isClient, autoInspect, interceptNavigation, scanFramerElements, addLog])

    // -------------------------------------------------------------------------
    // COPY UTILITIES
    // -------------------------------------------------------------------------
    const handleCopy = async (format: "json" | "report" | "snippet" | "css") => {
        let textToCopy = ""

        if (format === "json") {
            const telemetryDump = {
                exportedAt: new Date().toISOString(),
                sessions,
                activeSession,
                recentLogs: logs.slice(0, 50),
                scannedFramerElements: scannedElements,
                browserCapabilities: {
                    startViewTransition: typeof document !== "undefined" && "startViewTransition" in document,
                    navigationApi: typeof window !== "undefined" && "navigation" in window,
                    viewTransitionTypes: typeof (document as any)?.startViewTransition === "function",
                },
            }
            textToCopy = safeJsonStringify(telemetryDump)
        } else if (format === "report") {
            textToCopy = generateReverseEngineeringReport(sessions, logs, scannedElements)
        } else if (format === "snippet") {
            textToCopy = `// Reverse-Engineered Framer View Transition Controller
import { animateView } from "framer-motion"

export function executeViewTransition(onUpdate: () => Promise<void> | void) {
  if (typeof document === "undefined" || !("startViewTransition" in document)) {
    return onUpdate()
  }
  
  return (animateView as any)(async () => {
    await onUpdate()
  }, { duration: 0.45, ease: [0.4, 0, 0.2, 1] })
    .old({ opacity: [1, 0], filter: ["blur(0px)", "blur(20px)"] })
    .new({ opacity: [0, 1], filter: ["blur(20px)", "blur(0px)"] })
}
`
        } else if (format === "css") {
            textToCopy = `/* Framer Native View Transition CSS Rules */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.45s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-old(root) {
  animation-name: framer-view-fade-out;
}

::view-transition-new(root) {
  animation-name: framer-view-fade-in;
}

@keyframes framer-view-fade-out {
  from { opacity: 1; filter: blur(0px); }
  to { opacity: 0; filter: blur(20px); }
}

@keyframes framer-view-fade-in {
  from { opacity: 0; filter: blur(20px); }
  to { opacity: 1; filter: blur(0px); }
}
`
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(textToCopy)
            } else {
                // Fallback textarea method
                const textArea = document.createElement("textarea")
                textArea.value = textToCopy
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand("copy")
                document.body.removeChild(textArea)
            }
            setCopiedFormat(format)
            addLog("INFO", "Telemetry Exported", `Copied ${format.toUpperCase()} to clipboard.`)
            setTimeout(() => setCopiedFormat(null), 2400)
        } catch (err: any) {
            addLog("WARN", "Clipboard Copy Failed", err?.message || "Could not write to clipboard")
        }
    }

    // -------------------------------------------------------------------------
    // SIMULATOR ACTIONS
    // -------------------------------------------------------------------------
    const runSimulatedTransition = async (type: "morph" | "clip-radial" | "crossfade") => {
        if (isTransitioningRef.current) return
        isTransitioningRef.current = true

        const nextState = simState === "compact" ? "expanded" : "compact"
        addLog("VT", `Simulator Trigger: ${type.toUpperCase()}`, `State transition: ${simState} ➔ ${nextState}`)

        if (typeof document !== "undefined" && "startViewTransition" in document) {
            try {
                const vt = (document as any).startViewTransition(async () => {
                    setSimState(nextState)
                    // Allow React to flush state update
                    await new Promise((r) => setTimeout(r, 60))
                })
                await vt.finished
            } catch (err) {
                setSimState(nextState)
            } finally {
                isTransitioningRef.current = false
            }
        } else {
            // Fallback for browsers without native startViewTransition
            setSimState(nextState)
            isTransitioningRef.current = false
        }
    }

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const matchesCat = categoryFilter === "ALL" || log.category === categoryFilter
            const matchesSearch =
                !searchQuery ||
                log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.message.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesCat && matchesSearch
        })
    }, [logs, categoryFilter, searchQuery])

    // Category colors
    const getBadgeStyle = (cat: LogCategory): React.CSSProperties => {
        switch (cat) {
            case "VT":
                return { background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }
            case "NAV":
                return { background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.3)" }
            case "DOM":
                return { background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" }
            case "MOTION":
                return { background: "rgba(249, 115, 22, 0.15)", color: "#fb923c", border: "1px solid rgba(249, 115, 22, 0.3)" }
            case "WARN":
                return { background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" }
            case "CSS":
                return { background: "rgba(234, 179, 8, 0.15)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.3)" }
            default:
                return { background: "rgba(148, 163, 184, 0.15)", color: "#94a3b8", border: "1px solid rgba(148, 163, 184, 0.3)" }
        }
    }

    // Overlay position calculation
    const getPositionStyles = (): React.CSSProperties => {
        const spacing = 16
        switch (overlayPosition) {
            case "top-left":
                return { top: spacing, left: spacing }
            case "top-right":
                return { top: spacing, right: spacing }
            case "bottom-left":
                return { bottom: spacing, left: spacing }
            case "bottom-right":
            default:
                return { bottom: spacing, right: spacing }
        }
    }

    const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)

    // Palette tokens
    const bgBase = isDark ? "rgba(11, 15, 25, 0.94)" : "rgba(255, 255, 255, 0.96)"
    const bgCard = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)"
    const bgCardActive = isDark ? "rgba(56, 189, 248, 0.1)" : "rgba(14, 165, 233, 0.08)"
    const borderBase = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
    const borderFocus = isDark ? "rgba(56, 189, 248, 0.4)" : "rgba(14, 165, 233, 0.5)"
    const textPrimary = isDark ? "#f8fafc" : "#0f172a"
    const textSecondary = isDark ? "#94a3b8" : "#64748b"
    const textMuted = isDark ? "#64748b" : "#94a3b8"
    const accentColor = isDark ? "#38bdf8" : "#0284c7"

    // -------------------------------------------------------------------------
    // RENDER TREE
    // -------------------------------------------------------------------------
    return (
        <>
            {/* Invisible anchor element on Framer Canvas */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    background: bgCard,
                    border: `1px dashed ${borderBase}`,
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: "ui-monospace, monospace",
                    color: textSecondary,
                    pointerEvents: "none",
                    userSelect: "none",
                    ...style,
                }}
                className={className}
                data-framer-name="ViewTransitionInspectorAnchor"
            >
                🔬 ViewTransition Inspector (Active)
            </div>

            {/* DOM Element Highlight Overlays (when enabled or hovered) */}
            {isClient && highlightDOMElements && hoveredElementSelector && (
                createPortal(
                    <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            pointerEvents: "none",
                            zIndex: 999998,
                        }}
                    >
                        {(() => {
                            const el = document.querySelector<HTMLElement>(hoveredElementSelector)
                            if (!el) return null
                            const r = el.getBoundingClientRect()
                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        position: "fixed",
                                        top: r.top,
                                        left: r.left,
                                        width: r.width,
                                        height: r.height,
                                        boxShadow: "0 0 0 2px #38bdf8, 0 0 16px rgba(56, 189, 248, 0.4)",
                                        background: "rgba(56, 189, 248, 0.1)",
                                        borderRadius: 4,
                                        pointerEvents: "none",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        justifyContent: "flex-start",
                                        padding: 4,
                                    }}
                                >
                                    <span
                                        style={{
                                            background: "#0f172a",
                                            color: "#38bdf8",
                                            fontSize: 10,
                                            fontFamily: "monospace",
                                            padding: "2px 6px",
                                            borderRadius: 4,
                                            border: "1px solid rgba(56, 189, 248, 0.4)",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                                        }}
                                    >
                                        {el.getAttribute("data-framer-name") || hoveredElementSelector} [
                                        {r.width.toFixed(0)}x{r.height.toFixed(0)}]
                                    </span>
                                </motion.div>
                            )
                        })()}
                    </div>,
                    document.body
                )
            )}

            {/* Floating Telemetry Console Overlay */}
            {isClient && showConsoleOverlay && createPortal(
                <div
                    id="framer-view-transition-inspector-portal"
                    style={{
                        position: "fixed",
                        zIndex: 999999,
                        ...getPositionStyles(),
                        pointerEvents: "auto",
                        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                    }}
                >
                    <AnimatePresence>
                        {isMinimized ? (
                            /* Minimized Floating Pill */
                            <motion.button
                                key="minimized-pill"
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsMinimized(false)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "8px 14px",
                                    background: bgBase,
                                    backdropFilter: "blur(16px)",
                                    border: `1px solid ${borderBase}`,
                                    borderRadius: 9999,
                                    color: textPrimary,
                                    cursor: "pointer",
                                    boxShadow: "0 12px 36px rgba(0, 0, 0, 0.35)",
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: activeSession?.status === "animating" ? "#22c55e" : accentColor,
                                        boxShadow: `0 0 8px ${accentColor}`,
                                    }}
                                />
                                <span>VT Inspector</span>
                                <span
                                    style={{
                                        background: bgCard,
                                        border: `1px solid ${borderBase}`,
                                        padding: "1px 6px",
                                        borderRadius: 999,
                                        fontSize: 10,
                                        color: textSecondary,
                                    }}
                                >
                                    {sessions.length}
                                </span>
                            </motion.button>
                        ) : (
                            /* Expanded Console Window */
                            <motion.div
                                key="expanded-console"
                                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                style={{
                                    width: isExpanded ? 460 : 340,
                                    maxHeight: isExpanded ? 580 : 420,
                                    display: "flex",
                                    flexDirection: "column",
                                    background: bgBase,
                                    backdropFilter: "blur(20px)",
                                    WebkitBackdropFilter: "blur(20px)",
                                    border: `1px solid ${borderBase}`,
                                    borderRadius: 14,
                                    boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05)",
                                    overflow: "hidden",
                                    color: textPrimary,
                                }}
                            >
                                {/* Header */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "10px 14px",
                                        borderBottom: `1px solid ${borderBase}`,
                                        background: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div
                                            style={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: "50%",
                                                background: activeSession?.status === "animating" ? "#22c55e" : accentColor,
                                                boxShadow: `0 0 6px ${accentColor}`,
                                            }}
                                        />
                                        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "-0.01em" }}>
                                            Framer View Transition Inspector
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        {/* Expand / Shrink Toggle */}
                                        <button
                                            onClick={() => setIsExpanded(!isExpanded)}
                                            title={isExpanded ? "Collapse View" : "Expand View"}
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: textSecondary,
                                                cursor: "pointer",
                                                padding: "4px 6px",
                                                borderRadius: 6,
                                                fontSize: 11,
                                            }}
                                        >
                                            {isExpanded ? "↙" : "↗"}
                                        </button>

                                        {/* Minimize Toggle */}
                                        <button
                                            onClick={() => setIsMinimized(true)}
                                            title="Minimize to Pill"
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: textSecondary,
                                                cursor: "pointer",
                                                padding: "4px 6px",
                                                borderRadius: 6,
                                                fontSize: 11,
                                            }}
                                        >
                                            _
                                        </button>
                                    </div>
                                </div>

                                {/* Tab Navigation */}
                                <div
                                    style={{
                                        display: "flex",
                                        borderBottom: `1px solid ${borderBase}`,
                                        background: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
                                        padding: "4px 8px",
                                        gap: 4,
                                        overflowX: "auto",
                                    }}
                                >
                                    {[
                                        { id: "stream", label: "Live Stream", count: filteredLogs.length },
                                        { id: "inspector", label: "Transitions", count: sessions.length },
                                        { id: "scanner", label: "DOM Scanner", count: scannedElements.length },
                                        { id: "simulator", label: "Simulator" },
                                        { id: "spec", label: "Architecture" },
                                    ].map((tab) => {
                                        const isActive = activeTab === tab.id
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                style={{
                                                    background: isActive ? bgCardActive : "transparent",
                                                    border: `1px solid ${isActive ? borderFocus : "transparent"}`,
                                                    color: isActive ? accentColor : textSecondary,
                                                    borderRadius: 6,
                                                    padding: "4px 8px",
                                                    fontSize: 11,
                                                    fontWeight: isActive ? 600 : 500,
                                                    cursor: "pointer",
                                                    whiteSpace: "nowrap",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 5,
                                                }}
                                            >
                                                <span>{tab.label}</span>
                                                {typeof tab.count === "number" && (
                                                    <span
                                                        style={{
                                                            fontSize: 9,
                                                            opacity: 0.8,
                                                            background: bgCard,
                                                            padding: "1px 4px",
                                                            borderRadius: 4,
                                                        }}
                                                    >
                                                        {tab.count}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Tab Content Area */}
                                <div
                                    style={{
                                        flex: 1,
                                        overflowY: "auto",
                                        padding: 12,
                                        fontSize: 11,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {/* --- TAB 1: LIVE STREAM --- */}
                                    {activeTab === "stream" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {/* Filters Bar */}
                                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                                <input
                                                    type="text"
                                                    placeholder="Filter logs..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 120,
                                                        background: bgCard,
                                                        border: `1px solid ${borderBase}`,
                                                        borderRadius: 6,
                                                        padding: "4px 8px",
                                                        color: textPrimary,
                                                        fontSize: 10,
                                                        outline: "none",
                                                    }}
                                                />
                                                {(["ALL", "VT", "NAV", "DOM", "MOTION"] as const).map((cat) => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => setCategoryFilter(cat)}
                                                        style={{
                                                            background: categoryFilter === cat ? bgCardActive : bgCard,
                                                            border: `1px solid ${categoryFilter === cat ? borderFocus : borderBase}`,
                                                            color: categoryFilter === cat ? accentColor : textSecondary,
                                                            borderRadius: 4,
                                                            padding: "2px 6px",
                                                            fontSize: 9,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setLogs([])}
                                                    title="Clear logs"
                                                    style={{
                                                        background: "transparent",
                                                        border: `1px solid ${borderBase}`,
                                                        color: textMuted,
                                                        borderRadius: 4,
                                                        padding: "2px 6px",
                                                        fontSize: 9,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    Clear
                                                </button>
                                            </div>

                                            {/* Log Entries */}
                                            {filteredLogs.length === 0 ? (
                                                <div style={{ textAlign: "center", color: textMuted, padding: "24px 0" }}>
                                                    No telemetry events captured yet. Trigger a transition or navigation.
                                                </div>
                                            ) : (
                                                filteredLogs.map((log) => (
                                                    <div
                                                        key={log.id}
                                                        style={{
                                                            padding: "6px 8px",
                                                            background: bgCard,
                                                            border: `1px solid ${borderBase}`,
                                                            borderRadius: 6,
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 2,
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                <span
                                                                    style={{
                                                                        padding: "1px 5px",
                                                                        borderRadius: 4,
                                                                        fontSize: 9,
                                                                        fontWeight: 700,
                                                                        ...getBadgeStyle(log.category),
                                                                    }}
                                                                >
                                                                    {log.category}
                                                                </span>
                                                                <span style={{ fontWeight: 600, color: textPrimary, fontSize: 11 }}>
                                                                    {log.title}
                                                                </span>
                                                            </div>
                                                            <span style={{ color: textMuted, fontSize: 9, fontFamily: "monospace" }}>
                                                                {log.timeString}
                                                            </span>
                                                        </div>
                                                        <div style={{ color: textSecondary, fontSize: 10, wordBreak: "break-word" }}>
                                                            {log.message}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* --- TAB 2: TRANSITION INSPECTOR --- */}
                                    {activeTab === "inspector" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            {sessions.length === 0 ? (
                                                <div style={{ textAlign: "center", color: textMuted, padding: "24px 0" }}>
                                                    No View Transition sessions recorded. Use the Simulator tab to test!
                                                </div>
                                            ) : (
                                                sessions.map((session, sIdx) => {
                                                    const isSelected = activeSession?.id === session.id
                                                    return (
                                                        <div
                                                            key={session.id}
                                                            onClick={() => setActiveSession(session)}
                                                            style={{
                                                                padding: 10,
                                                                background: isSelected ? bgCardActive : bgCard,
                                                                border: `1px solid ${isSelected ? borderFocus : borderBase}`,
                                                                borderRadius: 8,
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: 6,
                                                            }}
                                                        >
                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                                <span style={{ fontWeight: 700, color: accentColor }}>
                                                                    Transition #{sessions.length - sIdx} ({session.id})
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize: 9,
                                                                        padding: "1px 6px",
                                                                        borderRadius: 4,
                                                                        background:
                                                                            session.status === "finished"
                                                                                ? "rgba(34, 197, 94, 0.2)"
                                                                                : session.status === "animating"
                                                                                ? "rgba(56, 189, 248, 0.2)"
                                                                                : "rgba(239, 68, 68, 0.2)",
                                                                        color:
                                                                            session.status === "finished"
                                                                                ? "#4ade80"
                                                                                : session.status === "animating"
                                                                                ? "#38bdf8"
                                                                                : "#f87171",
                                                                    }}
                                                                >
                                                                    {session.status.toUpperCase()}
                                                                </span>
                                                            </div>

                                                            {/* Waterfall Timeline */}
                                                            <div
                                                                style={{
                                                                    display: "grid",
                                                                    gridTemplateColumns: "repeat(4, 1fr)",
                                                                    gap: 4,
                                                                    background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)",
                                                                    padding: 6,
                                                                    borderRadius: 6,
                                                                    fontSize: 9,
                                                                }}
                                                            >
                                                                <div>
                                                                    <div style={{ color: textMuted }}>Trigger</div>
                                                                    <div style={{ fontWeight: 600, color: textPrimary }}>0.0ms</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: textMuted }}>DOM Update</div>
                                                                    <div style={{ fontWeight: 600, color: textPrimary }}>
                                                                        {session.phaseTimings.updateCallbackEnd
                                                                            ? `${(session.phaseTimings.updateCallbackEnd - session.phaseTimings.triggerTime).toFixed(1)}ms`
                                                                            : "..."}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: textMuted }}>Pseudo-Ready</div>
                                                                    <div style={{ fontWeight: 600, color: textPrimary }}>
                                                                        {session.phaseTimings.readyTime
                                                                            ? `${(session.phaseTimings.readyTime - session.phaseTimings.triggerTime).toFixed(1)}ms`
                                                                            : "..."}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: textMuted }}>Finished</div>
                                                                    <div style={{ fontWeight: 600, color: textPrimary }}>
                                                                        {session.durationMs ? `${session.durationMs.toFixed(1)}ms` : "..."}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Matched Pairs */}
                                                            {session.pairs.length > 0 && (
                                                                <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                                                                    <span style={{ fontSize: 9, color: textMuted, fontWeight: 600 }}>
                                                                        Shared Elements Matched ({session.pairs.length}):
                                                                    </span>
                                                                    {session.pairs.map((p, pIdx) => (
                                                                        <div
                                                                            key={pIdx}
                                                                            style={{
                                                                                display: "flex",
                                                                                justifyContent: "space-between",
                                                                                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                                                                                padding: "3px 6px",
                                                                                borderRadius: 4,
                                                                                fontSize: 9,
                                                                                fontFamily: "monospace",
                                                                            }}
                                                                        >
                                                                            <span>
                                                                                {p.fromName} ➔ {p.toName}
                                                                            </span>
                                                                            <span style={{ color: accentColor }}>
                                                                                Δ({p.delta.dx.toFixed(0)}px, {p.delta.dy.toFixed(0)}px)
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}

                                    {/* --- TAB 3: DOM SCANNER --- */}
                                    {activeTab === "scanner" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ color: textSecondary, fontSize: 10 }}>
                                                    Discovered {scannedElements.length} Framer layer elements
                                                </span>
                                                <button
                                                    onClick={scanFramerElements}
                                                    style={{
                                                        background: bgCard,
                                                        border: `1px solid ${borderBase}`,
                                                        borderRadius: 4,
                                                        padding: "2px 8px",
                                                        fontSize: 9,
                                                        color: accentColor,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    ↻ Rescan
                                                </button>
                                            </div>

                                            {scannedElements.length === 0 ? (
                                                <div style={{ textAlign: "center", color: textMuted, padding: "20px 0" }}>
                                                    No [data-framer-*] tags found in current DOM.
                                                </div>
                                            ) : (
                                                scannedElements.map((el, eIdx) => (
                                                    <div
                                                        key={eIdx}
                                                        onMouseEnter={() => setHoveredElementSelector(el.selector)}
                                                        onMouseLeave={() => setHoveredElementSelector(null)}
                                                        style={{
                                                            padding: 8,
                                                            background: hoveredElementSelector === el.selector ? bgCardActive : bgCard,
                                                            border: `1px solid ${hoveredElementSelector === el.selector ? borderFocus : borderBase}`,
                                                            borderRadius: 6,
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 3,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                            <strong style={{ color: textPrimary, fontSize: 11 }}>{el.name}</strong>
                                                            <span style={{ color: textMuted, fontSize: 9, fontFamily: "monospace" }}>
                                                                {el.rect.width.toFixed(0)} × {el.rect.height.toFixed(0)}
                                                            </span>
                                                        </div>
                                                        <div style={{ color: textSecondary, fontSize: 9, fontFamily: "monospace" }}>
                                                            {el.selector}
                                                        </div>
                                                        {el.computedStyle.viewTransitionName && (
                                                            <div style={{ color: accentColor, fontSize: 9 }}>
                                                                view-transition-name: <code>{el.computedStyle.viewTransitionName}</code>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* --- TAB 4: SIMULATOR --- */}
                                    {activeTab === "simulator" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                            <div style={{ color: textSecondary, fontSize: 10 }}>
                                                Trigger simulated View Transitions below to test Framer Motion & native browser pseudo-element interpolation live.
                                            </div>

                                            {/* Mode Selector */}
                                            <div style={{ display: "flex", gap: 6 }}>
                                                {[
                                                    { id: "morph", label: "Shared Morph" },
                                                    { id: "clip-radial", label: "Clip Origin" },
                                                    { id: "crossfade", label: "Blur Crossfade" },
                                                ].map((t) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => setSimTransitionType(t.id as any)}
                                                        style={{
                                                            flex: 1,
                                                            padding: "5px 6px",
                                                            background: simTransitionType === t.id ? bgCardActive : bgCard,
                                                            border: `1px solid ${simTransitionType === t.id ? borderFocus : borderBase}`,
                                                            color: simTransitionType === t.id ? accentColor : textSecondary,
                                                            borderRadius: 6,
                                                            fontSize: 10,
                                                            fontWeight: simTransitionType === t.id ? 600 : 400,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Interactive Live Sandbox Target */}
                                            <div
                                                style={{
                                                    padding: 14,
                                                    background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
                                                    border: `1px solid ${borderBase}`,
                                                    borderRadius: 8,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    minHeight: 130,
                                                }}
                                            >
                                                <motion.div
                                                    layout
                                                    data-framer-name="SimulatorSampleCard"
                                                    style={{
                                                        width: simState === "compact" ? 140 : 260,
                                                        height: simState === "compact" ? 70 : 100,
                                                        borderRadius: simState === "compact" ? 12 : 20,
                                                        background: simState === "compact" ? "linear-gradient(135deg, #38bdf8, #818cf8)" : "linear-gradient(135deg, #ec4899, #8b5cf6)",
                                                        color: "#ffffff",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        justifyContent: "space-between",
                                                        padding: 10,
                                                        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                                                        viewTransitionName: "sample-sim-card",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                            {simState === "compact" ? "Compact Card" : "Expanded Detail Modal"}
                                                        </span>
                                                        <span style={{ fontSize: 8, background: "rgba(255,255,255,0.2)", padding: "1px 4px", borderRadius: 4 }}>
                                                            {simState}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: simState === "compact" ? 11 : 13, fontWeight: 700 }}>
                                                        {simState === "compact" ? "Morph Target A" : "Morph Target B (Detail)"}
                                                    </span>
                                                </motion.div>
                                            </div>

                                            {/* Trigger Button */}
                                            <button
                                                onClick={() => runSimulatedTransition(simTransitionType)}
                                                style={{
                                                    padding: "8px 14px",
                                                    background: accentColor,
                                                    color: isDark ? "#0f172a" : "#ffffff",
                                                    border: "none",
                                                    borderRadius: 8,
                                                    fontWeight: 700,
                                                    fontSize: 11,
                                                    cursor: "pointer",
                                                    boxShadow: `0 4px 12px ${accentColor}40`,
                                                }}
                                            >
                                                ⚡ Execute \`document.startViewTransition\`
                                            </button>
                                        </div>
                                    )}

                                    {/* --- TAB 5: ARCHITECTURE SPEC --- */}
                                    {activeTab === "spec" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10, color: textSecondary }}>
                                            <div style={{ fontWeight: 700, color: textPrimary, fontSize: 12 }}>
                                                Reverse-Engineered Architecture Spec
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                <div style={{ background: bgCard, padding: 8, borderRadius: 6, border: `1px solid ${borderBase}` }}>
                                                    <strong style={{ color: textPrimary }}>1. Capture Phase:</strong>
                                                    <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                                                        Outgoing element bounding box is stored. Temporary <code>view-transition-name</code> is attached.
                                                    </p>
                                                </div>
                                                <div style={{ background: bgCard, padding: 8, borderRadius: 6, border: `1px solid ${borderBase}` }}>
                                                    <strong style={{ color: textPrimary }}>2. Raster Freeze:</strong>
                                                    <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                                                        <code>document.startViewTransition</code> rasterizes old pixels into <code>::view-transition-old</code>.
                                                    </p>
                                                </div>
                                                <div style={{ background: bgCard, padding: 8, borderRadius: 6, border: `1px solid ${borderBase}` }}>
                                                    <strong style={{ color: textPrimary }}>3. Destination Match:</strong>
                                                    <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                                                        New DOM mounts. Target element matching <code>data-framer-name</code> receives the same transition name.
                                                    </p>
                                                </div>
                                                <div style={{ background: bgCard, padding: 8, borderRadius: 6, border: `1px solid ${borderBase}` }}>
                                                    <strong style={{ color: textPrimary }}>4. Browser Geometry Delta:</strong>
                                                    <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                                                        Browser smoothly animates <code>transform</code> and dimensions between old and new rects on the compositor thread.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer & One-Click Copy Actions */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "8px 12px",
                                        borderTop: `1px solid ${borderBase}`,
                                        background: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
                                        gap: 6,
                                    }}
                                >
                                    <span style={{ fontSize: 9, color: textMuted }}>
                                        {copiedFormat ? `✓ ${copiedFormat.toUpperCase()} Copied!` : "Export Telemetry:"}
                                    </span>

                                    <div style={{ display: "flex", gap: 4 }}>
                                        <button
                                            onClick={() => handleCopy("json")}
                                            title="Copy full telemetry dump in JSON format"
                                            style={{
                                                background: copiedFormat === "json" ? "rgba(34, 197, 94, 0.2)" : bgCard,
                                                border: `1px solid ${copiedFormat === "json" ? "#22c55e" : borderBase}`,
                                                color: copiedFormat === "json" ? "#4ade80" : textPrimary,
                                                borderRadius: 6,
                                                padding: "4px 8px",
                                                fontSize: 10,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {copiedFormat === "json" ? "Copied JSON" : "Copy JSON Trace"}
                                        </button>

                                        <button
                                            onClick={() => handleCopy("report")}
                                            title="Copy structured Markdown reverse engineering report"
                                            style={{
                                                background: copiedFormat === "report" ? "rgba(34, 197, 94, 0.2)" : bgCard,
                                                border: `1px solid ${copiedFormat === "report" ? "#22c55e" : borderBase}`,
                                                color: copiedFormat === "report" ? "#4ade80" : textPrimary,
                                                borderRadius: 6,
                                                padding: "4px 8px",
                                                fontSize: 10,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {copiedFormat === "report" ? "Copied Report" : "Copy Report"}
                                        </button>

                                        <button
                                            onClick={() => handleCopy("snippet")}
                                            title="Copy Framer Motion Code Override code"
                                            style={{
                                                background: copiedFormat === "snippet" ? "rgba(34, 197, 94, 0.2)" : bgCard,
                                                border: `1px solid ${copiedFormat === "snippet" ? "#22c55e" : borderBase}`,
                                                color: copiedFormat === "snippet" ? "#4ade80" : textPrimary,
                                                borderRadius: 6,
                                                padding: "4px 8px",
                                                fontSize: 10,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {copiedFormat === "snippet" ? "Copied Code" : "Copy Framer Code"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>,
                document.body
            )}
        </>
    )
}

// -----------------------------------------------------------------------------
// FRAMER PROPERTY CONTROLS
// -----------------------------------------------------------------------------

ViewTransitionInspector.displayName = "ViewTransitionInspector"

ViewTransitionInspector.defaultProps = {
    showConsoleOverlay: true,
    overlayPosition: "bottom-right",
    autoInspect: true,
    interceptNavigation: true,
    highlightDOMElements: false,
    theme: "dark",
    maxLogEntries: 100,
}

addPropertyControls(ViewTransitionInspector, {
    showConsoleOverlay: {
        type: ControlType.Boolean,
        title: "Show HUD",
        defaultValue: true,
        description: "Displays the floating telemetry console HUD overlay in the viewport.",
    },
    overlayPosition: {
        type: ControlType.Enum,
        title: "HUD Position",
        options: ["bottom-right", "bottom-left", "top-right", "top-left"],
        optionTitles: ["Bottom Right", "Bottom Left", "Top Right", "Top Left"],
        defaultValue: "bottom-right",
    },
    autoInspect: {
        type: ControlType.Boolean,
        title: "Auto Inspect",
        defaultValue: true,
        description: "Automatically instruments document.startViewTransition and DOM mutations.",
    },
    interceptNavigation: {
        type: ControlType.Boolean,
        title: "Intercept Nav",
        defaultValue: true,
        description: "Logs window.navigation, popstate, and router link transitions.",
    },
    highlightDOMElements: {
        type: ControlType.Boolean,
        title: "Highlight Nodes",
        defaultValue: false,
        description: "Outlines active Framer layer nodes on the canvas when hovering in the DOM scanner.",
    },
    theme: {
        type: ControlType.Enum,
        title: "HUD Theme",
        options: ["dark", "light", "system"],
        optionTitles: ["Dark", "Light", "System"],
        defaultValue: "dark",
    },
    maxLogEntries: {
        type: ControlType.Number,
        title: "Max Logs",
        defaultValue: 100,
        min: 20,
        max: 500,
        step: 10,
    },
    transition: {
        type: ControlType.Transition,
        title: "HUD Motion",
    },
})
