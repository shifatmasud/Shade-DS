import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef } from "react"
import { animate, animateView } from "framer-motion"

const STORAGE_KEY = "ait"
const MAX_SNAPSHOT_AGE_MS = 6000
const READINESS_TIMEOUT_MS = 2000
const FALLBACK_CLEANUP_MS = 2400

type Snapshot = {
    transitionId: string
    direction?: "forward" | "backward"
    cardIndex?: number
    originCardIndex?: number
    originUrl?: string
    title?: string
    href?: string
    imageSrc?: string
    type?: "div"
    src?: string
    html?: string
    bg?: string
    backgroundImage?: string
    backgroundSize?: string
    backgroundPosition?: string
    color?: string
    boxShadow?: string
    border?: string
    borderColor?: string
    borderWidth?: string
    borderStyle?: string
    radius?: string
    overflow?: string
    padding?: string
    display?: string
    flexDirection?: string
    alignItems?: string
    justifyContent?: string
    gap?: string
    x: number // Document-relative x
    y: number // Document-relative y
    width: number
    height: number
    fit?: string
    ts: number
}

type VisualCandidate = {
    type: "div"
    src: string
    title?: string
    href?: string
    imageSrc?: string
    rect: DOMRect
    fit: string
    radius: string
    bg?: string
    backgroundImage?: string
    backgroundSize?: string
    backgroundPosition?: string
    color?: string
    boxShadow?: string
    border?: string
    borderColor?: string
    borderWidth?: string
    borderStyle?: string
    overflow?: string
    padding?: string
    display?: string
    flexDirection?: string
    alignItems?: string
    justifyContent?: string
    gap?: string
    html?: string
    imageEl: HTMLElement | null
}

type ElementStyleBackup = {
    element: HTMLElement
    opacity: string
    filter: string
    transform: string
}

type ActiveTransitionController = {
    id: string
    stop: () => void
    exitPromise?: Promise<void>
    startedAt: number
}

let activeGlobalTransition: ActiveTransitionController | null = null

function cancelGlobalTransition(): void {
    if (activeGlobalTransition) {
        try {
            activeGlobalTransition.stop()
        } catch (_e) {}
        activeGlobalTransition = null
    }
}

function generateTransitionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
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

function backupElementStyles(elements: HTMLElement[]): ElementStyleBackup[] {
    return elements.map((el) => ({
        element: el,
        opacity: el.style.opacity,
        filter: el.style.filter,
        transform: el.style.transform,
    }))
}

function restoreElementStyles(backups: ElementStyleBackup[]): void {
    backups.forEach(({ element, opacity, filter, transform }) => {
        try {
            if (element && element.style) {
                element.style.opacity = opacity
                element.style.filter = filter
                element.style.transform = transform
            }
        } catch (_e) {}
    })
}

/**
 * Identifies all non-shared surrounding content on the page, strictly excluding
 * the shared target element and its ancestors/descendants.
 */
function getSurroundingElements(
    targetElement: HTMLElement | null
): HTMLElement[] {
    if (typeof document === "undefined" || !targetElement) return []

    const root =
        document.getElementById("root") ||
        document.querySelector("main") ||
        document.querySelector("[data-framer-root]") ||
        document.getElementById("__next") ||
        document.body

    const surrounding: HTMLElement[] = []
    const visited = new Set<HTMLElement>()

    function collectNonShared(node: HTMLElement) {
        if (!node || visited.has(node)) return
        visited.add(node)

        // Ignore meta/script/style/link/exit clones/source layers
        if (
            node.tagName === "SCRIPT" ||
            node.tagName === "STYLE" ||
            node.tagName === "LINK" ||
            node.tagName === "NOSCRIPT" ||
            node.getAttribute("data-view-transition-source") === "true" ||
            node.getAttribute("data-view-transition-exit-clone") === "true" ||
            node.getAttribute("aria-hidden") === "true"
        ) {
            return
        }

        // Shared targets must NOT receive this generic fade/blur animation
        if (node === targetElement || targetElement.contains(node)) {
            return
        }

        // If this node contains targetElement, drill down into its children to isolate siblings
        if (node.contains(targetElement)) {
            Array.from(node.children).forEach((child) => {
                if (child instanceof HTMLElement) {
                    collectNonShared(child)
                }
            })
            return
        }

        if (isElementVisible(node)) {
            surrounding.push(node)
        }
    }

    Array.from(root.children).forEach((child) => {
        if (child instanceof HTMLElement) {
            collectNonShared(child)
        }
    })

    return surrounding
}

type ExitAnimationHandle = {
    cancel: () => void
    promise: Promise<void>
}

/**
 * Outgoing: Animates non-shared surrounding elements out with slow gentle opacity, blur, and translate.
 * Returns both a cancellation handle and a Promise that resolves when the exit animation completes.
 */
