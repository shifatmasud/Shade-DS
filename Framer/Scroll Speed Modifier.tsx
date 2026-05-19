import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, useScroll, useSpring, useTransform, useMotionValue } from "framer-motion"

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 0
 * @framerIntrinsicHeight 0
 * 
 * Scroll Speed Modifier (Parallax)
 * Uses high-performance useScroll with target tracking to create buttery 
 * parallax effects. Tracks the section's viewport progress and maps 
 * it to a translation offset.
 */

// Shade DSL Architecture
// COMPONENT: ScrollSpeedModifier
// DATA: 
//   props.speed (number, 100 = 1x)
//   props.levels (number, target depth)
//   props.axis ("x" | "y")
//   props.smoothing (Spring config)
// LOGIC:
//   HOOK: useScroll with target-based section tracking
//   HOOK: useTransform mapping progress [0, 1] to parallax distance
//   PHYSICS: useSpring for inertia and release
//   SYNC: Procedural transform application to target DOM
// RENDER:
//   VIEW: Invisible tracking ghost

export function ScrollSpeedModifier(props) {
    const { speed, levels, enabled, transition } = props
    const ref = React.useRef<HTMLDivElement>(null)
    const [targetElement, setTargetElement] = React.useState<HTMLElement | null>(null)
    
    // Stable ref for useScroll viewport tracking
    const internalTargetRef = React.useRef<HTMLElement>(null)

    // 🔍 Find the target component to modify
    React.useLayoutEffect(() => {
        const element = ref.current
        if (!element) return

        let target: HTMLElement | null = element
        for (let i = 0; i < levels; i++) {
            target = target?.parentElement || null
            if (!target) break
        }
        
        if (target) {
            setTargetElement(target)
            // @ts-ignore - assigning to read-only current for useScroll compatibility
            internalTargetRef.current = target
        }
    }, [levels])

    // 🌊 Track intersection progress for both axes
    const { scrollYProgress, scrollXProgress } = useScroll({
        target: internalTargetRef,
        offset: ["start end", "end start"]
    })

    // 📐 Parallax Calculation
    // multiplier 1 (100%) -> factor 0 -> no offset
    const multiplier = speed / 100
    const factor = multiplier - 1
    
    // Base unit for parallax movement. We'll use 300px as a reference range.
    const parallaxRange = 300 * factor 

    // Map [0, 1] progress to translation range
    const rawX = useTransform(scrollXProgress, [0, 1], [parallaxRange, -parallaxRange])
    const rawY = useTransform(scrollYProgress, [0, 1], [parallaxRange, -parallaxRange])
    
    // ✨ Smooth with physics using the Transition control settings
    const smoothX = useSpring(rawX, transition)
    const smoothY = useSpring(rawY, transition)

    // 🚀 High-performance direct DOM mutation
    React.useEffect(() => {
        if (!targetElement || !enabled) return

        const updateStyles = () => {
            const x = smoothX.get()
            const y = smoothY.get()
            // We use translate instead of 3d as requested
            targetElement.style.transform = `translate(${x}px, ${y}px)`
        }

        const unsubX = smoothX.on("change", updateStyles)
        const unsubY = smoothY.on("change", updateStyles)
        
        updateStyles()

        return () => {
            unsubX()
            unsubY()
            if (targetElement) targetElement.style.transform = ""
        }
    }, [targetElement, enabled, smoothX, smoothY])

    return (
        <motion.div
            ref={ref}
            initial={false}
            style={{ 
                position: "absolute", 
                width: 0, 
                height: 0, 
                visibility: "hidden",
                pointerEvents: "none"
            }}
            data-framer-name="Scroll Speed Modifier"
        />
    )
}

ScrollSpeedModifier.defaultProps = {
    speed: 100,
    levels: 1,
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
    levels: {
        type: ControlType.Number,
        title: "DOM Levels",
        defaultValue: 1,
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

