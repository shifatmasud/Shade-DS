
//remix https://framer.com/remix/gyJob0goCsTUoyrEeUya

//live https://little-network-752783.framer.app/

//component https://framer.com/m/Share-rxr5D4.js@ub2LeGEbSISMcXGLkeBm

import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef, useState, useCallback } from "react"
import { animateView } from "framer-motion"

const generateUID = () => "m-" + Math.random().toString(36).substring(2, 7)

/* ========================================================================= */
/* LOCKED: FORWARD NAVIGATION PIPELINE (DO NOT MODIFY - TESTED & WORKING)   */
/* ========================================================================= */

/**
 * [LOCKED] Tags destination elements on forward navigation for active item transition.
 * Ensures detail page destination elements receive the exact matching UID for the active item.
 */
const tagForwardDestinationElements = (destList: string[], uid: string) => {
    if (typeof document === "undefined") return
    let primaryContainer: HTMLElement | null = null

    destList.forEach((destName, listIndex) => {
        const destEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(destName) : destName
        let targetEl: HTMLElement | null = null

        if (listIndex === 0) {
            const allDest = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${destEscaped}"]`))
            if (allDest.length > 0) {
                targetEl = allDest[0]
                primaryContainer = targetEl
            }
        } else {
            if (primaryContainer) {
                targetEl = primaryContainer.querySelector<HTMLElement>(`[data-framer-name="${destEscaped}"]`)
            }
            if (!targetEl) {
                targetEl = document.querySelector<HTMLElement>(`[data-framer-name="${destEscaped}"]`)
            }
        }

        if (targetEl) {
            targetEl.setAttribute("data-morphine-id", `${uid}-active-${listIndex}`)
        }
    })
}

/* ========================================================================= */
/* END LOCKED: FORWARD NAVIGATION PIPELINE                                   */
/* ========================================================================= */

/* ========================================================================= */
/* LOCKED: REVERSE NAVIGATION PIPELINE (DO NOT MODIFY - TESTED & WORKING)   */
/* ========================================================================= */

/**
 * [LOCKED] Tags the exact originating card (e.g. product-2) in the newly mounted List DOM right after reverse navigation.
 * Uses persistent memory index, URL slug, and title matching to guarantee precise reverse morphing.
 */
function tagActiveOriginCardInNewDOM(
    memory: OriginMemory | null,
    targetFromNames?: string,
    currentUrlBeforeNav?: string,
    uid: string = ""
) {
    if (typeof document === "undefined") return

    const destList = parseNameList(targetFromNames, "Card")
    const primaryName = destList[0] || "Card"
    const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(primaryName) : primaryName
    let allCards = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${escaped}"]`))

    if (allCards.length === 0) {
        for (const altName of destList) {
            const altEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(altName) : altName
            const found = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${altEscaped}"]`))
            if (found.length > 0) {
                allCards = found
                break
            }
        }
    }

    if (allCards.length === 0) return

    const activeMemory = memory || getStoredOriginMemory()
    let matchedCard: HTMLElement | null = null

    // Strategy 1: URL / Route / Slug matching
    let searchUrl = activeMemory?.url || currentUrlBeforeNav || (typeof window !== "undefined" ? window.location.href : "")
    let searchSlug = (activeMemory?.slug || extractSlug(searchUrl)).toLowerCase().trim()
    let searchPath = activeMemory?.pathname || ""

    if (!searchPath && searchUrl) {
        try {
            searchPath = searchUrl.startsWith("http") ? new URL(searchUrl).pathname : searchUrl.split("?")[0].split("#")[0]
        } catch (_e) {}
    }

    if (searchSlug || searchPath) {
        for (const card of allCards) {
            const links: HTMLAnchorElement[] = []
            if (card.tagName.toLowerCase() === "a" && (card as HTMLAnchorElement).href) {
                links.push(card as HTMLAnchorElement)
            }
            card.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((l) => links.push(l))
            const parentLink = card.closest("a[href]") as HTMLAnchorElement | null
            if (parentLink) links.push(parentLink)

            for (const link of links) {
                const href = (link.getAttribute("href") || "").toLowerCase()
                const decodedHref = decodeURIComponent(href)
                if (
                    (searchPath && (href === searchPath.toLowerCase() || href.endsWith(searchPath.toLowerCase()))) ||
                    (searchSlug && (href.includes(searchSlug) || decodedHref.includes(searchSlug) || href.endsWith(`/${searchSlug}`)))
                ) {
                    matchedCard = card
                    break
                }
            }
            if (matchedCard) break

            // Match data attributes or ID on card
            const cardSlug = (card.getAttribute("data-slug") || card.getAttribute("data-id") || card.id || "").toLowerCase()
            if (searchSlug && cardSlug && (cardSlug.includes(searchSlug) || searchSlug.includes(cardSlug))) {
                matchedCard = card
                break
            }
        }
    }

    // Strategy 2: Exact Index match from previous click memory (e.g. index 1 for product-2)
    if (!matchedCard && activeMemory && typeof activeMemory.index === "number" && activeMemory.index >= 0) {
        if (activeMemory.index < allCards.length) {
            matchedCard = allCards[activeMemory.index]
        }
    }

    // Strategy 3: Text content / slug similarity match
    if (!matchedCard && searchSlug) {
        for (const card of allCards) {
            const text = (card.textContent || "").toLowerCase()
            const cleanSlug = searchSlug.replace(/[-_]/g, " ")
            if (text.includes(searchSlug) || text.includes(cleanSlug)) {
                matchedCard = card
                break
            }
        }
    }

    // Strategy 4: Safe fallback to the first card
    if (!matchedCard) {
        matchedCard = allCards[0]
    }

    if (matchedCard) {
        matchedCard.setAttribute("data-morphine-active-card", "true")
        if (uid) {
            matchedCard.setAttribute("data-morphine-id", `${uid}-reverse-0`)

            // Tag child elements within the matched card (e.g. Image, Title)
            destList.forEach((destName, listIndex) => {
                if (listIndex === 0) return
                const childEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(destName) : destName
                const childEl = matchedCard!.querySelector<HTMLElement>(`[data-framer-name="${childEscaped}"]`)
                if (childEl) {
                    childEl.setAttribute("data-morphine-id", `${uid}-reverse-${listIndex}`)
                }
            })
        }
    }
}

