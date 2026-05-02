import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef, useState, startTransition } from "react"

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 40
 * @framerIntrinsicHeight 40
 */
export default function Styler(props) {
    const {
        targetId,
        manualId,
        opacity,
        blur,
        grayscale,
        hueRotate,
        sepia,
        invert,
        rotate,
        scale,
        skewX,
        skewY,
        x,
        y,
        borderRadius,
        backgroundColor,
        borderWidth,
        borderColor,
        borderStyle,
        mixBlendMode,
        zIndex,
        pointerEvents,
        transitionDuration,
        transitionEasing,
        enabled,
        showDebug,
    } = props

    const [debugInfo, setDebugInfo] = useState<string>("Waiting...")
    const originalStylesRef = useRef<any>(null)
    const targetElementRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        if (!enabled) {
            startTransition(() => setDebugInfo("Disabled"))
            return
        }

        // Discovery Logic: Manual ID takes precedence, then Picker
        const effectiveId = manualId || (typeof targetId === "string" ? targetId : targetId?.section || targetId?.id)
        
        if (!effectiveId && (!targetId || !targetId.current)) {
            startTransition(() => setDebugInfo("No Target"))
            return
        }

        const applyStyles = (el: HTMLElement) => {
            if (!el || !el.style) return

            // Save original styles once per element
            if (originalStylesRef.current === null) {
                originalStylesRef.current = {
                    opacity: el.style.opacity,
                    filter: el.style.filter,
                    transform: el.style.transform,
                    borderRadius: el.style.borderRadius,
                    backgroundColor: el.style.backgroundColor,
                    borderWidth: el.style.borderWidth,
                    borderColor: el.style.borderColor,
                    borderStyle: el.style.borderStyle,
                    mixBlendMode: el.style.mixBlendMode,
                    zIndex: el.style.zIndex,
                    pointerEvents: el.style.pointerEvents,
                    transition: el.style.transition,
                }
            }

            // Apply Transition
            el.style.transition = transitionDuration > 0 
                ? `all ${transitionDuration}s ${transitionEasing}` 
                : "none"

            // Filters
            const filters = [
                blur > 0 ? `blur(${blur}px)` : "",
                grayscale > 0 ? `grayscale(${grayscale}%)` : "",
                hueRotate !== 0 ? `hue-rotate(${hueRotate}deg)` : "",
                sepia > 0 ? `sepia(${sepia}%)` : "",
                invert > 0 ? `invert(${invert}%)` : "",
            ].filter(Boolean).join(" ")

            // Transforms
            const transforms = [
                scale !== 1 ? `scale(${scale})` : "",
                rotate !== 0 ? `rotate(${rotate}deg)` : "",
                skewX !== 0 ? `skewX(${skewX}deg)` : "",
                skewY !== 0 ? `skewY(${skewY}deg)` : "",
                x !== 0 || y !== 0 ? `translate(${x}px, ${y}px)` : "",
            ].filter(Boolean).join(" ")

            // Apply Values
            el.style.opacity = `${opacity}`
            el.style.filter = filters
            el.style.transform = transforms
            el.style.borderRadius = `${borderRadius}px`
            el.style.backgroundColor = backgroundColor
            el.style.borderWidth = `${borderWidth}px`
            el.style.borderColor = borderColor
            el.style.borderStyle = borderStyle
            el.style.mixBlendMode = mixBlendMode
            el.style.zIndex = zIndex === 0 ? (originalStylesRef.current?.zIndex || "") : `${zIndex}`
            el.style.pointerEvents = pointerEvents
        }

        const restoreStyles = () => {
            const el = targetElementRef.current
            if (el && originalStylesRef.current) {
                Object.assign(el.style, originalStylesRef.current)
                originalStylesRef.current = null
            }
        }

        let searchInterval: number | null = null

        const findElement = () => {
            let foundEl: HTMLElement | null = null

            // 1. Try manual ID or Picked ID string
            if (effectiveId && typeof effectiveId === "string") {
                foundEl = document.getElementById(effectiveId)
                if (!foundEl) {
                    foundEl = document.querySelector(`[data-framer-section-id="${effectiveId}"], [data-framer-name="${effectiveId}"], [id="${effectiveId}"]`) as HTMLElement
                }
            }

            // 2. Try Ref Current if available (from Picker)
            if (!foundEl && targetId?.current) {
                foundEl = targetId.current
            }

            if (foundEl) {
                if (searchInterval) clearInterval(searchInterval)
                applyStyles(foundEl)
                targetElementRef.current = foundEl
                startTransition(() => {
                    setDebugInfo(`Active: ${effectiveId || "Target Node"}`)
                })
            } else {
                startTransition(() => {
                    setDebugInfo(`Searching: ${effectiveId || "..."}`)
                })
            }
        }

        findElement()
        // Aggressive search for Framer Canvas hydration
        searchInterval = window.setInterval(findElement, 500)

        return () => {
            if (searchInterval) clearInterval(searchInterval)
            restoreStyles()
        }
    }, [
        enabled,
        targetId,
        manualId,
        opacity,
        blur,
        grayscale,
        hueRotate,
        sepia,
        invert,
        rotate,
        scale,
        skewX,
        skewY,
        x,
        y,
        borderRadius,
        backgroundColor,
        borderWidth,
        borderColor,
        borderStyle,
        mixBlendMode,
        zIndex,
        pointerEvents,
        transitionDuration,
        transitionEasing,
        showDebug,
    ])

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: RenderTarget.current() === RenderTarget.canvas || showDebug ? "flex" : "none",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 153, 255, 0.05)",
                border: "1px dashed rgba(0, 153, 255, 0.4)",
                borderRadius: 8,
                overflow: "hidden",
                fontSize: 9,
                color: "#09f",
                fontFamily: "monospace",
                textAlign: "center",
                padding: 4,
                pointerEvents: "none",
            }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: 4 }}
            >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            {showDebug && (
                <div style={{ wordBreak: "break-all", background: "rgba(255, 255, 255, 0.9)", padding: "1px 3px", borderRadius: 3, border: "1px solid rgba(0, 153, 255, 0.2)" }}>
                    {debugInfo}
                </div>
            )}
        </div>
    )
}