function animateSurroundingExit(
    surroundingElements: HTMLElement[],
    transitionOptions: any,
    onAnimationCreated?: (anim: any) => void
): ExitAnimationHandle {
    if (surroundingElements.length === 0) {
        return {
            cancel: () => {},
            promise: Promise.resolve(),
        }
    }

    const backups = backupElementStyles(surroundingElements)
    const duration =
        typeof transitionOptions?.duration === "number"
            ? transitionOptions.duration
            : 0.65

    const anim = animate(
        surroundingElements,
        {
            opacity: 0,
            filter: "blur(16px)",
            transform: "translateY(14px)",
        },
        transitionOptions || {
            duration,
            ease: [0.4, 0, 0.2, 1],
        }
    )

    if (onAnimationCreated) {
        onAnimationCreated(anim)
    }

    let isCompleted = false
    const promise = new Promise<void>((resolve) => {
        const onDone = () => {
            if (!isCompleted) {
                isCompleted = true
                resolve()
            }
        }

        if (anim && typeof (anim as any).then === "function") {
            ;(anim as any).then(onDone).catch(onDone)
        }

        // Bounded fallback timeout matching animation duration plus a tiny buffer
        const timeoutMs = Math.max(200, Math.round(duration * 1000) + 40)
        window.setTimeout(onDone, timeoutMs)
    })

    const cancel = () => {
        try {
            anim.stop()
        } catch (_e) {}
        // Do NOT resolve promise early on cancellation
        restoreElementStyles(backups)
    }

    return { cancel, promise }
}

/**
 * Incoming: Initializes non-shared surrounding elements at opacity 0, blur(16px), and translated position,
 * then animates them smoothly in to opacity 1, blur(0px), and original position.
 */
function animateSurroundingEnter(
    surroundingElements: HTMLElement[],
    transitionOptions: any,
    onAnimationCreated?: (anim: any) => void
): () => void {
    if (surroundingElements.length === 0) return () => {}

    const backups = backupElementStyles(surroundingElements)

    // Initialize surrounding elements at opacity: 0, blur(16px), translated position
    surroundingElements.forEach((el) => {
        el.style.opacity = "0"
        el.style.filter = "blur(16px)"
        el.style.transform = "translateY(14px)"
    })

    const duration =
        typeof transitionOptions?.duration === "number"
            ? transitionOptions.duration
            : 0.75

    const anim = animate(
        surroundingElements,
        {
            opacity: 1,
            filter: "blur(0px)",
            transform: "translateY(0px)",
        },
        transitionOptions || {
            duration,
            ease: [0.16, 1, 0.3, 1],
        }
    )

    if (onAnimationCreated) {
        onAnimationCreated(anim)
    }

    let finished = false
    const cleanup = () => {
        if (finished) return
        finished = true
        try {
            anim.stop()
        } catch (_e) {}
        restoreElementStyles(backups)
    }

    if (anim && typeof (anim as any).then === "function") {
        ;(anim as any).then(cleanup).catch(cleanup)
    }

    return cleanup
}

function extractElementTitle(el: HTMLElement): string {
    const heading = el.querySelector(
        "h1, h2, h3, h4, h5, h6, [data-framer-name*='Title'], [data-framer-name*='Heading']"
    )
    if (heading && heading.textContent) {
        return heading.textContent.trim()
    }
    const text = el.innerText || el.textContent || ""
    const lines = text
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
    return lines[0] || ""
}

function extractElementHref(el: HTMLElement): string {
    const link =
        (el.closest("a[href]") as HTMLAnchorElement | null) ||
        (el.querySelector("a[href]") as HTMLAnchorElement | null)
    if (link) {
        const href = link.getAttribute("href")
        if (href) return normalizeUrl(href)
    }
    return ""
}

