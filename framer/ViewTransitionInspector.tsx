
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType } from "framer"

type LogItem = {
    time: string
    type: string
    message: string
    data?: any
}

function safeStringify(value: any) {
    try {
        return JSON.stringify(
            value,
            (_, v) => {
                if (v instanceof Element) {
                    return `<${v.tagName.toLowerCase()}${v.id ? `#${v.id}` : ""}>`
                }

                if (v instanceof DOMRect) {
                    return {
                        x: v.x,
                        y: v.y,
                        width: v.width,
                        height: v.height,
                    }
                }

                if (typeof v === "function") return `[Function ${v.name || "anonymous"}]`

                if (v instanceof Error) {
                    return {
                        name: v.name,
                        message: v.message,
                        stack: v.stack,
                    }
                }

                return v
            },
            2
        )
    } catch {
        return String(value)
    }
}

function inspectElement(el: Element | null) {
    if (!el) return null

    const rect = el.getBoundingClientRect()

    return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className:
            typeof el.className === "string"
                ? el.className
                : null,
        dataAttributes: Array.from(el.attributes)
            .filter(a => a.name.startsWith("data-"))
            .reduce((acc, a) => {
                acc[a.name] = a.value
                return acc
            }, {} as Record<string, string>),
        viewTransitionName:
            getComputedStyle(el).viewTransitionName,
        rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        },
    }
}

function inspectViewTransitionPseudoElements() {
    const root = document.documentElement

    const pseudos = [
        "::view-transition",
        "::view-transition-group(*)",
        "::view-transition-image-pair(*)",
        "::view-transition-old(*)",
        "::view-transition-new(*)",
    ]

    const result: Record<string, any> = {}

    for (const pseudo of pseudos) {
        try {
            const style = getComputedStyle(root, pseudo)

            result[pseudo] = {
                opacity: style.opacity,
                transform: style.transform,
                animationName: style.animationName,
                animationDuration: style.animationDuration,
                animationDelay: style.animationDelay,
                animationTimingFunction: style.animationTimingFunction,
                mixBlendMode: style.mixBlendMode,
                isolation: style.isolation,
                width: style.width,
                height: style.height,
            }
        } catch {
            result[pseudo] = null
        }
    }

    return result
}

function inspectStylesheets() {
    const matches: string[] = []

    try {
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                for (const rule of Array.from(sheet.cssRules || [])) {
                    const text = rule.cssText || ""

                    if (
                        text.includes("view-transition") ||
                        text.includes("view-transition-name")
                    ) {
                        matches.push(text)
                    }
                }
            } catch {
                // Cross-origin stylesheet.
            }
        }
    } catch {}

    return matches
}

function inspectFramerGlobals() {
    const win = window as any
    const result: Record<string, string> = {}

    for (const key of Object.keys(win)) {
        const lower = key.toLowerCase()

        if (
            lower.includes("framer") ||
            lower.includes("transition") ||
            lower.includes("motion")
        ) {
            try {
                result[key] = typeof win[key]
            } catch {
                result[key] = "unreadable"
            }
        }
    }

    return result
}

function inspectDOM() {
    const all = Array.from(document.querySelectorAll("*"))

    const named = all
        .filter(el => {
            const name = getComputedStyle(el).viewTransitionName

            return name && name !== "none"
        })
        .slice(0, 100)
        .map(inspectElement)

    return {
        url: location.href,
        title: document.title,
        bodyChildren: document.body.children.length,
        totalElements: all.length,
        viewTransitionElements: named,
    }
}

