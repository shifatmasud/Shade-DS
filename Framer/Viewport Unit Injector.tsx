// Viewport Unit Injector component for Framer
// Created: 2026-05-20
// Purpose: Injects modern dynamic viewport units (svh, dvh, lvh) and responsive design CSS variables into parent DOM elements in Framer.
// How to Undo: Simply delete this file or remove the component instances from your Framer canvas.

import * as React from "react"
import { Frame, addPropertyControls, ControlType } from "framer"

type OriginalStyles = {
    height: string
    minHeight: string
    maxHeight: string
}

type Props = {
    enabled: boolean
    levels: number
    heightUnit: string
    customHeight: string
    minHeightUnit: string
    customMinHeight: string
    maxHeightUnit: string
    customMaxHeight: string
    injectCssVars: boolean
    useJsFallback: boolean
}

export function ViewportUnitInjector(props: Props) {
    const {
        enabled,
        levels,
        heightUnit,
        customHeight,
        minHeightUnit,
        customMinHeight,
        maxHeightUnit,
        customMaxHeight,
        injectCssVars,
        useJsFallback,
    } = props

    const ref = React.useRef<HTMLDivElement>(null)
    const originalStylesRef = React.useRef<OriginalStyles | null>(null)
    const errorStateRef = React.useRef<string | null>(null)

    React.useEffect(() => {
        if (!enabled) return

        const element = ref.current
        if (!element) return

        // 🔼 Climb up to find the target Framer container parent hierarchy
        let target: HTMLElement | null = element
        try {
            for (let i = 0; i < levels; i++) {
                target = target?.parentElement || null
                if (!target) break
            }
        } catch (err) {
            errorStateRef.current = String(err)
            console.error("ViewportUnitInjector error climbing levels:", err)
        }

        if (!target) {
            console.warn("ViewportUnitInjector: Target parent element not found at DOM level " + levels)
            return
        }

        // 🧠 Cache original styling properties before modification (safe fallback & restore)
        if (originalStylesRef.current === null) {
            originalStylesRef.current = {
                height: target.style.height || "",
                minHeight: target.style.minHeight || "",
                maxHeight: target.style.maxHeight || "",
            }
        }

        // Helper to resolve unit string
        const resolveValue = (unit: string, custom: string) => {
            if (unit === "none") return ""
            if (unit === "custom") return custom
            return unit
        }

        try {
            // Apply layout viewport override style rules
            const resolvedHeight = resolveValue(heightUnit, customHeight)
            const resolvedMinHeight = resolveValue(minHeightUnit, customMinHeight)
            const resolvedMaxHeight = resolveValue(maxHeightUnit, customMaxHeight)

            if (resolvedHeight) target.style.height = resolvedHeight
            if (resolvedMinHeight) target.style.minHeight = resolvedMinHeight
            if (resolvedMaxHeight) target.style.maxHeight = resolvedMaxHeight

            // Inject Custom CSS Variables if enabled (letting children reference them)
            if (injectCssVars) {
                target.style.setProperty("--svh", "1svh")
                target.style.setProperty("--dvh", "1dvh")
                target.style.setProperty("--lvh", "1lvh")
                target.style.setProperty("--svh-100", "100svh")
                target.style.setProperty("--dvh-100", "100dvh")
                target.style.setProperty("--lvh-100", "100lvh")
            }

            // Optional JavaScript-based calculating fallbacks for absolute robustness
            let handleResize: (() => void) | null = null

            if (useJsFallback) {
                const updateFallbackVars = () => {
                    if (!target) return
                    const doc = document.documentElement
                    // clientHeight represents SVH (small viewport height - toolbars static)
                    const jsSvh = (doc.clientHeight * 0.01).toFixed(3) + "px"
                    // innerHeight represents DVH (dynamic viewport height - changes with toolbar height)
                    const jsDvh = (window.innerHeight * 0.01).toFixed(3) + "px"

                    target.style.setProperty("--js-svh", jsSvh)
                    target.style.setProperty("--js-dvh", jsDvh)
                }

                // Run once initial trigger
                updateFallbackVars()

                // Register event listener
                handleResize = () => {
                    requestAnimationFrame(updateFallbackVars)
                }
                window.addEventListener("resize", handleResize, { passive: true })
            }

            // Cleanup & Restore styles inside target
            return () => {
                if (target && originalStylesRef.current) {
                    target.style.height = originalStylesRef.current.height
                    target.style.minHeight = originalStylesRef.current.minHeight
                    target.style.maxHeight = originalStylesRef.current.maxHeight
                }
                if (handleResize) {
                    window.removeEventListener("resize", handleResize)
                }
            }
        } catch (styleErr) {
            errorStateRef.current = String(styleErr)
            console.error("ViewportUnitInjector error applying styles:", styleErr)
        }
    }, [
        enabled,
        levels,
        heightUnit,
        customHeight,
        minHeightUnit,
        customMinHeight,
        maxHeightUnit,
        customMaxHeight,
        injectCssVars,
        useJsFallback,
    ])

    // Render an absolute ghost Frame (zero dimension layout item)
    return (
        <Frame
            ref={ref}
            name="Viewport Unit Injector Ghost"
            background={null}
            size={0}
            style={{ position: "absolute", visibility: "hidden", pointerEvents: "none" }}
        />
    )
}