function extractElementImageSrc(el: HTMLElement): string {
    const img = el.querySelector("img[src]") as HTMLImageElement | null
    if (img && img.src) return normalizeUrl(img.src)

    const style = window.getComputedStyle(el)
    if (style.backgroundImage && style.backgroundImage !== "none") {
        const match = style.backgroundImage.match(/url\((['"]?)(.*?)\1\)/i)
        if (match && match[2]) return normalizeUrl(match[2])
    }

    const childWithBg = el.querySelector(
        "[style*='background-image']"
    ) as HTMLElement | null
    if (childWithBg) {
        const childStyle = window.getComputedStyle(childWithBg)
        const match = childStyle.backgroundImage.match(/url\((['"]?)(.*?)\1\)/i)
        if (match && match[2]) return normalizeUrl(match[2])
    }

    return ""
}

function findSemanticMatch(
    visibleList: HTMLElement[],
    snapshot: Snapshot
): HTMLElement | null {
    if (visibleList.length === 0) return null

    // Priority 1: Href matching
    if (snapshot.href) {
        const cleanSnapHref = snapshot.href.split("?")[0].split("#")[0]
        for (const el of visibleList) {
            const elHref = extractElementHref(el)
            if (elHref) {
                const cleanElHref = elHref.split("?")[0].split("#")[0]
                if (cleanElHref === cleanSnapHref) {
                    return el
                }
            }
        }
    }

    // Priority 2: Origin URL matching against card's href
    if (snapshot.originUrl) {
        const cleanOriginUrl = snapshot.originUrl.split("?")[0].split("#")[0]
        for (const el of visibleList) {
            const elHref = extractElementHref(el)
            if (elHref) {
                const cleanElHref = elHref.split("?")[0].split("#")[0]
                if (cleanElHref === cleanOriginUrl) {
                    return el
                }
            }
        }
    }

    // Priority 3: Image source matching
    if (snapshot.imageSrc) {
        for (const el of visibleList) {
            const elImg = extractElementImageSrc(el)
            if (elImg && elImg === snapshot.imageSrc) {
                return el
            }
        }
    }

    // Priority 4: Title / Heading text fingerprinting
    if (snapshot.title && snapshot.title.length > 2) {
        const normSnapTitle = snapshot.title.toLowerCase().trim()
        for (const el of visibleList) {
            const elTitle = extractElementTitle(el).toLowerCase().trim()
            if (
                elTitle &&
                (elTitle === normSnapTitle ||
                    elTitle.includes(normSnapTitle) ||
                    normSnapTitle.includes(elTitle))
            ) {
                return el
            }
        }
    }

    return null
}

function readSnapshot(key: string = STORAGE_KEY): Snapshot | null {
    if (typeof window === "undefined") return null
    try {
        const raw = window.sessionStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Snapshot
        if (!parsed) return null
        if (
            typeof parsed.x !== "number" ||
            typeof parsed.y !== "number" ||
            typeof parsed.width !== "number" ||
            typeof parsed.height !== "number" ||
            typeof parsed.ts !== "number"
        ) {
            return null
        }
        return {
            transitionId:
                typeof parsed.transitionId === "string"
                    ? parsed.transitionId
                    : "",
            direction: parsed.direction === "backward" ? "backward" : "forward",
            cardIndex:
                typeof parsed.cardIndex === "number" ? parsed.cardIndex : 0,
            originCardIndex:
                typeof parsed.originCardIndex === "number"
                    ? parsed.originCardIndex
                    : typeof parsed.cardIndex === "number"
                      ? parsed.cardIndex
                      : 0,
            originUrl:
                typeof parsed.originUrl === "string" ? parsed.originUrl : "",
            title: typeof parsed.title === "string" ? parsed.title : "",
            href: typeof parsed.href === "string" ? parsed.href : "",
            imageSrc:
                typeof parsed.imageSrc === "string" ? parsed.imageSrc : "",
            type: "div",
            src: parsed.src ? normalizeUrl(parsed.src) : "",
            html: typeof parsed.html === "string" ? parsed.html : "",
            bg: typeof parsed.bg === "string" ? parsed.bg : "",
            backgroundImage:
                typeof parsed.backgroundImage === "string"
                    ? parsed.backgroundImage
                    : "",
            backgroundSize:
                typeof parsed.backgroundSize === "string"
                    ? parsed.backgroundSize
                    : "",
            backgroundPosition:
                typeof parsed.backgroundPosition === "string"
                    ? parsed.backgroundPosition
                    : "",
            color: typeof parsed.color === "string" ? parsed.color : "",
            boxShadow:
                typeof parsed.boxShadow === "string" ? parsed.boxShadow : "",
            border: typeof parsed.border === "string" ? parsed.border : "",
            borderColor:
                typeof parsed.borderColor === "string"
                    ? parsed.borderColor
                    : "",
            borderWidth:
                typeof parsed.borderWidth === "string"
                    ? parsed.borderWidth
                    : "",
            borderStyle:
                typeof parsed.borderStyle === "string"
                    ? parsed.borderStyle
                    : "",
            overflow:
                typeof parsed.overflow === "string" ? parsed.overflow : "",
            padding: typeof parsed.padding === "string" ? parsed.padding : "",
            display: typeof parsed.display === "string" ? parsed.display : "",
            flexDirection:
                typeof parsed.flexDirection === "string"
                    ? parsed.flexDirection
                    : "",
            alignItems:
                typeof parsed.alignItems === "string" ? parsed.alignItems : "",
            justifyContent:
                typeof parsed.justifyContent === "string"
                    ? parsed.justifyContent
                    : "",
            gap: typeof parsed.gap === "string" ? parsed.gap : "",
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

function getVisualCandidateFromElement(
    el: HTMLElement
): VisualCandidate | null {
    if (!el || typeof window === "undefined") return null
    const style = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null

    return {
        type: "div",
        src: "",
        title: extractElementTitle(el),
        href: extractElementHref(el),
        imageSrc: extractElementImageSrc(el),
        rect,
        fit:
            style.backgroundSize && style.backgroundSize !== "auto"
                ? style.backgroundSize
                : "cover",
        radius: style.borderRadius || "0px",
        bg: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        color: style.color,
        boxShadow: style.boxShadow,
        border: style.border,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
        overflow: style.overflow,
        padding: style.padding,
        display: style.display,
        flexDirection: style.flexDirection,
        alignItems: style.alignItems,
        justifyContent: style.justifyContent,
        gap: style.gap,
        html: el.innerHTML,
        imageEl: el,
    }
}

function isElementVisible(el: HTMLElement | null): boolean {
    if (!el || typeof window === "undefined") return false
    const rect = el.getBoundingClientRect()
    if (rect.width <= 1 || rect.height <= 1) return false
    try {
        const style = window.getComputedStyle(el)
        if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.visibility === "collapse" ||
            style.opacity === "0"
        ) {
            return false
        }
    } catch (_e) {
        return false
    }
    return true
}

function resolveBestTargetElement(
    elements: HTMLElement[],
    snapshot: Snapshot
): HTMLElement | null {
    const visible = elements.filter(isElementVisible)
    if (visible.length === 0) return null
    if (visible.length === 1) return visible[0]

    const semanticMatch = findSemanticMatch(visible, snapshot)
    if (semanticMatch) {
        return semanticMatch
    }

    if (snapshot.direction === "forward") {
        return visible.slice().sort((a, b) => {
            const rectA = a.getBoundingClientRect()
            const rectB = b.getBoundingClientRect()
            const docTopA = rectA.top + window.scrollY
            const docTopB = rectB.top + window.scrollY
            if (Math.abs(docTopA - docTopB) > 5) {
                return docTopA - docTopB
            }
            const areaA = rectA.width * rectA.height
            const areaB = rectB.width * rectB.height
            return areaB - areaA
        })[0]
    } else {
        const index =
            typeof snapshot.cardIndex === "number"
                ? snapshot.cardIndex
                : typeof snapshot.originCardIndex === "number"
                  ? snapshot.originCardIndex
                  : 0
        if (index >= 0 && index < visible.length) {
            return visible[index]
        }
        return visible[0]
    }
}

function findBestVisualCandidate(
    root: HTMLElement | null,
    _eventTarget?: EventTarget | null
): VisualCandidate | null {
    if (typeof window === "undefined" || !root) return null
    const rootRect = root.getBoundingClientRect()
    if (rootRect.width <= 0 || rootRect.height <= 0) return null

    return getVisualCandidateFromElement(root)
}

function captureCandidateSnapshot(
    candidate: VisualCandidate,
    direction: "forward" | "backward",
    storageKey: string,
    cardIndex: number = 0,
    transition?: any,
    hrefOverride?: string
): { success: boolean; promise: Promise<void> } {
    const rect = candidate.rect
    if (rect.width <= 0 || rect.height <= 0) {
        return { success: false, promise: Promise.resolve() }
    }

    // If an outgoing exit animation is ALREADY in flight (e.g. from pointerdown preceding click within 1200ms),
    // reuse its existing exitPromise to avoid cancelling/restarting mid-animation.
    if (
        activeGlobalTransition?.exitPromise &&
        Date.now() - (activeGlobalTransition.startedAt || 0) < 1200
    ) {
        return { success: true, promise: activeGlobalTransition.exitPromise }
    }

    // Safely stop any previous stale transition before starting a new outgoing capture
    cancelGlobalTransition()

    const existingSnap = readSnapshot(storageKey)
    const originCardIndex =
        direction === "backward"
            ? (existingSnap?.originCardIndex ??
              existingSnap?.cardIndex ??
              cardIndex)
            : cardIndex

    const transitionId = generateTransitionId()

    const snapshot: Snapshot = {
        transitionId,
        direction,
        cardIndex,
        originCardIndex,
        originUrl: typeof window !== "undefined" ? window.location.href : "",
        title:
            candidate.title ||
            (candidate.imageEl ? extractElementTitle(candidate.imageEl) : ""),
        href:
            hrefOverride ||
            candidate.href ||
            (candidate.imageEl ? extractElementHref(candidate.imageEl) : ""),
        imageSrc:
            candidate.imageSrc ||
            (candidate.imageEl
                ? extractElementImageSrc(candidate.imageEl)
                : ""),
        type: "div",
        src: candidate.src || "",
        html: candidate.html || "",
        bg: candidate.bg || "",
        backgroundImage: candidate.backgroundImage || "",
        backgroundSize: candidate.backgroundSize || "",
        backgroundPosition: candidate.backgroundPosition || "",
        color: candidate.color || "",
        boxShadow: candidate.boxShadow || "",
        border: candidate.border || "",
        borderColor: candidate.borderColor || "",
        borderWidth: candidate.borderWidth || "",
        borderStyle: candidate.borderStyle || "",
        overflow: candidate.overflow || "",
        padding: candidate.padding || "",
        display: candidate.display || "",
        flexDirection: candidate.flexDirection || "",
        alignItems: candidate.alignItems || "",
        justifyContent: candidate.justifyContent || "",
        gap: candidate.gap || "",
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
        fit: candidate.fit || "cover",
        radius: candidate.radius || "0px",
        ts: Date.now(),
    }

    try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot))

        // Outgoing transition orchestration: animate non-shared content out
        // Shared target element is strictly excluded from the generic exit fade/blur/translate
        const surroundingElements = getSurroundingElements(candidate.imageEl)
        const activeAnimations: any[] = []

        const exitHandle = animateSurroundingExit(
            surroundingElements,
            transition,
            (anim) => activeAnimations.push(anim)
        )

        activeGlobalTransition = {
            id: transitionId,
            startedAt: Date.now(),
            stop: () => {
                exitHandle.cancel()
                activeAnimations.forEach((anim) => {
                    try {
                        anim.stop()
                    } catch (_e) {}
                })
            },
            exitPromise: exitHandle.promise,
        }

        return { success: true, promise: exitHandle.promise }
    } catch (_error) {
        return { success: false, promise: Promise.resolve() }
    }
}

/**
 * Executes incoming transition orchestration:
 * 1. Connects source -> destination shared targets via animateView
 * 2. Initializes non-shared content at opacity: 0, blur, translated position
 * 3. Animates non-shared content in to opacity: 1, blur(0), original position
 * 4. Cleans up sessionStorage record and restores styles on completion/timeout
 */
function executeMorphWithAnimateView(
    target: VisualCandidate,
    snapshot: Snapshot,
    currentSnapshotId: string,
    transition: any,
    activeAnimations: any[],
    onFinished?: () => void
): void {
    const destinationElement = target.imageEl
    if (!destinationElement) return

    // Safely stop any previous transition
    cancelGlobalTransition()

    // 1. Create the source element with origin snapshot geometry and styles
    const fromElement = document.createElement("div")
    fromElement.setAttribute("data-view-transition-source", "true")
    fromElement.setAttribute("aria-hidden", "true")
    fromElement.innerHTML = snapshot.html || ""

    if (
        snapshot.bg &&
        snapshot.bg !== "rgba(0, 0, 0, 0)" &&
        snapshot.bg !== "transparent"
    ) {
        fromElement.style.backgroundColor = snapshot.bg
    }
    if (snapshot.backgroundImage && snapshot.backgroundImage !== "none") {
        fromElement.style.backgroundImage = snapshot.backgroundImage
        fromElement.style.backgroundSize = snapshot.backgroundSize || "cover"
        fromElement.style.backgroundPosition =
            snapshot.backgroundPosition || "center"
    }
    if (snapshot.color) fromElement.style.color = snapshot.color
    if (snapshot.boxShadow && snapshot.boxShadow !== "none") {
        fromElement.style.boxShadow = snapshot.boxShadow
    }
    if (
        snapshot.border &&
        snapshot.border !== "none" &&
        !snapshot.border.startsWith("0px")
    ) {
        fromElement.style.border = snapshot.border
    }
    if (snapshot.display) fromElement.style.display = snapshot.display
    if (snapshot.flexDirection)
        fromElement.style.flexDirection = snapshot.flexDirection
    if (snapshot.alignItems) fromElement.style.alignItems = snapshot.alignItems
    if (snapshot.justifyContent)
        fromElement.style.justifyContent = snapshot.justifyContent
    if (snapshot.gap) fromElement.style.gap = snapshot.gap
    if (snapshot.padding) fromElement.style.padding = snapshot.padding

    fromElement.style.boxSizing = "border-box"
    fromElement.style.overflow = "hidden"
    fromElement.style.position = "absolute"
    fromElement.style.left = `${snapshot.x}px`
    fromElement.style.top = `${snapshot.y}px`
    fromElement.style.width = `${snapshot.width}px`
    fromElement.style.height = `${snapshot.height}px`
    fromElement.style.borderRadius = snapshot.radius || "0px"
    fromElement.style.pointerEvents = "none"
    fromElement.style.zIndex = "2147483647"

    document.body.appendChild(fromElement)

    // Prepare destination element visibility for the view transition update
    const previousOpacity = destinationElement.style.opacity
    const previousVisibility = destinationElement.style.visibility
    destinationElement.style.opacity = "0"
    destinationElement.style.visibility = "hidden"

    const toElement = destinationElement

    // Identify non-shared surrounding elements (strictly excludes destination shared target)
    const surroundingElements = getSurroundingElements(toElement)

    let cleaned = false
    let cancelSurroundingEnter: (() => void) | null = null

    const cleanup = () => {
        if (cleaned) return
        cleaned = true
        toElement.style.opacity = previousOpacity
        toElement.style.visibility = previousVisibility
        if (fromElement.parentNode) {
            fromElement.parentNode.removeChild(fromElement)
        }
        if (cancelSurroundingEnter) {
            cancelSurroundingEnter()
            cancelSurroundingEnter = null
        }
        clearSnapshot(currentSnapshotId)
        if (activeGlobalTransition?.id === snapshot.transitionId) {
            activeGlobalTransition = null
        }
        if (onFinished) onFinished()
    }

    try {
        const transitionOptions = transition || {
            duration: 0.75,
            ease: [0.16, 1, 0.3, 1],
        }

        // Register global active transition controller for race-condition cancellation
        activeGlobalTransition = {
            id: snapshot.transitionId,
            startedAt: Date.now(),
            stop: () => {
                cleanup()
                activeAnimations.forEach((anim) => {
                    try {
                        anim.stop()
                    } catch (_e) {}
                })
            },
        }

        // DOM mutation callback executed within animateView
        const update = () => {
            fromElement.style.display = "none"
            toElement.style.visibility = "visible"
            toElement.style.opacity = "1"
        }

        // Morph animation connecting source -> destination targets
        const viewTransition = (animateView as any)(
            update,
            transitionOptions
        ).add(fromElement, toElement)

        // Incoming transition orchestration: animate non-shared content in
        cancelSurroundingEnter = animateSurroundingEnter(
            surroundingElements,
            transitionOptions,
            (anim) => activeAnimations.push(anim)
        )

        if (
            viewTransition &&
            typeof (viewTransition as any).then === "function"
        ) {
            ;(viewTransition as any).then(cleanup).catch(cleanup)
        }

        window.setTimeout(cleanup, FALLBACK_CLEANUP_MS)
    } catch (_error) {
        cleanup()
    }
}

/**
 * Primes the incoming page elements immediately upon mounting to prevent
 * flash of un-animated content (FOUC) while candidate rects are measured.
 */
function primeIncomingElements(): HTMLElement[] {
    if (typeof document === "undefined") return []
    const root =
        document.getElementById("root") ||
        document.querySelector("main") ||
        document.querySelector("[data-framer-root]") ||
        document.getElementById("__next") ||
        document.body
    if (!root) return []

    const primed: HTMLElement[] = []
    Array.from(root.children).forEach((child) => {
        if (
            child instanceof HTMLElement &&
            child.tagName !== "SCRIPT" &&
            child.tagName !== "STYLE" &&
            child.tagName !== "LINK" &&
            child.tagName !== "NOSCRIPT"
        ) {
            child.style.opacity = "0"
            child.style.filter = "blur(16px)"
            child.style.transform = "translateY(14px)"
            primed.push(child)
        }
    })
    return primed
}

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 */
export default function ArticleTransition(props: any) {
    const {
        snapshotId = "article-card",
        STORAGE_KEY: propStorageKey,
        targetName = "Card",
        transition,
    } = props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const activeAnimationsRef = useRef<any[]>([])
    const hasPlayedRef = useRef(false)
    const lastPlayedUrlRef = useRef<string>("")
    const currentUrl = typeof window !== "undefined" ? window.location.href : ""

    useEffect(() => {
        if (isCanvas || typeof document === "undefined") return

        const currentSnapshotId = snapshotId || propStorageKey || STORAGE_KEY

        // Reset played state if URL has changed to handle single-page dynamic app routing
        if (window.location.href !== lastPlayedUrlRef.current) {
            hasPlayedRef.current = false
            lastPlayedUrlRef.current = window.location.href
        }

        let cancelled = false
        let rafId = 0
        let timeoutId = 0
        let stableFrames = 0
        let lastRectKey = ""
        const startAt = Date.now()

        // 1. INCOMING ORCHESTRATION: Detect transition record and execute morph & non-shared enter
        const snapshot = readSnapshot(currentSnapshotId)

        if (snapshot && !hasPlayedRef.current && !isReducedMotion()) {
            const age = Date.now() - snapshot.ts
            if (age >= 0 && age <= MAX_SNAPSHOT_AGE_MS) {
                // Prime surrounding elements immediately to prevent flash of un-animated content
                primeIncomingElements()

                const checkReady = () => {
                    if (cancelled || hasPlayedRef.current) return
                    const elapsed = Date.now() - startAt
                    if (elapsed > READINESS_TIMEOUT_MS) {
                        clearSnapshot(currentSnapshotId)
                        return
                    }

                    const targetElements = Array.from(
                        document.querySelectorAll<HTMLElement>(
                            `[data-framer-name="${CSS.escape(targetName)}"]`
                        )
                    )

                    if (targetElements.length === 0) {
                        rafId = window.requestAnimationFrame(checkReady)
                        return
                    }

                    // Resolve the destination shared target element
                    const targetEl = resolveBestTargetElement(
                        targetElements,
                        snapshot
                    )

                    if (!targetEl) {
                        rafId = window.requestAnimationFrame(checkReady)
                        return
                    }

                    const bestTarget = findBestVisualCandidate(targetEl, null)

                    if (
                        !bestTarget ||
                        bestTarget.rect.width <= 0 ||
                        bestTarget.rect.height <= 0
                    ) {
                        rafId = window.requestAnimationFrame(checkReady)
                        return
                    }

                    const targetPageX = bestTarget.rect.left + window.scrollX
                    const targetPageY = bestTarget.rect.top + window.scrollY
                    const rectKey = `${Math.round(targetPageX)}:${Math.round(
                        targetPageY
                    )}:${Math.round(bestTarget.rect.width)}:${Math.round(
                        bestTarget.rect.height
                    )}`

                    stableFrames =
                        rectKey === lastRectKey ? stableFrames + 1 : 1
                    lastRectKey = rectKey
                    if (stableFrames < 2) {
                        rafId = window.requestAnimationFrame(checkReady)
                        return
                    }

                    hasPlayedRef.current = true
                    // Clear snapshot record from storage upon initiating playback
                    clearSnapshot(currentSnapshotId)
                    executeMorphWithAnimateView(
                        bestTarget,
                        snapshot,
                        currentSnapshotId,
                        transition,
                        activeAnimationsRef.current
                    )
                }

                rafId = window.requestAnimationFrame(checkReady)
                timeoutId = window.setTimeout(() => {
                    cancelled = true
                    if (rafId) window.cancelAnimationFrame(rafId)
                    clearSnapshot(currentSnapshotId)
                }, READINESS_TIMEOUT_MS + 80)
            } else {
                clearSnapshot(currentSnapshotId)
            }
        } else {
            clearSnapshot(currentSnapshotId)
        }

        // 2. OUTGOING ORCHESTRATION: Detect navigation and capture source targets & non-shared exit
        const getElements = () =>
            document.querySelectorAll<HTMLElement>(
                `[data-framer-name="${CSS.escape(targetName)}"]`
            )

        const tryCaptureSnapshot = (event: any) => {
            if (isModifiedOrNonPrimaryClick(event)) return

            const allElements = Array.from(getElements())
            const visibleElements = allElements.filter(isElementVisible)

            const container =
                (event.currentTarget as HTMLElement | null) ||
                (event.target as HTMLElement)?.closest(
                    `[data-framer-name="${CSS.escape(targetName)}"]`
                ) ||
                (event.target as HTMLElement)

            const cardIndex = container
                ? visibleElements.indexOf(container as HTMLElement)
                : 0

            const candidate = findBestVisualCandidate(container, event.target)
            if (!candidate) return

            captureCandidateSnapshot(
                candidate,
                "forward",
                currentSnapshotId,
                cardIndex >= 0 ? cardIndex : 0,
                transition
            )
        }

        const hasNavApi = Boolean(
            typeof window !== "undefined" &&
                "navigation" in window &&
                (window as any).navigation?.addEventListener
        )

        const handlePointerDown = (event: any) => tryCaptureSnapshot(event)
        const handleClick = (event: any) => {
            if (isModifiedOrNonPrimaryClick(event)) return
            const link = (event.target as HTMLElement)?.closest(
                "a[href]"
            ) as HTMLAnchorElement | null

            // Fallback for browsers without Navigation API: delay link navigation until exit animation finishes
            if (!hasNavApi && link && link.href) {
                const targetUrl = normalizeUrl(
                    link.getAttribute("href") || link.href
                )
                const isExternal =
                    link.target === "_blank" ||
                    targetUrl.startsWith("mailto:") ||
                    targetUrl.startsWith("tel:")
                if (!isExternal) {
                    event.preventDefault()
                    tryCaptureSnapshot(event)
                    if (activeGlobalTransition?.exitPromise) {
                        activeGlobalTransition.exitPromise
                            .then(() => {
                                window.location.href = targetUrl
                            })
                            .catch(() => {
                                window.location.href = targetUrl
                            })
                    } else {
                        window.location.href = targetUrl
                    }
                    return
                }
            }

            tryCaptureSnapshot(event)
        }

        const elements = getElements()
        elements.forEach((el) => {
            el.addEventListener("pointerdown", handlePointerDown, {
                capture: true,
            })
            el.addEventListener("click", handleClick, { capture: true })
        })

        // 3. EXIT / REVERSE NAVIGATION CAPTURE: Trigger reverse transition when clicking back/nav items
        const handleExitPointerDown = (event: any) => {
            if (isModifiedOrNonPrimaryClick(event)) return
            const target = event.target as HTMLElement | null
            if (!target) return

            // Never treat clicking inside a source card / target container as an exit trigger
            const isInsideCard = target.closest(
                `[data-framer-name="${CSS.escape(targetName)}"]`
            )
            if (isInsideCard) return

            // Trigger reverse transition on clicking any link, back button, nav item, or header
            const isExitTrigger =
                target.closest("a") ||
                target.closest("button") ||
                target.closest('[data-framer-name*="Back"]') ||
                target.closest('[data-framer-name*="Close"]') ||
                target.closest('[data-framer-name*="Nav"]') ||
                target.closest("nav") ||
                target.closest("header")

            if (isExitTrigger) {
                const targetElements = Array.from(
                    document.querySelectorAll<HTMLElement>(
                        `[data-framer-name="${CSS.escape(targetName)}"]`
                    )
                )
                const heroRoot =
                    resolveBestTargetElement(targetElements, {
                        direction: "forward",
                    } as Snapshot) ||
                    document.querySelector<HTMLElement>(
                        `[data-framer-name="${CSS.escape(targetName)}"]`
                    ) ||
                    document.body

                const heroCandidate = findBestVisualCandidate(heroRoot, null)
                if (
                    heroCandidate &&
                    heroCandidate.rect.width > 0 &&
                    heroCandidate.rect.height > 0
                ) {
                    const exitLink = target.closest(
                        "a[href]"
                    ) as HTMLAnchorElement | null
                    const exitHref = exitLink?.getAttribute("href")
                        ? normalizeUrl(exitLink.getAttribute("href")!)
                        : ""

                    const existingSnap = readSnapshot(currentSnapshotId)
                    const preservedIndex =
                        typeof existingSnap?.cardIndex === "number"
                            ? existingSnap.cardIndex
                            : typeof existingSnap?.originCardIndex === "number"
                              ? existingSnap.originCardIndex
                              : 0

                    captureCandidateSnapshot(
                        heroCandidate,
                        "backward",
                        currentSnapshotId,
                        preservedIndex,
                        transition,
                        exitHref || undefined
                    )
                }
            }
        }

        const handleExitClick = (event: any) => {
            if (isModifiedOrNonPrimaryClick(event)) return
            const target = event.target as HTMLElement | null
            if (!target) return

            const isInsideCard = target.closest(
                `[data-framer-name="${CSS.escape(targetName)}"]`
            )
            if (isInsideCard) return

            const link = target.closest("a[href]") as HTMLAnchorElement | null

            // Fallback for browsers without Navigation API: delay link navigation until exit animation finishes
            if (!hasNavApi && link && link.href) {
                const targetUrl = normalizeUrl(
                    link.getAttribute("href") || link.href
                )
                const isExternal =
                    link.target === "_blank" ||
                    targetUrl.startsWith("mailto:") ||
                    targetUrl.startsWith("tel:")
                if (!isExternal) {
                    event.preventDefault()
                    handleExitPointerDown(event)
                    if (activeGlobalTransition?.exitPromise) {
                        activeGlobalTransition.exitPromise
                            .then(() => {
                                window.location.href = targetUrl
                            })
                            .catch(() => {
                                window.location.href = targetUrl
                            })
                    } else {
                        window.location.href = targetUrl
                    }
                    return
                }
            }

            handleExitPointerDown(event)
        }

        document.addEventListener("pointerdown", handleExitPointerDown, {
            capture: true,
        })
        document.addEventListener("click", handleExitClick, {
            capture: true,
        })

        // 4. NAVIGATION API INTEGRATION: Use browser Navigation API to wait until page exit animation completes
        let handleNavigate: ((event: any) => void) | null = null
        const nav =
            typeof window !== "undefined" && "navigation" in window
                ? (window as any).navigation
                : null

        if (nav && typeof nav.addEventListener === "function") {
            handleNavigate = (event: any) => {
                if (
                    !event ||
                    !event.canIntercept ||
                    event.hashChange ||
                    event.downloadRequest
                ) {
                    return
                }

                const destinationUrl = event.destination?.url || ""
                if (destinationUrl && destinationUrl === window.location.href) {
                    return
                }

                // If an exit animation is already running (e.g. triggered via pointerdown/click), wait for it!
                if (activeGlobalTransition?.exitPromise) {
                    const exitPromise = activeGlobalTransition.exitPromise
                    if (typeof event.intercept === "function") {
                        event.intercept({
                            handler: async () => {
                                await exitPromise
                            },
                        })
                    } else if (typeof event.transitionWhile === "function") {
                        event.transitionWhile(exitPromise)
                    }
                } else {
                    // Navigation triggered programmatically (e.g. navigation.navigate, history back/forward)
                    const targetElements = Array.from(getElements())
                    const heroRoot =
                        resolveBestTargetElement(targetElements, {
                            direction: "forward",
                        } as Snapshot) ||
                        document.querySelector<HTMLElement>(
                            `[data-framer-name="${CSS.escape(targetName)}"]`
                        ) ||
                        document.body

                    const heroCandidate = findBestVisualCandidate(heroRoot, null)
                    if (
                        heroCandidate &&
                        heroCandidate.rect.width > 0 &&
                        heroCandidate.rect.height > 0
                    ) {
                        const existingSnap = readSnapshot(currentSnapshotId)
                        const preservedIndex =
                            typeof existingSnap?.cardIndex === "number"
                                ? existingSnap.cardIndex
                                : typeof existingSnap?.originCardIndex ===
                                    "number"
                                  ? existingSnap.originCardIndex
                                  : 0

                        const result = captureCandidateSnapshot(
                            heroCandidate,
                            "backward",
                            currentSnapshotId,
                            preservedIndex,
                            transition,
                            destinationUrl || undefined
                        )

                        if (result.success && result.promise) {
                            if (typeof event.intercept === "function") {
                                event.intercept({
                                    handler: async () => {
                                        await result.promise
                                    },
                                })
                            } else if (
                                typeof event.transitionWhile === "function"
                            ) {
                                event.transitionWhile(result.promise)
                            }
                        }
                    }
                }

                // Handle navigation abort cleanly
                if (
                    event.signal &&
                    typeof event.signal.addEventListener === "function"
                ) {
                    event.signal.addEventListener(
                        "abort",
                        () => {
                            cancelGlobalTransition()
                        },
                        { once: true }
                    )
                }
            }

            nav.addEventListener("navigate", handleNavigate)
        }

        return () => {
            cancelled = true
            if (rafId) window.cancelAnimationFrame(rafId)
            if (timeoutId) window.clearTimeout(timeoutId)
            if (
                nav &&
                handleNavigate &&
                typeof nav.removeEventListener === "function"
            ) {
                nav.removeEventListener("navigate", handleNavigate)
            }
            elements.forEach((el) => {
                el.removeEventListener("pointerdown", handlePointerDown, {
                    capture: true,
                })
                el.removeEventListener("click", handleClick, {
                    capture: true,
                })
            })
            document.removeEventListener("pointerdown", handleExitPointerDown, {
                capture: true,
            })
            document.removeEventListener("click", handleExitClick, {
                capture: true,
            })
            cancelGlobalTransition()
            activeAnimationsRef.current.forEach((anim) => {
                try {
                    anim.stop()
                } catch (_e) {}
            })
            activeAnimationsRef.current = []
        }
    }, [
        targetName,
        snapshotId,
        propStorageKey,
        currentUrl,
        isCanvas,
        transition,
    ])

    return (
        <div
            style={{
                width: 1,
                height: 1,
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
            }}
        />
    )
}

ArticleTransition.defaultProps = {
    snapshotId: "article-card",
    targetName: "Card",
}

addPropertyControls(ArticleTransition, {
    snapshotId: {
        type: ControlType.String,
        title: "SNAPSHOT ID",
        defaultValue: "article-card",
        description: "Shared ID between source card and destination page.",
    },
    targetName: {
        type: ControlType.String,
        title: "Target Div Name",
        defaultValue: "Card",
        description:
            "data-framer-name of the div container to capture or animate.",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
    },
})

