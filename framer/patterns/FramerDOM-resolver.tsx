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
   SVG & VECTOR HELPERS
-------------------------------------------------- */

function isInsideDefs(el: Element): boolean {
    let parent = el.parentElement
    while (parent) {
        if (parent.tagName.toLowerCase() === "defs") {
            return true
        }
        parent = parent.parentElement
    }
    return false
}

function extractSvgFromImgSrc(src: string): string | null {
    if (!src) return null

    // Check if it's an SVG data URI
    if (!src.includes("image/svg+xml") && !src.startsWith("data:image/svg")) {
        return null
    }

    // 1. Base64 encoded: data:image/svg+xml;base64,...
    if (src.includes(";base64,")) {
        try {
            const base64Part = src.split(";base64,")[1]
            if (typeof window !== "undefined" && typeof window.atob === "function") {
                return window.atob(base64Part)
            }
        } catch (e) {
            // ignore
        }
    }

    // 2. Data URI payload
    const commaIndex = src.indexOf(",")
    if (commaIndex !== -1) {
        let raw = src.substring(commaIndex + 1)
        try {
            raw = decodeURIComponent(raw)
        } catch (e) {
            // ignore if malformed percent encoding
        }
        // Decode HTML entities if present (e.g. &lt;svg ... &gt;)
        if (raw.includes("&lt;") || raw.includes("&gt;") || raw.includes("&quot;")) {
            raw = raw
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&amp;/g, "&")
        }
        if (raw.includes("<svg") || raw.includes("<SVG")) {
            return raw
        }
    }

    return null
}

function inlineSvgFromImg(img: HTMLImageElement): SVGSVGElement | null {
    const parent = img.parentElement
    if (parent) {
        const existingInjected = parent.querySelector<SVGSVGElement>(
            `svg[data-injected-from-img-id="${img.id || "default"}"]`
        )
        if (existingInjected) {
            return existingInjected
        }
    }

    const src = img.getAttribute("src") || img.src || ""
    const svgXml = extractSvgFromImgSrc(src)
    if (!svgXml) return null

    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(svgXml, "image/svg+xml")
        const parsedSvg = doc.querySelector("svg")
        if (!parsedSvg || doc.querySelector("parsererror")) return null

        // Clone/import into document
        const importedSvg = document.importNode(parsedSvg, true) as SVGSVGElement

        // Transfer classes and styles from <img> to <svg>
        if (img.className) {
            importedSvg.setAttribute("class", img.className)
        }
        if (img.id) {
            importedSvg.setAttribute("data-source-img-id", img.id)
        }
        importedSvg.setAttribute("data-injected-from-img", "true")
        importedSvg.setAttribute("data-injected-from-img-id", img.id || "default")

        // Copy computed/inline styles where helpful
        importedSvg.style.display = "block"
        if (img.style.position) importedSvg.style.position = img.style.position
        if (img.style.top) importedSvg.style.top = img.style.top
        if (img.style.left) importedSvg.style.left = img.style.left
        if (img.style.right) importedSvg.style.right = img.style.right
        if (img.style.bottom) importedSvg.style.bottom = img.style.bottom
        if (img.style.transform) importedSvg.style.transform = img.style.transform
        if (img.style.width) importedSvg.style.width = img.style.width
        if (img.style.height) importedSvg.style.height = img.style.height
        if (img.style.zIndex) importedSvg.style.zIndex = img.style.zIndex

        // Insert adjacent to img and hide original img
        if (parent) {
            parent.insertBefore(importedSvg, img)
            img.style.display = "none"
            img.setAttribute("data-svg-injected", "true")
            return importedSvg
        }
    } catch (e) {
        console.warn("[FramerDOMResolver] Failed to inline SVG from img:", e)
    }

    return null
}

