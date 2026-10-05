import { addPropertyControls, ControlType, RenderTarget } from "framer"
import {
    useScroll,
    useVelocity,
    useMotionValueEvent,
    useMotionValue,
    useSpring,
} from "framer-motion"
import { useEffect, useRef } from "react"

function smootherstep(t: number) {
    t = Math.max(0, Math.min(1, t))
    return t * t * t * (t * (t * 6 - 15) + 10)
}

/** Top/bottom inward curve — fuller, smoother arc (more curvy). */
function buildElegantVerticalCurve(size = 640) {
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    const img = ctx.createImageData(size, size)
    const d = img.data
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const nx = (x / (size - 1)) * 2 - 1
            const ny = (y / (size - 1)) * 2 - 1
            const ay = Math.abs(ny)
            const t = smootherstep(Math.max(0, (ay - 0.08) / 0.92))
            const cosine = 1 - Math.cos(Math.PI * 0.5 * t)
            const lateral = 0.7 + 0.3 * (nx * nx)
            let dy = -Math.sign(ny || 1) * cosine * lateral
            dy = Math.max(-0.95, Math.min(0.95, dy))
            const i = (y * size + x) * 4
            d[i] = 128
            d[i + 1] = Math.round(128 + dy * 127)
            d[i + 2] = 128
            d[i + 3] = 255
        }
    }
    ctx.putImageData(img, 0, 0)
    try {
        ctx.filter = "blur(1.25px)"
        ctx.drawImage(canvas, 0, 0)
        ctx.filter = "none"
    } catch (_) {}
    return canvas.toDataURL("image/png")
}

type LensSingleton = {
    overlay: HTMLDivElement
    dispEl: Element | null
    blurTop: HTMLDivElement
    blurBottom: HTMLDivElement
    filterCss: string
}

let lensSingleton: LensSingleton | null = null

/**
 * Viewport Lens — full-viewport top/bottom curve + progressive edge blur
 * driven by scroll VELOCITY (gentle spring).
 */
