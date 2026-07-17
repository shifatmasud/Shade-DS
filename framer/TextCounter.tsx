import React, { useRef, useState, useEffect, useLayoutEffect } from "react"
import { motion, motionValue, animate, useScroll, useMotionValue, MotionValue, useTransform } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

/**
 * 📝 TextCounter
 * 
 * A self-contained Framer Code Component that discovers sibling text nodes
 * and injects a high-performance numeric counter animation.
 * 
 * Pattern: Injector (Zero-UI, purely behavioral)
 */

// --- DIGIT COMPONENT ---
const DIGIT_HEIGHT = '1em'
const Digit = React.memo(({ mv }: { mv: MotionValue<number> }) => {
    const yTranslate = useTransform(mv, (v) => `${v}em`)
    return (
        <div style={{ height: DIGIT_HEIGHT, overflow: 'hidden' }}>
            <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', y: yTranslate }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                    <span key={i} style={{ height: DIGIT_HEIGHT, display: 'block' }}>{i}</span>
                ))}
            </motion.div>
        </div>
    )
})
Digit.displayName = 'Digit'

export default function TextCounter(props: any) {
    const {
        trigger = "mount",
        countTarget = 100,
        stagger = 0.05,
        color = "",
        transition = { type: "spring", stiffness: 100, damping: 30 },
        scrollsectionref,
        scrollOffsetStart = "start end",
        scrollOffsetEnd = "end start",
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [target, setTarget] = useState<HTMLElement | null>(null)
    const [rawText, setRawText] = useState("")
    
    // Counter State
    const [tracks, setTracks] = useState<{ key: string, char: string, isDigit: boolean }[]>([])
    const digitMVs = useRef<Record<string, MotionValue<number>>>({})
    const targetValues = useRef<Record<string, number>>({})
    const countMV = useMotionValue(0)

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
                if (type === "RichTextContainer" && !foundContainer) {
                    foundContainer = child as HTMLElement
                    foundP = child.querySelector("p, span, h1, h2, h3, h4, h5, h6, div") as HTMLElement | null
                }
            })

            if (foundP && foundContainer) {
                setTarget(foundP)
                const text = foundP.innerText || foundP.textContent || ""
                setRawText(text)
                
                const computed = window.getComputedStyle(foundP)
                const containerComputed = window.getComputedStyle(foundContainer)
                
                const fSize = foundP.style.getPropertyValue("--framer-font-size") || computed.fontSize
                const rawLHeight = foundP.style.getPropertyValue("--framer-line-height") || computed.lineHeight
                const tAlign = foundP.style.getPropertyValue("--framer-text-alignment") || computed.textAlign

                let lHeight = rawLHeight
                if (!isNaN(parseFloat(rawLHeight)) && !rawLHeight.includes("px") && !rawLHeight.includes("%")) {
                    lHeight = `${parseFloat(rawLHeight) * parseFloat(fSize)}px`
                }

                setExtractedStyles({
                    fontSize: fSize,
                    lineHeight: lHeight,
                    textAlign: tAlign as any,
                    fontWeight: computed.fontWeight,
                    letterSpacing: computed.letterSpacing,
                    fontFamily: computed.fontFamily,
                    color: color || computed.color,
                    textTransform: computed.textTransform,
                    fontStyle: computed.fontStyle,
                    textDecoration: computed.textDecoration,
                    direction: computed.direction,
                    whiteSpace: computed.whiteSpace,
                })

                foundContainer.style.opacity = "0"
                foundContainer.style.pointerEvents = "none"
                
                if (!observer) {
                    observer = new MutationObserver(() => {
                        const newText = foundP?.innerText || foundP?.textContent || ""
                        setRawText(newText)
                    })
                    observer.observe(foundP, { characterData: true, childList: true, subtree: true })
                }

                if (countTarget === 0) {
                    const parsedValue = parseFloat(text.replace(/[^0-9.]/g, ""))
                    if (!isNaN(parsedValue)) {
                        countMV.set(0) 
                    }
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
            if (target && target.parentElement) {
                target.parentElement.style.opacity = ""
                target.parentElement.style.pointerEvents = ""
            }
        }
    }, [target, color, countTarget, trigger])

    const [extractedStyles, setExtractedStyles] = useState<any>({})

    // --- COUNTER LOGIC ---
    const tracksRef = useRef(tracks)
    useEffect(() => {
        if (!rawText) return

        const getTracks = (valueStr: string) => {
            const chars = valueStr.split('')
            return chars.map((char, idx) => {
                const isDigit = !isNaN(parseInt(char, 10))
                const posFromRight = chars.length - 1 - idx
                const key = isDigit ? `digit-${posFromRight}` : `char-${idx}`
                return { key, char, isDigit }
            })
        }

        const formatValue = (val: number) => {
            const rounded = Math.floor(val)
            return rounded.toLocaleString()
        }

        const updateDigitAnimations = (currentTracks: typeof tracks) => {
            currentTracks.forEach((t, i) => {
                if (t.isDigit) {
                    const num = parseInt(t.char, 10)
                    const mv = digitMVs.current[t.key]
                    const targetValue = -num
                    if (mv && targetValues.current[t.key] !== targetValue) {
                        targetValues.current[t.key] = targetValue
                        animate(mv, targetValue, {
                            ...transition,
                            delay: (currentTracks.length - 1 - i) * stagger
                        })
                    }
                }
            })
        }

        const handleValueChange = (val: number) => {
            const valStr = formatValue(val)
            const newTracks = getTracks(valStr)
            
            newTracks.forEach(t => {
                if (t.isDigit && !digitMVs.current[t.key]) {
                    digitMVs.current[t.key] = motionValue(0)
                    targetValues.current[t.key] = 0
                }
            })

            const hasStructureChanged = 
                newTracks.length !== tracksRef.current.length ||
                newTracks.some((t, idx) => t.key !== tracksRef.current[idx]?.key)

            if (hasStructureChanged) {
                tracksRef.current = newTracks
                setTracks(newTracks)
            } else {
                updateDigitAnimations(newTracks)
            }
        }

        const unsub = countMV.on("change", handleValueChange)
        handleValueChange(countMV.get())
        return () => unsub()
    }, [rawText, transition, countMV, stagger])

    useLayoutEffect(() => {
        tracks.forEach((t, i) => {
            if (t.isDigit) {
                const num = parseInt(t.char, 10)
                const mv = digitMVs.current[t.key]
                const targetValue = -num
                if (mv) {
                    targetValues.current[t.key] = targetValue
                    animate(mv, targetValue, transition)
                }
            }
        })
    }, [tracks])

    // --- TRIGGER ORCHESTRATION ---
    const targetRef = (scrollsectionref && scrollsectionref.current) ? scrollsectionref : containerRef
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: [scrollOffsetStart as any, scrollOffsetEnd as any]
    })

    useEffect(() => {
        if (!found) return
        
        let targetValue = countTarget
        if (countTarget === 0 && rawText) {
            const parsed = parseFloat(rawText.replace(/[^0-9.]/g, ""))
            if (!isNaN(parsed)) targetValue = parsed
        }

        if (trigger === "mount" || trigger === "prop") {
            animate(countMV, targetValue, transition)
        } else if (trigger === "scroll") {
            const unsub = scrollYProgress.on("change", (latest) => {
                countMV.set(latest * targetValue)
            })
            return () => unsub()
        }
    }, [trigger, found, countTarget, transition, scrollYProgress, rawText, countMV])

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
                borderRadius: "inherit",
                overflow: "hidden",
                zIndex: 0,
            }}
        >
            {found && (
                <div style={commonTextStyle}>
                    <div style={{ display: "flex", gap: "0.02em", fontVariantNumeric: 'tabular-nums' }}>
                        {tracks.map((track) => (
                            track.isDigit ? <Digit key={track.key} mv={digitMVs.current[track.key]} /> : <span key={track.key}>{track.char}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

addPropertyControls(TextCounter, {
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["mount", "scroll", "prop"],
        optionTitles: ["On Mount", "Scroll Linked", "From Prop"],
        defaultValue: "mount",
    },
    countTarget: {
        type: ControlType.Number,
        title: "Count To",
        defaultValue: 100,
    },
    stagger: {
        type: ControlType.Number,
        title: "Stagger",
        min: 0,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.05,
    },
    color: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: { type: "spring", stiffness: 100, damping: 30 },
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
