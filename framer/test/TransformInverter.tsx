import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef } from "react"

type MatchType = "exact" | "prefix" | "suffix" | "contains"

export type TransformInverterProps = {
    publisher?: string
    subscriber?: string
    match?: MatchType
    intensity?: number
    preserveLocalTransform?: boolean
    preserveAncestor3DContext?: boolean
    clipToPublisher?: boolean
    clipBorderRadius?: number
    clipPadding?: number
    enabled?: boolean
}

/**
 * Parses any CSS transform string into a DOMMatrix.
 */
function parseMatrix(transformStr: string | null | undefined): DOMMatrix {
    if (!transformStr || transformStr === "none") {
        return new DOMMatrix()
    }
    try {
        return new DOMMatrix(transformStr)
    } catch {
        return new DOMMatrix()
    }
}

/**
 * Extracts non-rotational layout transforms (e.g. translate(-50%, -50%), scale(1), etc.)
 * from an existing CSS transform string, stripping any existing perspective and rotations.
 */
function extractBaseTransform(transformStr: string | null | undefined): string {
    if (!transformStr || transformStr === "none") {
        return ""
    }
    const cleaned = transformStr
        .replace(/perspective\([^)]*\)/gi, "")
        .replace(/rotate[XYZ3d]*\([^)]*\)/gi, "")
        .replace(/matrix3d\([^)]*\)/gi, "")
        .replace(/\s+/g, " ")
        .trim()
    return cleaned === "none" ? "" : cleaned
}

/**
 * Extracts perspective viewing distance in pixels from CSS computed styles or matrix.
 */
function extractPerspectiveDistance(pubEl: HTMLElement, pubMat: DOMMatrix): number {
    if (typeof window === "undefined") return 0

    // 1. Check perspective in matrix m34 (in standard CSS perspective, w = m34*z + m44 where m34 = -1/d)
    if (pubMat.m34 && Math.abs(pubMat.m34) > 1e-6) {
        return Math.abs(1 / pubMat.m34)
    }

    // 2. Check computed perspective on element or ancestors
    let curr: HTMLElement | null = pubEl
    while (curr && curr !== document.body) {
        const comp = window.getComputedStyle(curr)
        if (comp.perspective && comp.perspective !== "none") {
            const parsed = parseFloat(comp.perspective)
            if (parsed > 0) return parsed
        }
        curr = curr.parentElement
    }

    return 0
}

/**
 * Constructs a 4x4 translation DOMMatrix.
 */
function translateMatrix(tx: number, ty: number, tz: number = 0): DOMMatrix {
    return new DOMMatrix([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        tx, ty, tz, 1,
    ])
}

/**
 * Builds the complete 3D orientation matrix (including 3D rotation and perspective)
 * isolated from translation offsets.
 */
function build3DOrientationMatrix(pubMat: DOMMatrix, perspectiveDist: number): DOMMatrix {
    // Check if pubMat already has perspective projection terms (m14, m24, m34)
    const hasPerspective =
        Math.abs(pubMat.m14) > 1e-6 || Math.abs(pubMat.m24) > 1e-6 || Math.abs(pubMat.m34) > 1e-6

    // Create a type-safe copy of the publisher matrix to isolate pure orientation/rotation.
    const orientationMat =
        typeof DOMMatrix.fromMatrix === "function"
            ? DOMMatrix.fromMatrix(pubMat)
            : new DOMMatrix(Array.from(pubMat.toFloat64Array()))

    // Zero out the translation components (m41, m42, m43) to align centers.
    // In DOMMatrix, m41=tx, m42=ty, m43=tz.
    orientationMat.m41 = 0
    orientationMat.m42 = 0
    orientationMat.m43 = 0

    // If perspective wasn't explicitly in the matrix but we found it in CSS:
    if (!hasPerspective && perspectiveDist > 0) {
        // Compose standard W3C 3D perspective matrix: R * P(d)
        // In DOMMatrix row vector transform (v * M), R must be multiplied by P
        // so that R (rotation) is applied first to 3D points, producing Z depth (z = y*sin(theta)),
        // and then P applies perspective foreshortening (w = 1 - z/d).
        const pMat = new DOMMatrix([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, -1 / perspectiveDist,
            0, 0, 0, 1,
        ])
        return orientationMat.multiply(pMat)
    }

    return orientationMat
}

/**
 * Computes the exact counter-transform matrix (O^-1) to invert 3D rotation and perspective.
 * When applied to Subscriber, (Publisher_Orientation * Counter_Matrix) = Identity.
 */
