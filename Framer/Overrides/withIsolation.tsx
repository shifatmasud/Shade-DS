import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * Higher-order component (Override) that applies CSS isolation to a component.
 * Isolation: 'isolate' creates a new stacking context, ensuring that internal 
 * z-index values do not "leak" out and interact with the z-index of siblings 
 * or outer elements. This is essential for complex overlays and ensuring 
 * backdrop filters work correctly in Safari.
 * 
 * @framerDisableUnlink
 */
export function withIsolation(Component: any): ComponentType {
    const IsolatedComponent = (props: any) => {
        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    isolation: "isolate",
                }}
            />
        )
    }
    
    IsolatedComponent.displayName = "withIsolation"
    return IsolatedComponent
}

/**
 * Creates an override factory that applies isolation and a specific z-index.
 * This is the most reliable way to manage complex layering in Framer.
 * 
 * @framerDisableUnlink
 */
function createIsolatedZIndex(zIndex: number, name: string) {
    const IsolatedZIndex = (Component: any): ComponentType => {
        const Wrap = (props: any) => {
            return (
                <Component
                    {...props}
                    style={{
                        ...props.style,
                        // Ensure we have a positioning context for z-index to work
                        position: props.style?.position || "relative",
                        zIndex: zIndex,
                        isolation: "isolate",
                    }}
                />
            )
        }
        Wrap.displayName = name
        return Wrap
    }
    return IsolatedZIndex
}

// Pre-defined z-index levels for easy selection in Framer Overrides dropdown
export const withZIndexAuto = createIsolatedZIndex(0, "withZIndexAuto")
export const withZIndex1 = createIsolatedZIndex(1, "withZIndex1")
export const withZIndex10 = createIsolatedZIndex(10, "withZIndex10")
export const withZIndex50 = createIsolatedZIndex(50, "withZIndex50")
export const withZIndex100 = createIsolatedZIndex(100, "withZIndex100")
export const withZIndex500 = createIsolatedZIndex(500, "withZIndex500")
export const withZIndex1000 = createIsolatedZIndex(1000, "withZIndex1000")

// Specialized layering overrides
export const withZIndexAboveAll = createIsolatedZIndex(9999, "withZIndexAboveAll")
export const withZIndexBelowAll = createIsolatedZIndex(-1, "withZIndexBelowAll")
export const withForefront = createIsolatedZIndex(99, "withForefront")
export const withBackgroundLayer = createIsolatedZIndex(-10, "withBackgroundLayer")

/**
 * Deep Isolation Override:
 * For components that contain their own nested stacking contexts (like tooltips or popovers).
 */
export const withDeepIsolation = (Component: any): ComponentType => {
    const DeepIsolated = (props: any) => {
        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    isolation: "isolate",
                    zIndex: 10,
                    position: "relative",
                    willChange: "transform, isolation",
                }}
            />
        )
    }
    DeepIsolated.displayName = "withDeepIsolation"
    return DeepIsolated
}
