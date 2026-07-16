import React, { useRef, useState, useEffect } from "react"
import { motionValue, animate, svgEffect, useScroll } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

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
    const [isHovered, setIsHovered] = useState(false)
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
        offset: ["start end", "end start"]
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
                if ((type === "SVG" || child.querySelector("svg")) && !foundSvg) {
                    foundSvg = child.querySelector("svg") as SVGSVGElement | null
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
                    const targetsArray = Array.from(foundTargets)
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

        // Set initial values
        targets.forEach((p: any) => {
            const initialColor = colorVal.current.get()
            const initialWidth = strokeWidthVal.current.get()
            if (initialColor) p.style.stroke = initialColor
            if (initialWidth > 0) p.style.strokeWidth = `${initialWidth}px`
            if (!p.style.stroke && !p.getAttribute("stroke")) p.style.stroke = "currentColor"
            if (p.getAttribute("fill") === null) p.setAttribute("fill", "transparent")
        })

        // Bind progress with svgEffect
        // @ts-ignore
        activeEffect.current = svgEffect(targets, {
            pathLength: progressVal.current
        })

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
        if (trigger === "mount" || trigger === "hover" || trigger === "scroll-trigger") {
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

    // 2. Hover trigger
    useEffect(() => {
        if (trigger !== "hover" || !found) return

        if (isHovered) {
            animate(progressVal.current, 1, {
                ...transition
            })
        } else {
            animate(progressVal.current, 0, {
                ...transition
            })
        }
    }, [isHovered, trigger, found, transition])

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

    // 5. Scroll-triggered (IntersectionObserver)
    useEffect(() => {
        if (trigger !== "scroll-trigger" || !found) return

        const element = (scrollsectionref && scrollsectionref.current) ? scrollsectionref.current : containerRef.current
        if (!element) return

        let hasTriggered = false
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasTriggered) {
                        hasTriggered = true
                        animate(progressVal.current, 1, {
                            ...transition
                        })
                    }
                })
            },
            { threshold: 0.1 }
        )

        observer.observe(element)
        return () => {
            observer.disconnect()
        }
    }, [trigger, found, scrollsectionref, transition])

    return (
        <div
            ref={containerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
                    Trigger: {trigger === "scroll-trigger" ? "Scroll Trigger" : trigger}
                </div>
            )}
        </div>
    )
}

addPropertyControls(SVGPathInjector, {
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["mount", "hover", "scroll", "scroll-trigger", "prop"],
        optionTitles: ["On Mount", "On Hover", "Scroll Linked", "Scroll Triggered", "From Prop"],
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
            return props.trigger !== "scroll" && props.trigger !== "scroll-trigger"
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
