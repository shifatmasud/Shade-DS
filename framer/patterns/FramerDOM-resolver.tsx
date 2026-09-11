import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

type ComponentType =
    | "Frame"
    | "SVG Path"
    | "Vector Set"
    | "Image"
    | "Video"
    | "Text"

type Props = {
    name: string
    type: ComponentType
    highlightColor: string
    highlightOpacity: number
    outlineWidth: number
    debug: boolean
    resolveSVG: boolean
}

const GEOMETRY_SELECTOR = "path, polyline, polygon, rect, circle, ellipse, line"

const RESOLVED_ATTR = "data-framer-resolver-resolved"

const TARGET_ATTR = "data-framer-resolver-target"

/* --------------------------------------------------
   SVG
-------------------------------------------------- */

function getUseHref(use: SVGUseElement) {
    return use.getAttribute("href") || use.getAttribute("xlink:href")
}

function getReferencedElement(use: SVGUseElement) {
    const href = getUseHref(use)

    if (!href?.startsWith("#")) {
        return null
    }

    return document.getElementById(href.slice(1))
}

function getGeometry(element: Element): SVGElement[] {
    const result: SVGElement[] = []

    if (element instanceof SVGGeometryElement) {
        result.push(element)
    }

    result.push(...Array.from(element.querySelectorAll(GEOMETRY_SELECTOR)))

    return result
}

/*
 * Materialize <use> references.
 *
 * IMPORTANT:
 * - Runs once.
 * - Marks the SVG.
 * - Does not use MutationObserver.
 * - Does not touch already-resolved SVGs.
 */
function resolveSVG(svg: SVGSVGElement) {
    if (svg.hasAttribute(RESOLVED_ATTR)) {
        return
    }

    const uses = Array.from(svg.querySelectorAll("use"))

    for (const use of uses) {
        if (use.hasAttribute("data-framer-resolver-use")) {
            continue
        }

        const source = getReferencedElement(use)

        if (!source) continue

        const geometry = getGeometry(source)

        if (!geometry.length) continue

        for (const original of geometry) {
            const clone = original.cloneNode(true) as SVGElement

            /*
             * Never duplicate IDs.
             */
            clone.removeAttribute("id")

            /*
             * Mark our generated geometry.
             */
            clone.setAttribute("data-framer-resolver-generated", "true")

            /*
             * Insert immediately before <use>.
             */
            use.parentNode?.insertBefore(clone, use)
        }

        /*
         * Keep <use> in DOM.
         * Only hide its visual rendering.
         */
        use.setAttribute("data-framer-resolver-use", "true")

        use.style.visibility = "hidden"
        use.style.pointerEvents = "none"
    }

    svg.setAttribute(RESOLVED_ATTR, "true")
}

/* --------------------------------------------------
   TARGET RESOLUTION
-------------------------------------------------- */

function resolveTarget(
    component: Element,
    type: ComponentType,
    shouldResolveSVG: boolean
): Element[] {
    switch (type) {
        case "Frame":
            return [component]

        case "SVG Path": {
            const svg = component.querySelector("svg")

            if (!svg) return []

            if (shouldResolveSVG) {
                resolveSVG(svg)
            }

            return Array.from(svg.querySelectorAll(GEOMETRY_SELECTOR))
        }

        case "Vector Set": {
            const svg =
                component instanceof SVGSVGElement
                    ? component
                    : component.querySelector("svg")

            if (!svg) return []

            if (shouldResolveSVG) {
                resolveSVG(svg)
            }

            return Array.from(svg.querySelectorAll(GEOMETRY_SELECTOR))
        }

        case "Image":
            return Array.from(component.querySelectorAll("img"))

        case "Video":
            return Array.from(component.querySelectorAll("video"))

        case "Text": {
            const p = component.querySelector("p")

            if (!p) return []

            return [p, ...Array.from(p.querySelectorAll("span"))]
        }

        default:
            return []
    }
}

/* --------------------------------------------------
   DEBUG TAG
-------------------------------------------------- */

