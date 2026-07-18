import React, { useRef, useState, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { motion, motionValue, animate, useScroll, useMotionValue, MotionValue, useTransform, stagger as staggerMotion } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

/**
 * 📝 TextCounter
 * 
 * A self-contained Framer Code Component that discovers sibling text nodes
 * and injects an ultra-smooth, zero-jitter numeric counter animation.
 * 
 * Pattern: Injector (Zero-UI, purely behavioral)
 */

// --- UTILS ---
const parseLineHeightToPx = (lHeightStr: string, fontSizeStr: string): number => {
    const fSize = parseFloat(fontSizeStr) || 16
    if (!lHeightStr) return fSize * 1.2
    if (lHeightStr === "normal") return fSize * 1.2
    
    const parsed = parseFloat(lHeightStr)
    if (isNaN(parsed)) return fSize * 1.2
    
    if (lHeightStr.includes("px")) return parsed
    if (lHeightStr.includes("rem")) return parsed * 16
    if (lHeightStr.includes("em")) return parsed * fSize
    if (lHeightStr.includes("%")) return (parsed / 100) * fSize
    
    return parsed * fSize
}

// --- DIGIT COMPONENT ---
const Digit = React.memo(({ mv, power, isEven, lineHeightPx }: { mv: MotionValue<number>, power: number, isEven: boolean, lineHeightPx: number }) => {
    // Create a series for an "infinite" feel by tripling the set
    // For Even: 0, 1, ..., 9. For Odd: 9, 8, ..., 0.
    const singleSet = isEven ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    const digits = [...singleSet, ...singleSet, ...singleSet]
    
    const yTranslate = useTransform(mv, (v) => {
        // Odometer Logic: Each digit track calculates its value as a direct mapping of the total number
        const val = v / Math.pow(10, power)
        let wrapped = val % 10
        if (wrapped < 0) wrapped += 10
        
        // We always use the middle set (indices 10-19) for smooth wrapping.
        // For Even (0..9): index 10 is 0, index 11 is 1... -> offset = -(10 + wrapped)
        // For Odd (9..0): index 19 is 0, index 18 is 1... -> offset = -(10 + (9 - wrapped))
        const offset = isEven ? -(10 + wrapped) : -(10 + (9 - wrapped))
        return `${offset * lineHeightPx}px`
    })

    return (
        <div style={{ height: lineHeightPx, overflow: 'hidden', width: '1ch' }}>
            <motion.div 
                style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    y: yTranslate,
                    willChange: "transform",
                    transformStyle: "preserve-3d",
                    backfaceVisibility: "hidden"
                }}
            >
                {digits.map((num, i) => (
                    <span 
                        key={i} 
                        style={{ 
                            height: lineHeightPx, 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: "1ch"
                        }}
                    >
                        {num}
                    </span>
                ))}
            </motion.div>
        </div>
    )
})
Digit.displayName = 'Digit'

// --- TRACK WRAPPER COMPONENT ---
const TrackWrapper = ({ 
    track, 
    index, 
    countMV, 
    digitMVs, 
    lineHeightPx, 
    reelGap, 
    padTo, 
    paddingLength 
}: { 
    track: any, 
    index: number, 
    countMV: MotionValue<number>, 
    digitMVs: Record<string, MotionValue<number>>, 
    lineHeightPx: number, 
    reelGap: number, 
    padTo: number, 
    paddingLength: number 
}) => {
    const targetMV = (track.isDigit && digitMVs[track.key]) ? digitMVs[track.key] : countMV
    
    const checkVisible = (v: number) => {
        const power = track.isDigit ? track.power : track.associatedPower
        if (power === null || power < 0) return true
        
        const intVal = Math.floor(Math.abs(v))
        const numDigits = intVal === 0 ? 1 : Math.floor(Math.log10(intVal)) + 1
        const requiredPadding = Math.max(numDigits, padTo, paddingLength)
        
        return power < requiredPadding
    }

    const [visible, setVisible] = useState(() => checkVisible(targetMV.get()))

    useEffect(() => {
        const unsub = targetMV.on("change", (v) => {
            const nextVisible = checkVisible(v)
            if (nextVisible !== visible) {
                setVisible(nextVisible)
            }
        })
        return () => unsub()
    }, [targetMV, visible, padTo, paddingLength])

    const targetWidth = track.isDigit ? "1ch" : (track.char === "," ? "0.3ch" : "0.5ch")
    const leftGap = index > 0 ? reelGap : 0

    const style: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.8)",
        width: visible ? targetWidth : "0ch",
        marginLeft: visible ? `${leftGap}px` : "0px",
        overflow: "hidden",
        whiteSpace: "nowrap",
        height: lineHeightPx,
        transition: "width 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "transform, opacity",
    }

    return (
        <span style={style}>
            {track.isDigit ? (
                <Digit 
                    mv={digitMVs[track.key]} 
                    power={track.power!} 
                    isEven={track.isEven!} 
                    lineHeightPx={lineHeightPx} 
                />
            ) : (
                track.char
            )}
        </span>
    )
}

