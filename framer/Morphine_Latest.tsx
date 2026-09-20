//https://framer.com/m/Morphine-vMQiuU.js@PHiUkMBdhqYOYF1RmSQW

//https://global-tasks-459969.framer.app/


import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { animateView } from "framer-motion"

/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

/** ControlType.Transition value — passed straight into animateView() */
type TransitionValue = Record<string, unknown>

export interface MorphineProps {
    /** @deprecated use from */
    targetFromNames?: string
    /** @deprecated use to */
    targetToNames?: string
    from?: string
    to?: string
    /** Passed directly to animateView(update, transition) */
    transition?: TransitionValue
    morphChildren?: boolean
    childDepth?: number
    crop?: boolean
    /** Fade + blur 20px on non-shared root layers */
    enterExitAnim?: boolean
    /** @deprecated use enterExitAnim */
    enableEnterExit?: boolean
    telemetry?: boolean
    /** @deprecated use telemetry */
    showDebugOverlay?: boolean
    maxLogs?: number
    /** @deprecated use maxLogs */
    maxLogEntries?: number
    style?: CSSProperties
    className?: string
}

type Direction = "forward" | "reverse"

type OriginMemory = {
    index: number
    pathname: string
    slug: string
    timestamp: number
}

type PendingMorph = {
    id: string
    direction: Direction
    source: HTMLElement | null
    fromNames: string[]
    toNames: string[]
    destinationUrl: string
    origin: OriginMemory | null
}

type LogLevel = "info" | "warn" | "error" | "success"

type LogEntry = {
    id: string
    t: number
    level: LogLevel
    msg: string
    data?: Record<string, unknown>
}

/* ========================================================================= */
/* GLOBAL + TELEMETRY                                                        */
/* ========================================================================= */

type MorphineGlobal = {
    installed: boolean
    originalStartViewTransition: typeof document.startViewTransition | null
    pending: PendingMorph | null
    logs: LogEntry[]
    maxLogs: number
    listeners: Set<() => void>
    transition: TransitionValue
    morphChildren: boolean
    childDepth: number
    crop: boolean
    enableEnterExit: boolean
}

const DEFAULT_TRANSITION: TransitionValue = {
    type: "spring",
    duration: 0.45,
    bounce: 0.12,
}

function getGlobal(): MorphineGlobal {
    if (typeof window === "undefined") {
        return {
            installed: false,
            originalStartViewTransition: null,
            pending: null,
            logs: [],
            maxLogs: 80,
            listeners: new Set(),
            transition: { ...DEFAULT_TRANSITION },
            morphChildren: true,
            childDepth: 2,
            crop: false,
            enableEnterExit: true,
        }
    }

    const key = "__MORPHINE_ANIMATE_VIEW_V1__"

    if (!(window as any)[key]) {
        ;(window as any)[key] = {
            installed: false,
            originalStartViewTransition: null,
            pending: null,
            logs: [],
            maxLogs: 80,
            listeners: new Set(),
            transition: { ...DEFAULT_TRANSITION },
            morphChildren: true,
            childDepth: 2,
            crop: false,
            enableEnterExit: true,
        }
    }

    return (window as any)[key]
}

function emitLog(level: LogLevel, msg: string, data?: Record<string, unknown>) {
    const global = getGlobal()
    const entry: LogEntry = {
        id: "log-" + Math.random().toString(36).slice(2, 9),
        t: Date.now(),
        level,
        msg,
        data,
    }
    global.logs = [...global.logs, entry].slice(-global.maxLogs)
    if (typeof console !== "undefined") {
        const payload = data ? [msg, data] : [msg]
        if (level === "error") console.error("[Morphine]", ...payload)
        else if (level === "warn") console.warn("[Morphine]", ...payload)
        else console.log("[Morphine]", ...payload)
    }
    global.listeners.forEach((fn) => {
        try {
            fn()
        } catch {}
    })
}