function escapeHTML(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

/*
 * Creates a useful representation such as:
 *
 * <img src="..." class="..." />
 *
 * <path d="..." />
 *
 * <span class="..." data-framer-name="..." />
 */
function getFullTag(element: Element) {
    const tag = element.tagName.toLowerCase()

    const attributes = Array.from(element.attributes)
        .filter((attr) => attr.name !== TARGET_ATTR)
        .map((attr) => {
            let value = attr.value

            /*
             * Keep debug overlay readable.
             */
            if (value.length > 100) {
                value = value.slice(0, 97) + "..."
            }

            return `${attr.name}="${escapeHTML(value)}"`
        })
        .join(" ")

    return attributes ? `<${tag} ${attributes} />` : `<${tag} />`
}

/* --------------------------------------------------
   HIGHLIGHT
-------------------------------------------------- */

function clearHighlights() {
    document.querySelectorAll(`[${TARGET_ATTR}]`).forEach((element) => {
        element.removeAttribute(TARGET_ATTR)

        const html = element as HTMLElement

        html.style.removeProperty("outline")

        html.style.removeProperty("outline-offset")

        html.style.removeProperty("background")
    })
}

function highlight(
    targets: Element[],
    color: string,
    opacity: number,
    width: number
) {
    targets.forEach((element) => {
        element.setAttribute(TARGET_ATTR, "true")

        const html = element as HTMLElement

        html.style.outline = `${width}px solid ${color}`

        html.style.outlineOffset = "2px"

        /*
         * Avoid changing SVG fill/stroke.
         * Background is only applied to normal
         * HTML elements.
         */
        if (!(element instanceof SVGElement)) {
            html.style.background = `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`
        }
    })
}

/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

export default function FramerDOMResolver(props: Props) {
    const {
        name,
        type,
        highlightColor,
        highlightOpacity,
        outlineWidth,
        debug,
        resolveSVG: shouldResolveSVG,
    } = props

    const [result, setResult] = React.useState<{
        components: Element[]
        targets: Element[]
    }>({
        components: [],
        targets: [],
    })

    React.useEffect(() => {
        /*
         * Small delay allows Framer's own
         * DOM rendering to finish.
         */
        const timer = window.setTimeout(() => {
            clearHighlights()

            const components = Array.from(
                document.querySelectorAll(
                    `[data-framer-name="${CSS.escape(name)}"]`
                )
            )

            const targets = components.flatMap((component) =>
                resolveTarget(component, type, shouldResolveSVG)
            )

            highlight(targets, highlightColor, highlightOpacity, outlineWidth)

            setResult({
                components,
                targets,
            })

            /*
             * Console debugging.
             */
            console.group(`[Framer Resolver] ${name}`)

            console.log("Component Type:", type)

            console.log("Components:", components.length)

            console.log("Targets:", targets.length)

            console.group("Resolved Targets")

            targets.forEach((target, index) => {
                console.log(`Target ${index + 1}:`, target)

                console.log(getFullTag(target))
            })

            console.groupEnd()
            console.groupEnd()
        }, 100)

        return () => {
            window.clearTimeout(timer)

            clearHighlights()
        }
    }, [
        name,
        type,
        highlightColor,
        highlightOpacity,
        outlineWidth,
        shouldResolveSVG,
    ])

    if (!debug) {
        return (
            <div
                style={{
                    width: 1,
                    height: 1,
                    pointerEvents: "none",
                    opacity: 0,
                }}
            />
        )
    }

    return (
        <div
            style={{
                position: "fixed",
                left: 12,
                bottom: 12,
                zIndex: 999999,

                width: 360,
                maxHeight: 320,

                overflow: "auto",

                padding: 12,

                borderRadius: 8,

                background: "rgba(0,0,0,.92)",

                color: "#fff",

                fontFamily: "Inter, system-ui, sans-serif",

                fontSize: 11,

                lineHeight: 1.45,

                pointerEvents: "none",

                boxShadow: "0 8px 32px rgba(0,0,0,.35)",
            }}
        >
            <div
                style={{
                    fontWeight: 700,
                    marginBottom: 8,
                    letterSpacing: ".04em",
                }}
            >
                FRAMER DOM RESOLVER
            </div>

            <div>
                <strong>Name:</strong> {name}
            </div>

            <div>
                <strong>Type:</strong> {type}
            </div>

            <div>
                <strong>Components:</strong> {result.components.length}
            </div>

            <div>
                <strong>Targets:</strong> {result.targets.length}
            </div>

            <div
                style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px solid rgba(255,255,255,.15)",
                }}
            >
                {result.targets.length === 0 ? (
                    <div
                        style={{
                            opacity: 0.55,
                        }}
                    >
                        No target resolved.
                    </div>
                ) : (
                    result.targets.map((target, index) => (
                        <div
                            key={index}
                            style={{
                                marginBottom: 8,
                                wordBreak: "break-all",
                                fontFamily: "Victor Mono, monospace",
                                fontSize: 10,
                            }}
                        >
                            <div
                                style={{
                                    opacity: 0.45,
                                    marginBottom: 2,
                                }}
                            >
                                TARGET {index + 1}
                            </div>

                            <div>{getFullTag(target)}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

/* --------------------------------------------------
   PROPERTY CONTROLS
-------------------------------------------------- */

addPropertyControls(FramerDOMResolver, {
    name: {
        type: ControlType.String,
        title: "Name",
        defaultValue: "Child 1",
    },

    type: {
        type: ControlType.Enum,
        title: "Type",
        options: ["Frame", "SVG Path", "Vector Set", "Image", "Video", "Text"],
        optionTitles: [
            "Frame",
            "SVG Path",
            "Vector Set",
            "Image",
            "Video",
            "Text",
        ],
        defaultValue: "Frame",
    },

    highlightColor: {
        type: ControlType.Color,
        title: "Highlight",
        defaultValue: "#00FF00",
    },

    highlightOpacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.15,
    },

    outlineWidth: {
        type: ControlType.Number,
        title: "Outline",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 2,
    },

    resolveSVG: {
        type: ControlType.Boolean,
        title: "Resolve SVG",
        defaultValue: true,
    },

    debug: {
        type: ControlType.Boolean,
        title: "Debug",
        defaultValue: true,
    },
})
