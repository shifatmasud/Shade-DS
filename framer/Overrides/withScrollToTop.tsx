import type { ComponentType } from "react"
import { useEffect } from "react"
import { RenderTarget } from "framer"

/**
 * Higher-order component (Override) that forces the page to scroll to the top
 * when the component mounts. This is useful for landing pages or sites where
 * browsers might attempt to restore scroll position.
 * 
 * @framerDisableUnlink
 */
export function withScrollToTop(Component: any): ComponentType {
    return (props: any) => {
        useEffect(() => {
            // Never run scroll logic on the Framer Canvas/Editor
            if (RenderTarget.current() === RenderTarget.canvas) return

            // Force scroll to top
            window.scrollTo(0, 0)

            // Robustness: Handle browsers that restore scroll position asynchronously
            const timer = setTimeout(() => {
                window.scrollTo(0, 0)
            }, 10)

            // Optional: Disable manual restoration for this session if it's a SPA-like experience
            if ("scrollRestoration" in history) {
                history.scrollRestoration = "manual"
            }

            return () => {
                clearTimeout(timer)
                // Re-enable on cleanup if navigating between pages with different scroll needs
                if ("scrollRestoration" in history) {
                    history.scrollRestoration = "auto"
                }
            }
        }, [])

        return <Component {...props} />
    }
}