function findSvgElement(component: Element): SVGSVGElement | null {
    if (component instanceof SVGSVGElement) {
        return component
    }

    const svg = component.querySelector("svg")
    if (svg) return svg

    // Check if component is an <img> or contains an <img> with SVG data URI
    const isImg = component.tagName.toLowerCase() === "img"
    const img = isImg
        ? (component as HTMLImageElement)
        : (component.querySelector("img") as HTMLImageElement | null)

    if (img) {
        const inlined = inlineSvgFromImg(img)
        if (inlined) return inlined
    }

    // Check if an injected SVG already exists under component
    const injected = component.querySelector(
        'svg[data-injected-from-img="true"]'
    ) as SVGSVGElement | null
    if (injected) return injected

    // Check if component itself is inside an SVG
    if (component.closest) {
        const parentSvg = component.closest("svg")
        if (parentSvg) return parentSvg
    }

    return null
}

function getUseHref(use: SVGUseElement): string | null {
    return use.getAttribute("href") || use.getAttribute("xlink:href")
}

function getReferencedElement(use: SVGUseElement, svg?: SVGSVGElement | null): Element | null {
    const href = getUseHref(use)
    if (!href || !href.includes("#")) {
        return null
    }

    const targetId = href.split("#")[1]
    if (!targetId) return null

    // 1. Direct getElementById
    const byId = document.getElementById(targetId)
    if (byId) return byId

    // 2. Query within local SVG if provided
    if (svg) {
        try {
            const local = svg.querySelector(`#${CSS.escape(targetId)}`)
            if (local) return local
        } catch (e) {
            // fallback
        }
    }

    // 3. Document query with escaped selector
    try {
        const docQuery = document.querySelector(`[id="${CSS.escape(targetId)}"]`)
        if (docQuery) return docQuery

        const symbolQuery = document.querySelector(`symbol#${CSS.escape(targetId)}`)
        if (symbolQuery) return symbolQuery
    } catch (e) {
        // fallback
    }

    return null
}

function getGeometry(element: Element): SVGElement[] {
    const result: SVGElement[] = []

    if (element instanceof SVGGeometryElement) {
        result.push(element)
    }

    const matched = Array.from(
        element.querySelectorAll<SVGElement>(GEOMETRY_SELECTOR)
    )

    result.push(...matched.filter((el) => !isInsideDefs(el)))

    return result
}

/*
 * Materialize <use> references.
 *
 * Aligned with SVGPathInjector: unpacks <symbol> and container nodes
 * into the live SVG tree before <use> and hides original <use>.
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

        const source = getReferencedElement(use, svg)
        if (!source) continue

        const tagName = source.tagName.toLowerCase()

        if (tagName === "symbol") {
            const clone = source.cloneNode(true) as HTMLElement
            const fragment = document.createDocumentFragment()
            while (clone.firstChild) {
                const child = clone.firstChild
                if (child instanceof Element) {
                    child.removeAttribute("id")
                    child.setAttribute("data-framer-resolver-generated", "true")
                }
                fragment.appendChild(child)
            }
            use.parentNode?.insertBefore(fragment, use)
        } else {
            const clone = source.cloneNode(true) as SVGElement
            clone.removeAttribute("id")
            clone.setAttribute("data-framer-resolver-generated", "true")
            use.parentNode?.insertBefore(clone, use)
        }

        /*
         * Keep <use> in DOM.
         * Only hide its visual rendering.
         */
        use.setAttribute("data-framer-resolver-use", "true")
        use.style.display = "none"
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

        case "SVG Path":
        case "Vector Set": {
            if (
                component instanceof SVGGeometryElement &&
                !isInsideDefs(component)
            ) {
                return [component]
            }

            const svg = findSvgElement(component)

            if (svg) {
                if (shouldResolveSVG) {
                    resolveSVG(svg)
                }

                const elements = Array.from(
                    svg.querySelectorAll<SVGElement>(GEOMETRY_SELECTOR)
                )
                const activeTargets = elements.filter((el) => !isInsideDefs(el))
                if (activeTargets.length > 0) {
                    return activeTargets
                }
                return [svg]
            }

            // Fallback: check if component itself contains geometry elements
            const directGeometry = Array.from(
                component.querySelectorAll<SVGElement>(GEOMETRY_SELECTOR)
            ).filter((el) => !isInsideDefs(el))

            if (directGeometry.length > 0) {
                return directGeometry
            }

            return []
        }

        case "Image": {
            const isImg = component.tagName.toLowerCase() === "img"
            if (isImg) return [component]
            const images = Array.from(component.querySelectorAll("img"))
            return images.length > 0 ? images : [component]
        }

        case "Video": {
            const isVid = component.tagName.toLowerCase() === "video"
            if (isVid) return [component]
            const videos = Array.from(component.querySelectorAll("video"))
            return videos.length > 0 ? videos : [component]
        }

        case "Text": {
            const p = component.querySelector("p")
            if (p) {
                const spans = Array.from(p.querySelectorAll("span"))
                return spans.length > 0 ? [p, ...spans] : [p]
            }
            const textNodes = Array.from(component.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6"))
            return textNodes.length > 0 ? textNodes : [component]
        }

        default:
            return []
    }
}