/**
 * [LOCKED] Cleans up temporary tracking attributes after transition completion.
 */
function cleanupActiveOriginTags() {
    if (typeof document === "undefined") return
    try {
        const tagged = document.querySelectorAll("[data-morphine-active-card], [data-morphine-id]")
        tagged.forEach((el) => {
            el.removeAttribute("data-morphine-active-card")
            el.removeAttribute("data-morphine-id")
        })
    } catch (_e) {}
}

/* ========================================================================= */
/* END LOCKED: REVERSE NAVIGATION PIPELINE                                   */
/* ========================================================================= */

const ROOT_VIEW_TRANSITION_STYLE_ID = "morphine-root-view-transition-style"
const ROOT_VIEW_TRANSITION_CSS = `
::view-transition-old(root),
::view-transition-new(root),
::view-transition-group(root) {
    animation: none !important;
}
`

function injectRootViewTransitionStyles() {
    if (typeof document === "undefined") return
    if (document.getElementById(ROOT_VIEW_TRANSITION_STYLE_ID)) return
    const style = document.createElement("style")
    style.id = ROOT_VIEW_TRANSITION_STYLE_ID
    style.textContent = ROOT_VIEW_TRANSITION_CSS
    document.head.appendChild(style)
}

function removeRootViewTransitionStyles() {
    if (typeof document === "undefined") return
    const style = document.getElementById(ROOT_VIEW_TRANSITION_STYLE_ID)
    if (style && style.parentNode) {
        style.parentNode.removeChild(style)
    }
}

/**
 * Normalizes and deduplicates repeated path segments (e.g. "/articles/articles/item" -> "/articles/item")
 * to ensure injected route URLs match Framer's original canonical route URLs without triggering a reload.
 */
function normalizeRouteUrl(
    rawUrlOrHref: string,
    baseHref: string = typeof window !== "undefined" ? window.location.href : ""
): { url: string; pathname: string; href: string } {
    if (!rawUrlOrHref) return { url: "", pathname: "", href: "" }
    try {
        const resolved = new URL(rawUrlOrHref, baseHref || "https://framer.app")
        const pathname = resolved.pathname

        // Deduplicate adjacent identical path segments (e.g., /articles/articles/ -> /articles/)
        const segments = pathname.split("/").filter(Boolean)
        const cleanSegments: string[] = []
        for (let i = 0; i < segments.length; i++) {
            if (i > 0 && segments[i] === segments[i - 1]) {
                continue
            }
            cleanSegments.push(segments[i])
        }

        const cleanPathname = "/" + cleanSegments.join("/") + (pathname.endsWith("/") && cleanSegments.length > 0 ? "/" : "")
        resolved.pathname = cleanPathname

        return {
            url: resolved.href,
            pathname: resolved.pathname,
            href: resolved.href,
        }
    } catch (_e) {
        return { url: rawUrlOrHref, pathname: rawUrlOrHref, href: rawUrlOrHref }
    }
}

/**
 * Synchronizes the current browser URL to Framer's canonical route URL without triggering a page reload.
 */
function syncCanonicalRouteUrl() {
    if (typeof window === "undefined" || typeof window.history === "undefined") return
    try {
        const canonical = normalizeRouteUrl(window.location.href)
        if (canonical.url && canonical.url !== window.location.href) {
            window.history.replaceState(window.history.state, "", canonical.url)
        }
    } catch (_e) {}
}

/**
 * Tags all matching elements with index-based IDs for multi-element transitions.
 */
const tagElements = (names: string[], attr: string, uid: string) => {
    if (typeof document === "undefined") return
    names.forEach((name, listIndex) => {
        const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(name) : name
        const elements = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${escaped}"]`))
        elements.forEach((el, i) => {
            el.setAttribute(attr, `${uid}-${listIndex}-${i}`)
        })
    })
}

/**
 * Creates explicit keyframe arrays for the outgoing non-shared root view transition.
 * Pure opacity and gaussian blur ensures smooth exit without viewport scale pops.
 */
const createExitAnimation = (blurPx: number = 20) => ({
    opacity: [1, 0],
    filter: ["blur(0px)", `blur(${blurPx}px)`],
})

/**
 * Creates explicit keyframe arrays for the incoming non-shared root view transition.
 * Starts in clean gaussian blur and settles smoothly into crystal clear focus (blur 0px).
 */
const createEnterAnimation = (blurPx: number = 20) => ({
    opacity: [0, 1],
    filter: [`blur(${blurPx}px)`, "blur(0px)"],
})

const DEFAULT_EXIT_ANIMATION = createExitAnimation(20)
const DEFAULT_ENTER_ANIMATION = createEnterAnimation(20)

export interface MorphineProps {
    targetFromNames?: string
    targetToNames?: string
    transition?: any
    enableEnterExit?: boolean
    disableEnterExit?: boolean
    stopEnterExitAnim?: boolean
    blurAmount?: number
    exitAnimation?: any
    enterAnimation?: any
    showDebugOverlay?: boolean
    style?: React.CSSProperties
    className?: string
}

type Direction = "forward" | "reverse"

type ResolvedPair = {
    fromName: string
    toName: string
    fromSelector: string
    toSelector: string
    fromElement: HTMLElement | null
    fromTarget: HTMLElement | string
    hasDiscovered: boolean
    direction: Direction
}

type OriginMemory = {
    cardName: string
    url: string
    pathname: string
    slug: string
    index: number
    timestamp: number
}

// In-memory cache & persistent storage helper to remember which card in a list was clicked
let activeOriginMemory: OriginMemory | null = null

