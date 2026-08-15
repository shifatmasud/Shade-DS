import React, { useRef, useState, useEffect, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Type interface for undocumented ScrollSectionRef
export interface ScrollSectionRef {
    current: HTMLElement | null
}

export interface SharedElementTransitionProps {
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
 * @framerIntrinsicWidth 240
 * @framerIntrinsicHeight 48
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function SharedElementTransition(props: SharedElementTransitionProps) {
    const {
        section,
        viewport = "top",
        sectionIdentifier = "shared-hero",
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

    useEffect(() => {
        setIsClient(true)
    }, [])

    /**
     * Resolves the target element designated by the ScrollSectionRef or fallback identifier
     */
    const resolveTargetElement = useCallback(
        (doc: Document | HTMLElement = document): HTMLElement | null => {
            // Direct reference when inside the active DOM
            if (section?.current && doc === document) {
                return section.current
            }

            // Target via data attributes or custom ID
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

    /**
     * Choreographs the 6-step transition lifecycle
     */
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

                // Asynchronous update callback that mutates the DOM
                const swapDOM = async () => {
                    const currentRoot = document.querySelector("[data-framer-root]") || document.body
                    const newRoot = newDoc.querySelector("[data-framer-root]") || newDoc.body

                    if (currentRoot && newRoot) {
                        currentRoot.innerHTML = newRoot.innerHTML
                    }

                    document.title = newDoc.title
                    window.history.pushState({ path: destinationUrl }, "", destinationUrl)
                    window.scrollTo(0, 0)
                }

                // Check for Framer Motion animateView API
                if (typeof (window as any).animateView === "function") {
                    const updateTransition = (window as any).animateView(swapDOM, transition)

                    if (fromElement) {
                        const toElement = resolveTargetElement(document)
                        if (toElement) {
                            // Morph shared element
                            updateTransition.add(fromElement, toElement)
                        }
                    }

                    // Choreograph exit and entry for non-shared page content
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
                console.warn("[SharedElementTransition] Falling back to standard navigation:", error)
                window.location.href = destinationUrl
            } finally {
                isNavigating.current = false
            }
        },
        [resolveTargetElement, transition, exitOffset, entryOffset, blurAmount]
    )

    // Intercept navigation links
    useEffect(() => {
        if (!isClient) return
        if (RenderTarget.current() === RenderTarget.canvas) return

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
                gap: 8,
                padding: "8px 16px",
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
            <span style={{ fontSize: 14 }}>✦</span>
            <span>Shared Page Transition ({sectionIdentifier})</span>
        </div>
    )
}

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
        title: "Identifier",
        defaultValue: "shared-hero",
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
