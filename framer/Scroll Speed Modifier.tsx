import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion"

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 20
 * @framerIntrinsicHeight 20
 * 
 * Scroll Speed Modifier (Parallax)
 * Uses high-performance useScroll with target tracking to create buttery 
 * parallax effects. Tracks the section's viewport progress and maps 
 * it to a translation offset.
 */

import { RenderTarget } from "framer"

// Shade DSL Architecture
// COMPONENT: ScrollSpeedModifier
// DATA: 
//   props.speed (percentage)
//   props.levels (climb depth)
//   props.transition (Smooth spring settings)
//   state.isClient (Hydration guard)
// LOGIC:
//   HOOK: useScroll with target tracking (viewport-relative)
//   HOOK: ResizeObserver to track element/viewport changes
//   STATE: Capture initial scroll progress on mount to anchor the layout
//   CALC: Offset = ScrollY * (1 - speed/100)
//   RESULT: Translates inversely to keep pace with speed multiplier
//   EXAMPLES: 
//     Speed 0% (Fixed): Offset = ScrollY (Cancels natural scroll)
//     Speed 100% (1:1): Offset = 0 (Natural scroll)
//     Speed 200% (2x): Offset = -ScrollY (Doubles natural move)
// RENDER:
//   VIEW: Invisible handle (visible on canvas) triggering direct mutations
//   MUTATION: Uses translate property to avoid nuking 'transform' stack