function createCounterTransformMatrix(
    orientationMat: DOMMatrix,
    intensity: number = 1.0
): DOMMatrix {
    try {
        const inv = orientationMat.inverse()
        const t = Math.max(0, Math.min(1, intensity))

        if (t === 1.0) {
            return inv
        }

        // Interpolate between Identity and Inverted matrix using property access for safety
        const result = new DOMMatrix()
        result.m11 = 1 + (inv.m11 - 1) * t
        result.m12 = inv.m12 * t
        result.m13 = inv.m13 * t
        result.m14 = inv.m14 * t
        result.m21 = inv.m21 * t
        result.m22 = 1 + (inv.m22 - 1) * t
        result.m23 = inv.m23 * t
        result.m24 = inv.m24 * t
        result.m31 = inv.m31 * t
        result.m32 = inv.m32 * t
        result.m33 = 1 + (inv.m33 - 1) * t
        result.m34 = inv.m34 * t
        result.m41 = 0
        result.m42 = 0
        result.m43 = 0
        result.m44 = 1
        return result
    } catch {
        return new DOMMatrix()
    }
}

/**
 * Converts a DOMMatrix into matrix3d(...) CSS string.
 */
function toCSS3D(matrix: DOMMatrix): string {
    const arr = Array.from(matrix.toFloat64Array())
    return `matrix3d(${arr.map((v) => (Math.abs(v) < 1e-7 ? 0 : Number(v.toFixed(6)))).join(",")})`
}

/**
 * Computes the global static offset of an element relative to the document root
 * by traversing the offsetParent hierarchy before CSS 3D transforms are applied.
 */
function getOffsetToDocument(el: HTMLElement): { x: number; y: number } {
    let x = 0
    let y = 0
    let curr: HTMLElement | null = el

    while (curr && curr !== document.body && curr !== document.documentElement) {
        x += curr.offsetLeft || 0
        y += curr.offsetTop || 0
        const parent = curr.offsetParent as HTMLElement | null
        if (parent && parent !== document.body && parent !== document.documentElement) {
            x += parent.clientLeft || 0
            y += parent.clientTop || 0
        }
        curr = parent
    }
    return { x, y }
}

/**
 * Computes static layout offset of a child element relative to an ancestor frame.
 * Completely agnostic to positioning mode (absolute, relative, fixed, sticky, flex, grid),
 * pins (top/left/right/bottom, insets, negative offsets), or intermediate DOM hierarchy.
 */
function getStaticOffsetRelToAncestor(
    child: HTMLElement,
    ancestor: HTMLElement
): { x: number; y: number } {
    const childOffset = getOffsetToDocument(child)
    const ancestorOffset = getOffsetToDocument(ancestor)

    return {
        x: childOffset.x - ancestorOffset.x - (ancestor.clientLeft || 0),
        y: childOffset.y - ancestorOffset.y - (ancestor.clientTop || 0),
    }
}

/**
 * Computes a mathematically pure 3D projected card clip-path polygon on the Subscriber.
 *
 * Guarantees:
 * 1. At 0° rotation: w is identically 1.0 across all vertices regardless of perspective distance,
 *    so the clip path is an exact, unrotated, zero-skew rounded rectangle matching the Publisher.
 * 2. During 3D tilt: Pure 3D projective coordinates seamlessly trace the Publisher's
 *    3D optical silhouette in camera-aligned space.
 */
/**
 * Mathematically projects the 3D-oriented rectangular/rounded Publisher boundary
 * onto the 2D local space of the Subscriber.
 *
 * Guarantees:
 * 1. At 0° rotation: w is identically 1.0 across all vertices regardless of perspective distance,
 *    so the clip path is an exact, unrotated, zero-skew rounded rectangle matching the Publisher.
 * 2. During 3D tilt & XY rotation: Pure 3D projective coordinates seamlessly trace the Publisher's
 *    3D optical silhouette with homogeneous coordinate division and near-plane safety bounds.
 * 3. Base Transform Compensation: If Subscriber has local base transforms (e.g. translate(-50%, -50%)),
 *    the projected vertices are mapped through the inverse of the base transform so the rendered clip
 *    remains perfectly aligned in the browser's post-transform coordinate space.
 */
