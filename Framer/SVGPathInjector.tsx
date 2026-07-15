import React, { useRef, useState, useEffect } from "react"
import { motionValue, animate, svgEffect } from "framer-motion"

/**
 * 🎨 SVGPathInjector (svgEffect Edition)
 * 
 * A self-contained Framer Code Component that uses the 'svgEffect' API 
 * to animate sibling SVG paths with precision.
 * 
 * Pattern: Injector (Zero-UI, purely behavioral)
 */
export default function SVGPathInjector(props: any) {
    const { 
        duration = 1.5, 
        delay = 0, 
        trigger = "mount", // "mount", "hover"
        color = "",
        strokeWidth = 0,
        ease = "easeInOut"
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [found, setFound] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const activeEffect = useRef<(() => void) | null>(null)
    const progress = useRef(motionValue(0))

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const discover = () => {
            // 1. Find the shared layout parent
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
                // 2. Resolve <use> tags to actual paths for animation
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

                // 3. Target all drawable elements (including nested ones)
                const drawableSelectors = "path, polyline, polygon, line, circle, ellipse, rect"
                const targets = foundSvg.querySelectorAll(drawableSelectors)
                
                if (targets.length > 0) {
                    setFound(true)

                    // 4. Cleanup old effect
                    if (activeEffect.current) activeEffect.current()

                    // 5. Apply baseline styles (color/width)
                    targets.forEach((p: any) => {
                        if (color) p.style.stroke = color
                        if (strokeWidth > 0) p.style.strokeWidth = `${strokeWidth}px`
                        if (!p.style.stroke && !p.getAttribute("stroke")) p.style.stroke = "currentColor"
                        if (p.getAttribute("fill") === null) p.setAttribute("fill", "transparent")
                    })

                    // 6. Bind svgEffect for drawing animation
                    // @ts-ignore - svgEffect might not be in all TS defs but exists in modern framer-motion
                    activeEffect.current = svgEffect(targets as any, {
                        pathLength: progress.current
                    })

                    if (trigger === "mount") {
                        setTimeout(() => {
                            animate(progress.current, 1, { 
                                duration, 
                                delay, 
                                ease: ease as any 
                            })
                        }, 200)
                    }
                }
            }
        }

        discover()
        const timer = setTimeout(discover, 1000)
        return () => {
            clearTimeout(timer)
            if (activeEffect.current) activeEffect.current()
        }
    }, [duration, ease, delay, color, strokeWidth, trigger])

    // Hover Trigger Logic
    useEffect(() => {
        if (trigger !== "hover" || !found) return
        
        if (isHovered) {
            animate(progress.current, 1, { duration, ease: ease as any })
        } else {
            animate(progress.current, 0, { duration, ease: ease as any })
        }
    }, [isHovered, trigger, found, duration, ease])

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
                background: found ? "rgba(52, 199, 89, 0.1)" : "rgba(255, 59, 48, 0.1)",
                borderRadius: 8,
                border: `1px dashed ${found ? "#34C759" : "#FF3B30"}`,
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
                <div style={{ fontSize: 8, opacity: 0.6, fontStyle: "italic" }}>
                    {trigger === "mount" ? "svgEffect: Auto" : "svgEffect: Hover"}
                </div>
            )}
        </div>
    )
}

// @ts-ignore
if (window.Framer) {
    // @ts-ignore
    SVGPathInjector.propertyControls = {
        trigger: {
            type: "enum",
            options: ["mount", "hover"],
            optionTitles: ["On Mount", "On Hover"],
            defaultValue: "mount",
        },
        duration: { type: "number", min: 0.1, max: 10, step: 0.1, defaultValue: 1.5 },
        delay: { type: "number", min: 0, max: 5, step: 0.1, defaultValue: 0 },
        color: { type: "color", title: "Override Color" },
        strokeWidth: { type: "number", min: 0, max: 20, defaultValue: 0, title: "Stroke Width" },
        ease: {
            type: "enum",
            options: ["linear", "easeIn", "easeOut", "easeInOut"],
            defaultValue: "easeInOut",
        }
    }
}
