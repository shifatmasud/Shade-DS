import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 0
 * @framerIntrinsicHeight 0
 */
export default function InfiniteCanvasInjector(props) {
    const {
        active,
        levels,
        dragSpeed,
        inertia,
        loopX,
        loopY,
        width,
        height,
    } = props

    const ref = React.useRef<HTMLDivElement>(null)
    const targetRef = React.useRef<HTMLElement | null>(null)
    const offset = React.useRef({ x: 0, y: 0 })
    const velocity = React.useRef({ x: 0, y: 0 })
    const isDragging = React.useRef(false)
    const lastPos = React.useRef({ x: 0, y: 0 })
    const lastTime = React.useRef(0)
    const rafId = React.useRef<number>(0)

    const [isClient, setIsClient] = React.useState(false)

    React.useEffect(() => {
        setIsClient(true)
    }, [])

    React.useEffect(() => {
        if (!isClient || !active || RenderTarget.current() === RenderTarget.canvas) return

        const element = ref.current
        if (!element) return

        // 🔼 climb up to find target
        let target: HTMLElement | null = element
        for (let i = 0; i < levels; i++) {
            target = target?.parentElement
            if (!target) break
        }

        if (!target) return
        targetRef.current = target

        // Initial setup
        const originalUserSelect = target.style.userSelect
        const originalTouchAction = target.style.touchAction
        target.style.userSelect = "none"
        target.style.touchAction = "none"
        target.style.willChange = "transform"

        const applyTransform = () => {
            if (!targetRef.current) return
            
            let tx = offset.current.x
            let ty = offset.current.y

            if (loopX && width > 0) {
                tx = ((tx % width) + width) % width
            }
            if (loopY && height > 0) {
                ty = ((ty % height) + height) % height
            }

            targetRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
        }

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return
            isDragging.current = true
            lastPos.current = { x: e.clientX, y: e.clientY }
            lastTime.current = performance.now()
            velocity.current = { x: 0, y: 0 }
            
            if (rafId.current) cancelAnimationFrame(rafId.current)
            target?.setPointerCapture(e.pointerId)
        }

        const onPointerMove = (e: PointerEvent) => {
            if (!isDragging.current) return
            
            const now = performance.now()
            const dt = Math.max(1, now - lastTime.current)
            
            const dx = (e.clientX - lastPos.current.x) * dragSpeed
            const dy = (e.clientY - lastPos.current.y) * dragSpeed
            
            offset.current.x += dx
            offset.current.y += dy
            
            velocity.current = {
                x: dx / dt,
                y: dy / dt
            }
            
            lastPos.current = { x: e.clientX, y: e.clientY }
            lastTime.current = now
            
            applyTransform()
        }

        const onPointerUp = () => {
            isDragging.current = false
            
            const friction = inertia
            const step = () => {
                if (isDragging.current) return

                offset.current.x += velocity.current.x * 16 // Approx 60fps step
                offset.current.y += velocity.current.y * 16
                
                velocity.current.x *= friction
                velocity.current.y *= friction
                
                applyTransform()

                if (Math.abs(velocity.current.x) > 0.01 || Math.abs(velocity.current.y) > 0.01) {
                    rafId.current = requestAnimationFrame(step)
                }
            }
            rafId.current = requestAnimationFrame(step)
        }

        target.addEventListener("pointerdown", onPointerDown as any)
        target.addEventListener("pointermove", onPointerMove as any)
        target.addEventListener("pointerup", onPointerUp as any)
        target.addEventListener("pointercancel", onPointerUp as any)

        return () => {
            target?.removeEventListener("pointerdown", onPointerDown as any)
            target?.removeEventListener("pointermove", onPointerMove as any)
            target?.removeEventListener("pointerup", onPointerUp as any)
            target?.removeEventListener("pointercancel", onPointerUp as any)
            
            if (target) {
                target.style.userSelect = originalUserSelect
                target.style.touchAction = originalTouchAction
                target.style.transform = ""
            }
            if (rafId.current) cancelAnimationFrame(rafId.current)
        }
    }, [isClient, active, levels, dragSpeed, inertia, loopX, loopY, width, height])

    if (!isClient) return null

    return (
        <div
            ref={ref}
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

InfiniteCanvasInjector.displayName = "Infinite Canvas Injector"

InfiniteCanvasInjector.defaultProps = {
    active: true,
    levels: 2,
    dragSpeed: 1,
    inertia: 0.95,
    loopX: true,
    loopY: true,
    width: 1000,
    height: 1000,
}

addPropertyControls(InfiniteCanvasInjector, {
    active: {
        type: ControlType.Boolean,
        title: "Active",
        defaultValue: true,
    },
    levels: {
        type: ControlType.Number,
        title: "DOM Levels",
        defaultValue: 2,
        min: 1,
        max: 5,
        step: 1,
    },
    dragSpeed: {
        type: ControlType.Number,
        title: "Drag Speed",
        defaultValue: 1,
        min: 0.1,
        max: 5,
        step: 0.1,
    },
    inertia: {
        type: ControlType.Number,
        title: "Inertia",
        defaultValue: 0.95,
        min: 0.8,
        max: 0.99,
        step: 0.01,
    },
    loopX: {
        type: ControlType.Boolean,
        title: "Loop X",
        defaultValue: true,
    },
    width: {
        type: ControlType.Number,
        title: "Loop Width",
        defaultValue: 1000,
        min: 100,
        max: 5000,
        hidden: (props) => !props.loopX,
    },
    loopY: {
        type: ControlType.Boolean,
        title: "Loop Y",
        defaultValue: true,
    },
    height: {
        type: ControlType.Number,
        title: "Loop Height",
        defaultValue: 1000,
        min: 100,
        max: 5000,
        hidden: (props) => !props.loopY,
    },
})