function formatLogsForCopy(logs: LogEntry[]) {
    return logs
        .map((e) => {
            const time = new Date(e.t).toISOString()
            const data = e.data ? " " + JSON.stringify(e.data) : ""
            return `[${time}] [${e.level.toUpperCase()}] ${e.msg}${data}`
        })
        .join("\n")
}

/* ========================================================================= */
/* ORIGIN MEMORY                                                             */
/* ========================================================================= */

const ORIGIN_KEY = "morphine-animate-view-origin"

function getOriginMemory(): OriginMemory | null {
    if (typeof window === "undefined") return null
    try {
        const raw = sessionStorage.getItem(ORIGIN_KEY)
        if (!raw) return null
        return JSON.parse(raw)
    } catch {
        return null
    }
}

function saveOriginMemory(memory: OriginMemory) {
    if (typeof window === "undefined") return
    try {
        sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(memory))
    } catch {}
}

function clearOriginMemory() {
    if (typeof window === "undefined") return
    try {
        sessionStorage.removeItem(ORIGIN_KEY)
    } catch {}
}

/* ========================================================================= */
/* UTILITIES                                                                 */
/* ========================================================================= */

function generateId() {
    return "morphine-" + Math.random().toString(36).slice(2, 10)
}

function parseNames(value?: string, fallback = "Card") {
    const names = (value || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    return names.length ? names : [fallback]
}

function escapeAttribute(value: string) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(value)
    }
    return value.replace(/["\\]/g, "\\$&")
}

function selectorForName(name: string) {
    return `[data-framer-name="${escapeAttribute(name)}"]`
}

function pathSlug(pathname: string) {
    const parts = pathname.split("/").filter(Boolean)
    return decodeURIComponent(parts[parts.length - 1] || "").toLowerCase()
}

function escapeSlug(slug: string) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(slug)
    }
    return slug.replace(/"/g, '\\"')
}

/**
 * Framer often makes the Card itself an <a href="./studies/slug">.
 * Prefer [data-framer-name=Card][href*="slug"], with :has() fallback.
 */
function scopedCardSelector(cardName: string, pathnameOrUrl: string) {
    const path = normalizePath(pathnameOrUrl)
    const slug = pathSlug(path)
    const base = selectorForName(cardName)
    if (!slug) return base
    const esc = escapeSlug(slug)
    // Self is <a>, or wraps <a>, or index fallback handled by caller
    return [
        base + '[href*="' + esc + '"]',
        "a" + base + '[href*="' + esc + '"]',
        base + ':has(a[href*="' + esc + '"])',
    ].join(", ")
}

function scopedChildSelector(
    cardName: string,
    pathnameOrUrl: string,
    childName: string
) {
    const path = normalizePath(pathnameOrUrl)
    const slug = pathSlug(path)
    const child = selectorForName(childName)
    if (!slug) return child
    const esc = escapeSlug(slug)
    const base = selectorForName(cardName)
    return [
        base + '[href*="' + esc + '"] ' + child,
        "a" + base + '[href*="' + esc + '"] ' + child,
        base + ':has(a[href*="' + esc + '"]) ' + child,
    ].join(", ")
}

/** Resolve the correct list card element after DOM update (index + href). */
function resolveListCard(
    cardName: string,
    origin: { index: number; pathname: string; slug: string } | null
): HTMLElement | null {
    const cards = Array.from(
        document.querySelectorAll<HTMLElement>(selectorForName(cardName))
    )
    if (!cards.length) return null

    if (origin) {
        const slug = (origin.slug || pathSlug(origin.pathname)).toLowerCase()
        const byHref = cards.find((el) => {
            const href = (
                (el as HTMLAnchorElement).href ||
                el.getAttribute("href") ||
                el.querySelector("a")?.getAttribute("href") ||
                ""
            ).toLowerCase()
            return slug && href.includes(slug)
        })
        if (byHref) return byHref
        if (cards[origin.index]) return cards[origin.index]
    }
    return cards[0]
}

