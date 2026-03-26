import { useEffect, useRef, useState } from "react"
import { animate } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 0
 * @framerIntrinsicHeight 0
 */
export default function ForceInjector(props) {
    const {
        pushForceTransition,
        pullBackTransition,
        globalFollowTransition,
        strength,
        rotationStrength,
        followStrength,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const targetRef = useRef<HTMLElement | null>(null)
    const lastPointerPos = useRef({ x: 0, y: 0 })
    const lastTime = useRef(0)
    const animationRef = useRef<any>(null)
    const isInside = useRef(false)
    const lastLeaveTime = useRef(0)
    const [isClient, setIsClient] = useState(false)

    // Store the initial center of the target to calculate follow offset
    const targetCenter = useRef({ x: 0, y: 0 })

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (!isClient) return
        if (RenderTarget.current() === RenderTarget.canvas) return

        const el = containerRef.current
        if (!el) return

        let target = el.parentElement as HTMLElement
        if (target && target.parentElement) {
            target = target.parentElement
        }
        
        if (!target) return
        targetRef.current = target

        const computedStyle = window.getComputedStyle(target)
        if (computedStyle.display === "inline") {
            target.style.display = "inline-block"
        }

        // Calculate initial center
        const updateCenter = () => {
            const rect = target.getBoundingClientRect()
            targetCenter.current = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            }
        }
        updateCenter()
        window.addEventListener("resize", updateCenter)

        const triggerReturn = () => {
            if (animationRef.current) animationRef.current.stop()
            animationRef.current = animate(
                target,
                { x: 0, y: 0, rotate: 0 },
                {
                    type: "spring",
                    ...pullBackTransition,
                }
            )
        }

        const handlePointerEnter = (e: PointerEvent) => {
            isInside.current = true
            updateCenter()
            lastPointerPos.current = { x: e.clientX, y: e.clientY }
            lastTime.current = performance.now()
        }

        const handleGlobalPointerMove = (e: PointerEvent) => {
            const now = performance.now()
            const dt = now - lastTime.current
            
            let pushX = 0
            let pushY = 0
            let pushRotate = 0

            // 1. Calculate Push Force (Velocity based) - Only if inside
            if (isInside.current && dt > 0) {
                const dx = e.clientX - lastPointerPos.current.x
                const dy = e.clientY - lastPointerPos.current.y
                
                const vx = dx / dt
                const vy = dy / dt

                pushX = vx * strength
                pushY = vy * strength
                pushRotate = vx * rotationStrength
            }

            // 2. Calculate Follow Force (Position based) - Global
            const followX = (e.clientX - targetCenter.current.x) * followStrength
            const followY = (e.clientY - targetCenter.current.y) * followStrength

            // Combine forces
            const targetX = pushX + followX
            const targetY = pushY + followY
            const targetRotate = pushRotate

            // Apply animation if there's any significant target
            if (Math.abs(targetX) > 0.1 || Math.abs(targetY) > 0.1 || Math.abs(targetRotate) > 0.1) {
                if (animationRef.current) animationRef.current.stop()
                
                // Determine which transition to use
                let transition = globalFollowTransition
                if (isInside.current) {
                    transition = pushForceTransition
                } else if (now - lastLeaveTime.current < 600) {
                    // Use pullBack spring for a short duration after leaving for the "snap" effect
                    transition = { type: "spring", ...pullBackTransition }
                }

                animationRef.current = animate(
                    target,
                    { x: targetX, y: targetY, rotate: targetRotate },
                    {
                        ...transition,
                    }
                )
            }

            lastPointerPos.current = { x: e.clientX, y: e.clientY }
            lastTime.current = now
        }

        const handlePointerLeave = () => {
            isInside.current = false
            lastLeaveTime.current = performance.now()
            triggerReturn()
        }

        target.addEventListener("pointerenter", handlePointerEnter as any)
        window.addEventListener("pointermove", handleGlobalPointerMove as any)
        target.addEventListener("pointerleave", handlePointerLeave as any)

        return () => {
            target.removeEventListener("pointerenter", handlePointerEnter as any)
            window.removeEventListener("pointermove", handleGlobalPointerMove as any)
            target.removeEventListener("pointerleave", handlePointerLeave as any)
            window.removeEventListener("resize", updateCenter)
            if (animationRef.current) animationRef.current.stop()
        }
    }, [isClient, pushForceTransition, pullBackTransition, globalFollowTransition, strength, rotationStrength, followStrength])

    if (!isClient) return null

    return (
        <div
            ref={containerRef}
            style={{
                width: 0,
                height: 0,
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                opacity: 0,
                zIndex: -1,
            }}
        />
    )
}

ForceInjector.displayName = "Force Injector"

ForceInjector.defaultProps = {
    strength: 40,
    rotationStrength: 10,
    followStrength: 0.02,
    pushForceTransition: {
        type: "spring",
        stiffness: 600,
        damping: 30,
        mass: 1,
    },
    pullBackTransition: {
        stiffness: 200,
        damping: 20,
        mass: 1,
    },
    globalFollowTransition: {
        type: "tween",
        ease: "linear",
        duration: 0.4,
    },
}

addPropertyControls(ForceInjector, {
    strength: {
        type: ControlType.Number,
        title: "Push Strength",
        defaultValue: 40,
        min: 0,
        max: 200,
        step: 1,
        description: "Multiplier for pointer velocity (transient push).",
    },
    rotationStrength: {
        type: ControlType.Number,
        title: "Rotation Strength",
        defaultValue: 10,
        min: 0,
        max: 100,
        step: 0.1,
        description: "How much the element tilts based on velocity.",
    },
    followStrength: {
        type: ControlType.Number,
        title: "Follow Strength",
        defaultValue: 0.02,
        min: 0,
        max: 0.5,
        step: 0.001,
        description: "Global cursor attraction (constant subtle movement).",
    },
    pushForceTransition: {
        type: ControlType.Transition,
        title: "Push Spring",
    },
    pullBackTransition: {
        type: ControlType.Transition,
        title: "Pull Back Spring",
    },
    globalFollowTransition: {
        type: ControlType.Transition,
        title: "Global Follow (Linear)",
    },
})
