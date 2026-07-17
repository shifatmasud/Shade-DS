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
        section,
        viewport = "bottom",
    } = props

    // Extract nested values with defaults
    const pushEnabled = localForce.push?.enabled ?? true
    const pushXEnabled = localForce.push?.xEnabled ?? true
    const pushYEnabled = localForce.push?.yEnabled ?? true
    const pushStrength = localForce.push?.strength ?? 40
    const pushRotation = localForce.push?.rotation ?? 10
    const pushTransition = localForce.push?.transition ?? {
        type: "spring",
        stiffness: 600,
        damping: 30,
        mass: 1,
    }
    const localAreaRadius = localForce.radius ?? 100
    const localTiltEnabled = localForce.tilt?.enabled ?? false
    const localTiltStrength = localForce.tilt?.strength ?? 0
    const localTiltPerspective = localForce.tilt?.perspective ?? 1200
    const snapbackEnabled = localForce.snapback?.enabled ?? true
    const snapbackTransition = localForce.snapback?.transition ?? {
        type: "spring",
        stiffness: 200,
        damping: 20,
        mass: 1,
    }
    const pullEnabled = localForce.pull?.enabled ?? true
    const pullXEnabled = localForce.pull?.xEnabled ?? true
    const pullYEnabled = localForce.pull?.yEnabled ?? true
    const pullStrength = localForce.pull?.strength ?? 20
    const pullRotation = localForce.pull?.rotation ?? 0
    const pullTransition = localForce.pull?.transition ?? {
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 1,
    }

    const attractEnabled = globalForce.attract?.enabled ?? true
    const attractXEnabled = globalForce.attract?.xEnabled ?? true
    const attractYEnabled = globalForce.attract?.yEnabled ?? true
    const attractStrength = globalForce.attract?.strength ?? 0.02
    const repelEnabled = globalForce.repel?.enabled ?? true
    const repelXEnabled = globalForce.repel?.xEnabled ?? true
    const repelYEnabled = globalForce.repel?.yEnabled ?? true
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
    const currentTransform = useRef({ x: 0, y: 0 })
    const [isClient, setIsClient] = useState(false)

    // Store the initial center of the target to calculate follow offset
    const targetCenter = useRef({ x: 0, y: 0 })

    useEffect(() => {
        setIsClient(true)
    }, [])

    /*
     * ----------------------------------------------------------------------------------
     * EXPLANATION OF CHANGES (MODIFICATION LOG):
     * 1. Added `section` and `viewport` to the component props extraction.
     * 2. Introduced `sectionElement` state and polling logic to resolve/find DOM targets.
     * 3. Integrated `IntersectionObserver` with dynamic `rootMargin` aligned to top/center/bottom.
     * 4. Adjusted the main `useEffect` to depend on `sectionInView` and exit early if false,
     *    preventing window event listeners from running when section is out-of-view.
     * 5. Tracked all operations safely within try-catch blocks to prevent run-time exceptions.
     * 
     * HOW TO UNDO CHANGES:
     * To revert back to the original behavior (always-on listeners ignoring section views):
     * 1. Remove the sectionInView dependency from the main useEffect: `}, [isClient, localForce, globalForce, sectionInView])` -> `}, [isClient, localForce, globalForce])`
     * 2. Delete the guard condition `if (!sectionInView) return` at the start of that hook.
     * 3. Delete section/viewport state variables and properties from addPropertyControls/defaultProps.
     * ----------------------------------------------------------------------------------
     */

    // --- SECTION IN-VIEW TRACKING ---
    // Track errors during element discovery or intersection API usage
    const [sectionElement, setSectionElement] = useState<HTMLElement | null>(null)
    
    // Determine if we have a section parameter configured
    const hasSectionConfigured = !!(
        typeof section === "string" 
            ? section 
            : section?.section || section?.id || section?.current
    )
    
    // If no section is configured, default to true; otherwise wait for Observer
    const [sectionInView, setSectionInView] = useState(!hasSectionConfigured)

    // Sync state when hasSectionConfigured changes
    useEffect(() => {
        setSectionInView(!hasSectionConfigured)
    }, [hasSectionConfigured])

    // Locate section element in Framer DOM (with polling for late-hydration fallback)
    useEffect(() => {
        if (!isClient) return
        if (RenderTarget.current() === RenderTarget.canvas) return

        const effectiveId = typeof section === "string" ? section : section?.section || section?.id
        if (!effectiveId && !section?.current) {
            setSectionElement(null)
            return
        }

        const findSection = () => {
            try {
                if (section?.current) {
                    setSectionElement(section.current)
                    return true
                }

                // Try finding by exact id, data-attribute, or name
                const el = document.querySelector(`[id="${effectiveId}"], [data-framer-section-id="${effectiveId}"], [data-framer-name="${effectiveId}"]`)
                if (el) {
                    setSectionElement(el as HTMLElement)
                    return true
                }

                // Pattern matching query fallback
                const selectors = [
                    `[id^="${effectiveId}"]`,
                    `[id$="${effectiveId}"]`,
                    `[id*="-${effectiveId}"]`,
                    `[id*="${effectiveId}-"]`,
                    `[data-framer-name^="${effectiveId}"]`,
                    `[data-framer-name$="${effectiveId}"]`,
                    `[data-framer-name*="${effectiveId}"]`,
                ]
                const found = document.querySelector(selectors.join(","))
                if (found) {
                    setSectionElement(found as HTMLElement)
                    return true
                }
            } catch (err) {
                console.warn("[ForceInjector] Error finding section element:", err)
            }
            return false
        }

        if (findSection()) return

        // Wait/poll for the element if it loads asynchronously
        const interval = window.setInterval(() => {
            if (findSection()) {
                clearInterval(interval)
            }
        }, 1000)

        return () => window.clearInterval(interval)
    }, [isClient, section])

    // Monitor section element intersection with appropriate viewport alignment
    useEffect(() => {
        if (!sectionElement) return

        let rootMargin = "0px"
        if (viewport === "center") {
            rootMargin = "-50% 0px -50% 0px" // Targets the vertical center of screen
        } else if (viewport === "top") {
            rootMargin = "-100% 0px 0px 0px" // Targets the top of screen
        }

        try {
            const observer = new IntersectionObserver(([entry]) => {
                setSectionInView(entry.isIntersecting)
            }, {
                rootMargin,
                threshold: 0,
            })

            observer.observe(sectionElement)
            return () => observer.disconnect()
        } catch (err) {
            console.warn("[ForceInjector] IntersectionObserver failed:", err)
            // Safety fallback: allow event listeners if observer errors out
            setSectionInView(true)
        }
    }, [sectionElement, viewport])
    // --- END SECTION IN-VIEW TRACKING ---

    useEffect(() => {
        if (!isClient) return
        if (RenderTarget.current() === RenderTarget.canvas) return

        // Early exit: only register global listeners if target section is in-view
        if (!sectionInView) return

        const el = containerRef.current
        if (!el) return

        let target = el.parentElement as HTMLElement
        if (target && target.parentElement) {
            target = target.parentElement
        }
        
        if (!target) return
        targetRef.current = target

        // Setup context if tilt is used
        const useTilt = (tiltEnabled && tiltStrength > 0) || (localTiltEnabled && localTiltStrength > 0)
        if (useTilt) {
            target.style.transformStyle = "preserve-3d"
            if (target.parentElement) {
                target.parentElement.style.perspective = `${tiltEnabled ? tiltPerspective : localTiltPerspective}px`
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
            if (!target) return
            const rect = target.getBoundingClientRect()
            targetCenter.current = {
                x: rect.left + rect.width / 2 - currentTransform.current.x,
                y: rect.top + rect.height / 2 - currentTransform.current.y,
            }
        }
        updateCenter()
        window.addEventListener("resize", updateCenter)

        const triggerReturn = () => {
            if (!snapbackEnabled) return
            if (animationRef.current) animationRef.current.stop()
            animationRef.current = animate(
                target,
                { x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0 },
                {
                    ...snapbackTransition,
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

            // Update isInside based on radius
            const dist = Math.hypot(clientX - targetCenter.current.x, clientY - targetCenter.current.y)
            const wasInside = isInside.current
            isInside.current = dist <= localAreaRadius

            // Handle leave event if just exited radius
            if (wasInside && !isInside.current) {
                lastLeaveTime.current = performance.now()
                if (pushEnabled || pullEnabled) triggerReturn()
            }

            let pushX = 0
            let pushY = 0
            let pushRotate = 0
            let pullX = 0
            let pullY = 0

            // 1. Calculate Push Force (Velocity based) - Only if inside
            if (pushEnabled && isInside.current && dt > 0) {
                const dx = clientX - lastPointerPos.current.x
                const dy = clientY - lastPointerPos.current.y
                
                const vx = dx / dt
                const vy = dy / dt

                pushX = pushXEnabled ? vx * pushStrength : 0
                pushY = pushYEnabled ? vy * pushStrength : 0
                pushRotate = vx * pushRotation
            }
            
            // 1.5 Calculate Pull Force (Position based) - Only if inside
            if (pullEnabled && isInside.current) {
                pullX = pullXEnabled ? (clientX - targetCenter.current.x) * (pullStrength / 100) : 0
                pullY = pullYEnabled ? (clientY - targetCenter.current.y) * (pullStrength / 100) : 0
                pushRotate += (clientX - targetCenter.current.x) * (pullRotation / 1000)
            }

            // 2. Calculate Follow Force (Position based) - Global
            // Attraction is positive, Repulsion is negative
            const netAttractStrengthX = attractEnabled && attractXEnabled ? attractStrength : 0
            const netAttractStrengthY = attractEnabled && attractYEnabled ? attractStrength : 0
            const netRepelStrengthX = repelEnabled && repelXEnabled ? repelStrength : 0
            const netRepelStrengthY = repelEnabled && repelYEnabled ? repelStrength : 0
            
            const followX = (clientX - targetCenter.current.x) * (netAttractStrengthX - netRepelStrengthX)
            const followY = (clientY - targetCenter.current.y) * (netAttractStrengthY - netRepelStrengthY)

            // 3. Calculate 3D Tilt
            // Global Tilt
            const tiltXGlobal = tiltEnabled ? -(clientY - targetCenter.current.y) * tiltStrength : 0
            const tiltYGlobal = tiltEnabled ? (clientX - targetCenter.current.x) * tiltStrength : 0
            
            // Local Tilt (only when inside)
            const tiltXLocal = (localTiltEnabled && isInside.current) ? -(clientY - targetCenter.current.y) * localTiltStrength : 0
            const tiltYLocal = (localTiltEnabled && isInside.current) ? (clientX - targetCenter.current.x) * localTiltStrength : 0
            
            // Combine forces
            const targetX = pushX + pullX + followX
            const targetY = pushY + pullY + followY
            const targetRotate = pushRotate
            const targetRotateX = tiltXGlobal + tiltXLocal
            const targetRotateY = tiltYGlobal + tiltYLocal

            // Apply animation if there's any significant target
            const hasMovement = Math.abs(targetX) > 0.1 || Math.abs(targetY) > 0.1 || 
                               Math.abs(targetRotate) > 0.1 || Math.abs(targetRotateX) > 0.1 || 
                               Math.abs(targetRotateY) > 0.1

            if (hasMovement) {
                if (animationRef.current) animationRef.current.stop()
                
                // Determine which transition to use
                let transition = globalTransition
                if (isInside.current && pushEnabled) {
                    transition = pushTransition
                } else if (pushEnabled && now - lastLeaveTime.current < 600) {
                    // Use pull spring for a short duration after leaving for the "snap" effect
                    transition = snapbackTransition
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
                        onUpdate: (latest) => {
                            currentTransform.current.x = latest.x || 0
                            currentTransform.current.y = latest.y || 0
                        }
                    }
                )
            }

            lastPointerPos.current = { x: clientX, y: clientY }
            lastTime.current = now
        }

        const handlePointerLeave = () => {
            // Handled by global pointer move/up
        }

        const handleGlobalPointerDown = (e: PointerEvent) => {
            updateCenter()
            lastPointerPos.current = { x: e.clientX, y: e.clientY }
            lastTime.current = performance.now()
            
            const dist = Math.hypot(e.clientX - targetCenter.current.x, e.clientY - targetCenter.current.y)
            isInside.current = dist <= localAreaRadius
        }

        const handleGlobalPointerUp = (e: PointerEvent) => {
            if (isInside.current) {
                isInside.current = false
                lastLeaveTime.current = performance.now()
                if (pushEnabled || pullEnabled) triggerReturn()
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (!pushEnabled) return
            const touch = e.touches[0]
            if (!touch) return
            
            const dist = Math.hypot(touch.clientX - targetCenter.current.x, touch.clientY - targetCenter.current.y)
            if (dist <= localAreaRadius) {
                // If we are within the radius, prevent scroll to allow force interaction
                if (e.cancelable) e.preventDefault()
            }
        }

        target.addEventListener("pointerenter", handlePointerEnter as any)
        window.addEventListener("pointerdown", handleGlobalPointerDown as any)
        window.addEventListener("pointermove", handleGlobalPointerMove as any)
        window.addEventListener("pointerup", handleGlobalPointerUp as any)
        window.addEventListener("pointercancel", handleGlobalPointerUp as any)
        window.addEventListener("touchmove", handleTouchMove as any, { passive: false })
        target.addEventListener("pointerleave", handlePointerLeave as any)

        // Prevent scrolling on touch devices when interacting with the target
        const originalTouchAction = target.style.touchAction
        target.style.touchAction = "none"

        return () => {
            target.removeEventListener("pointerenter", handlePointerEnter as any)
            window.removeEventListener("pointerdown", handleGlobalPointerDown as any)
            window.removeEventListener("pointermove", handleGlobalPointerMove as any)
            window.removeEventListener("pointerup", handleGlobalPointerUp as any)
            window.removeEventListener("pointercancel", handleGlobalPointerUp as any)
            window.removeEventListener("touchmove", handleTouchMove as any)
            target.removeEventListener("pointerleave", handlePointerLeave as any)
            window.removeEventListener("resize", updateCenter)
            target.style.touchAction = originalTouchAction
            if (animationRef.current) animationRef.current.stop()
            
            // Clean/Reset transforms to zero state upon effect removal
            try {
                target.style.transform = ""
            } catch (err) {}
        }
    }, [isClient, localForce, globalForce, sectionInView])

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
    section: "",
    viewport: "bottom",
    localForce: {
        radius: 100,
        push: {
            enabled: true,
            xEnabled: true,
            yEnabled: true,
            strength: 40,
            rotation: 10,
            transition: {
                type: "spring",
                stiffness: 600,
                damping: 30,
                mass: 1,
            },
        },
        snapback: {
            enabled: true,
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 20,
                mass: 1,
            },
        },
        pull: {
            enabled: true,
            xEnabled: true,
            yEnabled: true,
            strength: 20,
            rotation: 0,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 1,
            },
        },
        tilt: {
            enabled: false,
            strength: 0,
            perspective: 1200,
        },
    },
    globalForce: {
        attract: { enabled: true, xEnabled: true, yEnabled: true, strength: 0.02 },
        repel: { enabled: false, xEnabled: true, yEnabled: true, strength: 0 },
        tilt: { enabled: false, strength: 0, perspective: 1200 },
        transition: {
            type: "tween",
            ease: "linear",
            duration: 0.4,
        },
    },
}

