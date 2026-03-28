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
        localForce = {},
        globalForce = {},
    } = props

    // Extract nested values with defaults
    const pushEnabled = localForce.push?.enabled ?? true
    const pushStrength = localForce.push?.strength ?? 40
    const pushRotation = localForce.push?.rotation ?? 10
    const pushTransition = localForce.push?.transition ?? {
        type: "spring",
        stiffness: 600,
        damping: 30,
        mass: 1,
    }
    const pullTransition = localForce.pull?.transition ?? {
        type: "spring",
        stiffness: 200,
        damping: 20,
        mass: 1,
    }

    const attractEnabled = globalForce.attract?.enabled ?? true
    const attractStrength = globalForce.attract?.strength ?? 0.02
    const repelEnabled = globalForce.repel?.enabled ?? true
    const repelStrength = globalForce.repel?.strength ?? 0
    const tiltEnabled = globalForce.tilt?.enabled ?? true
    const tiltStrength = globalForce.tilt?.strength ?? 0
    const tiltPerspective = globalForce.tilt?.perspective ?? 1200
    const globalTransition = globalForce.transition ?? {
        type: "tween",
        ease: "linear",
        duration: 0.4,
    }

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

        // Setup 3D context if tilt is used
        if (tiltEnabled && tiltStrength > 0) {
            target.style.transformStyle = "preserve-3d"
            if (target.parentElement) {
                target.parentElement.style.perspective = `${tiltPerspective}px`
            }
        } else {
            target.style.transformStyle = ""
            if (target.parentElement) {
                target.parentElement.style.perspective = ""
            }
        }

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
                { x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0 },
                {
                    ...pullTransition,
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
            
            const clientX = e.clientX
            const clientY = e.clientY

            let pushX = 0
            let pushY = 0
            let pushRotate = 0

            // 1. Calculate Push Force (Velocity based) - Only if inside
            if (pushEnabled && isInside.current && dt > 0) {
                const dx = clientX - lastPointerPos.current.x
                const dy = clientY - lastPointerPos.current.y
                
                const vx = dx / dt
                const vy = dy / dt

                pushX = vx * pushStrength
                pushY = vy * pushStrength
                pushRotate = vx * pushRotation
            }

            // 2. Calculate Follow Force (Position based) - Global
            // Attraction is positive, Repulsion is negative
            const netAttract = attractEnabled ? attractStrength : 0
            const netRepel = repelEnabled ? repelStrength : 0
            const netFollowStrength = netAttract - netRepel
            
            const followX = (clientX - targetCenter.current.x) * netFollowStrength
            const followY = (clientY - targetCenter.current.y) * netFollowStrength

            // 3. Calculate 3D Tilt
            // rotateY depends on X offset, rotateX depends on Y offset (inverted)
            const tiltX = tiltEnabled ? -(clientY - targetCenter.current.y) * tiltStrength : 0
            const tiltY = tiltEnabled ? (clientX - targetCenter.current.x) * tiltStrength : 0

            // Combine forces
            const targetX = pushX + followX
            const targetY = pushY + followY
            const targetRotate = pushRotate
            const targetRotateX = tiltX
            const targetRotateY = tiltY

            // Apply animation if there's any significant target
            const hasMovement = Math.abs(targetX) > 0.1 || Math.abs(targetY) > 0.1 || 
                               Math.abs(targetRotate) > 0.1 || Math.abs(targetRotateX) > 0.1 || 
                               Math.abs(targetRotateY) > 0.1

            if (hasMovement) {
                if (animationRef.current) animationRef.current.stop()
                
                // Determine which transition to use
                let transition = globalTransition
                if (isInside.current) {
                    transition = pushTransition
                } else if (now - lastLeaveTime.current < 600) {
                    // Use pull spring for a short duration after leaving for the "snap" effect
                    transition = pullTransition
                }

                animationRef.current = animate(
                    target,
                    { 
                        x: targetX, 
                        y: targetY, 
                        rotate: targetRotate,
                        rotateX: targetRotateX,
                        rotateY: targetRotateY
                    },
                    {
                        ...transition,
                    }
                )
            }

            lastPointerPos.current = { x: clientX, y: clientY }
            lastTime.current = now
        }

        const handlePointerLeave = () => {
            isInside.current = false
            lastLeaveTime.current = performance.now()
            triggerReturn()
        }

        const handlePointerDown = (e: PointerEvent) => {
            isInside.current = true
            updateCenter()
            lastPointerPos.current = { x: e.clientX, y: e.clientY }
            lastTime.current = performance.now()
        }

        target.addEventListener("pointerenter", handlePointerEnter as any)
        target.addEventListener("pointerdown", handlePointerDown as any)
        window.addEventListener("pointermove", handleGlobalPointerMove as any)
        target.addEventListener("pointerleave", handlePointerLeave as any)

        // Prevent scrolling on touch devices when interacting with the target
        const originalTouchAction = target.style.touchAction
        target.style.touchAction = "none"

        return () => {
            target.removeEventListener("pointerenter", handlePointerEnter as any)
            target.removeEventListener("pointerdown", handlePointerDown as any)
            window.removeEventListener("pointermove", handleGlobalPointerMove as any)
            target.removeEventListener("pointerleave", handlePointerLeave as any)
            window.removeEventListener("resize", updateCenter)
            target.style.touchAction = originalTouchAction
            if (animationRef.current) animationRef.current.stop()
        }
    }, [isClient, localForce, globalForce])

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
    localForce: {
        push: {
            enabled: true,
            strength: 40,
            rotation: 10,
            transition: {
                type: "spring",
                stiffness: 600,
                damping: 30,
                mass: 1,
            },
        },
        pull: {
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 20,
                mass: 1,
            },
        },
    },
    globalForce: {
        attract: { enabled: true, strength: 0.02 },
        repel: { enabled: false, strength: 0 },
        tilt: { enabled: false, strength: 0, perspective: 1200 },
        transition: {
            type: "tween",
            ease: "linear",
            duration: 0.4,
        },
    },
}