function computeProjectedCardClipPolygon(
    pubW: number,
    pubH: number,
    orientationMat: DOMMatrix,
    pubOriginInSubX: number,
    pubOriginInSubY: number,
    cx: number,
    cy: number,
    borderRadius: number = 0,
    padding: number = 0,
    subBaseMatrix?: DOMMatrix,
    subOriginX: number = 0,
    subOriginY: number = 0
): string {
    if (pubW <= 0 || pubH <= 0) return "none"

    const left = -padding
    const top = -padding
    const right = pubW + padding
    const bottom = pubH + padding
    const r = Math.max(0, Math.min(borderRadius, pubW / 2 + padding, pubH / 2 + padding))

    // Invert Subscriber's local base matrix if present and non-identity
    let subBaseInv: DOMMatrix | null = null
    if (subBaseMatrix && !subBaseMatrix.isIdentity) {
        try {
            subBaseInv = subBaseMatrix.inverse()
        } catch {
            subBaseInv = null
        }
    }

    // Generate boundary vertices in Publisher local coordinate space relative to origin (cx, cy)
    const points2D: [number, number][] = []
    if (r <= 0) {
        points2D.push([left - cx, top - cy]) // Top-Left
        points2D.push([right - cx, top - cy]) // Top-Right
        points2D.push([right - cx, bottom - cy]) // Bottom-Right
        points2D.push([left - cx, bottom - cy]) // Bottom-Left
    } else {
        // Use 12 segments per corner for smooth projective rounded rectangle tracking
        const segments = 12
        // Top-Right arc
        for (let i = 0; i <= segments; i++) {
            const angle = -Math.PI / 2 + (Math.PI / 2) * (i / segments)
            points2D.push([right - r - cx + r * Math.cos(angle), top + r - cy + r * Math.sin(angle)])
        }
        // Bottom-Right arc
        for (let i = 0; i <= segments; i++) {
            const angle = 0 + (Math.PI / 2) * (i / segments)
            points2D.push([right - r - cx + r * Math.cos(angle), bottom - r - cy + r * Math.sin(angle)])
        }
        // Bottom-Left arc
        for (let i = 0; i <= segments; i++) {
            const angle = Math.PI / 2 + (Math.PI / 2) * (i / segments)
            points2D.push([left + r - cx + r * Math.cos(angle), bottom - r - cy + r * Math.sin(angle)])
        }
        // Top-Left arc
        for (let i = 0; i <= segments; i++) {
            const angle = Math.PI + (Math.PI / 2) * (i / segments)
            points2D.push([left + r - cx + r * Math.cos(angle), top + r - cy + r * Math.sin(angle)])
        }
    }

    // Project each 2D vertex through the unified 3D orientation matrix
    const projectedPoints = points2D.map(([x, y]) => {
        // x' = m11*x + m21*y + m31*z + m41
        // y' = m12*x + m22*y + m32*z + m42
        // w' = m14*x + m24*y + m34*z + m44
        // Since z=0 and we zeroed out translation (m41, m42):
        const xRot = orientationMat.m11 * x + orientationMat.m21 * y
        const yRot = orientationMat.m12 * x + orientationMat.m22 * y
        const wRot = orientationMat.m14 * x + orientationMat.m24 * y + (orientationMat.m44 || 1)

        // Near-plane safe perspective division
        const scale = wRot > 0.001 ? 1 / wRot : 1

        let projX = pubOriginInSubX + xRot * scale
        let projY = pubOriginInSubY + yRot * scale

        // Map back through Subscriber's local base transform inverse if active
        if (subBaseInv && !subBaseInv.isIdentity) {
            const dx = projX - subOriginX
            const dy = projY - subOriginY
            const wLocal = subBaseInv.m14 * dx + subBaseInv.m24 * dy + (subBaseInv.m44 || 1)
            const sLocal = Math.abs(wLocal) > 1e-4 ? 1 / wLocal : 1
            projX = subOriginX + (subBaseInv.m11 * dx + subBaseInv.m21 * dy + subBaseInv.m41) * sLocal
            projY = subOriginY + (subBaseInv.m12 * dx + subBaseInv.m22 * dy + subBaseInv.m42) * sLocal
        }

        return `${projX.toFixed(2)}px ${projY.toFixed(2)}px`
    })

    return `polygon(${projectedPoints.join(", ")})`
}