// Controls configuration for the Framer editing canvas interface
addPropertyControls(ViewportUnitInjector, {
    enabled: {
        type: ControlType.Boolean,
        title: "Enabled",
        defaultValue: true,
    },
    levels: {
        type: ControlType.Number,
        title: "DOM Levels",
        defaultValue: 2,
        min: 1,
        max: 10,
        step: 1,
    },
    heightUnit: {
        type: ControlType.Enum,
        title: "Height",
        options: ["none", "100svh", "100dvh", "100lvh", "100vh", "custom"],
        optionTitles: ["None", "100svh (Small)", "100dvh (Dynamic)", "100lvh (Large)", "100vh (Standard)", "Custom"],
        defaultValue: "100dvh",
    },
    customHeight: {
        type: ControlType.String,
        title: "Custom Height",
        defaultValue: "100dvh",
        hidden(props) {
            return props.heightUnit !== "custom"
        },
    },
    minHeightUnit: {
        type: ControlType.Enum,
        title: "Min Height",
        options: ["none", "100svh", "100dvh", "100lvh", "100vh", "custom"],
        optionTitles: ["None", "100svh (Small)", "100dvh (Dynamic)", "100lvh (Large)", "100vh (Standard)", "Custom"],
        defaultValue: "none",
    },
    customMinHeight: {
        type: ControlType.String,
        title: "Custom Min H",
        defaultValue: "100dvh",
        hidden(props) {
            return props.minHeightUnit !== "custom"
        },
    },
    maxHeightUnit: {
        type: ControlType.Enum,
        title: "Max Height",
        options: ["none", "100svh", "100dvh", "100lvh", "100vh", "custom"],
        optionTitles: ["None", "100svh (Small)", "100dvh (Dynamic)", "100lvh (Large)", "100vh (Standard)", "Custom"],
        defaultValue: "none",
    },
    customMaxHeight: {
        type: ControlType.String,
        title: "Custom Max H",
        defaultValue: "100dvh",
        hidden(props) {
            return props.maxHeightUnit !== "custom"
        },
    },
    injectCssVars: {
        type: ControlType.Boolean,
        title: "Inject CSS Vars",
        defaultValue: true,
        // @ts-ignore
        description: "Exposes --svh, --dvh, --svh-100, etc. CSS properties.",
    },
    useJsFallback: {
        type: ControlType.Boolean,
        title: "JS Fallback",
        defaultValue: true,
        // @ts-ignore
        description: "Creates dynamic --js-svh & --js-dvh properties on resize.",
    },
})
