import React, { useRef, useState, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
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
const Digit = React.memo(({ mv, posFromRight }: { mv: MotionValue<number>, posFromRight: number }) => {
    const isEven = posFromRight % 2 === 0
    // Create a series for an "infinite" feel by tripling the set
    // For Even: 0, 1, ..., 9. For Odd: 9, 8, ..., 0.
    const singleSet = isEven ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    const digits = [...singleSet, ...singleSet, ...singleSet]
    
    const yTranslate = useTransform(mv, (v) => {
        // v is the accumulated integer target.
        // We wrap to 0-9 to find the offset within a single set.
        let val = v % 10
        if (val < 0) val += 10
        
        // We always use the middle set (indices 10-19) for smooth wrapping.
        // For Even (0..9): index 10 is 0, index 11 is 1... -> offset = -(10 + val)
        // For Odd (9..0): index 19 is 0, index 18 is 1... -> offset = -(10 + (9 - val))
        const offset = isEven ? -(10 + val) : -(10 + (9 - val))
        return `${offset}em`
    })

    return (
        <div style={{ height: DIGIT_HEIGHT, overflow: 'hidden' }}>
            <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', y: yTranslate }}>
                {digits.map((num, i) => (
                    <span key={i} style={{ height: DIGIT_HEIGHT, display: 'block' }}>{num}</span>
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
        staggerDirection = "first",
        reelGap = 0,
        color = "",
        transition = { type: "spring", stiffness: 260, damping: 30 },
        scrollsectionref,
        scrollOffsetStart = "start end",
        scrollOffsetEnd = "end start",
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [target, setTarget] = useState<HTMLElement | null>(null)
    const [rawText, setRawText] = useState("")
    const [paddingLength, setPaddingLength] = useState(0)
    const [decimalCount, setDecimalCount] = useState(0)
    
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

                const [intPart, decPart] = text.split('.')
                const intDigits = intPart ? (intPart.match(/\d/g)?.length || 0) : 0
                const decDigits = decPart ? (decPart.match(/\d/g)?.length || 0) : 0
                
                setPaddingLength(intDigits)
                setDecimalCount(decDigits)
                
                const computed = window.getComputedStyle(foundP)
                const containerComputed = window.getComputedStyle(foundContainer)
                
                const fSize = foundP.style.getPropertyValue("--framer-font-size") || computed.fontSize
                const rawLHeight = foundP.style.getPropertyValue("--framer-line-height") || computed.lineHeight
                const tAlign = foundP.style.getPropertyValue("--framer-text-alignment") || computed.textAlign
                const fFamily = foundP.style.getPropertyValue("--framer-font-family") || computed.fontFamily
                const lSpacing = foundP.style.getPropertyValue("--framer-letter-spacing") || computed.letterSpacing

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
            if (target) {
                target.style.opacity = ""
                target.style.pointerEvents = ""
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
            const valStr = val.toLocaleString(undefined, {
                minimumFractionDigits: decimalCount,
                maximumFractionDigits: decimalCount,
            })
            
            const [intPart, decPart] = valStr.split('.')
            // Remove commas for padding check
            const intDigitsOnly = intPart.replace(/[^0-9]/g, '')
            
            if (paddingLength > intDigitsOnly.length && !intPart.includes(',')) {
                const paddedInt = intPart.padStart(paddingLength, '0')
                return decPart !== undefined ? `${paddedInt}.${decPart}` : paddedInt
            }
            
            return valStr
        }

        const updateDigitAnimations = (currentTracks: typeof tracks) => {
            currentTracks.forEach((t, i) => {
                if (t.isDigit) {
                    const num = parseInt(t.char, 10)
                    const mv = digitMVs.current[t.key]
                    if (!mv) return

                    const currentTarget = targetValues.current[t.key] || 0
                    const currentTargetDigit = ((Math.round(currentTarget) % 10) + 10) % 10
                    
                    if (num !== currentTargetDigit) {
                        let diff = num - currentTargetDigit
                        // 🔄 Infinite Scroll Logic: Shortest path wrapping
                        if (diff > 5) diff -= 10
                        if (diff < -5) diff += 10
                        
                        const nextTarget = currentTarget + diff
                        targetValues.current[t.key] = nextTarget
                        
                        const delay = (() => {
                            if (staggerDirection === "first") return i * stagger
                            if (staggerDirection === "last") return (currentTracks.length - 1 - i) * stagger
                            if (staggerDirection === "center") {
                                const mid = (currentTracks.length - 1) / 2
                                return Math.abs(i - mid) * stagger
                            }
                            return 0
                        })()

                        animate(mv, nextTarget, {
                            ...transition,
                            delay: delay
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
    }, [rawText, transition, countMV, stagger, staggerDirection, paddingLength, decimalCount])

    useLayoutEffect(() => {
        tracks.forEach((t, i) => {
            if (t.isDigit) {
                const num = parseInt(t.char, 10)
                const mv = digitMVs.current[t.key]
                if (mv) {
                    const currentTarget = targetValues.current[t.key] || 0
                    const currentTargetDigit = ((Math.round(currentTarget) % 10) + 10) % 10
                    
                    if (num !== currentTargetDigit) {
                        let diff = num - currentTargetDigit
                        if (diff > 5) diff -= 10
                        if (diff < -5) diff += 10
                        const nextTarget = currentTarget + diff
                        
                        targetValues.current[t.key] = nextTarget
                        animate(mv, nextTarget, transition)
                    }
                }
            }
        })
    }, [tracks, transition])

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
        wordSpacing: extractedStyles.wordSpacing || 'inherit',
        fontVariantNumeric: extractedStyles.fontVariantNumeric || 'tabular-nums',
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
                        <div style={{ display: "flex", fontVariantNumeric: 'tabular-nums' }}>
                            {tracks.map((track, i) => (
                                <span 
                                    key={track.key} 
                                    style={{ 
                                        display: 'inline-flex', 
                                        marginLeft: i > 0 ? `${reelGap}px` : 0 
                                    }}
                                >
                                    {track.isDigit ? <Digit mv={digitMVs.current[track.key]} posFromRight={parseInt(track.key.split('-')[1], 10)} /> : track.char}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>,
                target.parentElement
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
    staggerDirection: {
        type: ControlType.Enum,
        title: "Stagger Dir",
        options: ["first", "last", "center"],
        optionTitles: ["Left to Right", "Right to Left", "Center Out"],
        defaultValue: "first",
    },
    reelGap: {
        type: ControlType.Number,
        title: "Reel Gap",
        min: -100,
        max: 100,
        step: 1,
        defaultValue: 0,
    },
    color: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: { type: "spring", stiffness: 260, damping: 30 },
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