const ORIGIN_STORAGE_KEY = "morphine_active_origin"

function getStoredOriginMemory(): OriginMemory | null {
    if (activeOriginMemory) return activeOriginMemory
    if (typeof window !== "undefined") {
        if ((window as any).__MORPHINE_ORIGIN_MEMORY__) {
            activeOriginMemory = (window as any).__MORPHINE_ORIGIN_MEMORY__
            return activeOriginMemory
        }
        try {
            const raw = sessionStorage.getItem(ORIGIN_STORAGE_KEY)
            if (raw) {
                activeOriginMemory = JSON.parse(raw)
                return activeOriginMemory
            }
        } catch (_e) {}
    }
    return null
}

function saveOriginMemory(memory: OriginMemory | null) {
    activeOriginMemory = memory
    if (typeof window !== "undefined") {
        try {
            ;(window as any).__MORPHINE_ORIGIN_MEMORY__ = memory
            if (memory) {
                sessionStorage.setItem(ORIGIN_STORAGE_KEY, JSON.stringify(memory))
            } else {
                sessionStorage.removeItem(ORIGIN_STORAGE_KEY)
            }
        } catch (_e) {}
    }
}

function isModifiedOrNonPrimaryClick(event: MouseEvent): boolean {
    if (!event) return true
    if (event.defaultPrevented) return true
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return true
    }
    return event.button !== 0
}

/**
 * Extracts a clean URL slug from a href string or pathname.
 */
function extractSlug(urlOrPath: string): string {
    if (!urlOrPath) return ""
    try {
        const path = urlOrPath.startsWith("http")
            ? new URL(urlOrPath).pathname
            : urlOrPath.split("?")[0].split("#")[0]
        const segments = path.split("/").filter(Boolean)
        const last = segments[segments.length - 1] || ""
        return decodeURIComponent(last).toLowerCase().trim()
    } catch (_e) {
        return ""
    }
}

/**
 * Finds the element closest to the user's click/interaction reference
 * to disambiguate among multiple elements sharing the same data-framer-name.
 */
function findClosestElement(
    ref: HTMLElement | null,
    elements: HTMLElement[]
): HTMLElement | null {
    if (!elements || elements.length === 0) return null
    if (elements.length === 1 || !ref) return elements[0]

    // 1. Direct match or containment
    for (const el of elements) {
        if (el === ref || el.contains(ref) || ref.contains(el)) {
            return el
        }
    }

    // 2. Proximity via DOM hierarchy distance to nearest common ancestor
    let bestEl = elements[0]
    let minDistance = Infinity

    for (const el of elements) {
        let parent: HTMLElement | null = ref
        let distance = 0
        while (parent && parent !== document.body) {
            if (parent.contains(el)) {
                if (distance < minDistance) {
                    minDistance = distance
                    bestEl = el
                }
                break
            }
            parent = parent.parentElement
            distance++
        }
    }

    return bestEl
}

