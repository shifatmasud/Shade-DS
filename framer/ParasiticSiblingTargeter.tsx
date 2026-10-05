import React, { useRef, useState, useEffect } from "react"

/**
 * 🕵️ ParasiticSiblingTargeter
 * 
 * A self-contained Framer Code Component that targets and manipulates 
 * siblings (Text and SVG) within the published DOM.
 * 
 * Target IDs (Canvas):
 * - p: nested inside [data-framer-component-type="RichTextContainer"]
 * - svg: nested inside [data-framer-component-type="SVG"]
 */
export default function ParasiticSiblingTargeter() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [found, setFound] = useState({ p: false, svg: false })
    const [isHovered, setIsHovered] = useState(false)

    const targets = useRef<{ p: HTMLElement | null; svg: SVGSVGElement | null }>({
        p: null,
        svg: null,
    })

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const discover = () => {
            // 1. Find the shared layout parent (Frame/Stack)
            // Code components are often nested: [Shared Parent] -> [Component Wrapper] -> [Your Div]
            let sharedParent = el.parentElement
            while (sharedParent && sharedParent.children.length <= 1 && sharedParent.tagName !== "BODY") {
                sharedParent = sharedParent.parentElement
            }
            if (!sharedParent) return

            let pNode: HTMLElement | null = null
            let svgNode: SVGSVGElement | null = null

            // 2. Scan ALL children of the shared parent
            Array.from(sharedParent.children).forEach((child) => {
                if (child === el || child.contains(el)) return

                const type = child.getAttribute("data-framer-component-type")

                if (type === "RichTextContainer" && !pNode) {
                    pNode = child.querySelector("p, span, h1, h2, h3") as HTMLElement | null
                }

                // Discovery: Try Framer attribute first, fallback to any SVG-containing child
                if ((type === "SVG" || child.querySelector("svg")) && !svgNode) {
                    svgNode = child.querySelector("svg") as SVGSVGElement | null
                }
            })

            targets.current = { p: pNode, svg: svgNode }
            setFound({ p: !!pNode, svg: !!svgNode })

            // 3. Inject transitions
            if (pNode) {
                pNode.style.transition = "color 0.4s ease, transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)"
            }
            if (svgNode) {
                svgNode.style.transition = "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)"
                // SVGs often need fill applied to inner elements
                const graphics = svgNode.querySelectorAll("path, use, rect, circle, polygon, polyline, ellipse")
                graphics.forEach((g) => {
                    ;(g as any).style.transition = "fill 0.4s ease"
                    // Ensure we don't overwrite if it's already set to something specific
                    if (!(g as any).style.fill) (g as any).style.fill = "currentColor"
                })
            }
        }

        // Discovery on mount + Poll for slow hydration
        discover()
        const timer = setTimeout(discover, 1000)

        // MutationObserver to catch dynamic sibling injection
        const observer = new MutationObserver(discover)
        if (el.parentElement) {
            observer.observe(el.parentElement, { childList: true, subtree: true })
        }

        return () => {
            clearTimeout(timer)
            observer.disconnect()
        }
    }, [])

    useEffect(() => {
        const { p, svg } = targets.current
        if (isHovered) {
            if (p) {
                p.style.color = "#007AFF"
                p.style.transform = "translateX(12px)"
            }
            if (svg) {
                svg.style.transform = "scale(1.2) rotate(-10deg)"
                const graphics = svg.querySelectorAll("path, use, rect, circle, polygon, polyline, ellipse")
                graphics.forEach((g) => (g as any).style.fill = "#007AFF")
            }
        } else {
            if (p) {
                p.style.color = ""
                p.style.transform = ""
            }
            if (svg) {
                svg.style.transform = ""
                const graphics = svg.querySelectorAll("path, use, rect, circle, polygon, polyline, ellipse")
                graphics.forEach((g) => (g as any).style.fill = "")
            }
        }
    }, [isHovered])

    return (
        <div
            ref={containerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={containerStyle}
        >
            <div style={labelStyle}>
                {isHovered ? "Siblings Manipulated" : "Hover to Discover Siblings"}
            </div>
            
            <div style={statusRowStyle}>
                <StatusDot active={found.p} label="TEXT" />
                <StatusDot active={found.svg} label="SVG" />
            </div>
        </div>
    )
}

// Minimalist Internal UI
const StatusDot = ({ active, label }: { active: boolean; label: string }) => (
    <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 4, 
        fontSize: 10, 
        color: active ? "#34C759" : "#8E8E93",
        fontFamily: "monospace" 
    }}>
        <div style={{ 
            width: 6, 
            height: 6, 
            borderRadius: "50%", 
            background: active ? "#34C759" : "#C7C7CC" 
        }} />
        {label}
    </div>
)

const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.1)",
    cursor: "pointer",
    userSelect: "none",
}

const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#1C1C1E",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
}

const statusRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
}
