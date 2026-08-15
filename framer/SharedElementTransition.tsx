import React, { useRef, useState, useEffect, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import {animateView } from "framer-motion"

export interface ScrollSectionRef {
    current: HTMLElement | null
}

export interface SharedElementTransitionProps {
    mode?: "auto" | "old page" | "new page"
    section?: ScrollSectionRef
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

    // Load theme using the robust token helper pattern
    let theme: any = {
        Color: {
            Base: {
                Surface: { "1": "#121212", "2": "#1E1E1E", "3": "#333333" },
                Content: { "1": "#E0E0E0", "2": "#AAAAAA", "3": "#777777" }
            },
            Focus: {
                Surface: { "1": "#0D1B2A" },
                Content: { "1": "#64B5F6" }
            }
        },
        radius: { "Radius.M": "8px" },
        border: {
            getBorder1px: (color: string) => ({
                border: "none",
                boxShadow: `0 0 1px 0px ${color}, inset 0 0 1px 0px ${color}`
            })
        }
    }

    useEffect(() => {
        setIsClient(true)
    }, [])

    const resolveTargetElement = useCallback(
        (doc: Document | HTMLElement = document): HTMLElement | null => {
            if (doc === document) {
                return section?.current || null
            }
            // For the incoming document clone (newDoc), match using the exact ID or structural tag of the outgoing section
            const outgoingEl = section?.current
            if (outgoingEl) {
                if (outgoingEl.id) {
                    const matched = doc.querySelector(`#${outgoingEl.id}`)
                    if (matched) return matched as HTMLElement
                }
                const selector = outgoingEl.className
                    ? `${outgoingEl.tagName.toLowerCase()}.${outgoingEl.className.split(" ").join(".")}`
                    : outgoingEl.tagName.toLowerCase()
                try {
                    const matched = doc.querySelector(selector)
                    if (matched) return matched as HTMLElement
                } catch (e) {
                    // Ignore selector errors
                }
            }
            return null
        },
        [section]
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

                // Check for animateView support
                const runAnimateView = typeof animateView === "function" ? animateView : (window as any).animateView

                if (typeof runAnimateView === "function") {
                    const updateTransition = runAnimateView(swapDOM, transition)

                    if (fromElement) {
                        const toElement = resolveTargetElement(document)
                        if (toElement) {
                            updateTransition.add(fromElement, toElement)
                        }
                    }

                    updateTransition
                        .old({
                            opacity: 0,
                            transform: `translateY(${exitOffset}px)`,
                            filter: `blur(${blurAmount}px)`,
                        })
                        .new({
                            opacity: 1,
                            transform: "translateY(0px)",
                            filter: "blur(0px)",
                        })

                    await updateTransition.finished
                } else {
                    await swapDOM()
                }
            } catch (error) {
                console.warn("[SharedElementTransition] Falling back to direct navigation:", error)
                window.location.href = destinationUrl
            } {
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

    const badgeStyle: React.CSSProperties = {
        display: isOnCanvas ? "flex" : "none",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "8px 14px",
        borderRadius: theme.radius["Radius.M"] || 8,
        background: theme.Color.Focus.Surface["1"] || "rgba(0, 153, 255, 0.08)",
        border: "1px dashed " + (theme.Color.Focus.Content["1"] || "rgba(0, 153, 255, 0.4)"),
        color: theme.Color.Focus.Content["1"] || "#0099ff",
        fontSize: 12,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        fontWeight: 500,
        userSelect: "none",
        width: "100%",
        ...style,
    }

    return (
        <div ref={containerRef} style={badgeStyle}>
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