function parseNameList(raw?: string, fallback: string = "Card"): string[] {
    const list = (raw || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    if (list.length === 0) list.push(fallback)
    return list
}

let lastKnownUrl: string = typeof window !== "undefined" ? window.location.href : ""

function updateLastKnownUrl(url?: string) {
    if (typeof window === "undefined") return
    lastKnownUrl = url || window.location.href
}

/**
 * Detects whether current navigation is Forward (From -> To)
 * or Reverse (To -> From) based on existing DOM elements, URL route depth, origin memory, and user interaction.
 */
function detectNavigationDirection(
    fromList: string[],
    toList: string[],
    clickRef?: HTMLElement | null,
    clickLink?: HTMLAnchorElement | null,
    fromUrl?: string,
    toUrl?: string
): Direction {
    if (typeof document === "undefined") return "forward"

    const memory = getStoredOriginMemory()
    const currentUrl = fromUrl || (typeof window !== "undefined" ? window.location.href : "")
    const destinationUrl = toUrl || ""
    let currentPath = ""
    let targetPath = ""
    try {
        if (currentUrl) currentPath = new URL(currentUrl, "https://framer.app").pathname
        if (destinationUrl) targetPath = new URL(destinationUrl, "https://framer.app").pathname
    } catch (_e) {}

    // 1. Check if click target or link indicates a Back / Return action
    const interactiveEl = clickLink || clickRef
    if (interactiveEl) {
        const backAttr = interactiveEl.closest(
            '[data-framer-name*="Back" i], [data-framer-name*="back" i], [aria-label*="back" i], [class*="back" i], [id*="back" i], [data-back="true"]'
        )
        if (backAttr) return "reverse"

        const text = (interactiveEl.textContent || "").trim().toLowerCase()
        if (
            text === "back" ||
            text === "←" ||
            text === "go back" ||
            text.startsWith("back to") ||
            text === "all" ||
            text === "close" ||
            text === "✕" ||
            text === "×"
        ) {
            return "reverse"
        }
    }

    // 2. Check if link target is a parent or root URL relative to current pathname
    if (clickLink && clickLink.href && typeof window !== "undefined") {
        try {
            const targetUrl = new URL(clickLink.href, window.location.href)
            const cleanTargetPath = targetUrl.pathname.replace(/\/+$/, "")
            const cleanCurPath = currentPath.replace(/\/+$/, "")
            if (
                cleanTargetPath.length < cleanCurPath.length &&
                (cleanCurPath.startsWith(cleanTargetPath) || cleanTargetPath === "" || cleanTargetPath === "/")
            ) {
                return "reverse"
            }
        } catch (_e) {}
    }

    // 3. History traversal / URL comparison (e.g. going from /product-2 back to /)
    if (currentUrl && destinationUrl) {
        if (memory) {
            const memSlug = memory.slug || extractSlug(memory.url || memory.pathname)
            if (memSlug && currentUrl.includes(memSlug) && !destinationUrl.includes(memSlug)) {
                return "reverse"
            }
        }
        if (targetPath && currentPath) {
            const cleanTarget = targetPath.replace(/\/+$/, "")
            const cleanCur = currentPath.replace(/\/+$/, "")
            if (
                cleanTarget.length < cleanCur.length &&
                (cleanCur.startsWith(cleanTarget) || cleanTarget === "" || cleanTarget === "/")
            ) {
                return "reverse"
            }
        }
    }

    // 4. Check if current URL matches the recorded detail memory and we are navigating away
    if (memory) {
        const memSlug = memory.slug || extractSlug(memory.url || memory.pathname)
        if (memSlug && (currentUrl.includes(memSlug) || currentPath.includes(memSlug))) {
            return "reverse"
        }
    }

    // 5. If click is explicitly inside an element matching targetToNames, it's a reverse transition
    if (clickRef) {
        for (const toName of toList) {
            const toEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(toName) : toName
            if (clickRef.closest(`[data-framer-name="${toEscaped}"]`)) {
                return "reverse"
            }
        }
    }

    const firstFrom = fromList[0]
    const firstTo = toList[0]

    const fromEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(firstFrom) : firstFrom
    const toEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(firstTo) : firstTo

    const fromCount = document.querySelectorAll(`[data-framer-name="${fromEscaped}"]`).length
    const toCount = document.querySelectorAll(`[data-framer-name="${toEscaped}"]`).length

    // If to elements exist on the page and from elements don't, we are navigating in reverse
    if (toCount > 0 && fromCount === 0) {
        return "reverse"
    }

    // If both exist but different names, and toCount > 0 while fromCount == 0
    if (firstFrom !== firstTo && toCount > 0 && fromCount === 0) {
        return "reverse"
    }

    return "forward"
}

/**
 * Discovers and resolves active pairs bidirectionally between outgoing (FROM) and incoming (TO) elements.
 * Correctly distinguishes between active clicked items (product-2) and global multi-element collections.
 */
function resolveBidirectionalPairs(
    targetFromNames?: string,
    targetToNames?: string,
    clickTarget?: HTMLElement | null,
    clickLink?: HTMLAnchorElement | null,
    forcedDirection?: Direction,
    uid: string = ""
): ResolvedPair[] {
    const fromList = parseNameList(targetFromNames, "Card")
    const toList = parseNameList(targetToNames, "Card")

    if (typeof document === "undefined") return []

    const ref = clickTarget || clickLink
    const direction = forcedDirection || detectNavigationDirection(fromList, toList, ref, clickLink)

    // Map source and destination lists based on direction
    const sourceList = direction === "forward" ? fromList : toList
    const destList = direction === "forward" ? toList : fromList

    const pairs: ResolvedPair[] = []

    // Step 1: Detect the primary active container enclosing or matching the click
    let activeContainer: HTMLElement | null = null
    let activeIndex = -1

    if (ref) {
        for (const sourceName of sourceList) {
            const sourceEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(sourceName) : sourceName
            const selector = `[data-framer-name="${sourceEscaped}"]`

            // Check if click is inside the container
            const matchedContainer = ref.closest<HTMLElement>(selector)
            if (matchedContainer) {
                activeContainer = matchedContainer
                break
            }

            // Check if link contains the container
            if (clickLink) {
                const insideLink = clickLink.querySelector<HTMLElement>(selector)
                if (insideLink) {
                    activeContainer = insideLink
                    break
                }
            }
        }
    }

    /* ========================================================================= */
    /* LOCKED: FORWARD NAVIGATION ORIGIN RECORDING (DO NOT MODIFY)               */
    /* ========================================================================= */
    // Step 2: If forward navigation, record the clicked card's context for reverse origin memory
    if (direction === "forward" && activeContainer) {
        const primarySourceName = sourceList[0]
        const primaryEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(primarySourceName) : primarySourceName
        const allPrimaryElements = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${primaryEscaped}"]`))
        activeIndex = allPrimaryElements.indexOf(activeContainer)

        const rawLinkHref = clickLink?.href || (activeContainer.tagName.toLowerCase() === "a" ? (activeContainer as HTMLAnchorElement).href : "")
        const effectiveRawUrl = rawLinkHref || (typeof window !== "undefined" ? window.location.href : "")
        const canonical = normalizeRouteUrl(effectiveRawUrl, typeof window !== "undefined" ? window.location.href : "")

        const memory: OriginMemory = {
            cardName: primarySourceName,
            index: activeIndex >= 0 ? activeIndex : 0,
            url: canonical.url,
            pathname: canonical.pathname,
            slug: extractSlug(canonical.url),
            timestamp: Date.now(),
        }
        saveOriginMemory(memory)
    }

    /* ========================================================================= */
    /* LOCKED: FORWARD NAVIGATION PAIR RESOLUTION (DO NOT MODIFY - TESTED)       */
    /* ========================================================================= */
    // Step 3A: FORWARD NAVIGATION WITH ACTIVE CONTAINER (e.g. product-2 clicked in list)
    if (direction === "forward" && activeContainer) {
        const maxLength = Math.max(sourceList.length, destList.length)
        for (let listIndex = 0; listIndex < maxLength; listIndex++) {
            const sourceName = sourceList[listIndex] || sourceList[sourceList.length - 1]
            const destName = destList[listIndex] || destList[destList.length - 1]
            const sourceEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(sourceName) : sourceName

            let fromElement: HTMLElement | null = null
            if (listIndex === 0 && (activeContainer.getAttribute("data-framer-name") === sourceName || activeContainer.matches(`[data-framer-name="${sourceEscaped}"]`))) {
                fromElement = activeContainer
            } else {
                fromElement = activeContainer.querySelector<HTMLElement>(`[data-framer-name="${sourceEscaped}"]`)
            }

            if (!fromElement && listIndex === 0) {
                fromElement = activeContainer
            }

            const morphineId = uid ? `${uid}-active-${listIndex}` : ""
            if (morphineId && fromElement) {
                fromElement.setAttribute("data-morphine-id", morphineId)
            }

            const toSelector = uid
                ? `[data-morphine-id="${uid}-active-${listIndex}"]`
                : `[data-framer-name="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(destName) : destName}"]`

            pairs.push({
                fromName: sourceName,
                toName: destName,
                fromSelector: morphineId ? `[data-morphine-id="${morphineId}"]` : `[data-framer-name="${sourceEscaped}"]`,
                toSelector,
                fromElement,
                fromTarget: fromElement || toSelector,
                hasDiscovered: Boolean(fromElement),
                direction,
            })
        }
        return pairs
    }
    /* ========================================================================= */
    /* END LOCKED: FORWARD NAVIGATION PAIR RESOLUTION                            */
    /* ========================================================================= */

    /* ========================================================================= */
    /* LOCKED: REVERSE NAVIGATION PAIR RESOLUTION (DO NOT MODIFY - TESTED)       */
    /* ========================================================================= */
    // Step 3B: REVERSE NAVIGATION (Detail -> List, morphing into exact origin card e.g. product-2)
    if (direction === "reverse") {
        const maxLength = Math.max(sourceList.length, destList.length)
        for (let listIndex = 0; listIndex < maxLength; listIndex++) {
            const sourceName = sourceList[listIndex] || sourceList[sourceList.length - 1]
            const destName = destList[listIndex] || destList[destList.length - 1]
            const sourceEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(sourceName) : sourceName
            const destEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(destName) : destName

            let allDiscovered = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${sourceEscaped}"]`))
            if (allDiscovered.length === 0 && sourceName !== destName) {
                allDiscovered = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${destEscaped}"]`))
            }
            let fromElement: HTMLElement | null = null

            if (activeContainer) {
                if (activeContainer.getAttribute("data-framer-name") === sourceName) {
                    fromElement = activeContainer
                } else {
                    fromElement = activeContainer.querySelector<HTMLElement>(`[data-framer-name="${sourceEscaped}"]`)
                }
            }

            if (!fromElement && allDiscovered.length > 0) {
                fromElement = findClosestElement(ref, allDiscovered)
            }

            const morphineId = uid ? `${uid}-reverse-${listIndex}` : ""
            if (morphineId && fromElement) {
                fromElement.setAttribute("data-morphine-id", morphineId)
            }

            const toSelector = uid
                ? `[data-morphine-id="${uid}-reverse-${listIndex}"]`
                : (listIndex === 0
                    ? `[data-morphine-active-card="true"]`
                    : `[data-morphine-active-card="true"] [data-framer-name="${destEscaped}"]`)

            pairs.push({
                fromName: sourceName,
                toName: destName,
                fromSelector: morphineId ? `[data-morphine-id="${morphineId}"]` : `[data-framer-name="${sourceEscaped}"]`,
                toSelector,
                fromElement,
                fromTarget: fromElement || toSelector,
                hasDiscovered: Boolean(fromElement),
                direction,
            })
        }
        return pairs
    }
    /* ========================================================================= */
    /* END LOCKED: REVERSE NAVIGATION PAIR RESOLUTION                            */
    /* ========================================================================= */

    // Step 3C: MULTI-ELEMENT GLOBAL TRANSITION (when no specific card container was clicked)
    if (uid) {
        sourceList.forEach((sourceName, listIndex) => {
            const destName = destList[listIndex] || destList[destList.length - 1]
            const sourceEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(sourceName) : sourceName
            const allDiscovered = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${sourceEscaped}"]`))

            allDiscovered.forEach((el, instanceIndex) => {
                const morphineId = `${uid}-${listIndex}-${instanceIndex}`
                el.setAttribute("data-morphine-id", morphineId)

                pairs.push({
                    fromName: sourceName,
                    toName: destName,
                    fromSelector: `[data-morphine-id="${morphineId}"]`,
                    toSelector: `[data-morphine-id="${uid}-${listIndex}-${instanceIndex}"]`,
                    fromElement: el,
                    fromTarget: el,
                    hasDiscovered: true,
                    direction,
                })
            })
        })
    }

    // Fallback if no pairs resolved
    if (pairs.length === 0) {
        const maxLength = Math.max(sourceList.length, destList.length)
        for (let i = 0; i < maxLength; i++) {
            const sourceName = sourceList[i] || sourceList[sourceList.length - 1]
            const destName = destList[i] || destList[destList.length - 1]
            const sourceEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(sourceName) : sourceName
            const destEscaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(destName) : destName

            const fromSelector = `[data-framer-name="${sourceEscaped}"]`
            const toSelector = `[data-framer-name="${destEscaped}"]`
            const allDiscovered = Array.from(document.querySelectorAll<HTMLElement>(fromSelector))
            const fromElement = allDiscovered.length > 0 ? findClosestElement(ref, allDiscovered) : null

            pairs.push({
                fromName: sourceName,
                toName: destName,
                fromSelector,
                toSelector,
                fromElement,
                fromTarget: fromElement || fromSelector,
                hasDiscovered: Boolean(fromElement),
                direction,
            })
        }
    }

    return pairs
}

/**
 * Morphine: View Transition Controller for Framer Layout Templates.
 * Coordinates native bidirectional shared-element morphing via Motion's `animateView()`.
 *
 * @framerDisableUnlink
 * @framerIntrinsicWidth 10
 * @framerIntrinsicHeight 10
 */
interface GlobalMorphineState {
    isTransitioning: boolean
    lastTransitionEndTime: number
    debugInfo?: {
        direction: Direction
        pairsCount: number
        navType: string
        fromUrl: string
        toUrl: string
        originMemory: OriginMemory | null
        timestamp: number
    }
}

function getGlobalState(): GlobalMorphineState {
    if (typeof window === "undefined") {
        return { isTransitioning: false, lastTransitionEndTime: 0 }
    }
    if (!(window as any).__MORPHINE_STATE__) {
        ;(window as any).__MORPHINE_STATE__ = {
            isTransitioning: false,
            lastTransitionEndTime: 0,
        }
    }
    return (window as any).__MORPHINE_STATE__
}

function waitForDomChange(maxWaitMs: number = 350): Promise<void> {
    return new Promise((resolve) => {
        let resolved = false
        const done = () => {
            if (!resolved) {
                resolved = true
                if (observer) observer.disconnect()
                resolve()
            }
        }
        let observer: MutationObserver | null = null
        if (typeof MutationObserver !== "undefined" && typeof document !== "undefined" && document.body) {
            observer = new MutationObserver(() => {
                done()
            })
            observer.observe(document.body, { childList: true, subtree: true })
        }
        if (typeof requestAnimationFrame !== "undefined") {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    done()
                })
            })
        }
        setTimeout(done, maxWaitMs)
    })
}

