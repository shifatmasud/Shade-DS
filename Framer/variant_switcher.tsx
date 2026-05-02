import React, { useEffect, useRef, useState, startTransition } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 60
 * @framerIntrinsicHeight 60
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function VariantSwitcher(props) {
    const {
        interaction,
        variantA,
        variantB,
        triggerId,
        targetId,
        style,
        opacity,
        visible,
        ...rest
    } = props

    const [isClient, setIsClient] = useState(false)
    const [currentVariant, setCurrentVariant] = useState(variantA)

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (!isClient || RenderTarget.current() === RenderTarget.canvas) return
        if (!triggerId || !targetId) return

        const trigger = document.getElementById(triggerId)
        if (!trigger) return

        const handleInteraction = (e: Event) => {
            const nextVariant = currentVariant === variantA ? variantB : variantA
            setCurrentVariant(nextVariant)

            // Attempt to find target and inject variant change
            const target = document.getElementById(targetId)
            if (target) {
                // This is where "id to inject functions" happens
                // We can try to trigger a custom event or find the react instance
                const event = new CustomEvent("framerVariantChange", {
                    detail: { variant: nextVariant },
                })
                target.dispatchEvent(event)
            }
        }

        const events = {
            click: ["click"],
            hover: ["mouseenter"],
            tap: ["pointerdown"],
        }
        const eventNames = events[interaction] || ["click"]

        eventNames.forEach((evt) =>
            trigger.addEventListener(evt, handleInteraction)
        )
        return () => {
            eventNames.forEach((evt) =>
                trigger.removeEventListener(evt, handleInteraction)
            )
        }
    }, [isClient, interaction, variantA, variantB, triggerId, targetId, currentVariant])

    const isOnCanvas = RenderTarget.current() === RenderTarget.canvas

    const containerStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        display: visible ? "flex" : "none",
        opacity: opacity,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isOnCanvas ? "rgba(0, 153, 255, 0.1)" : "transparent",
        border: isOnCanvas ? "1px dashed rgba(0, 153, 255, 0.5)" : "none",
        pointerEvents: "none",
        overflow: "visible",
        ...style,
    }

    return (
        <div ref={useRef(null)} style={containerStyle} {...rest}>
            {isOnCanvas && (
                <div
                    style={{
                        color: "#09f",
                        fontSize: 9,
                        fontWeight: 700,
                        textAlign: "center",
                        padding: 4,
                        textTransform: "uppercase",
                    }}
                >
                    Var Switcher
                </div>
            )}
        </div>
    )
}

VariantSwitcher.defaultProps = {
    interaction: "click",
    variantA: "Variant 1",
    variantB: "Variant 2",
}

addPropertyControls(VariantSwitcher, {
    triggerId: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Trigger ID",
        description: "Interaction source (e.g. Button ID)",
    },
    targetId: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Target ID",
        description: "Component ID to change",
    },
    interaction: {
        type: ControlType.Enum,
        title: "Interaction",
        options: ["click", "hover", "tap"],
        optionTitles: ["Click", "Hover", "Tap"],
        defaultValue: "click",
    },
    variantA: {
        type: ControlType.String,
        title: "Variant A",
        defaultValue: "Variant 1",
    },
    variantB: {
        type: ControlType.String,
        title: "Variant B",
        defaultValue: "Variant 2",
    },
    opacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 1,
    },
    visible: {
        type: ControlType.Boolean,
        title: "Visible",
        defaultValue: true,
    },
})
