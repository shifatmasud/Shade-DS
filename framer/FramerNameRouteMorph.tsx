//Not working

import React, { useEffect, useState, useRef, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

export interface FramerNameRouteMorphProps {
    targetNames?: string
    transition?: any
    style?: React.CSSProperties
}

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function FramerNameRouteMorph(props: FramerNameRouteMorphProps) {
    const {
        targetNames = "0",
        style,
    } = props

    const [isClient, setIsClient] = useState(false)
    const isNavigating = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const activeOverlayRef = useRef<HTMLDivElement | null>(null)

    const [siteScan, setSiteScan] = useState<{
        totalCount: number
        pageCount: number
        currentCount: number
        isLoading: boolean
    }>({
        totalCount: 0,
        pageCount: 1,
        currentCount: 0,
        isLoading: true,
    })

    useEffect(() => {
        setIsClient(true)
    }, [])

    const parseTargetNames = useCallback((): string[] => {
        if (!targetNames || typeof targetNames !== "string") return []
        return targetNames
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name.length > 0)
    }, [targetNames])

    const resolveElementByName = useCallback(
        (doc: Document | HTMLElement, name: string): HTMLElement | null => {
            try {
                const escapedName = CSS.escape(name)
                const queried =
                    doc.querySelector(`[data-framer-name="${name}"]`) ||
                    doc.querySelector(`[data-name="${name}"]`) ||
                    doc.querySelector(`#${escapedName}`)
                return queried as HTMLElement | null
            } catch (err) {
                console.warn(`[FramerNameRouteMorph] Invalid selector for target name "${name}":`, err)
                return null
            }
        },
        []
    )

    // Fast, local-only DOM scanner to count elements
    useEffect(() => {
        if (!isClient) return

        const names = parseTargetNames()
        if (names.length === 0) {
            setSiteScan({ totalCount: 0, pageCount: 1, currentCount: 0, isLoading: false })
            return
        }

        let currentDocCount = 0
        names.forEach((name) => {
            const escaped = CSS.escape(name)
            const matches = document.querySelectorAll(
                `[data-framer-name="${name}"], [data-name="${name}"], #${escaped}`
            )
            currentDocCount += matches.length
        })

        setSiteScan({
            totalCount: currentDocCount,
            pageCount: 1,
            currentCount: currentDocCount,
            isLoading: false,
        })
    }, [isClient, parseTargetNames])

    const cleanUrlPath = useCallback((urlPath: string): string => {
        try {
            const [path, query] = urlPath.split("?")
            const segments = path.split("/").filter(Boolean)
            const deduplicated: string[] = []
            
            for (const seg of segments) {
                if (deduplicated.length > 0 && deduplicated[deduplicated.length - 1] === seg) {
                    continue
                }
                deduplicated.push(seg)
            }
            
            const cleanPath = "/" + deduplicated.join("/")
            return query ? `${cleanPath}?${query}` : cleanPath
        } catch (e) {
            return urlPath
        }
    }, [])

    const performRouteTransition = useCallback(
        async (rawDestinationUrl: string) => {
            if (isNavigating.current) return
            isNavigating.current = true

            const destinationUrl = cleanUrlPath(rawDestinationUrl)

            // Clean up any existing overlay first
            if (activeOverlayRef.current) {
                activeOverlayRef.current.remove()
                activeOverlayRef.current = null
            }

            const names = parseTargetNames()

            try {
                // 1. Fetch the target page elements
                const response = await fetch(destinationUrl)
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} loading ${destinationUrl}`)
                }
                const htmlText = await response.text()
                const parser = new DOMParser()
                const targetDoc = parser.parseFromString(htmlText, "text/html")

                // 2. Setup safe offscreen container to calculate exact layout bounding boxes
                const measurementContainer = document.createElement("div")
                measurementContainer.id = "framer-morph-measurement-viewport"
                Object.assign(measurementContainer.style, {
                    position: "fixed",
                    top: "0",
                    left: "0",
                    width: "100vw",
                    height: "100vh",
                    visibility: "hidden",
                    pointerEvents: "none",
                    overflow: "hidden",
                    zIndex: "-99999",
                })

                // Use target page layout nodes for measurement
                const targetBody = targetDoc.body
                measurementContainer.innerHTML = targetBody.innerHTML
                document.body.appendChild(measurementContainer)

                // 3. Collect bounding coordinates of targets on current page and destination page
                const morphTargets: Array<{
                    name: string
                    homeEl: HTMLElement
                    destEl: HTMLElement
                    srcRect: DOMRect
                    destRect: DOMRect
                }> = []

                names.forEach((name) => {
                    const homeEl = resolveElementByName(document, name)
                    const destEl = resolveElementByName(measurementContainer, name)
                    if (homeEl && destEl) {
                        morphTargets.push({
                            name,
                            homeEl,
                            destEl,
                            srcRect: homeEl.getBoundingClientRect(),
                            destRect: destEl.getBoundingClientRect(),
                        })
                    }
                })

                // Clean up offscreen measurement DOM once sizes are recorded
                measurementContainer.remove()

                if (morphTargets.length === 0) {
                    // No matching morph targets, fallback safely
                    console.warn("[FramerNameRouteMorph] No matching morph targets found, transitioning directly.")
                    window.location.href = destinationUrl
                    return
                }

                // 4. Create premium absolute client-side overlay layer
                const overlay = document.createElement("div")
                overlay.id = "framer-route-morph-overlay"
                Object.assign(overlay.style, {
                    position: "fixed",
                    top: "0",
                    left: "0",
                    width: "100vw",
                    height: "100vh",
                    zIndex: "99999",
                    pointerEvents: "auto",
                    backgroundColor: "#ffffff",
                    overflowX: "hidden",
                    overflowY: "auto",
                })
                document.body.appendChild(overlay)
                activeOverlayRef.current = overlay

                // Intercept clicks inside the transition overlay to allow standard navigation
                overlay.addEventListener("click", (e) => {
                    const anchor = (e.target as HTMLElement).closest("a")
                    if (anchor) {
                        const href = anchor.getAttribute("href")
                        if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
                            e.preventDefault()
                            // Smoothly close active overlay and navigate
                            overlay.style.transition = "opacity 0.4s ease-out"
                            overlay.style.opacity = "0"
                            setTimeout(() => {
                                window.location.href = anchor.href
                            }, 400)
                        }
                    }
                })

                // 5. Change the URL address dynamically without page reload
                window.history.pushState({ path: destinationUrl }, "", destinationUrl)
                document.title = targetDoc.title

                // 6. Generate precise element morph clones over home page
                const animationPromises: Array<Promise<void>> = []
                const originalStylesMap = new Map<HTMLElement, string>()

                morphTargets.forEach(({ homeEl, srcRect, destRect }) => {
                    // Hide original element securely
                    originalStylesMap.set(homeEl, homeEl.style.opacity)
                    homeEl.style.opacity = "0"

                    // Clone matching layout node
                    const clone = homeEl.cloneNode(true) as HTMLElement
                    const homeStyle = window.getComputedStyle(homeEl)

                    Object.assign(clone.style, {
                        position: "fixed",
                        top: `${srcRect.top}px`,
                        left: `${srcRect.left}px`,
                        width: `${srcRect.width}px`,
                        height: `${srcRect.height}px`,
                        margin: "0",
                        padding: homeStyle.padding,
                        boxSizing: "border-box",
                        zIndex: "100000",
                        pointerEvents: "none",
                        transition: "none",
                    })
                    overlay.appendChild(clone)

                    // Execute hardware-accelerated WAAPI spring morph
                    const waapi = clone.animate(
                        [
                            {
                                top: `${srcRect.top}px`,
                                left: `${srcRect.left}px`,
                                width: `${srcRect.width}px`,
                                height: `${srcRect.height}px`,
                                borderRadius: homeStyle.borderRadius,
                            },
                            {
                                top: `${destRect.top}px`,
                                left: `${destRect.left}px`,
                                width: `${destRect.width}px`,
                                height: `${destRect.height}px`,
                                borderRadius: window.getComputedStyle(clone).borderRadius,
                            },
                        ],
                        {
                            duration: 650,
                            easing: "cubic-bezier(0.16, 1, 0.3, 1)", // Premium snappy Ease Out
                            fill: "forwards",
                        }
                    )

                    animationPromises.push(
                        new Promise((resolve) => {
                            waapi.onfinish = () => resolve()
                        })
                    )
                })

                // 7. Inject destination page elements (everything except the morph targets)
                const contentOverlay = document.createElement("div")
                Object.assign(contentOverlay.style, {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    opacity: "0",
                    transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                    pointerEvents: "auto",
                })

                // Clone target body layout nodes safely
                Array.from(targetBody.children).forEach((child) => {
                    if (child.id !== "framer-route-morph-overlay" && child.id !== "framer-morph-measurement-viewport") {
                        const contentClone = child.cloneNode(true) as HTMLElement
                        contentOverlay.appendChild(contentClone)
                    }
                })

                overlay.appendChild(contentOverlay)

                // Hide the destination morph targets inside contentOverlay so they don't overlap with active clones
                names.forEach((name) => {
                    const overlayTarget = resolveElementByName(contentOverlay, name)
                    if (overlayTarget) {
                        overlayTarget.style.opacity = "0"
                    }
                })

                // Fade in target elements smoothly once morph is running
                requestAnimationFrame(() => {
                    contentOverlay.style.opacity = "1"
                })

                // Keep home page elements hidden during full active overlay lifecycle
                await Promise.all(animationPromises)

            } catch (error) {
                console.warn("[FramerNameRouteMorph] Client-side morph fallback:", error)
                window.location.href = destinationUrl
            } finally {
                isNavigating.current = false
            }
        },
        [parseTargetNames, resolveElementByName, cleanUrlPath]
    )

    useEffect(() => {
        if (!isClient) return
        if (RenderTarget.current() === RenderTarget.canvas) return

        const handleAnchorClick = (e: MouseEvent) => {
            const anchor = (e.target as HTMLElement).closest("a")
            if (!anchor) return

            const href = anchor.getAttribute("href")
            if (
                !href ||
                href.startsWith("#") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:") ||
                href.startsWith("javascript:")
            ) {
                return
            }

            if (anchor.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
                return
            }

            const targetUrl = new URL(anchor.href, window.location.origin)
            if (targetUrl.origin !== window.location.origin) return
            if (targetUrl.pathname === window.location.pathname) return

            e.preventDefault()
            performRouteTransition(targetUrl.pathname + targetUrl.search)
        }

        const handlePopState = () => {
            // If popstate returns to original pathname, clean up any active overlays smoothly
            if (window.location.pathname === "/" || window.location.pathname === "") {
                if (activeOverlayRef.current) {
                    activeOverlayRef.current.style.transition = "opacity 0.4s ease-out"
                    activeOverlayRef.current.style.opacity = "0"
                    const currentOverlay = activeOverlayRef.current
                    setTimeout(() => {
                        currentOverlay.remove()
                    }, 400)
                    activeOverlayRef.current = null
                }
            } else {
                performRouteTransition(window.location.pathname + window.location.search)
            }
        }

        document.addEventListener("click", handleAnchorClick, { capture: true })
        window.addEventListener("popstate", handlePopState)

        return () => {
            document.removeEventListener("click", handleAnchorClick, { capture: true })
            window.removeEventListener("popstate", handlePopState)
            if (activeOverlayRef.current) {
                activeOverlayRef.current.remove()
            }
        }
    }, [isClient, performRouteTransition])

    if (!isClient) {
        return <div style={{ display: "none", width: "100%", height: "auto", ...style }} />
    }

    const isOnCanvas = RenderTarget.current() === RenderTarget.canvas

    return (
        <div
            ref={containerRef}
            style={{
                display: isOnCanvas ? "flex" : "none",
                flexDirection: "column",
                gap: 6,
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(120, 80, 255, 0.08)",
                border: "1px dashed rgba(120, 80, 255, 0.4)",
                color: "#7850ff",
                fontSize: 12,
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 500,
                userSelect: "none",
                boxSizing: "border-box",
                width: "100%",
                height: "auto",
                ...style,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>✦</span>
                    <span style={{ fontWeight: 600 }}>Pure Client Morph</span>
                    <span style={{ opacity: 0.7, fontSize: 11 }}>[{targetNames}]</span>
                </div>
                <span
                    style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "rgba(120, 80, 255, 0.15)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontWeight: 600,
                    }}
                >
                    Overlay Mode
                </span>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: "rgba(120, 80, 255, 0.9)",
                    paddingTop: 4,
                    borderTop: "1px solid rgba(120, 80, 255, 0.15)",
                }}
            >
                <span>
                    <strong>{siteScan.totalCount}</strong> element{siteScan.totalCount === 1 ? "" : "s"} found
                </span>
                <span>•</span>
                <span>
                    across <strong>{siteScan.pageCount}</strong> route{siteScan.pageCount === 1 ? "" : "s"}
                </span>
            </div>
        </div>
    )
}

addPropertyControls(FramerNameRouteMorph, {
    targetNames: {
        type: ControlType.String,
        title: "Target Names",
        defaultValue: "0",
        description: "Comma-separated list of data-framer-name layer values to target & morph across pages",
    },
})