function normalizePath(url: string) {
    try {
        return (
            new URL(url, window.location.href).pathname.replace(/\/+$/, "") ||
            "/"
        )
    } catch {
        return "/"
    }
}

function extractSlug(url: string) {
    try {
        const pathname = new URL(url, window.location.href).pathname
        const parts = pathname.split("/").filter(Boolean)
        return decodeURIComponent(parts[parts.length - 1] || "")
            .toLowerCase()
            .trim()
    } catch {
        return ""
    }
}

function getLinks(element: HTMLElement) {
    const links: HTMLAnchorElement[] = []
    if (element instanceof HTMLAnchorElement && element.href)
        links.push(element)
    element.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
        if (link.href) links.push(link)
    })
    const parent = element.closest("a[href]")
    if (parent instanceof HTMLAnchorElement && parent.href) links.push(parent)
    return Array.from(new Set(links))
}

function describeEl(el: HTMLElement | null) {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
        name: el.getAttribute("data-framer-name"),
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
    }
}

function linkMatches(link: HTMLAnchorElement, destinationUrl: string) {
    try {
        const a = new URL(link.href, window.location.href)
        const b = new URL(destinationUrl, window.location.href)
        return (
            a.origin === b.origin &&
            normalizePath(a.href) === normalizePath(b.href)
        )
    } catch {
        return false
    }
}

function findOrigin(name: string, destinationUrl: string) {
    const elements = Array.from(
        document.querySelectorAll<HTMLElement>(selectorForName(name))
    )
    for (let index = 0; index < elements.length; index++) {
        const element = elements[index]
        if (
            getLinks(element).some((link) => linkMatches(link, destinationUrl))
        ) {
            return { element, index }
        }
    }
    return null
}

function getDirection(event: any, destinationUrl: string): Direction {
    if (event.navigationType === "traverse") {
        const navigation = (window as any).navigation
        const currentIndex = navigation?.currentEntry?.index
        const destinationIndex = event.destination?.index
        if (
            typeof currentIndex === "number" &&
            typeof destinationIndex === "number"
        ) {
            return destinationIndex < currentIndex ? "reverse" : "forward"
        }
        return "reverse"
    }
    const current = normalizePath(window.location.href)
    const destination = normalizePath(destinationUrl)
    if (
        current !== "/" &&
        destination.length < current.length &&
        (current.startsWith(destination) || destination === "/")
    ) {
        return "reverse"
    }
    return "forward"
}

/**
 * Collect nested targets for .add(old, new) pairing.
 * Prefers data-framer-name keys so list/detail children match.
 */
function collectChildPairs(
    source: HTMLElement,
    listCardName: string,
    matchPath: string,
    depth: number,
    scopeNew: boolean
): Array<{ oldEl: HTMLElement; newSelector: string; key: string }> {
    if (depth <= 0) return []

    const pairs: Array<{
        oldEl: HTMLElement
        newSelector: string
        key: string
    }> = []
    const seen = new Set<string>()

    const walk = (node: HTMLElement, remaining: number) => {
        if (remaining <= 0) return
        Array.from(node.children).forEach((child) => {
            if (!(child instanceof HTMLElement)) return
            const name = child.getAttribute("data-framer-name")
            if (name && name !== "MorphineController" && !seen.has(name)) {
                seen.add(name)
                const newSelector = scopeNew
                    ? scopedChildSelector(listCardName, matchPath, name)
                    : selectorForName(name)
                pairs.push({
                    oldEl: child,
                    newSelector,
                    key: name,
                })
            }
            walk(child, remaining - 1)
        })
    }

    walk(source, depth)
    return pairs
}

/* ========================================================================= */
/* animateView BRIDGE                                                        */
/* ========================================================================= */