export default function TextCounter(props: any) {
    const {
        trigger = "mount",
        countTarget = 100,
        stagger = 0.05,
        staggerDirection = "first",
        reelGap = 0,
        color = "",
        decimalSeparator = ".",
        thousandsSeparator = ",",
        transition = { type: "spring", stiffness: 260, damping: 30 },
        scrollsectionref,
        scrollOffsetStart = "start end",
        scrollOffsetEnd = "end start",
        padTo = 0,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [target, setTarget] = useState<HTMLElement | null>(null)
    const [rawText, setRawText] = useState("")
    const [paddingLength, setPaddingLength] = useState(0)
    const [decimalCount, setDecimalCount] = useState(0)
    
    // Counter State
    const [tracks, setTracks] = useState<{ key: string, char: string, isDigit: boolean, power?: number, isEven?: boolean, associatedPower?: number | null }[]>([])
    const digitMVs = useRef<Record<string, MotionValue<number>>>({})
    const countMV = useMotionValue(0)

    const found = !!target

    // --- UTILS ---
    const getTracks = (valueStr: string) => {
        const chars = valueStr.split('')
        const decimalIdx = chars.indexOf(decimalSeparator)
        const refIdx = decimalIdx === -1 ? chars.length : decimalIdx
        
        const powers: (number | null)[] = new Array(chars.length).fill(null)
        
        // Count power of 10 for each digit
        let p = 0
        for (let i = refIdx - 1; i >= 0; i--) {
            if (!isNaN(parseInt(chars[i], 10))) {
                powers[i] = p
                p++
            }
        }
        
        p = -1
        for (let i = refIdx + 1; i < chars.length; i++) {
            if (!isNaN(parseInt(chars[i], 10))) {
                powers[i] = p
                p--
            }
        }

        return chars.map((char, idx) => {
            const isDigit = powers[idx] !== null
            const power = powers[idx] ?? 0
            const isEven = isDigit ? Math.abs(power) % 2 === 0 : false
            const key = isDigit ? `digit-${power}` : `char-${idx}`
            
            // Find associated power for non-digits
            let associatedPower = null
            if (!isDigit) {
                for (let i = idx - 1; i >= 0; i--) {
                    if (powers[i] !== null) {
                        associatedPower = powers[i]
                        break
                    }
                }
            }
            
            return { key, char, isDigit, power, isEven, associatedPower }
        })
    }

    const formatValue = (val: number) => {
        let [intPart, decPart] = val.toFixed(decimalCount).split('.')
        const intDigitsOnly = intPart.replace(/[^0-9]/g, '')
        const targetPadding = Math.max(paddingLength, padTo)
        if (targetPadding > intDigitsOnly.length) {
            intPart = intPart.padStart(targetPadding, '0')
        }
        if (thousandsSeparator) {
            intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)
        }
        if (decimalCount > 0) {
            return `${intPart}${decimalSeparator}${decPart}`
        }
        return intPart
    }

    // Resolve target value
    const getResolvedTarget = () => {
        let targetValue = countTarget
        if (countTarget === 0 && rawText) {
            const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const cleanRegex = new RegExp(`[^0-9${escapeRegExp(decimalSeparator)}]`, 'g');
            const cleanedText = rawText.replace(cleanRegex, "").replace(decimalSeparator, ".");
            const parsed = parseFloat(cleanedText)
            if (!isNaN(parsed)) targetValue = parsed
        }
        return targetValue
    }

    // Update static track representation based on resolved targets or property changes
    useEffect(() => {
        if (!rawText) return
        const resolved = getResolvedTarget()
        const refVal = Math.max(Math.abs(resolved), Math.abs(countMV.get()), 1)
        const refStr = formatValue(refVal)
        const newTracks = getTracks(refStr)
        setTracks(newTracks)
    }, [rawText, countTarget, decimalCount, paddingLength, padTo, thousandsSeparator, decimalSeparator])

    // Ensure motion values exist for all tracks
    tracks.forEach((track) => {
        if (track.isDigit && !digitMVs.current[track.key]) {
            digitMVs.current[track.key] = motionValue(countMV.get())
        }
    })

    // High performance synchronization of digitMVs on central countMV change (for scroll triggers)
    useEffect(() => {
        const handleSync = (val: number) => {
            tracks.forEach((t) => {
                if (t.isDigit) {
                    const mv = digitMVs.current[t.key]
                    if (mv) {
                        mv.set(val)
                    }
                }
            })
        }
        if (trigger === "scroll") {
            const unsub = countMV.on("change", handleSync)
            return () => unsub()
        }
    }, [tracks, trigger])

    // Helper to run individual digit track staggered animations
    const updateDigitAnimations = (currentTracks: typeof tracks, targetValue: number, isStaggered = false) => {
        const staggerDelay = staggerMotion(stagger, { from: staggerDirection })
        
        currentTracks.forEach((t, i) => {
            if (t.isDigit) {
                const mv = digitMVs.current[t.key]
                if (!mv) return
                
                if (!isStaggered) {
                    mv.set(targetValue)
                } else {
                    animate(mv, targetValue, {
                        ...transition,
                        delay: staggerDelay(i, currentTracks.length)
                    })
                }
            }
        })
    }

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

                const [intPart, decPart] = text.split(decimalSeparator)
                const intDigits = intPart ? (intPart.match(/\d/g)?.length || 0) : 0
                const decDigits = decPart ? (decPart.match(/\d/g)?.length || 0) : 0
                
                setPaddingLength(intDigits)
                setDecimalCount(decDigits)
                
                const computed = window.getComputedStyle(foundP)
                
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
                    // Create a regex to keep only digits and the decimal separator
                    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const cleanRegex = new RegExp(`[^0-9${escapeRegExp(decimalSeparator)}]`, 'g');
                    const cleanedText = text.replace(cleanRegex, "").replace(decimalSeparator, ".");
                    const parsedValue = parseFloat(cleanedText)
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

    const [extractedStyles, setExtractedStyles] = useState<any>({
        fontSize: "16px",
        lineHeight: "20px",
        textAlign: "left",
    })

    const lineHeightPx = parseLineHeightToPx(extractedStyles.lineHeight, extractedStyles.fontSize)

    // Trigger animation to targetValue
    useEffect(() => {
        if (trigger !== "scroll") {
            const targetValue = getResolvedTarget()
            
            // Sync the central countMV
            animate(countMV, targetValue, transition)
            
            // Stagger the individual digit tracks
            updateDigitAnimations(tracks, targetValue, true)
        }
    }, [trigger, countTarget, rawText, transition, decimalSeparator, tracks])


    // --- TRIGGER ORCHESTRATION ---
    const targetRef = (scrollsectionref && scrollsectionref.current) ? scrollsectionref : containerRef
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: [scrollOffsetStart as any, scrollOffsetEnd as any]
    })

    useEffect(() => {
        if (!found || trigger !== "scroll") return
        
        const targetValue = getResolvedTarget()

        const unsub = scrollYProgress.on("change", (latest) => {
            countMV.set(latest * targetValue)
        })
        return () => unsub()
    }, [trigger, found, countTarget, transition, scrollYProgress, rawText, countMV, decimalCount, paddingLength, padTo, thousandsSeparator, decimalSeparator])

    const commonTextStyle: React.CSSProperties = {
        fontSize: extractedStyles.fontSize || 'inherit',
        fontWeight: extractedStyles.fontWeight || 'inherit',
        lineHeight: `${lineHeightPx}px`,
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
                        <div style={{ display: "flex", fontVariantNumeric: 'tabular-nums', height: `${lineHeightPx}px`, alignItems: "center" }}>
                            {tracks.map((track, i) => (
                                <TrackWrapper
                                    key={track.key}
                                    track={track}
                                    index={i}
                                    countMV={countMV}
                                    digitMVs={digitMVs.current}
                                    lineHeightPx={lineHeightPx}
                                    reelGap={reelGap}
                                    padTo={padTo}
                                    paddingLength={paddingLength}
                                />
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
        step: 0.01,
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
    thousandsSeparator: {
        type: ControlType.String,
        title: "Thousands Sep",
        defaultValue: ",",
    },
    padTo: {
        type: ControlType.Number,
        title: "Padding (padTo)",
        min: 0,
        max: 20,
        step: 1,
        defaultValue: 0,
        description: "Force a specific number of digits (e.g. 4 makes 10 into 0010)",
    },
    decimalSeparator: {
        type: ControlType.String,
        title: "Decimal Sep",
        defaultValue: ".",
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