/**
 * Deterministically waits until at least one element matching any of the specified framer names
 * exists in the DOM. Eliminates race conditions between React SPA routing/unmounting and Morphine's tagging.
 */
function waitForTargetElements(
    names: string[] | string,
    timeoutMs: number = 400
): Promise<HTMLElement[]> {
    if (typeof document === "undefined") return Promise.resolve([])
    const nameList = Array.isArray(names) ? names : parseNameList(names, "Card")

    const queryElements = (): HTMLElement[] => {
        for (const name of nameList) {
            const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(name) : name
            const found = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${escaped}"]`))
            if (found.length > 0) return found
        }
        return []
    }

    const immediate = queryElements()
    if (immediate.length > 0) {
        return Promise.resolve(immediate)
    }

    return new Promise((resolve) => {
        let isDone = false
        let observer: MutationObserver | null = null
        let rafId: number | null = null
        let timerId: any = null

        const cleanup = () => {
            if (observer) {
                observer.disconnect()
                observer = null
            }
            if (rafId !== null) {
                cancelAnimationFrame(rafId)
                rafId = null
            }
            if (timerId !== null) {
                clearTimeout(timerId)
                timerId = null
            }
        }

        const check = () => {
            if (isDone) return
            const found = queryElements()
            if (found.length > 0) {
                isDone = true
                cleanup()
                resolve(found)
            }
        }

        if (typeof MutationObserver !== "undefined" && document.body) {
            observer = new MutationObserver(() => {
                check()
            })
            observer.observe(document.body, { childList: true, subtree: true })
        }

        const pollRaf = () => {
            if (isDone) return
            check()
            if (!isDone) {
                rafId = requestAnimationFrame(pollRaf)
            }
        }
        rafId = requestAnimationFrame(pollRaf)

        timerId = setTimeout(() => {
            if (!isDone) {
                isDone = true
                cleanup()
                resolve(queryElements())
            }
        }, timeoutMs)
    })
}

