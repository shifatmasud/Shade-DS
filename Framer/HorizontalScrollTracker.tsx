import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useScroll, useTransform, useInView } from "framer-motion"

/*
 * ----------------------------------------------------------------------------------
 * SHADE DSL / WORKFLOW INTEGRATION: HorizontalScrollTracker (Revised)
 *
 * DESCRIPTION:
 * High-performance horizontal page slide scroll utility. Maps vertical scroll progress
 * of targeted canvas sections onto horizontal parent translation styling.
 *
 * CORE DESIGN CONCEPT:
 * - Clean layout boundary: attached to slide container, animates its immediate parent element.
 * - Leverages zero-rerender framer-motion listeners for slick animations on published sites.
 * - Safely returns null on live builds to prevent visual clatter, while displaying a clear
 *   dashed boundary indicator on the Framer design canvas.
 *
 * MODIFICATION LOG / HOW TO REVERT CHANGES:
 * To revert to direct string CSS injection, simple transition curves can be modified or
 * the parent element selector changed in the useLayoutEffect discovery block.
 * ----------------------------------------------------------------------------------
 */

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 140
 * @framerIntrinsicHeight 40
 */
export default function HorizontalScrollTracker(props) {
    const { scrollSectionRef, offsetX, viewport, levels, targetMode } = props

    const containerRef = React.useRef<HTMLDivElement>(null)
    const [targetElement, setTargetElement] =
        React.useState<HTMLElement | null>(null)
    const [scrollSectionElement, setScrollSectionElement] =
        React.useState<HTMLElement | null>(null)
    const [isClient, setIsClient] = React.useState(false)

    // Ensure hydration safety for server-side pre-rendering
    React.useEffect(() => {
        setIsClient(true)
    }, [])

    // 🔗 Target Discovery: Finds the element to animate based on Mode and Levels
    React.useLayoutEffect(() => {
        if (!isClient) return
        const self = containerRef.current
        if (!self) return

        try {
            let target: HTMLElement | null = self

            if (targetMode === "parent") {
                // Climb UP the tree to find the container
                for (let i = 0; i < levels; i++) {
                    target = target?.parentElement || null
                }
            } else {
                // Escape component wrapper (usually 1 level) then find sibling
                const wrapper = target?.parentElement
                if (targetMode === "prev") {
                    target = (wrapper?.previousElementSibling as HTMLElement) || null
                } else if (targetMode === "next") {
                    target = (wrapper?.nextElementSibling as HTMLElement) || null
                }
            }

            if (target && target !== targetElement) {
                setTargetElement(target)
            }
        } catch (err) {
            console.error("[ScrollTracker] Discovery error:", err)
        }
    }, [isClient, targetElement, levels, targetMode])

    // 🔍 Find the scroll section target element on the canvas or published page
    const effectiveId =
        typeof scrollSectionRef === "string"
            ? scrollSectionRef
            : scrollSectionRef?.section || scrollSectionRef?.id

    React.useEffect(() => {
        if (!isClient) return

        // Support direct ref if provided by contemporary Framer bindings
        if (scrollSectionRef?.current) {
            setScrollSectionElement(scrollSectionRef.current)
            return
        }

        if (!effectiveId) {
            setScrollSectionElement(null)
            return
        }

        const locateSection = () => {
            try {
                const matched = document.querySelector(
                    `[id="${effectiveId}"], [data-framer-section-id="${effectiveId}"], [data-framer-name="${effectiveId}"]`
                ) as HTMLElement | null

                if (matched && matched !== scrollSectionElement) {
                    setScrollSectionElement(matched)
                }
            } catch (err) {
                console.error("[ScrollTracker] Section discovery error:", err)
            }
        }

        locateSection()
        const intervalId = window.setInterval(locateSection, 1000)
        return () => window.clearInterval(intervalId)
    }, [isClient, effectiveId, scrollSectionRef, scrollSectionElement])

    const isOnCanvas = RenderTarget.current() === RenderTarget.canvas

    // Returns null in preview/production for zero visual overhead, unless showDebug is needed on canvas
    if (!isClient) return null

    return (
        <div
            ref={containerRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: isOnCanvas ? "flex" : "none",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 153, 255, 0.05)",
                border: "1px dashed rgba(0, 153, 255, 0.4)",
                borderRadius: 8,
                padding: 10,
                fontSize: 10,
                color: "#0099FF",
                fontFamily: "monospace",
                pointerEvents: "none",
                textAlign: "center",
            }}
            data-framer-name="HorizontalScrollTracker"
        >
            {/* 🔄 Core Tracker Mount: Keyed by resolved element to guarantee useScroll binds properly on mount */}
            {targetElement && (
                <ScrollTrackerCore
                    key={`${targetElement.id || "target"}-${scrollSectionElement ? scrollSectionElement.id || "sec" : "window"}`}
                    targetElement={targetElement}
                    scrollSectionElement={scrollSectionElement}
                    offsetX={offsetX}
                    viewport={viewport}
                />
            )}

            <div style={{ fontWeight: "bold", fontSize: 9, marginBottom: 2 }}>
                ↔ SCROLL TRACKER
            </div>
            <div style={{ opacity: 0.8, fontSize: 8 }}>
                {scrollSectionRef ? `Section: Bound` : "No Section Selected"}
            </div>
        </div>
    )
}

