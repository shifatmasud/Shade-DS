import React, { useEffect, useLayoutEffect, ComponentType, useRef } from "react"
import { RenderTarget } from "framer"

/**
 * @framerDisableUnlink
 */
export function withImagePreload(Component: any): ComponentType {
    return (props: any) => {
        const containerRef = useRef<HTMLDivElement>(null)

        // 1. Precise extraction from Framer's Image prop or native source props
        const imageProp = props.image || props.src || props.backgroundImage || props.style?.backgroundImage
        
        let src = props.preloadSrc
        let srcset = props.preloadSrcset
        let sizes = props.preloadSizes

        // Helper to extract URL from background-image string
        const extractUrl = (str: any) => {
            if (typeof str !== "string") return null
            const match = str.match(/url\(['"]?([^'"]+)['"]?\)/)
            return match ? match[1] : str
        }

        // Deep discovery helper
        const discoverSrc = (p: any): any => {
            if (!p) return null
            
            // 1. Direct string (URL or background-image)
            if (typeof p === "string") {
                const url = extractUrl(p)
                if (url && (url.includes("framerusercontent.com") || url.includes("images.unsplash.com") || url.includes("?"))) {
                    return { src: url }
                }
                return null
            }
            
            // 2. Object check
            if (typeof p === "object") {
                // Direct props
                if (p.src || p.srcSet || p.srcset) return p
                
                // Nested background/style checks
                if (p.background) {
                    const found = discoverSrc(p.background)
                    if (found) return found
                }
                
                if (p.backgroundImage) {
                    const found = discoverSrc(p.backgroundImage)
                    if (found) return found
                }

                if (p.style?.backgroundImage) return { src: extractUrl(p.style.backgroundImage) }
                
                // Common Framer nested pattern for backgrounds
                if (p.value?.src) return p.value
                
                // Deep children search (for wrapped components)
                if (p.children) {
                    const children = React.Children.toArray(p.children)
                    for (const child of children) {
                        if (React.isValidElement(child)) {
                            const found = discoverSrc(child.props)
                            if (found) return found
                        }
                    }
                }
            }
            return null
        }

        const discovered = discoverSrc(props.image) || 
                          discoverSrc(props.src) || 
                          discoverSrc(props.background) || 
                          discoverSrc(props.backgroundImage) || 
                          discoverSrc(props.style) || 
                          discoverSrc(props)
        
        src = src || (typeof discovered === "string" ? discovered : discovered?.src)
        srcset = srcset || discovered?.srcSet || discovered?.srcset
        sizes = sizes || discovered?.sizes
        
        const finalSizes = sizes || "100vw"

        useLayoutEffect(() => {
            if (RenderTarget.current() === RenderTarget.canvas) return

            // Log for debugging
            if (!src) {
                console.log("⚠️ withImagePreload: No src discovered in props branch.", {
                    comp: Component.displayName || Component.name || "Unknown",
                    propKeys: Object.keys(props).filter(k => !k.startsWith("_"))
                })
            } else {
                console.log("✅ withImagePreload: Found src", src.substring(0, 50) + "...")
            }

            // --- Strategy D: Persistent DOM Patching (The "Discovery" Enforcer) ---
            // This runs REGARDLESS of whether we found src in props
            const forceEager = () => {
                const targetNode = containerRef.current || document.body
                const images = targetNode.querySelectorAll("img, source")
                for (let i = 0; i < images.length; i++) {
                    const el = images[i] as any
                    if (el.tagName === "IMG") {
                        if (el.getAttribute("loading") !== "eager") {
                            el.setAttribute("loading", "eager")
                            el.loading = "eager"
                        }
                        if (el.getAttribute("decoding") !== "sync") {
                            el.setAttribute("decoding", "sync")
                            el.decoding = "sync"
                        }
                    }
                    if (el.getAttribute("fetchpriority") !== "high") {
                        el.setAttribute("fetchpriority", "high")
                        el.fetchPriority = "high"
                    }
                }
            }

            forceEager()
            const timer = setTimeout(forceEager, 50)
            const timer2 = setTimeout(forceEager, 200)
            const interval = setInterval(forceEager, 2000)
            const observer = new MutationObserver(forceEager)
            
            if (containerRef.current) {
                observer.observe(containerRef.current, { 
                    childList: true, 
                    subtree: true, 
                    attributes: true,
                    attributeFilter: ["loading", "fetchpriority", "src", "srcset", "decoding", "style"]
                })
            }

            // Strategies A & B strictly require src
            let link: HTMLLinkElement | null = null
            let img: HTMLImageElement | null = null

            if (src) {
                // --- Strategy A: Head Preload ---
                link = document.createElement("link")
                link.rel = "preload"
                link.as = "image"
                link.href = src
                link.setAttribute("crossorigin", "anonymous")
                link.setAttribute("fetchpriority", "high")
                if (srcset) {
                    link.setAttribute("imagesrcset", srcset)
                    link.setAttribute("imagesizes", finalSizes)
                }
                document.head.appendChild(link)

                // --- Strategy B: JS Image Priming ---
                img = new Image()
                img.crossOrigin = "anonymous"
                // @ts-ignore
                img.fetchPriority = "high"
                if (srcset) {
                    img.srcset = srcset
                    img.sizes = finalSizes
                }
                img.src = src
            }

            return () => {
                if (link && document.head.contains(link)) document.head.removeChild(link)
                clearTimeout(timer)
                clearTimeout(timer2)
                clearInterval(interval)
                observer.disconnect()
                if (img) {
                    img.onload = null
                    img.onerror = null
                }
            }
        }, [src, srcset, finalSizes])

        return (
            <div ref={containerRef} style={{ display: "contents" }}>
                <Component
                    {...props}
                    loading="eager"
                    // @ts-ignore
                    fetchPriority="high"
                    draggable={false}
                />
                
                {/* --- Strategy C: DOM Tree Priming (Invisible Discovery) --- */}
                {/* This ensures the browser discovers the high-priority resource 
                    even if the main image is buried in a lazy-loading wrapper. */}
                {src && (
                    <img 
                        src={src} 
                        srcSet={srcset}
                        sizes={finalSizes}
                        alt="" 
                        aria-hidden="true" 
                        loading="eager"
                        decoding="sync"
                        crossOrigin="anonymous"
                        // @ts-ignore
                        fetchPriority="high"
                        style={{
                            position: "fixed",
                            width: "4px",
                            height: "4px",
                            opacity: 0.01,
                            pointerEvents: "none",
                            zIndex: -111,
                            left: "-50px",
                            top: "-50px",
                            objectFit: "cover"
                        }}
                    />
                )}
            </div>
        )
    }
}