function installAnimateViewBridge() {
    if (typeof document === "undefined") return
    if (typeof document.startViewTransition !== "function") {
        emitLog("error", "View Transitions API missing")
        return
    }
    if (typeof animateView !== "function") {
        emitLog(
            "error",
            "animateView is not available from framer-motion — check package version"
        )
        return
    }

    const global = getGlobal()
    if (global.installed) return

    const original = document.startViewTransition.bind(document)
    global.originalStartViewTransition = document.startViewTransition

    /**
     * Framer calls startViewTransition during navigation.
     * When a Morphine morph is armed, route through animateView so the
     * ControlType.Transition prop is applied natively (no spring() / CSS hacks).
     */
    document.startViewTransition = ((updateCallback: any, _options?: any) => {
        const pending = global.pending

        if (!pending || !pending.source) {
            return _options !== undefined
                ? (original as any)(updateCallback, _options)
                : original(updateCallback)
        }

        emitLog("info", "animateView morph", {
            id: pending.id,
            direction: pending.direction,
            transition: global.transition,
            source: describeEl(pending.source),
        })

        // Temporarily restore native API so animateView can call it
        document.startViewTransition = original

        const listCardName =
            pending.direction === "forward"
                ? pending.fromNames[0] || "Card"
                : pending.fromNames[0] || "Card"
        const detailCardName =
            pending.direction === "forward"
                ? pending.toNames[0] || "Card"
                : pending.toNames[0] || "Card"

        /*
         * Forward: OLD = specific list card (element), NEW = detail Card (one on page)
         * Reverse: OLD = detail Card, NEW = the list card matching origin path
         *          (NOT the first [data-framer-name=Card] on the grid)
         */
        let destSelector: string
        let matchPath: string
        let scopeChildrenToListCard = false

        if (pending.direction === "forward") {
            destSelector = selectorForName(detailCardName)
            matchPath = normalizePath(pending.destinationUrl)
            scopeChildrenToListCard = false
        } else {
            matchPath =
                pending.origin?.pathname || normalizePath(window.location.href)
            destSelector = scopedCardSelector(listCardName, matchPath)
            scopeChildrenToListCard = true
        }

        let builder: any
        try {
            builder = animateView(async () => {
                await updateCallback()
            }, global.transition as any)

            /*
             * Root surrounding content (non-shared).
             * currentSubject starts as "root". enter/exit are presence-gated and
             * never fire on survivors (root + morphing card both exist in old+new).
             * Use ungated .old() / .new() on root BEFORE any .add().
             */
            if (global.enableEnterExit) {
                if (typeof builder.old === "function") {
                    builder.old(
                        {
                            opacity: [1, 0],
                            filter: ["blur(0px)", "blur(20px)"],
                        },
                        global.transition as any
                    )
                }
                if (typeof builder.new === "function") {
                    builder.new(
                        {
                            opacity: [0, 1],
                            filter: ["blur(20px)", "blur(0px)"],
                        },
                        global.transition as any
                    )
                }
                emitLog("info", "root enter/exit (old/new) enabled", {
                    old: "opacity 1→0, blur 0→20px",
                    new: "opacity 0→1, blur 20px→0",
                })
            }

            // Shared-element pair
            builder.add(pending.source, destSelector)

            emitLog("info", "pair targets", {
                direction: pending.direction,
                destSelector,
                matchPath,
            })

            // Nested children scoped to the same card on reverse
            if (global.morphChildren) {
                const childPairs = collectChildPairs(
                    pending.source,
                    listCardName,
                    matchPath,
                    global.childDepth,
                    scopeChildrenToListCard
                )
                childPairs.forEach(({ oldEl, newSelector, key }) => {
                    builder.add(oldEl, newSelector)
                    emitLog("info", "child pair", { key, newSelector })
                })
            }

            // Text morphs: crop off so glyphs aren't clipped while box grows
            if (!global.crop && typeof builder.crop === "function") {
                builder.crop(false)
            }

            emitLog("success", "animateView configured", {
                id: pending.id,
                destSelector,
                transition: global.transition,
            })
        } catch (error) {
            emitLog("error", "animateView failed — falling back to native", {
                error: String(error),
            })
            document.startViewTransition = (
                document.startViewTransition === original
                    ? (cb: any, opts?: any) => {
                          // re-enter wrapped path only after restore below
                          return opts !== undefined
                              ? (original as any)(cb, opts)
                              : original(cb)
                      }
                    : document.startViewTransition
            ) as any
            // Fall back
            const vt =
                _options !== undefined
                    ? (original as any)(updateCallback, _options)
                    : original(updateCallback)
            queueMicrotask(() => {
                document.startViewTransition =
                    document.startViewTransition as any
                // reinstall wrapper
                installAnimateViewBridgeForce()
            })
            return vt
        }

        // Re-install wrapper after Motion has scheduled the transition
        queueMicrotask(() => {
            installAnimateViewBridgeForce()
        })

        const finished = Promise.resolve(builder).then(
            () => {
                emitLog("info", "animateView finished", { id: pending.id })
                if (pending.direction === "reverse") clearOriginMemory()
                if (global.pending?.id === pending.id) global.pending = null
            },
            (err: unknown) => {
                emitLog("warn", "animateView rejected", {
                    error: String(err),
                })
                if (global.pending?.id === pending.id) global.pending = null
            }
        )

        // Framer may expect a ViewTransition-like return
        return {
            finished,
            ready: finished,
            updateCallbackDone: finished,
            skipTransition: () => {},
            types: [],
        } as unknown as ViewTransition
    }) as typeof document.startViewTransition

    global.installed = true
    emitLog("success", "Morphine animateView bridge installed", {
        transition: global.transition,
    })
}