/**
 * 🛠️ ScrollTrackerCore Component
 * Isolated sub-component to guarantee React hooks (useScroll) run with pre-resolved non-null elements on mount.
 */
function ScrollTrackerCore({
    targetElement,
    scrollSectionElement,
    offsetX,
    viewport,
}: {
    targetElement: HTMLElement
    scrollSectionElement: HTMLElement | null
    offsetX: string[]
    viewport: "top" | "center" | "bottom"
}) {
    const sectionRef = React.useRef<HTMLElement | null>(scrollSectionElement)

    // Sync ref value with selected element
    sectionRef.current = scrollSectionElement

    // Viewport bound offset configurations mapper
    const offsetConfig = React.useMemo(() => {
        if (viewport === "center") return ["start center", "end center"]
        if (viewport === "top") return ["start start", "end start"]
        return ["start end", "end end"]
    }, [viewport])

    // Mount high fidelity Framer Motion scroll hooks
    const { scrollYProgress } = useScroll({
        target: scrollSectionElement ? sectionRef : undefined,
        offset: scrollSectionElement ? (offsetConfig as any) : undefined,
    })

    // Map scroll timeline sequence into horizontal styling offset values
    const x = useTransform(scrollYProgress, [0, 0.5, 1], offsetX) as any

    React.useEffect(() => {
        const el = targetElement
        const style = el.style
        const originalTransform = style.transform
        const originalWillChange = style.willChange

        const handleTranslateUpdate = () => {
            try {
                style.transform = `translateX(${x.get()}) translateZ(0)`
                style.willChange = "transform"
            } catch (err) {
                console.error("[ScrollTracker] Style update error:", err)
            }
        }

        const unsubscribe = x.on("change", handleTranslateUpdate)
        handleTranslateUpdate()

        // Cleanup original state modifications on unmount safely
        // Undo: Restoring original transforms can be performed by unselecting or deleting the tracker layer
        return () => {
            if (typeof unsubscribe === "function") {
                unsubscribe()
            }
            if (el) {
                style.transform = originalTransform || ""
                style.willChange = originalWillChange || ""
            }
        }
    }, [targetElement, x])

    return null
}

HorizontalScrollTracker.displayName = "HorizontalScrollTracker"

HorizontalScrollTracker.defaultProps = {
    scrollSectionRef: "",
    targetMode: "parent",
    levels: 2,
    offsetX: ["0dvw", "-100dvw", "-200dvw"],
    viewport: "bottom",
}

addPropertyControls(HorizontalScrollTracker, {
    scrollSectionRef: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Scroll Section",
    },
    targetMode: {
        type: ControlType.Enum,
        title: "Target Mode",
        options: ["parent", "prev", "next"],
        optionTitles: ["Climb Parent", "Prev Sibling", "Next Sibling"],
        defaultValue: "parent",
    },
    levels: {
        type: ControlType.Number,
        title: "Parent Levels",
        defaultValue: 2,
        min: 1,
        max: 8,
        step: 1,
        hidden: (props) => props.targetMode !== "parent",
    },
    offsetX: {
        type: ControlType.Array,
        title: "Offset X",
        control: {
            type: ControlType.String,
        },
        defaultValue: ["0dvw", "-100dvw", "-200dvw"],
    },
    viewport: {
        type: ControlType.Enum,
        title: "Viewport Anchor",
        displaySegmentedControl: true,

        options: ["top", "center", "bottom"],
        optionTitles: [
            "Top (Viewport Top)",
            "Center (Viewport Center)",
            "Bottom (Viewport Bottom)",
        ],
        //@ts-ignore
        optionIcons: ["align-top", "align-middle", "align-bottom"],
        defaultValue: "bottom",
    },
})
