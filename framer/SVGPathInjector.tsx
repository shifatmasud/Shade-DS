import React, { useRef, useState, useEffect } from "react"
import { motionValue, animate, svgEffect, useScroll } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

/**
 * 🛠️ Helper to detect if an element is inside <defs> template
 */
const isInsideDefs = (el: HTMLElement | SVGElement): boolean => {
    let parent = el.parentElement
    while (parent) {
        if (parent.tagName.toLowerCase() === "defs") {
            return true
        }
        parent = parent.parentElement
    }
    return false
}

/**
 * 🛠️ Helper to detect if an element is a small anchor point or control handle
 */
const isAnchorPoint = (el: HTMLElement | SVGElement): boolean => {
    const tagName = el.tagName.toLowerCase()
    const id = (el.id || "").toLowerCase()
    const className = (typeof el.className === "string" ? el.className : "").toLowerCase()
    const nameAttr = (el.getAttribute("data-framer-name") || "").toLowerCase()

    // 1. Check common names/attributes
    if (
        id.includes("anchor") || id.includes("handle") || id.includes("point") || id.includes("marker") || id.includes("dot") || id.includes("vector") ||
        className.includes("anchor") || className.includes("handle") || className.includes("point") || className.includes("marker") || className.includes("dot") || className.includes("vector") ||
        nameAttr.includes("anchor") || nameAttr.includes("handle") || nameAttr.includes("point") || nameAttr.includes("marker") || nameAttr.includes("dot") || nameAttr.includes("vector")
    ) {
        return true
    }

    // 2. Check geometry and size constraints for shape types
    if (tagName === "circle") {
        const r = parseFloat(el.getAttribute("r") || "0")
        if (r > 0 && r <= 8) return true
    } else if (tagName === "rect") {
        const w = parseFloat(el.getAttribute("width") || "0")
        const h = parseFloat(el.getAttribute("height") || "0")
        if (w > 0 && w <= 16 && h > 0 && h <= 16) return true
    } else if (tagName === "ellipse") {
        const rx = parseFloat(el.getAttribute("rx") || "0")
        const ry = parseFloat(el.getAttribute("ry") || "0")
        if (rx > 0 && rx <= 8 && ry > 0 && ry <= 8) return true
    } else if (tagName === "path") {
        try {
            if ("getBBox" in el) {
                const bbox = (el as any).getBBox()
                if (bbox.width > 0 && bbox.width <= 16 && bbox.height > 0 && bbox.height <= 16) {
                    return true
                }
            }
        } catch (e) {
            const d = el.getAttribute("d") || ""
            if (d.length < 50 && (d.includes("M") || d.includes("m"))) {
                return true
            }
        }
    }
    return false
}

/**
 * 🎨 SVGPathInjector (svgEffect Edition)
 * 
 * A self-contained Framer Code Component that uses the 'svgEffect' API 
 * to animate sibling SVG paths with precision.
 * 
 * Pattern: Injector (Zero-UI, purely behavioral)
 * 
 * @framerDisableUnlink
 * @framerIntrinsicWidth 160
 * @framerIntrinsicHeight 60
 */
