import * as React from "react"
import { Frame, addPropertyControls, ControlType } from "framer"

type OriginalStyles = {
    clipPath: string
    webkitClipPath: string
    position: string
}

export function ClipPathGhost(props) {
    const { hasEffect, levels } = props

    const ref = React.useRef<HTMLDivElement>(null)
    const originalStylesRef = React.useRef<OriginalStyles | null>(null)

    React.useEffect(() => {
        const element = ref.current
        if (!element) return

        // 🔼 climb up (default = 2 like your pattern)
        let target: HTMLElement | null = element
        for (let i = 0; i < levels; i++) {
            target = target?.parentElement
            if (!target) break
        }

        if (!target) {
            console.error("ClipPathGhost: No valid target found.")
            return
        }

        // 🧠 save original styles once
        if (originalStylesRef.current === null) {
            originalStylesRef.current = {
                clipPath: target.style.clipPath,
                webkitClipPath: target.style.webkitClipPath,
                position: target.style.position,
            }
        }

        if (hasEffect) {
            // ✅ apply clipping fix
            target.style.clipPath = "inset(0)"
            target.style.webkitClipPath = "inset(0)"

            // ensure positioning context (safe guard)
            if (getComputedStyle(target).position === "static") {
                target.style.position = "relative"
            }
        } else {
            // 🔁 restore
            if (originalStylesRef.current) {
                Object.assign(target.style, originalStylesRef.current)
            }
        }

        // 🧹 cleanup on unmount
        return () => {
            if (target && originalStylesRef.current) {
                Object.assign(target.style, originalStylesRef.current)
            }
        }
    }, [hasEffect, levels])

    return (
        <Frame
            ref={ref}
            name="ClipPath Ghost"
            background={null}
            size={0}
            style={{ position: "absolute", visibility: "hidden" }}
        />
    )
}
addPropertyControls(ClipPathGhost, {
    hasEffect: {
        type: ControlType.Boolean,
        title: "Enabled",
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
})