export default function ViewportLens(props: {
    maxStrength?: number
    maxBlur?: number
    blurBand?: number
    velocityScale?: number
    style?: React.CSSProperties
}) {
    const {
        maxStrength = 0.2,
        maxBlur = 16,
        blurBand = 0.3,
        velocityScale = 0.0014,
        style,
    } = props

    const isCanvas =
        typeof window !== "undefined" &&
        RenderTarget.current() === RenderTarget.canvas

    const { scrollY } = useScroll()
    const rawVelocity = useVelocity(scrollY)
    const absVel = useMotionValue(0)
    // Gentle motion: soft stiffness, calm damping, light mass
    const smoothVel = useSpring(absVel, {
        stiffness: 90,
        damping: 28,
        mass: 0.85,
    })

    useMotionValueEvent(rawVelocity, "change", (v) => {
        absVel.set(Math.abs(v))
    })

    const maxSRef = useRef(maxStrength)
    maxSRef.current = maxStrength
    const maxBRef = useRef(maxBlur)
    maxBRef.current = maxBlur
    const scaleRef = useRef(velocityScale)
    scaleRef.current = velocityScale

    useMotionValueEvent(smoothVel, "change", (v) => {
        if (!lensSingleton?.dispEl) return
        const morphinePending =
            typeof window !== "undefined" &&
            (window as any).__MORPHINE_ANIMATE_VIEW_V1__?.pending
        const strength = morphinePending
            ? 0
            : Math.min(maxSRef.current, v * scaleRef.current)
        const blurPx = morphinePending
            ? 0
            : Math.min(
                  maxBRef.current,
                  (v * scaleRef.current * maxBRef.current) /
                      Math.max(0.01, maxSRef.current)
              )

        lensSingleton.dispEl.setAttribute("scale", String(strength))
        const active = strength > 0.003
        if (lensSingleton.overlay) {
            if (active) {
                lensSingleton.overlay.style.backdropFilter =
                    lensSingleton.filterCss
                lensSingleton.overlay.style.webkitBackdropFilter =
                    lensSingleton.filterCss
            } else {
                lensSingleton.overlay.style.backdropFilter = "none"
                lensSingleton.overlay.style.webkitBackdropFilter = "none"
            }
        }

        const op = Math.min(1, blurPx / Math.max(1, maxBRef.current))
        ;[lensSingleton.blurTop, lensSingleton.blurBottom].forEach((el) => {
            if (!el) return
            if (blurPx < 0.4) {
                el.style.visibility = "hidden"
                el.style.opacity = "0"
                el.style.backdropFilter = "none"
                el.style.webkitBackdropFilter = "none"
            } else {
                el.style.visibility = "visible"
                el.style.opacity = String(op)
                const f = `blur(${blurPx.toFixed(1)}px)`
                el.style.backdropFilter = f
                el.style.webkitBackdropFilter = f
            }
        })
    })

    useEffect(() => {
        if (isCanvas || typeof window === "undefined") return
        ;[
            "viewport-lens-overlay",
            "viewport-lens-filter-svg",
            "viewport-lens-blur-top",
            "viewport-lens-blur-bottom",
        ].forEach((id) => document.getElementById(id)?.remove())
        lensSingleton = null

        const filterId = "viewport-lens-filter"
        const filterCss = `url(#${filterId})`
        const mapDataUrl = buildElegantVerticalCurve(640)

        const svgHost = document.createElement("div")
        svgHost.id = "viewport-lens-filter-svg"
        svgHost.setAttribute("aria-hidden", "true")
        svgHost.style.cssText =
            "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none"
        svgHost.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><defs><filter id="${filterId}" x="-5%" y="-18%" width="110%" height="136%" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB"><feImage id="${filterId}-map" result="map" x="0" y="0" width="1" height="1" preserveAspectRatio="none"/><feDisplacementMap id="${filterId}-disp" in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>`
        document.body.prepend(svgHost)

        if (mapDataUrl) {
            const feImg = document.getElementById(`${filterId}-map`)
            if (feImg) {
                feImg.setAttribute("href", mapDataUrl)
                feImg.setAttributeNS(
                    "http://www.w3.org/1999/xlink",
                    "href",
                    mapDataUrl
                )
            }
        }

        const dispEl = document.getElementById(`${filterId}-disp`)
        const overlay = document.createElement("div")
        overlay.id = "viewport-lens-overlay"
        overlay.setAttribute("aria-hidden", "true")
        overlay.setAttribute("data-framer-page-effect-exclude", "true")
        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: "9998",
            backdropFilter: "none",
            webkitBackdropFilter: "none",
            viewTransitionName: "none",
        })
        overlay.style.height = "100vh"

        const bandPct = Math.round(blurBand * 100)
        function makeBlur(id: string, top: boolean) {
            const el = document.createElement("div")
            el.id = id
            el.setAttribute("aria-hidden", "true")
            el.setAttribute("data-framer-page-effect-exclude", "true")
            const mask = top
                ? "linear-gradient(to bottom, black 0%, black 18%, rgba(0,0,0,0.55) 45%, transparent 100%)"
                : "linear-gradient(to top, black 0%, black 18%, rgba(0,0,0,0.55) 45%, transparent 100%)"
            Object.assign(el.style, {
                position: "fixed",
                left: "0",
                width: "100%",
                height: `${bandPct}vh`,
                pointerEvents: "none",
                zIndex: "9997",
                opacity: "0",
                visibility: "hidden",
                viewTransitionName: "none",
                ...(top ? { top: "0" } : { bottom: "0" }),
                maskImage: mask,
                webkitMaskImage: mask,
            })
            return el
        }
        const blurTop = makeBlur("viewport-lens-blur-top", true)
        const blurBottom = makeBlur("viewport-lens-blur-bottom", false)

        const template =
            document.querySelector('[data-layout-template="true"]') ||
            document.getElementById("main") ||
            document.body
        ;[overlay, blurTop, blurBottom].forEach((el) => {
            if (el.parentElement !== template) template.appendChild(el)
        })

        lensSingleton = { overlay, dispEl, blurTop, blurBottom, filterCss }

        return () => {
            lensSingleton = null
            ;[
                "viewport-lens-overlay",
                "viewport-lens-filter-svg",
                "viewport-lens-blur-top",
                "viewport-lens-blur-bottom",
            ].forEach((id) => document.getElementById(id)?.remove())
        }
    }, [isCanvas, maxStrength, maxBlur, blurBand])

    if (isCanvas) {
        return (
            <div
                style={{
                    ...style,
                    width: "100%",
                    height: 64,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(12,14,22,0.95)",
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 13,
                    borderRadius: 8,
                    border: "1px dashed rgba(255,255,255,0.2)",
                }}
            >
                ViewportLens · gentle velocity curve
            </div>
        )
    }

    return (
        <div
            data-viewport-lens-boot
            data-framer-page-effect-exclude="true"
            style={{ display: "none", ...style }}
            aria-hidden
        />
    )
}

ViewportLens.displayName = "Viewport Lens Overlay"

addPropertyControls(ViewportLens, {
    maxStrength: {
        type: ControlType.Number,
        title: "Max curve",
        min: 0,
        max: 0.35,
        step: 0.01,
        defaultValue: 0.2,
    },
    maxBlur: {
        type: ControlType.Number,
        title: "Max blur (px)",
        min: 0,
        max: 28,
        step: 1,
        defaultValue: 16,
    },
    blurBand: {
        type: ControlType.Number,
        title: "Blur band",
        min: 0.12,
        max: 0.45,
        step: 0.02,
        defaultValue: 0.3,
    },
    velocityScale: {
        type: ControlType.Number,
        title: "Velocity scale",
        min: 0.0002,
        max: 0.005,
        step: 0.0001,
        defaultValue: 0.0014,
        description: "Maps |scroll velocity| → curve/blur strength.",
    },
})
