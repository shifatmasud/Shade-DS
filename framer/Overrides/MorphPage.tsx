import {
    forwardRef,
    type ComponentType,
    type MutableRefObject,
    useCallback,
    useEffect,
    useRef,
} from "react"
import { isStaticRenderer } from "framer"
import { animate } from "framer-motion"

const STORAGE_KEY = "ait"
const MAX_SNAPSHOT_AGE_MS = 15000
const READINESS_TIMEOUT_MS = 1400
const FALLBACK_CLEANUP_MS = 1400

type Snapshot = {
    src: string
    x: number // Document-relative x
    y: number // Document-relative y
    width: number
    height: number
    fit: string
    radius: string
    ts: number
}

type VisualCandidate = {
    src: string
    rect: DOMRect
    fit: string
    radius: string
    imageEl: HTMLImageElement | null
}

function parseBackgroundImage(bg: string): string {
    const match = bg.match(/url\((['"]?)(.*?)\1\)/i)
    return match?.[2] ?? ""
}

function normalizeUrl(url: string): string {
    try {
        if (typeof window !== "undefined") {
            return new URL(url, window.location.href).href
        }
        return url
    } catch (_error) {
        return url
    }
}

// Strip Framer's responsive image parameters or general query parameters
function getBaseImageUrl(url: string): string {
    if (!url) return ""
    try {
        const u = new URL(
            url,
            typeof window !== "undefined" ? window.location.href : undefined
        )
        return u.origin + u.pathname
    } catch (_error) {
        return url.split("?")[0]
    }
}

function isReducedMotion(): boolean {
    if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
    )
        return false
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    } catch (_error) {
        return false
    }
}

function isModifiedOrNonPrimaryClick(event: any): boolean {
    if (!event) return true
    if (event.defaultPrevented) return true
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return true
    const button = typeof event.button === "number" ? event.button : 0
    if (button !== 0) return true
    return false
}

// Find the root-most container for page transitions (usually #root or body)
function getPageTransitionTarget(el: HTMLElement | null): HTMLElement | null {
    if (typeof document === "undefined") return el
    return document.getElementById("root") || document.body || el
}

function readSnapshot(key: string = STORAGE_KEY): Snapshot | null {
    if (typeof window === "undefined") return null
    try {
        const raw = window.sessionStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Snapshot
        if (!parsed) return null
        if (
            typeof parsed.src !== "string" ||
            typeof parsed.x !== "number" ||
            typeof parsed.y !== "number" ||
            typeof parsed.width !== "number" ||
            typeof parsed.height !== "number" ||
            typeof parsed.ts !== "number"
        ) {
            return null
        }
        return {
            src: normalizeUrl(parsed.src),
            x: parsed.x,
            y: parsed.y,
            width: parsed.width,
            height: parsed.height,
            fit: typeof parsed.fit === "string" ? parsed.fit : "cover",
            radius: typeof parsed.radius === "string" ? parsed.radius : "0px",
            ts: parsed.ts,
        }
    } catch (_error) {
        return null
    }
}

function clearSnapshot(key: string = STORAGE_KEY): void {
    if (typeof window === "undefined") return
    try {
        window.sessionStorage.removeItem(key)
    } catch (_error) {}
}

function getRectArea(rect: DOMRect): number {
    return Math.max(0, rect.width) * Math.max(0, rect.height)
}

function getVisualCandidateFromElement(
    el: HTMLElement
): VisualCandidate | null {
    const style = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    const bgSrc = parseBackgroundImage(style.backgroundImage)
    if (bgSrc) {
        return {
            src: normalizeUrl(bgSrc),
            rect,
            fit:
                style.backgroundSize && style.backgroundSize !== "auto"
                    ? style.backgroundSize
                    : "cover",
            radius: style.borderRadius || "0px",
            imageEl: null,
        }
    }
    if (el instanceof HTMLImageElement) {
        const src = normalizeUrl(el.currentSrc || el.src || "")
        if (!src) return null
        return {
            src,
            rect,
            fit: style.objectFit || "cover",
            radius: style.borderRadius || "0px",
            imageEl: el,
        }
    }
    return null
}

function findBestVisualCandidate(
    root: HTMLElement | null,
    eventTarget?: EventTarget | null,
    matchingSrc?: string
): VisualCandidate | null {
    if (typeof window === "undefined" || !root) return null
    const rootRect = root.getBoundingClientRect()
    if (rootRect.width <= 0 || rootRect.height <= 0) return null

    const candidates: VisualCandidate[] = []

    const targetElement =
        eventTarget instanceof HTMLElement ? eventTarget : null
    let walker: HTMLElement | null = targetElement
    while (walker && root.contains(walker)) {
        const candidate = getVisualCandidateFromElement(walker)
        if (candidate) candidates.push(candidate)
        walker = walker.parentElement
    }

    const imgElements = Array.from(root.querySelectorAll("img"))
    for (const img of imgElements) {
        const candidate = getVisualCandidateFromElement(img)
        if (candidate) candidates.push(candidate)
    }

    const rootCandidate = getVisualCandidateFromElement(root)
    if (rootCandidate) candidates.push(rootCandidate)

    if (candidates.length === 0) return null

    // If we have a matching source URL, prioritize candidates matching the base URL
    if (matchingSrc) {
        const baseTarget = getBaseImageUrl(matchingSrc)
        const matched = candidates.filter(
            (c) => getBaseImageUrl(c.src) === baseTarget
        )
        if (matched.length > 0) {
            matched.sort((a, b) => getRectArea(b.rect) - getRectArea(a.rect))
            return matched[0]
        }
    }

    candidates.sort((a, b) => getRectArea(b.rect) - getRectArea(a.rect))
    return candidates[0]
}

export function CaptureArticleImageTransition(
    Component: ComponentType<any>
): ComponentType {
    const Wrapper = forwardRef(function CaptureArticleImageTransitionOverride(
        props: any,
        ref
    ) {
        const elementRef = useRef<HTMLElement | null>(null)
        const lastCaptureSignatureRef = useRef<string>("")

        const setRefs = useCallback(
            (node: HTMLElement | null) => {
                elementRef.current = node
                if (typeof ref === "function") {
                    ref(node)
                } else if (ref && typeof ref === "object") {
                    ;(ref as MutableRefObject<HTMLElement | null>).current =
                        node
                }
            },
            [ref]
        )

        const tryCaptureSnapshot = useCallback((event: any) => {
            const currentLayoutId = props.layoutId || STORAGE_KEY
            if (isStaticRenderer()) return
            if (typeof window === "undefined") return
            if (isModifiedOrNonPrimaryClick(event)) return

            const container = event.currentTarget as HTMLElement | null
            const candidate = findBestVisualCandidate(container, event.target)
            if (!candidate || !candidate.src) return
            const rect = candidate.rect
            if (rect.width <= 0 || rect.height <= 0) return

            const eventTime =
                typeof event.timeStamp === "number"
                    ? Math.round(event.timeStamp)
                    : Date.now()
            const signature = `${eventTime}:${candidate.src}:${Math.round(rect.left)}:${Math.round(rect.top)}`
            if (signature === lastCaptureSignatureRef.current) return
            lastCaptureSignatureRef.current = signature

            // Capture document-relative coordinates to protect against scroll offsets
            const snapshot: Snapshot = {
                src: candidate.src,
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height,
                fit: candidate.fit || "cover",
                radius: candidate.radius || "0px",
                ts: Date.now(),
            }

            try {
                window.sessionStorage.setItem(
                    currentLayoutId,
                    JSON.stringify(snapshot)
                )

                // Exit animation for the whole page
                const pageTarget = getPageTransitionTarget(elementRef.current)
                if (pageTarget) {
                    animate(
                        pageTarget,
                        {
                            filter: "blur(20px)",
                            opacity: 0,
                            y: -10,
                            scale: 0.98,
                        },
                        {
                            duration: 0.4,
                            ease: [0.4, 0, 1, 1],
                        }
                    )
                }
            } catch (_error) {}
        }, [])

        const handlePointerDownCapture = useCallback(
            (event: any) => {
                props.onPointerDownCapture?.(event)
                if (event.defaultPrevented) return
                tryCaptureSnapshot(event)
            },
            [props, tryCaptureSnapshot]
        )

        const handleClickCapture = useCallback(
            (event: any) => {
                props.onClickCapture?.(event)
                if (event.defaultPrevented) return
                tryCaptureSnapshot(event)
            },
            [props, tryCaptureSnapshot]
        )

        return (
            <Component
                ref={setRefs}
                {...props}
                onPointerDownCapture={handlePointerDownCapture}
                onClickCapture={handleClickCapture}
            />
        )
    })
    Wrapper.displayName = "CaptureArticleImageTransition"
    return Wrapper
}

export function PlayArticleImageTransition(
    Component: ComponentType<any>
): ComponentType {
    const Wrapper = forwardRef(function PlayArticleImageTransitionOverride(
        props: any,
        ref
    ) {
        const elementRef = useRef<HTMLElement | null>(null)
        const hasPlayedRef = useRef(false)
        const lastPlayedUrlRef = useRef<string>("")
        const activeAnimationsRef = useRef<any[]>([])

        const setRefs = useCallback(
            (node: HTMLElement | null) => {
                elementRef.current = node
                if (typeof ref === "function") {
                    ref(node)
                } else if (ref && typeof ref === "object") {
                    ;(ref as MutableRefObject<HTMLElement | null>).current =
                        node
                }
            },
            [ref]
        )

        const currentUrl =
            typeof window !== "undefined" ? window.location.href : ""

        useEffect(() => {
            if (
                typeof window === "undefined" ||
                typeof document === "undefined"
            )
                return

            // Reset played state if URL has changed to handle single-page dynamic app routing
            if (window.location.href !== lastPlayedUrlRef.current) {
                hasPlayedRef.current = false
                lastPlayedUrlRef.current = window.location.href
            }

            const currentLayoutId = props.layoutId || STORAGE_KEY
            const snapshot = readSnapshot(currentLayoutId)
            if (!snapshot) return
            if (hasPlayedRef.current || isStaticRenderer()) return
            if (isReducedMotion()) return
            if (
                typeof Element === "undefined" ||
                typeof Element.prototype.animate !== "function"
            )
                return

            const age = Date.now() - snapshot.ts
            if (age < 0 || age > MAX_SNAPSHOT_AGE_MS) {
                clearSnapshot()
                return
            }

            let cancelled = false
            let rafId = 0
            let timeoutId = 0
            let stableFrames = 0
            let lastRectKey = ""

            const startAt = Date.now()

            const startAnimation = (target: VisualCandidate) => {
                if (cancelled) return
                if (hasPlayedRef.current) return

                const destinationRadius = target.radius || "0px"
                const destinationElement = target.imageEl ?? elementRef.current
                if (!destinationElement) return

                // Get absolute target coordinates relative to the page document
                const destRect = target.rect
                const destPageX = destRect.left + window.scrollX
                const destPageY = destRect.top + window.scrollY

                const overlay = document.createElement("img")
                overlay.src = snapshot.src
                overlay.alt = ""
                overlay.setAttribute("aria-hidden", "true")

                // Using position: absolute locked to document scroll context to eliminate scroll jitter
                overlay.style.position = "absolute"
                overlay.style.left = `${snapshot.x}px`
                overlay.style.top = `${snapshot.y}px`
                overlay.style.width = `${snapshot.width}px`
                overlay.style.height = `${snapshot.height}px`
                overlay.style.objectFit = snapshot.fit || "cover"
                overlay.style.borderRadius = snapshot.radius || "0px"
                overlay.style.transformOrigin = "top left"
                overlay.style.transform =
                    "translate3d(0px, 0px, 0px) scale(1, 1)"
                overlay.style.opacity = "1"
                overlay.style.pointerEvents = "none"
                overlay.style.zIndex = "2147483647"
                overlay.style.willChange = "transform, opacity, border-radius"

                document.body.appendChild(overlay)

                const previousOpacity = destinationElement.style.opacity
                destinationElement.style.opacity = "0"

                const pageTarget = getPageTransitionTarget(elementRef.current)
                const previousPageOpacity = pageTarget
                    ? pageTarget.style.opacity
                    : ""
                const previousPageFilter = pageTarget
                    ? pageTarget.style.filter
                    : ""
                const previousPageTransform = pageTarget
                    ? pageTarget.style.transform
                    : ""

                let cleaned = false
                const cleanup = () => {
                    if (cleaned) return
                    cleaned = true
                    destinationElement.style.opacity = previousOpacity
                    if (pageTarget) {
                        pageTarget.style.opacity = previousPageOpacity
                        pageTarget.style.filter = previousPageFilter
                        pageTarget.style.transform = previousPageTransform
                    }
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay)
                    }
                }

                // Initial state for page transition to avoid flash
                if (pageTarget) {
                    pageTarget.style.opacity = "0"
                    pageTarget.style.filter = "blur(20px)"
                }

                // Compute exact deltas and scales in document coordinates
                const deltaX = destPageX - snapshot.x
                const deltaY = destPageY - snapshot.y
                const scaleX = destRect.width / snapshot.width
                const scaleY = destRect.height / snapshot.height

                try {
                    // Shared image morph animation using Framer Motion
                    const animation = animate(
                        overlay,
                        {
                            x: deltaX,
                            y: deltaY,
                            scaleX: scaleX,
                            scaleY: scaleY,
                            borderRadius: destinationRadius,
                        },
                        {
                            duration: 0.5,
                            ease: [0.22, 1, 0.36, 1],
                        }
                    )

                    // Page entrance animation using Framer Motion
                    const pageAnimation = pageTarget
                        ? animate(
                              pageTarget,
                              {
                                  opacity: 1,
                                  filter: "blur(0px)",
                                  y: 0,
                                  scale: 1,
                              },
                              {
                                  duration: 0.8,
                                  delay: 0.05,
                                  ease: [0.22, 1, 0.36, 1],
                              }
                          )
                        : null

                    // Destination image fade-in
                    const destAnimation =
                        destinationElement !== elementRef.current
                            ? animate(
                                  destinationElement,
                                  { opacity: 1 },
                                  {
                                      duration: 0.3,
                                      delay: 0.3,
                                      ease: "easeOut",
                                  }
                              )
                            : null

                    activeAnimationsRef.current.push(animation)
                    if (pageAnimation)
                        activeAnimationsRef.current.push(pageAnimation)
                    if (destAnimation)
                        activeAnimationsRef.current.push(destAnimation)

                    const finish = () => {
                        cleanup()
                        clearSnapshot(currentLayoutId)
                    }

                    animation.then(finish).catch(finish)
                    window.setTimeout(finish, FALLBACK_CLEANUP_MS)
                    hasPlayedRef.current = true
                } catch (_error) {
                    cleanup()
                }
            }

            const checkReady = () => {
                if (cancelled) return
                const elapsed = Date.now() - startAt
                const liveSnapshot = readSnapshot(currentLayoutId)
                if (!liveSnapshot) return
                if (Date.now() - liveSnapshot.ts > MAX_SNAPSHOT_AGE_MS) {
                    clearSnapshot(currentLayoutId)
                    return
                }
                if (elapsed > READINESS_TIMEOUT_MS) return

                // Retrieve the matching target image based on the snapshot's source URL (fuzzy base match)
                const target = findBestVisualCandidate(
                    elementRef.current,
                    null,
                    liveSnapshot.src
                )
                if (
                    !target ||
                    target.rect.width <= 0 ||
                    target.rect.height <= 0
                ) {
                    rafId = window.requestAnimationFrame(checkReady)
                    return
                }

                const targetSrc = normalizeUrl(target.src || "")
                if (!targetSrc) {
                    rafId = window.requestAnimationFrame(checkReady)
                    return
                }

                // Verify base image match to resolve responsive CMS image sizes
                if (
                    getBaseImageUrl(targetSrc) !==
                    getBaseImageUrl(liveSnapshot.src)
                ) {
                    clearSnapshot()
                    return
                }

                // Use document-relative coordinates for layout stability checks to make it scroll-agnostic
                const targetPageX = target.rect.left + window.scrollX
                const targetPageY = target.rect.top + window.scrollY
                const rectKey = `${Math.round(targetPageX)}:${Math.round(targetPageY)}:${Math.round(
                    target.rect.width
                )}:${Math.round(target.rect.height)}`

                stableFrames = rectKey === lastRectKey ? stableFrames + 1 : 1
                lastRectKey = rectKey
                if (stableFrames < 2) {
                    rafId = window.requestAnimationFrame(checkReady)
                    return
                }

                // Start transition immediately without waiting for image download or decode.
                // Since the source image is already cached, it will render instantly.
                startAnimation(target)
            }

            rafId = window.requestAnimationFrame(checkReady)
            timeoutId = window.setTimeout(() => {
                cancelled = true
                if (rafId) window.cancelAnimationFrame(rafId)
            }, READINESS_TIMEOUT_MS + 80)

            return () => {
                cancelled = true
                if (rafId) window.cancelAnimationFrame(rafId)
                if (timeoutId) window.clearTimeout(timeoutId)
                activeAnimationsRef.current.forEach((anim) => {
                    try {
                        anim.cancel()
                    } catch (_e) {}
                })
                activeAnimationsRef.current = []
            }
        }, [currentUrl, props])

        return <Component ref={setRefs} {...props} />
    })
    Wrapper.displayName = "PlayArticleImageTransition"
    return Wrapper
}