export default function ViewTransitionInspector(props: any) {
    const {
        width = 420,
        height = 560,
        initiallyOpen = true,
        maxLogs = 300,
    } = props

    const [open, setOpen] = useState(initiallyOpen)
    const [logs, setLogs] = useState<LogItem[]>([])
    const [active, setActive] = useState(false)

    const logsRef = useRef<LogItem[]>([])
    const cleanupRef = useRef<(() => void) | null>(null)

    function log(type: string, message: string, data?: any) {
        const item: LogItem = {
            time: new Date().toISOString().slice(11, 23),
            type,
            message,
            data,
        }

        logsRef.current = [...logsRef.current, item].slice(-maxLogs)
        setLogs(logsRef.current)
    }

    useEffect(() => {
        if (!open) return

        const cleanups: (() => void)[] = []

        const originalStartViewTransition =
            (document as any).startViewTransition

        const originalPushState = history.pushState
        const originalReplaceState = history.replaceState

        log("MOUNT", "Inspector mounted")

        log("ENV", "View Transition API", {
            supported: typeof originalStartViewTransition === "function",
            documentStartViewTransition:
                typeof originalStartViewTransition,
        })

        log("DOM", "Initial DOM snapshot", inspectDOM())

        log("PSEUDO", "Initial View Transition pseudo styles", {
            pseudos: inspectViewTransitionPseudoElements(),
        })

        log("CSS", "View Transition CSS rules", inspectStylesheets())

        log("FRAMER", "Possible Framer runtime globals", inspectFramerGlobals())

        // ------------------------------------------------------------
        // document.startViewTransition
        // ------------------------------------------------------------

        if (typeof originalStartViewTransition === "function") {
            ;(document as any).startViewTransition = function (
                updateCallback?: () => void | Promise<void>
            ) {
                const startedAt = performance.now()

                setActive(true)

                log("VT START", "document.startViewTransition() called", {
                    url: location.href,
                    time: startedAt,
                    domBefore: inspectDOM(),
                    pseudoBefore: inspectViewTransitionPseudoElements(),
                })

                let transition: any

                try {
                    transition = originalStartViewTransition.call(
                        document,
                        async () => {
                            log("VT UPDATE", "View Transition update callback started")

                            const result = updateCallback
                                ? await updateCallback()
                                : undefined

                            log("VT UPDATE", "View Transition update callback finished", {
                                domAfter: inspectDOM(),
                            })

                            return result
                        }
                    )
                } catch (error) {
                    log("VT ERROR", "startViewTransition threw", error)
                    setActive(false)
                    throw error
                }

                if (transition) {
                    transition.ready
                        ?.then(() => {
                            log("VT READY", "transition.ready resolved", {
                                elapsed: performance.now() - startedAt,
                                pseudo: inspectViewTransitionPseudoElements(),
                                dom: inspectDOM(),
                            })
                        })
                        .catch((error: any) => {
                            log("VT READY ERROR", "transition.ready rejected", error)
                        })

                    transition.finished
                        ?.then(() => {
                            log("VT FINISHED", "transition.finished resolved", {
                                elapsed: performance.now() - startedAt,
                                pseudo: inspectViewTransitionPseudoElements(),
                                dom: inspectDOM(),
                            })

                            setActive(false)
                        })
                        .catch((error: any) => {
                            log("VT FINISHED ERROR", "transition.finished rejected", error)
                            setActive(false)
                        })

                    transition.updateCallbackDone
                        ?.then(() => {
                            log(
                                "VT UPDATE DONE",
                                "transition.updateCallbackDone resolved"
                            )
                        })
                        .catch((error: any) => {
                            log(
                                "VT UPDATE DONE ERROR",
                                "transition.updateCallbackDone rejected",
                                error
                            )
                        })
                }

                return transition
            }

            cleanups.push(() => {
                ;(document as any).startViewTransition =
                    originalStartViewTransition
            })
        }

        // ------------------------------------------------------------
        // History
        // ------------------------------------------------------------

        history.pushState = function (...args: any[]) {
            log("HISTORY", "pushState()", {
                url: args[2],
                state: args[0],
            })

            return originalPushState.apply(this, args as any)
        }

        history.replaceState = function (...args: any[]) {
            log("HISTORY", "replaceState()", {
                url: args[2],
                state: args[0],
            })

            return originalReplaceState.apply(this, args as any)
        }

        cleanups.push(() => {
            history.pushState = originalPushState
            history.replaceState = originalReplaceState
        })

        // ------------------------------------------------------------
        // popstate
        // ------------------------------------------------------------

        const onPopState = (event: PopStateEvent) => {
            log("NAV", "popstate", {
                url: location.href,
                state: event.state,
            })
        }

        window.addEventListener("popstate", onPopState)
        cleanups.push(() =>
            window.removeEventListener("popstate", onPopState)
        )

        // ------------------------------------------------------------
        // Click inspection
        // ------------------------------------------------------------

        const onClick = (event: MouseEvent) => {
            const target = event.target as Element | null

            const anchor = target?.closest?.("a")

            if (!anchor) return

            const href = anchor.getAttribute("href")

            log("CLICK", "Navigation-like anchor clicked", {
                href,
                target: inspectElement(anchor),
                defaultPrevented: event.defaultPrevented,
            })
        }

        document.addEventListener("click", onClick, true)

        cleanups.push(() =>
            document.removeEventListener("click", onClick, true)
        )

        // ------------------------------------------------------------
        // DOM mutations
        // ------------------------------------------------------------

        let mutationTimer: any = null

        const observer = new MutationObserver(mutations => {
            clearTimeout(mutationTimer)

            mutationTimer = setTimeout(() => {
                const relevant = mutations.some(mutation => {
                    const nodes = [
                        ...Array.from(mutation.addedNodes),
                        ...Array.from(mutation.removedNodes),
                    ]

                    return nodes.some(node => {
                        if (!(node instanceof Element)) return false

                        const name = getComputedStyle(node).viewTransitionName

                        return (
                            name !== "none" ||
                            node.matches?.(
                                "[data-framer-name], [data-framer-component-type]"
                            )
                        )
                    })
                })

                if (relevant) {
                    log("DOM MUTATION", "Navigation-related DOM mutation", {
                        count: mutations.length,
                        dom: inspectDOM(),
                    })
                }
            }, 50)
        })

        observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: [
                "class",
                "style",
                "data-framer-name",
                "data-framer-component-type",
            ],
        })

        cleanups.push(() => {
            observer.disconnect()
            clearTimeout(mutationTimer)
        })

        // ------------------------------------------------------------
        // Performance observer
        // ------------------------------------------------------------

        if ("PerformanceObserver" in window) {
            try {
                const performanceObserver = new PerformanceObserver(list => {
                    for (const entry of list.getEntries()) {
                        if (
                            entry.name.toLowerCase().includes("view") ||
                            entry.name.toLowerCase().includes("navigation")
                        ) {
                            log("PERF", entry.name, {
                                duration: entry.duration,
                                startTime: entry.startTime,
                                entryType: entry.entryType,
                            })
                        }
                    }
                })

                performanceObserver.observe({
                    entryTypes: ["measure", "navigation"],
                })

                cleanups.push(() => performanceObserver.disconnect())
            } catch {}
        }

        cleanupRef.current = () => {
            cleanups.forEach(fn => fn())
            setActive(false)
        }

        return () => {
            cleanupRef.current?.()
            cleanupRef.current = null
        }
    }, [open, maxLogs])

    function clearLogs() {
        logsRef.current = []
        setLogs([])
    }

    async function copyReport() {
        const report = {
            capturedAt: new Date().toISOString(),

            environment: {
                url: location.href,
                userAgent: navigator.userAgent,
                viewTransitionSupported:
                    typeof (document as any).startViewTransition ===
                    "function",
            },

            dom: inspectDOM(),

            pseudoElements:
                inspectViewTransitionPseudoElements(),

            stylesheets: inspectStylesheets(),

            framerGlobals: inspectFramerGlobals(),

            logs: logsRef.current,
        }

        await navigator.clipboard.writeText(
            safeStringify(report)
        )

        log("COPY", "Full inspection report copied")
    }

    if (!open) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                <button
                    onClick={() => setOpen(true)}
                    style={{
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 14px",
                        background: "#111",
                        color: "#fff",
                        cursor: "pointer",
                    }}
                >
                    Open Inspector
                </button>
            </div>
        )
    }

    return (
        <div
            style={{
                width,
                height,
                background: "rgba(10,10,10,.96)",
                color: "#fff",
                borderRadius: 14,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                fontFamily:
                    "Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: 11,
                boxShadow: "0 20px 60px rgba(0,0,0,.35)",
            }}
        >
            {/* HEADER */}

            <div
                style={{
                    height: 48,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    gap: 8,
                    borderBottom:
                        "1px solid rgba(255,255,255,.08)",
                }}
            >
                <div
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: 99,
                        background: active
                            ? "#ff453a"
                            : "#30d158",
                        boxShadow: active
                            ? "0 0 12px #ff453a"
                            : "0 0 12px #30d158",
                    }}
                />

                <strong style={{ flex: 1 }}>
                    View Transition Inspector
                </strong>

                <button
                    onClick={copyReport}
                    style={buttonStyle}
                >
                    Copy
                </button>

                <button
                    onClick={clearLogs}
                    style={buttonStyle}
                >
                    Clear
                </button>

                <button
                    onClick={() => setOpen(false)}
                    style={buttonStyle}
                >
                    ×
                </button>
            </div>

            {/* STATUS */}

            <div
                style={{
                    padding: "8px 12px",
                    background:
                        "rgba(255,255,255,.035)",
                    borderBottom:
                        "1px solid rgba(255,255,255,.06)",
                    display: "flex",
                    gap: 12,
                }}
            >
                <span>
                    API:{" "}
                    <b>
                        {typeof (document as any)
                            .startViewTransition ===
                        "function"
                            ? "supported"
                            : "not detected"}
                    </b>
                </span>

                <span>
                    Events: <b>{logs.length}</b>
                </span>

                <span>
                    State:{" "}
                    <b>{active ? "transitioning" : "idle"}</b>
                </span>
            </div>

            {/* CONSOLE */}

            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: 8,
                    fontFamily:
                        '"Victor Mono", ui-monospace, monospace',
                }}
            >
                {logs.length === 0 && (
                    <div
                        style={{
                            opacity: 0.45,
                            padding: 12,
                        }}
                    >
                        Waiting for runtime events…
                    </div>
                )}

                {logs.map((item, index) => (
                    <div
                        key={index}
                        style={{
                            padding: "8px 6px",
                            borderBottom:
                                "1px solid rgba(255,255,255,.05)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                marginBottom: 4,
                            }}
                        >
                            <span style={{ opacity: 0.4 }}>
                                {item.time}
                            </span>

                            <b>{item.type}</b>
                        </div>

                        <div
                            style={{
                                opacity: 0.8,
                                marginBottom:
                                    item.data !== undefined
                                        ? 5
                                        : 0,
                            }}
                        >
                            {item.message}
                        </div>

                        {item.data !== undefined && (
                            <pre
                                style={{
                                    margin: 0,
                                    padding: 7,
                                    whiteSpace: "pre-wrap",
                                    overflowWrap:
                                        "anywhere",
                                    background:
                                        "rgba(255,255,255,.04)",
                                    borderRadius: 6,
                                    color: "#bbb",
                                }}
                            >
                                {safeStringify(item.data)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

const buttonStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    borderRadius: 6,
    padding: "5px 8px",
    cursor: "pointer",
    fontSize: 10,
}

ViewTransitionInspector.defaultProps = {
    width: 420,
    height: 560,
    initiallyOpen: true,
    maxLogs: 300,
}

addPropertyControls(ViewTransitionInspector, {
    width: {
        type: ControlType.Number,
        min: 280,
        max: 900,
        defaultValue: 420,
    },

    height: {
        type: ControlType.Number,
        min: 300,
        max: 1000,
        defaultValue: 560,
    },

    initiallyOpen: {
        type: ControlType.Boolean,
        defaultValue: true,
    },

    maxLogs: {
        type: ControlType.Number,
        min: 50,
        max: 1000,
        defaultValue: 300,
        step: 50,
    },
})