export default function Morphine(props: MorphineProps) {
    const {
        targetFromNames = "Card",
        targetToNames = "Card",
        transition,
        enableEnterExit = true,
        disableEnterExit = false,
        stopEnterExitAnim = false,
        blurAmount = 20,
        exitAnimation,
        enterAnimation,
        showDebugOverlay = false,
        style,
        className,
    } = props

    const [debugState, setDebugState] = useState<any>(null)

    const transitionRef = useRef(transition)
    transitionRef.current = transition

    const isEnterExitActive = enableEnterExit !== false && !disableEnterExit && !stopEnterExitAnim
    const propsRef = useRef({
        targetFromNames,
        targetToNames,
        isEnterExitActive,
        blurAmount,
        exitAnimation,
        enterAnimation,
    })
    propsRef.current = {
        targetFromNames,
        targetToNames,
        isEnterExitActive,
        blurAmount,
        exitAnimation,
        enterAnimation,
    }

    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") return

        // Bypass view transition interception inside Framer canvas editor
        if (RenderTarget.current() === RenderTarget.canvas) return

        // Disable root view-transition CSS crossfade when enter/exit animations are disabled
        if (!isEnterExitActive) {
            injectRootViewTransitionStyles()
        } else {
            removeRootViewTransitionStyles()
        }

        updateLastKnownUrl(window.location.href)

        const globalState = getGlobalState()

        const isBusy = () => {
            if (globalState.isTransitioning) return true
            if (Date.now() - globalState.lastTransitionEndTime < 350) return true
            return false
        }

        // Executes Motion's animateView wrapping the navigation and active target binding
        const performViewTransition = async (
            pairs: ResolvedPair[],
            direction: Direction,
            currentUrlBeforeNav: string,
            performNavigation: () => Promise<void> | void,
            uid: string = "",
            navType: string = "navigate"
        ) => {
            if (globalState.isTransitioning) return
            globalState.isTransitioning = true

            const currentTransition = transitionRef.current
            const toNames = parseNameList(propsRef.current.targetToNames)
            const {
                isEnterExitActive: enterExitActive,
                blurAmount: customBlur,
                exitAnimation: customExit,
                enterAnimation: customEnter,
            } = propsRef.current

            const blurPx = typeof customBlur === "number" ? customBlur : 20
            const defaultTransition = {
                duration: 0.45,
                ease: [0.4, 0, 0.2, 1],
            }
            const effectiveTransition = {
                ...defaultTransition,
                ...currentTransition,
            }

            const info = {
                direction,
                pairsCount: pairs.length,
                navType,
                fromUrl: currentUrlBeforeNav,
                toUrl: window.location.href,
                originMemory: getStoredOriginMemory(),
                timestamp: Date.now(),
            }
            globalState.debugInfo = info
            setDebugState(info)

            try {
                let animation = (animateView as any)(
                    async () => {
                        // 1. Perform navigation / DOM update
                        await performNavigation()

                        // Synchronize canonical route URL in address bar without reload
                        syncCanonicalRouteUrl()

                        // 2. Tag newly mounted elements based on navigation mode
                        if (direction === "forward") {
                            // Ensure destination elements exist in the DOM
                            await waitForTargetElements(toNames, 400)
                            // Tag destination elements on Detail page for the active item [LOCKED]
                            tagForwardDestinationElements(toNames, uid)
                        } else if (direction === "reverse") {
                            // Ensure list card elements exist in the DOM
                            await waitForTargetElements(propsRef.current.targetFromNames, 400)
                            // Tag the exact originating card (e.g. product-2) in the List page
                            tagActiveOriginCardInNewDOM(
                                getStoredOriginMemory(),
                                propsRef.current.targetFromNames,
                                currentUrlBeforeNav,
                                uid
                            )
                        } else if (uid) {
                            // Multi-element fallback tagging
                            await waitForTargetElements(toNames, 400)
                            tagElements(toNames, "data-morphine-id", uid)
                        }
                    },
                    effectiveTransition
                )

                // Framer Motion Page Transition: Animate outgoing (.old) and incoming (.new) root snapshot layers ONLY when enabled
                if (enterExitActive) {
                    const exitKeyframes = customExit || {
                        opacity: [1, 0],
                        filter: ["blur(0px)", `blur(${blurPx}px)`],
                    }
                    const enterKeyframes = customEnter || {
                        opacity: [0, 1],
                        filter: [`blur(${blurPx}px)`, "blur(0px)"],
                    }
                    if (typeof animation.old === "function") {
                        animation = animation.old(exitKeyframes)
                    }
                    if (typeof animation.new === "function") {
                        animation = animation.new(enterKeyframes)
                    }
                }

                // Pass the isolated HTMLElement / unique selector for each shared morph pair via Framer Motion's .add()
                pairs.forEach(({ fromTarget, toSelector }) => {
                    if (typeof animation.add === "function") {
                        animation = animation.add(fromTarget, toSelector)
                    } else if (typeof animation.get === "function") {
                        animation = animation.get(fromTarget)
                    }
                })

                if (animation && typeof animation.finished !== "undefined") {
                    try {
                        await animation.finished
                    } catch (_err) {
                    }
                }
            } catch (_err) {
            } finally {
                cleanupActiveOriginTags()
                syncCanonicalRouteUrl()
                updateLastKnownUrl(window.location.href)
                globalState.isTransitioning = false
                globalState.lastTransitionEndTime = Date.now()
            }
        }

        // 1. Navigation API: Standard browser & SPA route lifecycle for in-page navigation & history traversal
        const nav = (window as any).navigation
        const hasNavApi = Boolean(nav && typeof nav.addEventListener === "function")

        const handleNavigate = (event: any) => {
            if (
                !event ||
                !event.canIntercept ||
                event.downloadRequest ||
                event.formData ||
                event.hashChange
            ) {
                return
            }
            if (isBusy()) return

            let destinationUrl: URL | null = null
            try {
                destinationUrl = new URL(event.destination.url)
                if (destinationUrl.origin !== window.location.origin) return
                if (destinationUrl.href === window.location.href) return
            } catch (_e) {
                return
            }

            const { targetFromNames: fromNames, targetToNames: toNames } = propsRef.current
            const fromList = parseNameList(fromNames, "Card")
            const toList = parseNameList(toNames, "Card")
            const currentUrl = window.location.href
            const targetUrlStr = destinationUrl ? destinationUrl.href : ""

            // If navigationType is traverse (back/forward history), prioritize reverse when navigating back
            let forcedDir: Direction
            if (event.navigationType === "traverse") {
                forcedDir = "reverse"
            } else {
                forcedDir = detectNavigationDirection(fromList, toList, null, null, currentUrl, targetUrlStr)
            }

            const uid = generateUID()
            const pairs = resolveBidirectionalPairs(fromNames, toNames, null, null, forcedDir, uid)
            const hasDiscoveredElements = pairs.some((p) => p.hasDiscovered)
            if (!hasDiscoveredElements) return

            const direction = pairs[0]?.direction || forcedDir
            updateLastKnownUrl(currentUrl)

            // Wrap the navigation handler inside animateView
            event.intercept({
                async handler() {
                    await performViewTransition(pairs, direction, currentUrl, async () => {
                        await waitForDomChange(350)
                    }, uid, event.navigationType || "navigate")
                    updateLastKnownUrl(window.location.href)
                    syncCanonicalRouteUrl()
                },
            })
        }

        if (hasNavApi) {
            nav.addEventListener("navigate", handleNavigate)
        }

        // 2. History popstate listener: Universal fallback & standard browser Back/Forward button support
        const handlePopState = (_event: PopStateEvent) => {
            // Guard against transitions already running or within the cooldown period
            if (isBusy()) return

            const previousUrl = lastKnownUrl || window.location.href
            const targetUrl = window.location.href
            updateLastKnownUrl(targetUrl)

            const { targetFromNames: fromNames, targetToNames: toNames } = propsRef.current
            const fromList = parseNameList(fromNames, "Card")
            const toList = parseNameList(toNames, "Card")

            // Popstate is triggered by back/forward button, default to reverse if memory or detection matches
            let direction = detectNavigationDirection(fromList, toList, null, null, previousUrl, targetUrl)
            if (direction !== "forward") {
                direction = "reverse"
            } else if (getStoredOriginMemory()) {
                direction = "reverse"
            }

            const uid = generateUID()
            const pairs = resolveBidirectionalPairs(fromNames, toNames, null, null, direction, uid)
            const hasDiscoveredElements = pairs.some((p) => p.hasDiscovered)
            if (!hasDiscoveredElements) return

            performViewTransition(pairs, direction, previousUrl, async () => {
                await waitForDomChange(350)
                syncCanonicalRouteUrl()
            }, uid, "popstate")
        }

        window.addEventListener("popstate", handlePopState, { capture: true })

        // 3. Link click interception: Integrates with Framer's client-side link router (bidirectional)
        const handleClick = (event: MouseEvent) => {
            if (isModifiedOrNonPrimaryClick(event)) return
            if (isBusy()) return

            const target = event.target as HTMLElement | null
            if (!target) return

            const link = target.closest("a[href]") as HTMLAnchorElement | null
            if (!link || !link.href) return

            const rawHref = link.getAttribute("href") || link.href
            const canonical = normalizeRouteUrl(rawHref, window.location.href)
            const targetUrl = canonical.url || link.href

            try {
                const url = new URL(targetUrl, window.location.href)
                if (url.origin !== window.location.origin) return
                if (url.href === window.location.href) return
                if (link.target === "_blank") return
            } catch (_e) {
                return
            }

            const { targetFromNames: fromNames, targetToNames: toNames } = propsRef.current
            // Resolve active pairs bidirectionally scoped strictly to the clicked card / detail / link
            const uid = generateUID()
            const pairs = resolveBidirectionalPairs(fromNames, toNames, target, link, undefined, uid)
            const hasDiscoveredElements = pairs.some((p) => p.hasDiscovered)
            if (!hasDiscoveredElements) return

            const direction = pairs[0]?.direction || "forward"
            const currentUrl = window.location.href
            updateLastKnownUrl(currentUrl)

            // Intercept initial click and execute the existing navigation inside animateView
            event.preventDefault()

            performViewTransition(pairs, direction, currentUrl, async () => {
                try {
                    if (hasNavApi && typeof nav.navigate === "function") {
                        const navPromise = nav.navigate(targetUrl)
                        if (navPromise && navPromise.finished) {
                            await navPromise.finished
                        }
                    } else {
                        // Invoke Framer's native router handler on the link
                        link.click()
                        await waitForDomChange(350)
                    }
                    syncCanonicalRouteUrl()
                } catch (_err) {}
            }, uid, "click")
        }

        document.addEventListener("click", handleClick, { capture: true })

        return () => {
            removeRootViewTransitionStyles()
            if (hasNavApi) {
                nav.removeEventListener("navigate", handleNavigate)
            }
            window.removeEventListener("popstate", handlePopState, { capture: true })
            document.removeEventListener("click", handleClick, { capture: true })
        }
    }, [isEnterExitActive])

    return (
        <>
            <div
                style={{
                    display: "none",
                    width: 0,
                    height: 0,
                    opacity: 0,
                    pointerEvents: "none",
                    ...style,
                }}
                className={className}
                aria-hidden="true"
                data-framer-name="MorphineController"
            />
            {showDebugOverlay && (
                <div
                    id="morphine-debug-hud"
                    style={{
                        position: "fixed",
                        bottom: 16,
                        right: 16,
                        zIndex: 999999,
                        background: "rgba(15, 23, 42, 0.85)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 12,
                        padding: "12px 16px",
                        color: "#f8fafc",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontSize: 11,
                        lineHeight: 1.5,
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
                        maxWidth: 320,
                        pointerEvents: "none",
                        userSelect: "none",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Morphine HUD</span>
                        <span style={{ fontSize: 9, background: isEnterExitActive ? "#10b98133" : "#ef444433", color: isEnterExitActive ? "#34d399" : "#f87171", padding: "2px 6px", borderRadius: 4 }}>
                            {isEnterExitActive ? "EnterExit ON" : "EnterExit OFF"}
                        </span>
                    </div>
                    {debugState ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <div>
                                <span style={{ color: "#94a3b8" }}>Direction: </span>
                                <strong style={{ color: debugState.direction === "forward" ? "#a7f3d0" : "#fed7aa" }}>
                                    {debugState.direction.toUpperCase()}
                                </strong>
                            </div>
                            <div>
                                <span style={{ color: "#94a3b8" }}>Nav Type: </span>
                                <span style={{ color: "#e2e8f0" }}>{debugState.navType}</span>
                            </div>
                            <div>
                                <span style={{ color: "#94a3b8" }}>Pairs Matched: </span>
                                <span style={{ color: "#e2e8f0" }}>{debugState.pairsCount}</span>
                            </div>
                            {debugState.originMemory && (
                                <div style={{ borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 3, marginTop: 2 }}>
                                    <span style={{ color: "#94a3b8" }}>Origin Memory: </span>
                                    <div style={{ color: "#cbd5e1", fontSize: 10 }}>
                                        card: {debugState.originMemory.cardName || "none"} [idx: {debugState.originMemory.index}]
                                    </div>
                                    <div style={{ color: "#94a3b8", fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        slug: {debugState.originMemory.slug || "none"}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ color: "#64748b", fontStyle: "italic" }}>
                            Idle (Ready for transition)
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

Morphine.displayName = "Morphine"

Morphine.defaultProps = {
    targetFromNames: "Card",
    targetToNames: "Card",
    enableEnterExit: true,
    blurAmount: 20,
    showDebugOverlay: false,
}

addPropertyControls(Morphine, {
    targetFromNames: {
        type: ControlType.String,
        title: "Target From",
        defaultValue: "Card",
        description: "data-framer-name of the source element (e.g. Card, Image, Title).",
    },
    targetToNames: {
        type: ControlType.String,
        title: "Target To",
        defaultValue: "Card",
        description: "data-framer-name of the destination element (e.g. DetailCard, DetailImage).",
    },
    enableEnterExit: {
        type: ControlType.Boolean,
        title: "Enter/Exit Anim",
        defaultValue: true,
        description: "Enable fade & blur animations on non-shared surrounding elements during transition.",
    },
    blurAmount: {
        type: ControlType.Number,
        title: "Blur Amount",
        defaultValue: 20,
        min: 0,
        max: 60,
        step: 2,
        unit: "px",
        hidden(props) {
            return props.enableEnterExit === false
        },
        description: "Pixel radius for the fade & blur transition (e.g. 20px).",
    },
    showDebugOverlay: {
        type: ControlType.Boolean,
        title: "Debug Overlay",
        defaultValue: false,
        description: "Displays a floating HUD in the bottom right corner with real-time transition diagnostics.",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
    },
})