addPropertyControls(ForceInjector, {
    section: {
        title: "Section",
        // @ts-ignore
        type: ControlType.ScrollSectionRef
    },
    viewport: {
        type: ControlType.Enum,
        defaultValue: "bottom",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        options: ["top", "center", "bottom"],
        // @ts-ignore
        optionIcons: ["align-top", "align-middle", "align-bottom"],
  
        description: "───────────"
    },
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
                    xEnabled: {
                        type: ControlType.Boolean,
                        title: "X Enabled",
                        defaultValue: true,
                    },
                    yEnabled: {
                        type: ControlType.Boolean,
                        title: "Y Enabled",
                        defaultValue: true,
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
                description: "Pull towards cursor when in zone",
                controls: {
                    enabled: {
                        type: ControlType.Boolean,
                        title: "Enabled",
                        defaultValue: true,
                    },
                    strength: {
                        type: ControlType.Number,
                        title: "Strength",
                        defaultValue: 20,
                        min: 0,
                        max: 100,
                    },
                    xEnabled: {
                        type: ControlType.Boolean,
                        title: "X Enabled",
                        defaultValue: true,
                    },
                    yEnabled: {
                        type: ControlType.Boolean,
                        title: "Y Enabled",
                        defaultValue: true,
                    },
                    rotation: {
                        type: ControlType.Number,
                        title: "Rotation",
                        defaultValue: 0,
                        min: 0,
                        max: 100,
                    },
                    transition: {
                        type: ControlType.Transition,
                        title: "Transition",
                    },
                },
            },
            radius: {
                type: ControlType.Number,
                title: "Local Area Radius",
                defaultValue: 100,
                min: 0,
                max: 500,
                step: 1,
                unit: "px",
            },
            tilt: {
                type: ControlType.Object,
                title: "3D Tilt (Local)",
                description: "CSS 3D tilt when inside zone",
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
            snapback: {
                type: ControlType.Object,
                title: "Snapback",
                description: "Snap to original position when out of zone",
                controls: {
                    enabled: {
                        type: ControlType.Boolean,
                        title: "Enabled",
                        defaultValue: true,
                    },
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
                    xEnabled: {
                        type: ControlType.Boolean,
                        title: "X Enabled",
                        defaultValue: true,
                    },
                    yEnabled: {
                        type: ControlType.Boolean,
                        title: "Y Enabled",
                        defaultValue: true,
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
                    xEnabled: {
                        type: ControlType.Boolean,
                        title: "X Enabled",
                        defaultValue: true,
                    },
                    yEnabled: {
                        type: ControlType.Boolean,
                        title: "Y Enabled",
                        defaultValue: true,
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