addPropertyControls(ForceInjector, {
    localForce: {
        type: ControlType.Object,
        title: "Local Force",
        controls: {
            push: {
                type: ControlType.Object,
                title: "Push",
                description: "Force out from original position when in zone",
                controls: {
                    enabled: {
                        type: ControlType.Boolean,
                        title: "Enabled",
                        defaultValue: true,
                    },
                    strength: {
                        type: ControlType.Number,
                        title: "Strength",
                        defaultValue: 40,
                        min: 0,
                        max: 200,
                    },
                    rotation: {
                        type: ControlType.Number,
                        title: "Rotation",
                        defaultValue: 10,
                        min: 0,
                        max: 100,
                    },
                    transition: {
                        type: ControlType.Transition,
                        title: "Transition",
                    },
                },
            },
            pull: {
                type: ControlType.Object,
                title: "Pull",
                description: "Snap to original position when out of zone",
                controls: {
                    transition: {
                        type: ControlType.Transition,
                        title: "Transition",
                    },
                },
            },
        },
    },
    globalForce: {
        type: ControlType.Object,
        title: "Global Force",
        controls: {
            attract: {
                type: ControlType.Object,
                title: "Attract",
                description: "To global pointer",
                controls: {
                    enabled: {
                        type: ControlType.Boolean,
                        title: "Enabled",
                        defaultValue: true,
                    },
                    strength: {
                        type: ControlType.Number,
                        title: "Strength",
                        defaultValue: 0.02,
                        min: 0,
                        max: 0.5,
                        step: 0.001,
                    },
                },
            },
            repel: {
                type: ControlType.Object,
                title: "Repel",
                description: "From global pointer",
                controls: {
                    enabled: {
                        type: ControlType.Boolean,
                        title: "Enabled",
                        defaultValue: false,
                    },
                    strength: {
                        type: ControlType.Number,
                        title: "Strength",
                        defaultValue: 0,
                        min: 0,
                        max: 0.5,
                        step: 0.001,
                    },
                },
            },
            tilt: {
                type: ControlType.Object,
                title: "3D Tilt",
                description: "CSS 3D tilt based on cursor",
                controls: {
                    enabled: {
                        type: ControlType.Boolean,
                        title: "Enabled",
                        defaultValue: false,
                    },
                    strength: {
                        type: ControlType.Number,
                        title: "Strength",
                        defaultValue: 0,
                        min: 0,
                        max: 0.5,
                        step: 0.01,
                    },
                    perspective: {
                        type: ControlType.Number,
                        title: "Perspective",
                        defaultValue: 1200,
                        min: 200,
                        max: 5000,
                        step: 10,
                        unit: "px",
                    },
                },
            },
            transition: {
                type: ControlType.Transition,
                title: "Follow Transition",
            },
        },
    },
})