export function ScrollSpeedModifier(props) {
    const { speed, levels, enabled, transition, direction = "y", invert = false } = props
    const ref = React.useRef<HTMLDivElement>(null)
    const [targetElement, setTargetElement] = React.useState<HTMLElement | null>(null)
    const [isClient, setIsClient] = React.useState(false)
    
    // 🌐 Hydration & Mount Safety
    React.useEffect(() => {
        setIsClient(true)
    }, [])

    // 🔍 Find the target component
    React.useLayoutEffect(() => {
        if (!isClient) return
        const element = ref.current
        if (!element) return

        let target: HTMLElement | null = element
        try {
            for (let i = 0; i < levels; i++) {
                const next = target?.parentElement || null
                // Failsafe: Don't climb past the main app container or body
                if (!next || next.tagName === "BODY" || next.tagName === "HTML") break
                target = next
            }
        } catch (e) {
            console.warn("ScrollSpeedModifier: Target finding failed", e)
        }
        
        if (target && target !== targetElement) {
            setTargetElement(target)
        }
    }, [levels, isClient, targetElement])

    // 🌊 Track global document-level scroll
    // This respects "The root html div should be the anchor"
    const { scrollY, scrollX } = useScroll()

    // 📏 Parallax Math
    // speed 100% (1.0) -> offset 0
    // speed 0% (0.0) -> offset matches scroll exactly (factor 1.0)
    // speed > 100% -> negative offset (faster travel, e.g. 200% = -1:1)
    // speed < 100% -> positive offset (slower/sticky travel)
    const multiplier = speed / 100
    let factor = 1 - multiplier
    if (invert) {
        factor = -factor
    }

    /* 
     * [CHANGE EXPLANATION]:
     * Added 'direction' support to enable "Horizontal offset X on vertical Scroll Y" (y-to-x).
     * This dynamically maps vertical page scrolling progress to horizontal displacement.
     * Also added 'invert' prop to optionally reverse the translation offset direction,
     * which is especially useful for speed < 100%.
     * 
     * [HOW TO UNDO CHANGE]:
     * To revert to standard behavior, delete the direction and invert property checks,
     * set 'offsetX' to map 'scrollX' and 'offsetY' to map 'scrollY' directly,
     * and remove the 'direction' and 'invert' controller properties at the bottom of the file.
     */
    const xSource = direction === "y-to-x" ? scrollY : null
    const ySource = direction === "y" ? scrollY : null

    const offsetX = useTransform(scrollY, (val) => direction === "y-to-x" ? val * factor : 0)
    const offsetY = useTransform(scrollY, (val) => direction === "y" ? val * factor : 0)
    
    // ✨ Smooth with spring
    const smoothX = useSpring(offsetX, transition)
    const smoothY = useSpring(offsetY, transition)

    // 🚀 Apply transforms directly
    // Using a ref to store original styles for perfect restoration
    const originalStyles = React.useRef<Record<string, string>>({})

    React.useEffect(() => {
        if (!targetElement || !enabled || !isClient) return

        const target = targetElement as HTMLElement
        const style = target.style as any
        
        // SAVE original styles for perfect restoration
        originalStyles.current = {
            translate: style.translate || "",
            transform: style.transform || "",
            willChange: style.willChange || ""
        }

        // Optimization: Prepare GPU for smooth translation
        style.willChange = "transform, translate"

        const updateStyles = () => {
            if (!enabled || !target) return
            
            const x = smoothX.get()
            const y = smoothY.get()
            
            // Failsafe: Avoid applying near-zero values to keep DOM clean
            // This ensures we revert to natural styles when sitting at the anchor.
            if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) {
                if (style.translate) style.translate = ""
                // Only touch transform if we previously modified it and it's not in the original
                if (style.transform && !originalStyles.current.transform) style.transform = ""
                return
            }

            // Using 'translate' property (modern, composable, non-destructive)
            // It won't overwrite existing 'transform' (like scale or rotate)
            if ('translate' in style) {
                style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`
            } else {
                // Failsafe: Fallback for older environments
                const existing = originalStyles.current.transform || ""
                const translateStr = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
                style.transform = existing ? `${existing} ${translateStr}` : translateStr
            }
        }

        const unsubX = smoothX.on("change", updateStyles)
        const unsubY = smoothY.on("change", updateStyles)
        
        // Initial sync
        updateStyles()

        return () => {
            unsubX()
            unsubY()
            // RESTORE original state explicitly
            if (target) {
                style.translate = originalStyles.current.translate || ""
                style.transform = originalStyles.current.transform || ""
                style.willChange = originalStyles.current.willChange || ""
            }
        }
    }, [targetElement, enabled, smoothX, smoothY, isClient])

    // Only render handles if on Canvas
    const isOnCanvas = RenderTarget.current() === RenderTarget.canvas

    return (
        <motion.div
            ref={ref}
            initial={false}
            style={{ 
                position: "absolute", 
                width: 20, 
                height: 20, 
                borderRadius: 10,
                border: "2px solid #0099FF",
                background: "rgba(0, 153, 255, 0.2)",
                display: isOnCanvas ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: isOnCanvas ? "auto" : "none",
                zIndex: 999
            }}
            data-framer-name="Scroll Speed Modifier"
        >
            {isOnCanvas && (
                <div style={{ fontSize: 8, color: "#0099FF", fontWeight: "bold" }}>PX</div>
            )}
        </motion.div>
    )
}

ScrollSpeedModifier.displayName = "ScrollSpeedModifier"

ScrollSpeedModifier.defaultProps = {
    direction: "y",
    speed: 100,
    invert: false,
    levels: 2,
    enabled: true,
    transition: {
        type: "spring",
        stiffness: 100,
        damping: 30,
        mass: 1,
    }
}

addPropertyControls(ScrollSpeedModifier, {
    enabled: {
        type: ControlType.Boolean,
        title: "Enabled",
        defaultValue: true,
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["y", "y-to-x"],
        optionTitles: ["Vertical (Y)", "Horizontal on Vertical Scroll (Y to X)"],
        defaultValue: "y",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed %",
        defaultValue: 100,
        min: -500,
        max: 500,
        step: 1,
        displayStepper: true,
        description: "100% is normal. >100% is faster. <100% is slower.",
    },
    invert: {
        type: ControlType.Boolean,
        title: "Invert Offset",
        defaultValue: false,
        description: "Invert translation offset (useful for speeds < 100%)."
    },
    levels: {
        type: ControlType.Number,
        title: "DOM Levels",
        defaultValue: 2,
        min: 1,
        max: 10,
        step: 1,
        description: "Levels up to find the element to move.",
    },
    transition: {
        type: ControlType.Transition,
        title: "Smoothing",
    },
})