function installAnimateViewBridgeForce() {
    const global = getGlobal()
    global.installed = false
    installAnimateViewBridge()
}

/* ========================================================================= */
/* COMPONENT                                                                 */
/* ========================================================================= */

/**
 * Morphine — shared-element page morphs via Motion animateView().
 * Transition is ControlType.Transition, passed directly to animateView.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 */
export default function Morphine(props: MorphineProps) {
    const {
        targetFromNames,
        targetToNames,
        from,
        to,
        transition = DEFAULT_TRANSITION,
        morphChildren = true,
        childDepth = 2,
        crop = false,
        enterExitAnim,
        enableEnterExit,
        telemetry,
        showDebugOverlay,
        maxLogs,
        maxLogEntries,
        style,
        className,
    } = props

    const resolvedFrom = from || targetFromNames || "Card"
    const resolvedTo = to || targetToNames || "Card"
    const resolvedEnterExit = enterExitAnim ?? enableEnterExit ?? true
    const resolvedTelemetry = telemetry ?? showDebugOverlay ?? true
    const resolvedMaxLogs = maxLogs ?? maxLogEntries ?? 80

    const [logs, setLogs] = useState<LogEntry[]>([])
    const [lastEvent, setLastEvent] = useState("Idle")
    const [copied, setCopied] = useState(false)
    const logBoxRef = useRef<HTMLDivElement>(null)

    const propsRef = useRef({ targetFromNames: resolvedFrom, targetToNames: resolvedTo })
    propsRef.current = { targetFromNames: resolvedFrom, targetToNames: resolvedTo }

    useEffect(() => {
        const global = getGlobal()
        global.maxLogs = resolvedMaxLogs
        global.transition = (transition ||
            DEFAULT_TRANSITION) as TransitionValue
        global.morphChildren = !!morphChildren
        global.childDepth = Math.max(0, Math.min(4, Math.round(childDepth || 2)))
        global.crop = !!crop
        global.enableEnterExit = !!resolvedEnterExit
        emitLog("info", "Transition prop updated", {
            transition: global.transition,
            morphChildren,
            childDepth: global.childDepth,
            crop,
            enterExitAnim: global.enableEnterExit,
        })
    }, [transition, morphChildren, childDepth, crop, resolvedEnterExit, resolvedMaxLogs])

    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return
        }
        if (RenderTarget.current() === RenderTarget.canvas) return

        const global = getGlobal()
        installAnimateViewBridge()

        const sync = () => {
            setLogs([...global.logs])
            const last = global.logs[global.logs.length - 1]
            if (last) setLastEvent(last.msg)
        }
        global.listeners.add(sync)
        sync()

        const navigation = (window as any).navigation
        if (!navigation || typeof navigation.addEventListener !== "function") {
            emitLog("error", "Navigation API missing")
            return () => {
                global.listeners.delete(sync)
            }
        }

        emitLog("info", "Morphine mounted (animateView)", {
            from: resolvedFrom,
            to: resolvedTo,
            path: window.location.pathname,
            transition: global.transition,
            hasAnimateView: typeof animateView === "function",
        })

        const handleNavigate = (event: any) => {
            if (!event) return
            if (event.downloadRequest || event.formData || event.hashChange) {
                return
            }

            const destinationUrl = event.destination?.url
            if (typeof destinationUrl !== "string") return
            if (
                normalizePath(destinationUrl) ===
                normalizePath(window.location.href)
            ) {
                return
            }

            const fromNames = parseNames(propsRef.current.targetFromNames)
            const toNames = parseNames(propsRef.current.targetToNames)
            const direction = getDirection(event, destinationUrl)

            emitLog("info", "navigate", {
                direction,
                from: normalizePath(window.location.href),
                to: normalizePath(destinationUrl),
            })

            if (global.pending) {
                emitLog("warn", "Skipped — morph already pending")
                return
            }

            let source: HTMLElement | null = null
            let origin: OriginMemory | null = null

            if (direction === "forward") {
                const result = findOrigin(fromNames[0], destinationUrl)
                if (result) {
                    source = result.element
                    origin = {
                        index: result.index,
                        pathname: normalizePath(destinationUrl),
                        slug: extractSlug(destinationUrl),
                        timestamp: Date.now(),
                    }
                    saveOriginMemory(origin)
                    emitLog("success", "Forward source", {
                        source: describeEl(source),
                    })
                } else {
                    emitLog("error", "No Card matching destination link", {
                        name: fromNames[0],
                        destinationUrl,
                    })
                }
            }

            if (direction === "reverse") {
                source = document.querySelector<HTMLElement>(
                    selectorForName(toNames[0])
                )
                origin = getOriginMemory()
                emitLog(source ? "success" : "error", "Reverse source", {
                    source: describeEl(source),
                })
            }

            if (!source) {
                emitLog("warn", "No source — Framer default transition")
                return
            }

            global.pending = {
                id: generateId(),
                direction,
                source,
                fromNames,
                toNames,
                destinationUrl,
                origin,
            }

            emitLog("success", "Morph armed for animateView", {
                id: global.pending.id,
                direction,
                source: describeEl(source),
            })
        }

        navigation.addEventListener("navigate", handleNavigate)
        return () => {
            navigation.removeEventListener("navigate", handleNavigate)
            global.listeners.delete(sync)
        }
    }, [])

    useEffect(() => {
        if (logBoxRef.current) {
            logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight
        }
    }, [logs])

    const handleCopy = async () => {
        const text = formatLogsForCopy(logs)
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
        } catch {
            const ta = document.createElement("textarea")
            ta.value = text
            ta.style.position = "fixed"
            ta.style.left = "-9999px"
            document.body.appendChild(ta)
            ta.select()
            try {
                document.execCommand("copy")
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
            } catch {}
            document.body.removeChild(ta)
        }
    }

    const levelColor = (level: LogLevel) => {
        if (level === "error") return "#fb7185"
        if (level === "warn") return "#fbbf24"
        if (level === "success") return "#34d399"
        return "#94a3b8"
    }

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

            {resolvedTelemetry && (
                <div
                    style={{
                        position: "fixed",
                        right: 16,
                        bottom: 16,
                        zIndex: 999999,
                        width: 400,
                        maxWidth: "calc(100vw - 32px)",
                        background: "rgba(8, 12, 20, 0.94)",
                        color: "#e2e8f0",
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.2)",
                        fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 11,
                        lineHeight: 1.45,
                        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                        pointerEvents: "auto",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "10px 12px",
                            borderBottom: "1px solid rgba(148,163,184,0.15)",
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontWeight: 700,
                                    letterSpacing: "0.04em",
                                }}
                            >
                                MORPHINE · animateView
                            </div>
                            <div
                                style={{
                                    marginTop: 2,
                                    color: "#94a3b8",
                                    fontSize: 10,
                                }}
                            >
                                {lastEvent}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopy}
                            style={{
                                border: "1px solid rgba(148,163,184,0.35)",
                                background: copied
                                    ? "rgba(52,211,153,0.2)"
                                    : "rgba(148,163,184,0.1)",
                                color: copied ? "#34d399" : "#e2e8f0",
                                borderRadius: 8,
                                padding: "6px 10px",
                                fontSize: 11,
                                fontFamily: "inherit",
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                        >
                            {copied ? "Copied" : "Copy logs"}
                        </button>
                    </div>
                    <div
                        ref={logBoxRef}
                        style={{
                            maxHeight: 240,
                            overflowY: "auto",
                            padding: "8px 12px 12px",
                        }}
                    >
                        {logs.length === 0 ? (
                            <div style={{ color: "#64748b" }}>
                                Waiting for navigation…
                            </div>
                        ) : (
                            logs.map((entry) => (
                                <div
                                    key={entry.id}
                                    style={{
                                        marginBottom: 6,
                                        borderLeft: `2px solid ${levelColor(entry.level)}`,
                                        paddingLeft: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            color: levelColor(entry.level),
                                        }}
                                    >
                                        {entry.level.toUpperCase()}{" "}
                                        <span style={{ color: "#64748b" }}>
                                            {new Date(
                                                entry.t
                                            ).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div>{entry.msg}</div>
                                    {entry.data && (
                                        <div
                                            style={{
                                                color: "#64748b",
                                                wordBreak: "break-all",
                                                marginTop: 2,
                                            }}
                                        >
                                            {JSON.stringify(entry.data)}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

Morphine.displayName = "Morphine animateView"

addPropertyControls(Morphine, {
    from: {
        type: ControlType.String,
        title: "From",
        defaultValue: "Card",
    },
    to: {
        type: ControlType.String,
        title: "To",
        defaultValue: "Card",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: { type: "spring", duration: 0.45, bounce: 0.12 },
        description: "Passed directly to animateView().",
    },
    morphChildren: {
        type: ControlType.Boolean,
        title: "Morph children",
        defaultValue: true,
    },
    childDepth: {
        type: ControlType.Number,
        title: "Child depth",
        defaultValue: 2,
        min: 0,
        max: 4,
        step: 1,
        displayStepper: true,
        hidden: (props) => !props.morphChildren,
    },
    crop: {
        type: ControlType.Boolean,
        title: "Crop",
        defaultValue: false,
        description: "Motion auto-crop. Off is better for text morphing.",
    },
    enterExitAnim: {
        type: ControlType.Boolean,
        title: "Enter/Exit Anim",
        defaultValue: true,
        description:
            "Fade & blur 20px on non-shared surrounding elements (root old/new).",
    },
    telemetry: {
        type: ControlType.Boolean,
        title: "Telemetry",
        defaultValue: true,
    },
    maxLogs: {
        type: ControlType.Number,
        title: "Max logs",
        defaultValue: 80,
        min: 10,
        max: 200,
        step: 10,
    },
})