/**
 * 🪞 TransformInverter
 *
 * Senses the Publisher layer's native Framer 3D rotation, perspective, and hover transforms,
 * and automatically counter-rotates nested child Subscribers so they stay 100% planar and camera-facing.
 * Dynamically masks child content to the Publisher's 3D card boundary without false rotation drift.
 *
 * @framerDisableUnlink
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 */
export default function TransformInverter({
    publisher = "Publisher",
    subscriber = "Subscriber",
    match = "exact",
    intensity = 1.0,
    preserveLocalTransform = true,
    preserveAncestor3DContext = true,
    clipToPublisher = true,
    clipBorderRadius = 0,
    clipPadding = 0,
    enabled = true,
}: TransformInverterProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    const subscriberDataRef = useRef<
        Map<
            HTMLElement,
            {
                originalTransform: string
                baseTransform: string
                baseMatrix: DOMMatrix
                originalTransformStyle?: string
                originalClipPath?: string
            }
        >
    >(new Map())

    const publisherOriginalRef = useRef<
        Map<
            HTMLElement,
            {
                originalTransform: string
                originalTransformStyle?: string
                originalOverflow?: string
                borderRadius: number
            }
        >
    >(new Map())

    const intermediateNodesRef = useRef<
        Map<
            HTMLElement,
            {
                originalTransformStyle?: string
                originalOverflow?: string
            }
        >
    >(new Map())

    const rafIdRef = useRef<number | null>(null)

    useEffect(() => {
        if (!enabled) {
            // Restore intermediate nodes
            intermediateNodesRef.current.forEach((data, el) => {
                if (data.originalTransformStyle !== undefined) {
                    if (data.originalTransformStyle) {
                        el.style.transformStyle = data.originalTransformStyle
                    } else {
                        el.style.removeProperty("transform-style")
                    }
                }
                if (data.originalOverflow !== undefined) {
                    if (data.originalOverflow) {
                        el.style.overflow = data.originalOverflow
                    } else {
                        el.style.removeProperty("overflow")
                    }
                }
            })
            intermediateNodesRef.current.clear()

            // Restore subscribers
            subscriberDataRef.current.forEach((data, el) => {
                if (data.originalTransform && data.originalTransform !== "none") {
                    el.style.transform = data.originalTransform
                } else {
                    el.style.removeProperty("transform")
                }
                if (data.originalTransformStyle) {
                    el.style.transformStyle = data.originalTransformStyle
                } else {
                    el.style.removeProperty("transform-style")
                }
                if (data.originalClipPath) {
                    el.style.clipPath = data.originalClipPath
                } else {
                    el.style.removeProperty("clip-path")
                }
                el.removeAttribute("data-framer-original-transform")
            })
            subscriberDataRef.current.clear()

            // Restore publishers
            publisherOriginalRef.current.forEach((data, el) => {
                if (data.originalTransform && data.originalTransform !== "none") {
                    el.style.transform = data.originalTransform
                } else {
                    el.style.removeProperty("transform")
                }
                if (data.originalTransformStyle) {
                    el.style.transformStyle = data.originalTransformStyle
                } else {
                    el.style.removeProperty("transform-style")
                }
                if (data.originalOverflow) {
                    el.style.overflow = data.originalOverflow
                } else {
                    el.style.removeProperty("overflow")
                }
                el.removeAttribute("data-framer-original-transform")
            })
            publisherOriginalRef.current.clear()
            return
        }

        const parseTargetNames = (input: string) =>
            input
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean)

        const publisherNames = parseTargetNames(publisher)
        const subscriberNames = parseTargetNames(subscriber)

        const matchesName = (nameAttr: string | null, targetList: string[]) => {
            if (!nameAttr) return false
            const lower = nameAttr.toLowerCase().trim()

            return targetList.some((target) => {
                if (target === "*" || target === "all") return true
                switch (match) {
                    case "prefix":
                        return lower.startsWith(target)
                    case "suffix":
                        return lower.endsWith(target)
                    case "contains":
                        return lower.includes(target)
                    case "exact":
                    default:
                        return lower === target
                }
            })
        }

        const findElements = (targets: string[]): HTMLElement[] => {
            if (typeof document === "undefined") return []
            const results: HTMLElement[] = []
            const elements = Array.from(
                document.querySelectorAll<HTMLElement>("[data-framer-name], [name], [id]")
            )

            elements.forEach((el) => {
                const name =
                    el.getAttribute("data-framer-name") ||
                    el.getAttribute("name") ||
                    el.getAttribute("id")
                if (matchesName(name, targets)) {
                    results.push(el)
                }
            })
            return results
        }

        // Cached DOM elements and layout geometry to eliminate layout thrashing during fast scroll
        let cachedPubEl: HTMLElement | null = null
        let cachedSubEls: HTMLElement[] = []
        let isDomDirty = true
        let isLayoutDirty = true
        let lastPubTransformStr = ""

        type CachedSubLayout = {
            scx: number
            scy: number
            subRelPub: { x: number; y: number }
        }
        let cachedPubLayout = {
            cx: 0,
            cy: 0,
            pubW: 0,
            pubH: 0,
            effectiveRadius: 0,
            perspectiveDist: 0,
        }
        const cachedSubLayouts = new Map<HTMLElement, CachedSubLayout>()

        const markDomDirty = () => {
            isDomDirty = true
            isLayoutDirty = true
        }

        const markLayoutDirty = () => {
            isLayoutDirty = true
        }

        const sync = () => {
            // 1. Resolve DOM elements if dirty or disconnected
            if (
                isDomDirty ||
                !cachedPubEl ||
                !cachedPubEl.isConnected ||
                cachedSubEls.some((el) => !el.isConnected)
            ) {
                let publisherElements = publisherNames.length ? findElements(publisherNames) : []

                // Zero-config host discovery fallback
                if (!publisherElements.length && containerRef.current) {
                    const parentFrame = containerRef.current.closest<HTMLElement>(
                        "[data-framer-name], [data-framer-component-type]"
                    )
                    if (parentFrame) {
                        publisherElements = [parentFrame]
                    }
                }

                if (!publisherElements.length) {
                    cachedPubEl = null
                    cachedSubEls = []
                    return
                }

                cachedPubEl = publisherElements[0]

                // Find subscribers inside or across document
                let subscriberElements = subscriberNames.length ? findElements(subscriberNames) : []

                // Wildcard children resolution
                if (
                    !subscriberElements.length &&
                    (subscriberNames.includes("*") ||
                        subscriberNames.includes("all") ||
                        subscriberNames.includes("children"))
                ) {
                    subscriberElements = Array.from(
                        cachedPubEl.querySelectorAll<HTMLElement>("[data-framer-name]")
                    ).filter((el) => el !== cachedPubEl && !el.contains(containerRef.current))
                }

                cachedSubEls = subscriberElements
                isDomDirty = false
                isLayoutDirty = true
            }

            const pubEl = cachedPubEl
            const subscriberElements = cachedSubEls

            if (!pubEl || !subscriberElements.length) {
                return
            }

            // Track publisher original styles
            if (!publisherOriginalRef.current.has(pubEl)) {
                const currentInline = pubEl.style.transform
                const computed =
                    typeof window !== "undefined"
                        ? window.getComputedStyle(pubEl).transform
                        : "none"
                const originalTransform = currentInline || (computed !== "none" ? computed : "none")

                const computedStyle =
                    typeof window !== "undefined" ? window.getComputedStyle(pubEl) : null
                const parsedRadius = computedStyle
                    ? parseFloat(computedStyle.borderRadius) || 0
                    : 0

                publisherOriginalRef.current.set(pubEl, {
                    originalTransform,
                    originalTransformStyle: pubEl.style.transformStyle,
                    originalOverflow: pubEl.style.overflow,
                    borderRadius: parsedRadius,
                })
            }

            // Maintain 3D rendering context across publisher and all intermediate ancestor containers
            if (preserveAncestor3DContext) {
                if (pubEl.style.transformStyle !== "preserve-3d") {
                    pubEl.style.transformStyle = "preserve-3d"
                }
                if (pubEl.style.overflow === "hidden" || pubEl.style.overflow === "clip") {
                    pubEl.style.overflow = "visible"
                }

                subscriberElements.forEach((subEl) => {
                    let curr = subEl.parentElement
                    while (curr && curr !== pubEl && curr !== document.body) {
                        if (!intermediateNodesRef.current.has(curr)) {
                            intermediateNodesRef.current.set(curr, {
                                originalTransformStyle: curr.style.transformStyle,
                                originalOverflow: curr.style.overflow,
                            })
                        }
                        if (curr.style.transformStyle !== "preserve-3d") {
                            curr.style.transformStyle = "preserve-3d"
                        }
                        if (curr.style.overflow === "hidden" || curr.style.overflow === "clip") {
                            curr.style.overflow = "visible"
                        }
                        curr = curr.parentElement
                    }
                })
            }

            // Read computed/inline 3D transform directly from Publisher
            const inlineTransform = pubEl.style.transform
            const pubComputed =
                !inlineTransform && typeof window !== "undefined"
                    ? window.getComputedStyle(pubEl)
                    : null
            const pubTransformStr = inlineTransform || pubComputed?.transform || "none"

            // 2. Measure layout metrics only when dirty (avoids forced layout thrashing during fast scroll)
            if (isLayoutDirty) {
                const activeComputed =
                    typeof window !== "undefined" ? window.getComputedStyle(pubEl) : null
                const originStr = activeComputed?.transformOrigin || ""
                const parts = originStr.split(" ").map(parseFloat)
                const cx = isNaN(parts[0])
                    ? (pubEl.offsetWidth || pubEl.clientWidth) / 2
                    : parts[0]
                const cy = isNaN(parts[1])
                    ? (pubEl.offsetHeight || pubEl.clientHeight) / 2
                    : parts[1]

                const pubDOMMatForPerspective = parseMatrix(pubTransformStr)
                const perspectiveDist = extractPerspectiveDistance(pubEl, pubDOMMatForPerspective)

                const pubData = publisherOriginalRef.current.get(pubEl)!
                const effectiveRadius =
                    clipBorderRadius > 0
                        ? clipBorderRadius
                        : activeComputed
                        ? parseFloat(activeComputed.borderRadius) || pubData.borderRadius || 0
                        : pubData.borderRadius || 0

                const pubW = pubEl.offsetWidth || pubEl.clientWidth
                const pubH = pubEl.offsetHeight || pubEl.clientHeight

                cachedPubLayout = {
                    cx,
                    cy,
                    pubW,
                    pubH,
                    effectiveRadius,
                    perspectiveDist,
                }

                subscriberElements.forEach((subEl) => {
                    const subComputed =
                        typeof window !== "undefined" ? window.getComputedStyle(subEl) : null
                    const subOriginStr = subComputed?.transformOrigin || ""
                    const subOriginParts = subOriginStr.split(" ").map(parseFloat)
                    const scx = isNaN(subOriginParts[0])
                        ? (subEl.offsetWidth || subEl.clientWidth) / 2
                        : subOriginParts[0]
                    const scy = isNaN(subOriginParts[1])
                        ? (subEl.offsetHeight || subEl.clientHeight) / 2
                        : subOriginParts[1]
                    const subRelPub = getStaticOffsetRelToAncestor(subEl, pubEl)

                    cachedSubLayouts.set(subEl, { scx, scy, subRelPub })
                })

                isLayoutDirty = false
            }

            // Quick change detection: if transform and layout did not change, skip matrix compute
            if (pubTransformStr === lastPubTransformStr && !isLayoutDirty) {
                return
            }
            lastPubTransformStr = pubTransformStr

            const pubDOMMat = parseMatrix(pubTransformStr)
            const { cx, cy, pubW, pubH, effectiveRadius, perspectiveDist } = cachedPubLayout

            // Extract perspective distance and build pure 3D orientation matrix directly from Publisher matrix
            const orientationMat = build3DOrientationMatrix(pubDOMMat, perspectiveDist)

            // Derive exact counter-transform matrix (O^-1)
            const counterMatrix = createCounterTransformMatrix(orientationMat, intensity)

            // Apply counter-transform and clean clipping to all matched subscribers
            subscriberElements.forEach((subEl) => {
                if (!subscriberDataRef.current.has(subEl)) {
                    const storedOrig = subEl.getAttribute("data-framer-original-transform")
                    const currentInline = subEl.style.transform
                    const computed =
                        typeof window !== "undefined"
                            ? window.getComputedStyle(subEl).transform
                            : "none"
                    const originalTransform =
                        storedOrig ?? (currentInline || (computed !== "none" ? computed : "none"))

                    if (!subEl.hasAttribute("data-framer-original-transform")) {
                        subEl.setAttribute("data-framer-original-transform", originalTransform)
                    }

                    subscriberDataRef.current.set(subEl, {
                        originalTransform,
                        baseTransform: extractBaseTransform(originalTransform),
                        baseMatrix: parseMatrix(extractBaseTransform(originalTransform)),
                        originalTransformStyle: subEl.style.transformStyle,
                        originalClipPath: subEl.style.clipPath,
                    })
                }

                const subData = subscriberDataRef.current.get(subEl)!
                let subLayout = cachedSubLayouts.get(subEl)
                if (!subLayout) {
                    const subRelPub = getStaticOffsetRelToAncestor(subEl, pubEl)
                    const scx = (subEl.offsetWidth || subEl.clientWidth) / 2
                    const scy = (subEl.offsetHeight || subEl.clientHeight) / 2
                    subLayout = { scx, scy, subRelPub }
                    cachedSubLayouts.set(subEl, subLayout)
                }

                const { scx, scy, subRelPub } = subLayout

                // Mathematically align the Subscriber's pivot with the Publisher's rotation origin
                const pubOriginInSubX = cx - subRelPub.x
                const pubOriginInSubY = cy - subRelPub.y

                // Vector from Subscriber origin to Publisher origin in Subscriber space
                const deltaX = pubOriginInSubX - scx
                const deltaY = pubOriginInSubY - scy

                // Conjugate counter-matrix by pivot translation delta:
                // M_pivot = Translate(delta) * M_counter * Translate(-delta)
                const tDelta = translateMatrix(deltaX, deltaY, 0)
                const tNegDelta = translateMatrix(-deltaX, -deltaY, 0)
                const pivotAdjustedCounter = tDelta.multiply(counterMatrix).multiply(tNegDelta)

                let finalMatrix: DOMMatrix
                if (preserveLocalTransform && subData.baseTransform !== "none") {
                    finalMatrix = pivotAdjustedCounter.multiply(subData.baseMatrix)
                } else {
                    finalMatrix = pivotAdjustedCounter
                }

                const targetCSS = toCSS3D(finalMatrix)

                if (subEl.style.transform !== targetCSS) {
                    subEl.style.transform = targetCSS
                }
                if (subEl.style.transformStyle !== "preserve-3d") {
                    subEl.style.transformStyle = "preserve-3d"
                }
                if (subEl.style.willChange !== "transform, clip-path") {
                    subEl.style.willChange = "transform, clip-path"
                }

                // Ensure child background image wrappers maintain 3D rendering
                const innerWrapper = subEl.querySelector<HTMLElement>(
                    "[data-framer-background-image-wrapper]"
                )
                if (innerWrapper && innerWrapper.style.transformStyle !== "preserve-3d") {
                    innerWrapper.style.transformStyle = "preserve-3d"
                }

                // 🌟 Mathematically Pure 3D Projected Card Clipping
                if (clipToPublisher && pubW > 0 && pubH > 0) {
                    const activeSubBaseMatrix =
                        preserveLocalTransform &&
                        subData.baseTransform !== "none" &&
                        !subData.baseMatrix.isIdentity
                            ? subData.baseMatrix
                            : undefined

                    const targetClip = computeProjectedCardClipPolygon(
                        pubW,
                        pubH,
                        orientationMat,
                        pubOriginInSubX,
                        pubOriginInSubY,
                        cx,
                        cy,
                        effectiveRadius,
                        clipPadding,
                        activeSubBaseMatrix,
                        scx,
                        scy
                    )

                    if (subEl.style.clipPath !== targetClip) {
                        subEl.style.clipPath = targetClip
                    }
                } else if (!clipToPublisher) {
                    if (subData.originalClipPath) {
                        if (subEl.style.clipPath !== subData.originalClipPath) {
                            subEl.style.clipPath = subData.originalClipPath
                        }
                    } else {
                        if (subEl.style.clipPath) {
                            subEl.style.removeProperty("clip-path")
                        }
                    }
                }
            })
        }

        let isRunning = true
        const loop = () => {
            if (!isRunning) return
            sync()
            rafIdRef.current = requestAnimationFrame(loop)
        }

        rafIdRef.current = requestAnimationFrame(loop)

        // Capture high-frequency scroll & wheel events directly for instantaneous sync
        const onScrollOrWheel = () => {
            sync()
        }

        const onResize = () => {
            markLayoutDirty()
            sync()
        }

        if (typeof window !== "undefined") {
            window.addEventListener("scroll", onScrollOrWheel, { passive: true, capture: true })
            window.addEventListener("wheel", onScrollOrWheel, { passive: true, capture: true })
            window.addEventListener("resize", onResize, { passive: true })
        }

        // ResizeObserver for tracking dimension changes without polling
        let resizeObserver: ResizeObserver | null = null
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                markLayoutDirty()
                sync()
            })
            if (containerRef.current) {
                resizeObserver.observe(containerRef.current)
            }
        }

        const observer = new MutationObserver(() => {
            markDomDirty()
            sync()
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-framer-name", "style", "class"],
        })

        return () => {
            isRunning = false
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current)
            }
            if (typeof window !== "undefined") {
                window.removeEventListener("scroll", onScrollOrWheel, { capture: true })
                window.removeEventListener("wheel", onScrollOrWheel, { capture: true })
                window.removeEventListener("resize", onResize)
            }
            if (resizeObserver) {
                resizeObserver.disconnect()
            }
            observer.disconnect()

            // Restore intermediate nodes
            intermediateNodesRef.current.forEach((data, el) => {
                if (data.originalTransformStyle !== undefined) {
                    if (data.originalTransformStyle) {
                        el.style.transformStyle = data.originalTransformStyle
                    } else {
                        el.style.removeProperty("transform-style")
                    }
                }
                if (data.originalOverflow !== undefined) {
                    if (data.originalOverflow) {
                        el.style.overflow = data.originalOverflow
                    } else {
                        el.style.removeProperty("overflow")
                    }
                }
            })
            intermediateNodesRef.current.clear()

            // Restore subscribers
            subscriberDataRef.current.forEach((data, el) => {
                if (data.originalTransform && data.originalTransform !== "none") {
                    el.style.transform = data.originalTransform
                } else {
                    el.style.removeProperty("transform")
                }
                if (data.originalTransformStyle) {
                    el.style.transformStyle = data.originalTransformStyle
                } else {
                    el.style.removeProperty("transform-style")
                }
                if (data.originalClipPath) {
                    el.style.clipPath = data.originalClipPath
                } else {
                    el.style.removeProperty("clip-path")
                }
                el.style.removeProperty("will-change")
                el.removeAttribute("data-framer-original-transform")
            })
            subscriberDataRef.current.clear()

            // Restore publishers
            publisherOriginalRef.current.forEach((data, el) => {
                if (data.originalTransform && data.originalTransform !== "none") {
                    el.style.transform = data.originalTransform
                } else {
                    el.style.removeProperty("transform")
                }
                if (data.originalTransformStyle) {
                    el.style.transformStyle = data.originalTransformStyle
                } else {
                    el.style.removeProperty("transform-style")
                }
                if (data.originalOverflow) {
                    el.style.overflow = data.originalOverflow
                } else {
                    el.style.removeProperty("overflow")
                }
                el.removeAttribute("data-framer-original-transform")
            })
            publisherOriginalRef.current.clear()
        }
    }, [
        publisher,
        subscriber,
        match,
        intensity,
        preserveLocalTransform,
        preserveAncestor3DContext,
        clipToPublisher,
        clipBorderRadius,
        clipPadding,
        enabled,
    ])

    return (
        <div
            ref={containerRef}
            style={{
                width: 1,
                height: 1,
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
                visibility: "hidden",
            }}
        />
    )
}