Styler.defaultProps = {
    enabled: true,
    showDebug: true,
    manualId: "",
    targetId: "",
    opacity: 1,
    blur: 0,
    grayscale: 0,
    hueRotate: 0,
    sepia: 0,
    invert: 0,
    rotate: 0,
    scale: 1,
    skewX: 0,
    skewY: 0,
    x: 0,
    y: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    borderStyle: "solid",
    mixBlendMode: "normal",
    zIndex: 0,
    pointerEvents: "auto",
    transitionDuration: 0.3,
    transitionEasing: "ease-in-out",
}

addPropertyControls(Styler, {
    enabled: {
        type: ControlType.Boolean,
        title: "Enabled",
        defaultValue: true,
    },
    showDebug: {
        type: ControlType.Boolean,
        title: "Debug Info",
        defaultValue: true,
    },
    manualId: {
        type: ControlType.String,
        title: "Manual ID",
        placeholder: "Type Layer ID...",
        defaultValue: "",
    },
    targetId: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Picker",
    },
    transitionDuration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0,
        max: 5,
        step: 0.1,
        unit: "s",
        defaultValue: 0.3,
    },
    transitionEasing: {
        type: ControlType.Enum,
        title: "Easing",
        options: ["ease", "ease-in", "ease-out", "ease-in-out", "linear"],
        defaultValue: "ease-in-out",
    },
    opacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 1,
    },
    blur: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 20,
        defaultValue: 0,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "transparent",
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        defaultValue: 0,
    },
    borderWidth: {
        type: ControlType.Number,
        title: "Border Width",
        min: 0,
        defaultValue: 0,
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border Color",
        defaultValue: "transparent",
    },
    borderStyle: {
        type: ControlType.Enum,
        title: "Border Style",
        options: ["solid", "dashed", "dotted", "none"],
        defaultValue: "solid",
    },
    filters: {
        type: ControlType.Object,
        title: "Filters",
        controls: {
            grayscale: {
                type: ControlType.Number,
                title: "Grayscale",
                min: 0,
                max: 100,
                unit: "%",
                defaultValue: 0,
            },
            hueRotate: {
                type: ControlType.Number,
                title: "Hue Rotate",
                min: 0,
                max: 360,
                unit: "°",
                defaultValue: 0,
            },
            sepia: {
                type: ControlType.Number,
                title: "Sepia",
                min: 0,
                max: 100,
                unit: "%",
                defaultValue: 0,
            },
            invert: {
                type: ControlType.Number,
                title: "Invert",
                min: 0,
                max: 100,
                unit: "%",
                defaultValue: 0,
            },
        },
    },
    transforms: {
        type: ControlType.Object,
        title: "Transform",
        controls: {
            rotate: {
                type: ControlType.Number,
                title: "Rotate",
                unit: "°",
                defaultValue: 0,
            },
            scale: {
                type: ControlType.Number,
                title: "Scale",
                step: 0.1,
                defaultValue: 1,
            },
            x: {
                type: ControlType.Number,
                title: "X Offset",
                unit: "px",
                defaultValue: 0,
            },
            y: {
                type: ControlType.Number,
                title: "Y Offset",
                unit: "px",
                defaultValue: 0,
            },
            skewX: {
                type: ControlType.Number,
                title: "Skew X",
                unit: "°",
                defaultValue: 0,
            },
            skewY: {
                type: ControlType.Number,
                title: "Skew Y",
                unit: "°",
                defaultValue: 0,
            },
        },
    },
    advanced: {
        type: ControlType.Object,
        title: "Advanced",
        controls: {
            mixBlendMode: {
                type: ControlType.Enum,
                title: "Blend Mode",
                options: [
                    "normal", "multiply", "screen", "overlay", "darken",
                    "lighten", "color-dodge", "color-burn", "hard-light",
                    "soft-light", "difference", "exclusion", "hue",
                    "saturation", "color", "luminosity"
                ],
                defaultValue: "normal",
            },
            zIndex: {
                type: ControlType.Number,
                title: "Z-Index",
                defaultValue: 0,
            },
            pointerEvents: {
                type: ControlType.Enum,
                title: "Pointer Events",
                options: ["auto", "none", "all"],
                defaultValue: "auto",
            },
        },
    },
})
