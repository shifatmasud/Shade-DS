import React, { useRef, useState, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { motion, useScroll, AnimatePresence, motionValue, animate } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

/**
 * 📝 TextShimmer
 * 
 * A self-contained Framer Code Component that discovers sibling text nodes
 * and injects a typewriter reveal with an advanced shimmering glass effect.
 * 
 * Pattern: Injector (Zero-UI, purely behavioral)
 */

export default function TextShimmer(props: any) {
    const {
        trigger = "mount",
        shimmerColor = "#ffffff",
        typingSpeed = 0.05,
        shimmerDelay = 4,
        color = "",
        scrollsectionref,
        scrollOffsetStart = "start end",
        scrollOffsetEnd = "end start",
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [target, setTarget] = useState<HTMLElement | null>(null)
    const [rawText, setRawText] = useState("")
    const [isComplete, setIsComplete] = useState(false)
    const [displayedCount, setDisplayedCount] = useState(0)
    const progressMV = useRef(motionValue(0))

    // Sync motion value to state for rendering
    useEffect(() => {
        const unsub = progressMV.current.on("change", (latest) => {
            const count = Math.floor(latest * rawText.length)
            setDisplayedCount(count)
            if (latest >= 1) setIsComplete(true)
            else setIsComplete(false)
        })
        return () => unsub()
    }, [rawText])

    const found = !!target

    // 🕵️ Discovery & Text Extraction
    useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return

        let observer: MutationObserver | null = null

        const discover = () => {
            let sharedParent = el.parentElement
            while (sharedParent && sharedParent.children.length <= 1 && sharedParent.tagName !== "BODY") {
                sharedParent = sharedParent.parentElement
            }
            if (!sharedParent) return

            let foundContainer: HTMLElement | null = null
            let foundP: HTMLElement | null = null

            Array.from(sharedParent.children).forEach((child) => {
                if (child === el || child.contains(el)) return
                const type = child.getAttribute("data-framer-component-type")
                const hasTextChild = child.querySelector("p, span, h1, h2, h3, h4, h5, h6")
                if ((type === "RichTextContainer" || hasTextChild) && !foundContainer) {
                    foundContainer = child as HTMLElement
                    foundP = (child.querySelector("p, span, h1, h2, h3, h4, h5, h6, div") as HTMLElement | null) || (child as HTMLElement)
                }
            })

            if (foundP && foundContainer) {
                setTarget(foundP)
                const text = foundP.innerText || foundP.textContent || ""
                setRawText(text)
                
                const spanEl = foundP.querySelector("span") as HTMLElement | null
                const computed = spanEl ? window.getComputedStyle(spanEl) : window.getComputedStyle(foundP)
                const pComputed = window.getComputedStyle(foundP)
                const containerComputed = window.getComputedStyle(foundContainer)
                
                const getVar = (name: string) => {
                    return (spanEl ? computed.getPropertyValue(name) : "") || 
                           pComputed.getPropertyValue(name) || 
                           containerComputed.getPropertyValue(name)
                }

                const fSize = getVar("--framer-font-size") || computed.fontSize
                const rawLHeight = getVar("--framer-line-height") || computed.lineHeight
                const tAlign = getVar("--framer-text-alignment") || pComputed.textAlign || computed.textAlign
                const fFamily = getVar("--framer-font-family") || computed.fontFamily
                const lSpacing = getVar("--framer-letter-spacing") || computed.letterSpacing

                let lHeight = rawLHeight
                if (!isNaN(parseFloat(rawLHeight)) && !rawLHeight.includes("px") && !rawLHeight.includes("%")) {
                    lHeight = `${parseFloat(rawLHeight) * parseFloat(fSize)}px`
                }

                setExtractedStyles({
                    fontSize: fSize,
                    lineHeight: lHeight,
                    textAlign: tAlign as any,
                    fontWeight: computed.fontWeight,
                    letterSpacing: lSpacing,
                    fontFamily: fFamily,
                    color: color || computed.color,
                    textTransform: computed.textTransform,
                    fontStyle: computed.fontStyle,
                    textDecoration: computed.textDecoration,
                    direction: computed.direction,
                    whiteSpace: computed.whiteSpace,
                    wordSpacing: computed.wordSpacing,
                    fontVariantNumeric: computed.fontVariantNumeric,
                    fontStretch: computed.fontStretch,
                })

                // 🎭 Mask original text node instead of the container
                foundP.style.opacity = "0"
                foundP.style.pointerEvents = "none"
                
                if (!observer) {
                    observer = new MutationObserver(() => {
                        const newText = foundP?.innerText || foundP?.textContent || ""
                        setRawText(newText)
                    })
                    observer.observe(foundP, { characterData: true, childList: true, subtree: true })
                }
                
                return true
            }
            return false
        }

        if (!discover()) {
            const timer = setInterval(() => {
                if (discover()) clearInterval(timer)
            }, 500)
            return () => {
                clearInterval(timer)
                if (observer) observer.disconnect()
            }
        }

        return () => {
            if (observer) observer.disconnect()
            if (target) {
                target.style.opacity = ""
                target.style.pointerEvents = ""
            }
        }
    }, [target, color, trigger])

    const [extractedStyles, setExtractedStyles] = useState<any>({})

    // --- SHIMMER LOGIC ---
    useEffect(() => {
        if (!found || !rawText) return
        
        setIsComplete(false)
        progressMV.current.set(0)

        if (trigger === "mount" || trigger === "prop") {
            const textLength = rawText.length
            if (textLength === 0) {
                setIsComplete(true)
                return
            }

            animate(progressMV.current, 1, {
                duration: textLength * typingSpeed,
                ease: "linear"
            })
        }
    }, [rawText, trigger, typingSpeed, found])

    // --- TRIGGER ORCHESTRATION ---
    const targetRef = (scrollsectionref && scrollsectionref.current) ? scrollsectionref : containerRef
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: [scrollOffsetStart as any, scrollOffsetEnd as any]
    })

    useEffect(() => {
        if (!found) return
        
        if (trigger === "scroll") {
            const unsub = scrollYProgress.on("change", (latest) => {
                animate(progressMV.current, latest, {
                    type: "spring",
                    stiffness: 100,
                    damping: 30,
                    restDelta: 0.001
                })
            })
            return () => unsub()
        }
    }, [trigger, found, scrollYProgress, rawText])

    const commonTextStyle: React.CSSProperties = {
        fontSize: extractedStyles.fontSize || 'inherit',
        fontWeight: extractedStyles.fontWeight || 'inherit',
        lineHeight: extractedStyles.lineHeight || 'inherit',
        letterSpacing: extractedStyles.letterSpacing || 'inherit',
        textAlign: extractedStyles.textAlign || 'inherit',
        whiteSpace: extractedStyles.whiteSpace || 'nowrap',
        color: extractedStyles.color || "inherit",
        fontFamily: extractedStyles.fontFamily || "inherit",
        textTransform: extractedStyles.textTransform || "none",
        fontStyle: extractedStyles.fontStyle || "normal",
        textDecoration: extractedStyles.textDecoration || "none",
        direction: extractedStyles.direction || 'inherit',
        wordSpacing: extractedStyles.wordSpacing || 'inherit',
        fontVariantNumeric: extractedStyles.fontVariantNumeric || 'inherit',
        fontStretch: extractedStyles.fontStretch || 'inherit',
        display: "flex",
        alignItems: "center",
        justifyContent: extractedStyles.textAlign === "center" ? "center" : extractedStyles.textAlign === "right" ? "flex-end" : "flex-start",
        width: "100%",
        height: "100%",
    }

    return (
        <div
            ref={containerRef}
            style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 0,
                opacity: 0, // Ensure the anchor component itself is invisible
            }}
        >
            {found && target.parentElement && createPortal(
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        borderRadius: "inherit",
                        overflow: "hidden",
                        zIndex: 10, // Ensure overlay is on top of hidden original
                    }}
                >
                    <div style={commonTextStyle}>
                        <div style={{ position: 'relative', width: 'fit-content' }}>
                            <span>
                                {rawText.slice(0, displayedCount)}
                                {!isComplete && (
                                    <motion.span
                                        animate={{ opacity: [1, 0, 1] }}
                                        transition={{ duration: 0.8, repeat: Infinity }}
                                        style={{ display: 'inline-block', width: '2px', height: '1em', background: color || "currentColor", marginLeft: 2, verticalAlign: 'middle' }}
                                    />
                                )}
                            </span>
                            <AnimatePresence>
                                {isComplete && (
                                    <>
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: [0, 0.3, 0], backgroundPosition: ['200% 0%', '-100% 0%'] }}
                                            transition={{ duration: 3, repeat: Infinity, repeatDelay: shimmerDelay }}
                                            style={{
                                                position: 'absolute', inset: 0, pointerEvents: 'none',
                                                backgroundImage: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`,
                                                backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                filter: 'blur(4px)', mixBlendMode: 'screen'
                                            }}
                                        >
                                            {rawText}
                                        </motion.span>
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: [0, 0.8, 0], backgroundPosition: ['200% 0%', '-100% 0%'] }}
                                            transition={{ duration: 3, repeat: Infinity, repeatDelay: shimmerDelay }}
                                            style={{
                                                position: 'absolute', inset: 0, pointerEvents: 'none',
                                                backgroundImage: `linear-gradient(90deg, transparent 30%, #ffffff 50%, transparent 70%)`,
                                                backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                                            }}
                                        >
                                            {rawText}
                                        </motion.span>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>,
                target.parentElement
            )}
        </div>
    )
}

addPropertyControls(TextShimmer, {
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["mount", "scroll", "prop"],
        optionTitles: ["On Mount", "Scroll Linked", "From Prop"],
        defaultValue: "mount",
    },
    shimmerColor: {
        type: ControlType.Color,
        title: "Shimmer",
        defaultValue: "#ffffff",
    },
    typingSpeed: {
        type: ControlType.Number,
        title: "Typing Speed",
        min: 0.01,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.05,
    },
    shimmerDelay: {
        type: ControlType.Number,
        title: "Shimmer Delay",
        min: 0,
        max: 10,
        defaultValue: 4,
    },
    color: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "",
    },
    scrollsectionref: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Scroll Section",
        hidden(props) { return props.trigger !== "scroll" }
    },
    scrollOffsetStart: {
        type: ControlType.String,
        title: "Scroll Start",
        defaultValue: "start end",
        hidden(props) { return props.trigger !== "scroll" }
    },
    scrollOffsetEnd: {
        type: ControlType.String,
        title: "Scroll End",
        defaultValue: "end start",
        hidden(props) { return props.trigger !== "scroll" }
    },
})