/* --------------------------------------------------
   COMPONENT DISCOVERY (WITH SIBLING FALLBACK)
-------------------------------------------------- */

function findComponents(
    name: string,
    containerEl: HTMLElement | null,
    type: ComponentType
): Element[] {
    const trimmedName = (name || "").trim()

    // 1. Direct exact match by [data-framer-name]
    if (trimmedName) {
        try {
            const exactMatches = Array.from(
                document.querySelectorAll(
                    `[data-framer-name="${CSS.escape(trimmedName)}"]`
                )
            )
            if (exactMatches.length > 0) {
                return exactMatches
            }

            // 2. Case-insensitive or attribute fallback match
            const allNamed = Array.from(
                document.querySelectorAll("[data-framer-name]")
            )
            const matched = allNamed.filter(
                (el) =>
                    (el.getAttribute("data-framer-name") || "")
                        .trim()
                        .toLowerCase() === trimmedName.toLowerCase()
            )
            if (matched.length > 0) {
                return matched
            }
        } catch (e) {
            // CSS escape error fallback
        }
    }

    // 3. Shared Parent Sibling Fallback (mirrors SVGPathInjector discovery)
    if (containerEl) {
        let sharedParent = containerEl.parentElement
        while (
            sharedParent &&
            sharedParent.children.length <= 1 &&
            sharedParent.tagName !== "BODY"
        ) {
            sharedParent = sharedParent.parentElement
        }

        if (sharedParent) {
            const siblings: Element[] = []
            Array.from(sharedParent.children).forEach((child) => {
                if (child === containerEl || child.contains(containerEl)) return

                if (type === "SVG Path" || type === "Vector Set") {
                    const compType = child.getAttribute("data-framer-component-type")
                    const isSvg = child.tagName.toLowerCase() === "svg"
                    const hasSvg = child.querySelector("svg") !== null
                    const isImg = child.tagName.toLowerCase() === "img"
                    const hasImg = child.querySelector("img") !== null

                    if (compType === "SVG" || isSvg || hasSvg || isImg || hasImg) {
                        siblings.push(child)
                    }
                } else if (type === "Text") {
                    const compType = child.getAttribute("data-framer-component-type")
                    if (compType === "RichTextContainer" || child.querySelector("p, span")) {
                        siblings.push(child)
                    }
                } else if (type === "Image") {
                    if (child.tagName.toLowerCase() === "img" || child.querySelector("img")) {
                        siblings.push(child)
                    }
                } else if (type === "Video") {
                    if (child.tagName.toLowerCase() === "video" || child.querySelector("video")) {
                        siblings.push(child)
                    }
                } else {
                    siblings.push(child)
                }
            })

            if (siblings.length > 0) {
                return siblings
            }
        }
    }

    return []
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
   HIGHLIGHT ENGINE (HTML & SVG COMPATIBLE)
-------------------------------------------------- */

function clearHighlights() {
    document.querySelectorAll(`[${TARGET_ATTR}]`).forEach((element) => {
        element.removeAttribute(TARGET_ATTR)

        const html = element as HTMLElement

        // Clear HTML styles
        html.style.removeProperty("outline")
        html.style.removeProperty("outline-offset")
        html.style.removeProperty("background")

        // Clear SVG specific styles
        if (element instanceof SVGElement) {
            html.style.removeProperty("stroke")
            html.style.removeProperty("stroke-width")
            html.style.removeProperty("filter")
            html.style.removeProperty("vector-effect")
        }
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

        // HTML element highlighting
        if (!(element instanceof SVGElement)) {
            html.style.outline = `${width}px solid ${color}`
            html.style.outlineOffset = "2px"
            html.style.background = `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`
        } else if (element instanceof SVGSVGElement) {
            // Container SVG highlighting
            html.style.outline = `${width}px solid ${color}`
            html.style.outlineOffset = "2px"
        } else {
            // SVG Geometry Shape (path, rect, circle, polyline, etc.)
            html.style.stroke = color
            html.style.strokeWidth = `${Math.max(width, 2)}px`
            html.style.filter = `drop-shadow(0 0 3px ${color})`
            html.style.setProperty("vector-effect", "non-scaling-stroke")
        }
    })
}

/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 360
 * @framerIntrinsicHeight 160
 */
export default function FramerDOMResolver(props: Props) {
    const {
        name = "Child 1",
        type = "Frame",
        highlightColor = "#00FF00",
        highlightOpacity = 0.15,
        outlineWidth = 2,
        debug = true,
        resolveSVG: shouldResolveSVG = true,
    } = props

    const containerRef = React.useRef<HTMLDivElement>(null)

    const [result, setResult] = React.useState<{
        components: Element[]
        targets: Element[]
    }>({
        components: [],
        targets: [],
    })

    // Multi-stage discovery and continuous mutation listener
    React.useEffect(() => {
        let isCancelled = false
        let animationFrameId: number | null = null

        const runDiscovery = () => {
            if (isCancelled) return

            clearHighlights()

            const components = findComponents(name, containerRef.current, type)

            const targets = components.flatMap((component) =>
                resolveTarget(component, type, shouldResolveSVG)
            )

            highlight(targets, highlightColor, highlightOpacity, outlineWidth)

            setResult({
                components,
                targets,
            })
        }

        // 1. Immediate execution
        runDiscovery()

        // 2. Multi-stage timed checkpoints (to catch Framer Canvas deferred rendering)
        const timeouts = [
            window.setTimeout(runDiscovery, 50),
            window.setTimeout(runDiscovery, 150),
            window.setTimeout(runDiscovery, 300),
            window.setTimeout(runDiscovery, 600),
            window.setTimeout(runDiscovery, 1200),
        ]

        // 3. Debounced MutationObserver for live DOM synchronization
        const debouncedRun = () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId)
            }
            animationFrameId = requestAnimationFrame(() => {
                runDiscovery()
            })
        }

        let observer: MutationObserver | null = null
        if (typeof MutationObserver !== "undefined" && document.body) {
            observer = new MutationObserver(debouncedRun)
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "data-framer-name",
                    "src",
                    "href",
                    "xlink:href",
                    "class",
                ],
            })
        }

        // 4. Window resize listener
        window.addEventListener("resize", debouncedRun)

        return () => {
            isCancelled = true
            timeouts.forEach((t) => window.clearTimeout(t))
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId)
            }
            if (observer) {
                observer.disconnect()
            }
            window.removeEventListener("resize", debouncedRun)
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
                ref={containerRef}
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
            ref={containerRef}
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