export default function SVGPathInjector(props: any) {
    const {
        trigger = "mount",
        drawProgress = 1,
        scrollsectionref,
        scrollOffsetStart = "start end",
        scrollOffsetEnd = "end start",
        color = "",
        strokeWidth = 0,
        transition = {
            type: "tween",
            duration: 1.5,
            delay: 0,
            ease: "easeInOut",
        },
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [targets, setTargets] = useState<any[]>([])
    const activeEffect = useRef<(() => void) | null>(null)

    // Motion values for animatable states
    const progressVal = useRef(motionValue(0))
    const strokeWidthVal = useRef(motionValue(strokeWidth))
    const colorVal = useRef(motionValue(color || "currentColor"))

    const found = targets.length > 0

    // Hook up scroll tracking of the section or container
    const targetRef = (scrollsectionref && scrollsectionref.current) ? scrollsectionref : containerRef
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: [scrollOffsetStart as any, scrollOffsetEnd as any]
    })

    // Sibling SVG discovery loop
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const discover = () => {
            // Find the shared layout parent
            let sharedParent = el.parentElement
            while (sharedParent && sharedParent.children.length <= 1 && sharedParent.tagName !== "BODY") {
                sharedParent = sharedParent.parentElement
            }
            if (!sharedParent) return

            let foundSvg: SVGSVGElement | null = null
            Array.from(sharedParent.children).forEach((child) => {
                if (child === el || child.contains(el)) return
                const type = child.getAttribute("data-framer-component-type")
                const isSvgElement = child.tagName.toLowerCase() === "svg"
                if ((type === "SVG" || isSvgElement || child.querySelector("svg")) && !foundSvg) {
                    foundSvg = isSvgElement ? (child as unknown as SVGSVGElement) : (child.querySelector("svg") as SVGSVGElement | null)
                }
            })

            if (foundSvg) {
                // Resolve <use> tags to actual paths for animation
                const useTags = foundSvg.querySelectorAll("use")
                useTags.forEach((use) => {
                    const href = use.getAttribute("href") || use.getAttribute("xlink:href")
                    if (!href || !href.startsWith("#")) return

                    const targetId = href.substring(1)
                    const targetElement = document.getElementById(targetId)
                    if (targetElement) {
                        const clone = targetElement.cloneNode(true) as HTMLElement
                        if (clone.tagName.toLowerCase() === "symbol") {
                            const fragment = document.createDocumentFragment()
                            while (clone.firstChild) fragment.appendChild(clone.firstChild)
                            use.parentElement?.insertBefore(fragment, use)
                        } else {
                            use.parentElement?.insertBefore(clone, use)
                        }
                        use.style.display = "none"
                    }
                })

                // Target all drawable elements (including nested ones)
                const drawableSelectors = "path, polyline, polygon, line, circle, ellipse, rect"
                const foundTargets = foundSvg.querySelectorAll(drawableSelectors)
                
                if (foundTargets.length > 0) {
                    const targetsArray = Array.from(foundTargets).filter((el: any) => !isInsideDefs(el))
                    // Only update state if targets list changes to prevent infinite render loops
                    setTargets((prev) => {
                        if (prev.length === targetsArray.length && prev.every((val, index) => val === targetsArray[index])) {
                            return prev
                        }
                        return targetsArray
                    })
                }
            }
        }

        discover()
        const timer = setTimeout(discover, 1000)
        return () => {
            clearTimeout(timer)
        }
    }, [])

    // Apply baseline styles and bind motion value updates dynamically
    useEffect(() => {
        if (targets.length === 0) return

        // Separate targets into drawables (paths to be drawn) and anchors (dots, circles, points)
        const drawables: any[] = []
        const anchors: any[] = []

        targets.forEach((p: any) => {
            if (isAnchorPoint(p)) {
                anchors.push(p)
            } else {
                drawables.push(p)
            }
        })

        // Set initial values
        targets.forEach((p: any) => {
            const initialColor = colorVal.current.get()
            const initialWidth = strokeWidthVal.current.get()
            if (initialColor) p.style.stroke = initialColor
            if (initialWidth > 0) p.style.strokeWidth = `${initialWidth}px`
            if (!p.style.stroke && !p.getAttribute("stroke")) p.style.stroke = "currentColor"
            if (p.getAttribute("fill") === null) p.setAttribute("fill", "transparent")
        })

        // Ensure anchor points are fully solid by overriding strokeDasharray and strokeDashoffset
        anchors.forEach((p: any) => {
            p.style.strokeDasharray = "none"
            p.style.strokeDashoffset = "none"
        })

        // Bind progress with svgEffect only to drawables
        // @ts-ignore
        activeEffect.current = svgEffect(drawables, {
            pathLength: progressVal.current
        })

        // Bind anchor points opacity to fade in smoothly as progress goes from 0 to 1
        // This stops them from blinking, turning off, or showing broken/jittery drawing states
        let activeAnchorEffect: (() => void) | null = null
        if (anchors.length > 0) {
            // @ts-ignore
            activeAnchorEffect = svgEffect(anchors, {
                opacity: progressVal.current
            })
        }

        // Listen to changes in stroke width and color and update elements
        const unsubWidth = strokeWidthVal.current.on("change", (latest) => {
            targets.forEach((p: any) => {
                p.style.strokeWidth = `${latest}px`
            })
        })

        const unsubColor = colorVal.current.on("change", (latest) => {
            targets.forEach((p: any) => {
                p.style.stroke = latest
            })
        })

        return () => {
            unsubWidth()
            unsubColor()
            if (activeEffect.current) {
                activeEffect.current()
                activeEffect.current = null
            }
            if (activeAnchorEffect) {
                activeAnchorEffect()
            }
        }
    }, [targets])

    // Trigger Transition Animations: strokeWidth & color
    useEffect(() => {
        const targetWidth = strokeWidth > 0 ? strokeWidth : 0
        animate(strokeWidthVal.current, targetWidth, {
            ...transition
        })
    }, [strokeWidth, transition])

    useEffect(() => {
        const targetColor = color || "currentColor"
        animate(colorVal.current, targetColor, {
            ...transition
        })
    }, [color, transition])

    // Reset progress when switching triggers to allow clean previews
    useEffect(() => {
        if (trigger === "mount") {
            progressVal.current.set(0)
        } else if (trigger === "prop") {
            progressVal.current.set(drawProgress)
        }
    }, [trigger])

    // Orchestrate Drawing Progress animations per trigger
    // 1. Mount trigger
    useEffect(() => {
        if (trigger === "mount" && found) {
            animate(progressVal.current, 1, {
                ...transition
            })
        }
    }, [trigger, found, transition])

    // 3. Prop trigger
    useEffect(() => {
        if (trigger === "prop" && found) {
            animate(progressVal.current, drawProgress, {
                ...transition
            })
        }
    }, [drawProgress, trigger, found, transition])

    // 4. Scroll-linked trigger
    useEffect(() => {
        if (trigger !== "scroll" || !found) return

        const unsubscribe = scrollYProgress.on("change", (latest) => {
            animate(progressVal.current, latest, {
                type: "spring",
                stiffness: 100,
                damping: 30,
                restDelta: 0.001
            })
        })

        return () => unsubscribe()
    }, [trigger, found, scrollYProgress])

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: found ? "rgba(52, 199, 89, 0.06)" : "rgba(255, 59, 48, 0.06)",
                borderRadius: 8,
                border: `1px dashed ${found ? "rgba(52, 199, 89, 0.3)" : "rgba(255, 59, 48, 0.3)"}`,
                overflow: "hidden",
                pointerEvents: "auto",
                gap: 4
            }}
        >
            <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.8, color: found ? "#1A7532" : "#A31D1D" }}>
                SVG EFFECT INJECTOR
            </div>
            <div style={{ 
                width: 6, 
                height: 6, 
                borderRadius: "50%", 
                background: found ? "#34C759" : "#FF3B30" 
            }} />
            {found && (
                <div style={{ fontSize: 8, opacity: 0.6, fontStyle: "italic", textTransform: "capitalize" }}>
                    Trigger: {trigger}
                </div>
            )}
        </div>
    )
}

addPropertyControls(SVGPathInjector, {
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["mount", "scroll", "prop"],
        optionTitles: ["On Mount", "Scroll Linked", "From Prop"],
        defaultValue: "mount",
    },
    drawProgress: {
        type: ControlType.Number,
        title: "Draw Progress",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 1,
        hidden(props) {
            return props.trigger !== "prop"
        }
    },
    scrollsectionref: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Scroll Section",
        hidden(props) {
            return props.trigger !== "scroll"
        }
    },
    scrollOffsetStart: {
        type: ControlType.String,
        title: "Scroll Start",
        defaultValue: "start end",
        placeholder: "e.g. start end",
        hidden(props) {
            return props.trigger !== "scroll"
        }
    },
    scrollOffsetEnd: {
        type: ControlType.String,
        title: "Scroll End",
        defaultValue: "end start",
        placeholder: "e.g. end start",
        hidden(props) {
            return props.trigger !== "scroll"
        }
    },
    color: {
        type: ControlType.Color,
        title: "Stroke Color",
        defaultValue: "",
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Stroke Width",
        min: 0,
        max: 20,
        defaultValue: 0,
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: {
            type: "tween",
            duration: 1.5,
            delay: 0,
            ease: "easeInOut",
        },
    },
})