TransformInverter.displayName = "Transform Inverter (Flat Child)"

addPropertyControls(TransformInverter, {
    publisher: {
        type: ControlType.String,
        title: "Publisher",
        placeholder: "Publisher, Card, Container",
        defaultValue: "Publisher",
        description: "Target layer name for 3D rotation",
    },

    subscriber: {
        type: ControlType.String,
        title: "Subscriber",
        placeholder: "Subscriber, Badge, Image, *",
        defaultValue: "Subscriber",
        description: "Child layer name to keep 100% flat (* for all children)",
    },

    match: {
        type: ControlType.Enum,
        title: "Match",
        options: ["exact", "prefix", "suffix", "contains"],
        optionTitles: ["Exact", "Prefix", "Suffix", "Contains"],
        defaultValue: "exact",
    },

    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 1.0,
        description: "1.0 = completely flat, 0 = tilted with parent",
    },

    preserveLocalTransform: {
        type: ControlType.Boolean,
        title: "Preserve Sub",
        defaultValue: true,
        description: "Preserve Subscriber's own original scale/offset/transform",
    },

    preserveAncestor3DContext: {
        type: ControlType.Boolean,
        title: "3D Chain",
        defaultValue: true,
        description: "Enforce preserve-3d & visible overflow across intermediate containers",
    },

    clipToPublisher: {
        type: ControlType.Boolean,
        title: "Clip to Card",
        defaultValue: true,
        description: "Mask Subscriber to Publisher 3D card boundary and corner radius",
    },

    clipBorderRadius: {
        type: ControlType.Number,
        title: "Clip Radius",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 0,
        unit: "px",
        description: "Clip corner radius (0 = auto-detect from Publisher)",
        hidden(props) {
            return !props.clipToPublisher
        },
    },

    clipPadding: {
        type: ControlType.Number,
        title: "Clip Padding",
        min: -50,
        max: 50,
        step: 1,
        defaultValue: 0,
        unit: "px",
        description: "Padding adjustment for the clip boundary",
        hidden(props) {
            return !props.clipToPublisher
        },
    },

    enabled: {
        type: ControlType.Boolean,
        title: "Enabled",
        defaultValue: true,
    },
})
