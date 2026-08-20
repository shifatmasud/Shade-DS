import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef } from "react"
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
    const allCards = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${escaped}"]`))

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

export interface MorphineProps {
    targetFromNames?: string
    targetToNames?: string
    transition?: any
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

const ROOT_VIEW_TRANSITION_RESET_ID = "morphine-vt-root-reset"
const ROOT_VIEW_TRANSITION_CSS = `
::view-transition-old(root),
::view-transition-new(root),
::view-transition-group(root) {
    animation: none !important;
}
`

function injectRootTransitionReset(): () => void {
    if (typeof document === "undefined") return () => {}

    let styleEl = document.getElementById(ROOT_VIEW_TRANSITION_RESET_ID) as HTMLStyleElement | null
    if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = ROOT_VIEW_TRANSITION_RESET_ID
        styleEl.textContent = ROOT_VIEW_TRANSITION_CSS
        document.head.appendChild(styleEl)
    }

    return () => {}
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

/**
 * Detects whether current navigation is Forward (From -> To)
 * or Reverse (To -> From) based on existing DOM elements, URL route depth, origin memory, and user interaction.
 */
function detectNavigationDirection(
    fromList: string[],
    toList: string[],
    clickRef?: HTMLElement | null,
    clickLink?: HTMLAnchorElement | null
): Direction {
    if (typeof document === "undefined") return "forward"

    const memory = getStoredOriginMemory()
    const currentUrl = typeof window !== "undefined" ? window.location.href : ""
    const currentPath = typeof window !== "undefined" ? window.location.pathname : ""

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
            const targetPath = targetUrl.pathname.replace(/\/+$/, "")
            const curPath = currentPath.replace(/\/+$/, "")
            if (
                targetPath.length < curPath.length &&
                (curPath.startsWith(targetPath) || targetPath === "" || targetPath === "/")
            ) {
                return "reverse"
            }
        } catch (_e) {}
    }

    // 3. Check if current URL matches the recorded detail memory and we are navigating away
    if (memory) {
        const memSlug = memory.slug || extractSlug(memory.url || memory.pathname)
        if (memSlug && (currentUrl.includes(memSlug) || currentPath.includes(memSlug))) {
            return "reverse"
        }
    }

    // 4. If click is explicitly inside an element matching targetToNames, it's a reverse transition
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

            const allDiscovered = Array.from(document.querySelectorAll<HTMLElement>(`[data-framer-name="${sourceEscaped}"]`))
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
export default function Morphine(props: MorphineProps) {
    const {
        targetFromNames = "Card",
        targetToNames = "Card",
        transition,
        style,
        className,
    } = props

    const transitionRef = useRef(transition)
    transitionRef.current = transition

    const propsRef = useRef({ targetFromNames, targetToNames })
    propsRef.current = { targetFromNames, targetToNames }

    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") return

        // Suppress default root-level page view transition crossfades
        injectRootTransitionReset()

        // Bypass view transition interception inside Framer canvas editor
        if (RenderTarget.current() === RenderTarget.canvas) return

        let isNavigating = false

        // Executes Motion's animateView wrapping the navigation and active target binding
        const performViewTransition = async (
            pairs: ResolvedPair[],
            direction: Direction,
            currentUrlBeforeNav: string,
            performNavigation: () => Promise<void> | void,
            uid: string = ""
        ) => {
            const currentTransition = transitionRef.current
            const toNames = parseNameList(propsRef.current.targetToNames)

            let animation = (animateView as any)(
                async () => {
                    // 1. Perform navigation / DOM update
                    await performNavigation()

                    // Synchronize canonical route URL in address bar without reload
                    syncCanonicalRouteUrl()

                    // 2. Tag newly mounted elements based on navigation mode
                    if (direction === "forward") {
                        // Tag destination elements on Detail page for the active item [LOCKED]
                        tagForwardDestinationElements(toNames, uid)
                    } else if (direction === "reverse") {
                        // Tag the exact originating card (e.g. product-2) in the List page
                        tagActiveOriginCardInNewDOM(
                            getStoredOriginMemory(),
                            propsRef.current.targetFromNames,
                            currentUrlBeforeNav,
                            uid
                        )
                    } else if (uid) {
                        // Multi-element fallback tagging
                        tagElements(toNames, "data-morphine-id", uid)
                    }
                },
                currentTransition
            )

            // Pass the isolated HTMLElement / unique selector for each pair
            pairs.forEach(({ fromTarget, toSelector }) => {
                animation = animation.add(fromTarget, toSelector)
            })

            if (animation && typeof animation.finished !== "undefined") {
                try {
                    await animation.finished
                } catch (_err) {
                } finally {
                    cleanupActiveOriginTags()
                    syncCanonicalRouteUrl()
                }
            }
        }

        // 1. Navigation API: Standard browser & SPA route lifecycle (forward & history traversal)
        const nav = (window as any).navigation
        const hasNavApi = Boolean(nav && typeof nav.addEventListener === "function")

        const handleNavigate = (event: any) => {
            if (!event || !event.canIntercept || event.downloadRequest || event.formData || event.hashChange) {
                return
            }
            if (isNavigating) return

            try {
                const destinationUrl = new URL(event.destination.url)
                if (destinationUrl.origin !== window.location.origin) return
                if (destinationUrl.href === window.location.href) return
            } catch (_e) {
                return
            }

            const { targetFromNames: fromNames, targetToNames: toNames } = propsRef.current
            const isTraverse = event.navigationType === "traverse"
            const forcedDir: Direction | undefined = isTraverse ? "reverse" : undefined

            const uid = generateUID()
            const pairs = resolveBidirectionalPairs(fromNames, toNames, null, null, forcedDir, uid)
            const hasDiscoveredElements = pairs.some((p) => p.hasDiscovered)
            if (!hasDiscoveredElements) return

            const direction = pairs[0]?.direction || "forward"
            const currentUrl = window.location.href

            // Wrap the navigation handler inside animateView
            event.intercept({
                async handler() {
                    await performViewTransition(pairs, direction, currentUrl, async () => {
                        // The intercepted navigation commits and renders the destination page
                    }, uid)
                    syncCanonicalRouteUrl()
                },
            })
        }

        if (hasNavApi) {
            nav.addEventListener("navigate", handleNavigate)
        }

        // 2. Link click interception: Integrates with Framer's client-side link router (bidirectional)
        const handleClick = (event: MouseEvent) => {
            if (isModifiedOrNonPrimaryClick(event)) return
            if (isNavigating) return

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

            // Intercept initial click and execute the existing navigation inside animateView
            event.preventDefault()

            performViewTransition(pairs, direction, currentUrl, async () => {
                isNavigating = true
                try {
                    if (hasNavApi && typeof nav.navigate === "function") {
                        const navPromise = nav.navigate(targetUrl)
                        if (navPromise && navPromise.finished) {
                            await navPromise.finished
                        }
                    } else {
                        // Invoke Framer's native router handler on the link
                        link.click()
                    }
                    syncCanonicalRouteUrl()
                } finally {
                    isNavigating = false
                }
            }, uid)
        }

        document.addEventListener("click", handleClick, { capture: true })

        return () => {
            if (hasNavApi) {
                nav.removeEventListener("navigate", handleNavigate)
            }
            document.removeEventListener("click", handleClick, { capture: true })
        }
    }, [])

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: ROOT_VIEW_TRANSITION_CSS }} />
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
        </>
    )
}

Morphine.displayName = "Morphine"

Morphine.defaultProps = {
    targetFromNames: "Card",
    targetToNames: "Card",
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
    transition: {
        type: ControlType.Transition,
        title: "Transition",
    },
})
