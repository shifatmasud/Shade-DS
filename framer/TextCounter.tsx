import React, { useRef, useState, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { motion, motionValue, animate, MotionValue, useTransform, wrap } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

/**
 * 📝 TextCounter
 * 
 * A self-contained Framer Code Component that discovers sibling text nodes
 * and injects a high-performance numeric counter animation.
 * 
 * Pattern: Injector (Zero-UI, purely behavioral)
 */

interface Track {
    key: string
    char: string
    isDigit: boolean
    digitIndex?: number // 0-based index among digits only
    posFromRight?: number // position from right among digits
    domIndex: number // index in original DOM text
}

// --- DIGIT COMPONENT ---
const DIGIT_HEIGHT = '1em'
const Digit = React.memo(({ mv, posFromRight, evenRollDirection, oddRollDirection }: { mv: MotionValue<number>, posFromRight: number, evenRollDirection: "up" | "down", oddRollDirection: "up" | "down" }) => {
    const isEven = posFromRight % 2 === 0
    const direction = isEven ? evenRollDirection : oddRollDirection
    
    // Create 3 sets of 0-9 to allow seamless infinite loops using wrap
    const singleSet = direction === "up" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    const digits = [...singleSet, ...singleSet, ...singleSet]
    
    const wrappedVal = useTransform(mv, (v) => wrap(0, 10, v))
    const yTranslate = useTransform(wrappedVal, (w) => {
        const offset = direction === "up" ? 10 + w : 19 + w
        return `${-offset}em`
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
        countTarget = "00100",
        stagger = 0.05,
        staggerDirection = "first",
        reelGap = 0,
        color = "",
        transition = { type: "spring", stiffness: 260, damping: 30 },
        evenRollDirection = "up",
        oddRollDirection = "down",
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [target, setTarget] = useState<HTMLElement | null>(null)
    const [charStyles, setCharStyles] = useState<any[]>([])
    const [tracks, setTracks] = useState<Track[]>([])
    const [extractedStyles, setExtractedStyles] = useState<any>({})
    
    // Digit MotionValues mapping (key: digitIndex)
    const digitMVs = useRef<Record<number, MotionValue<number>>>({})
    const prevTargetRef = useRef<string | null>(null)
    const currentStepsRef = useRef<Record<number, number>>({})

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

                // Extract individual character-by-character styles from the DOM tree of foundP
                const stylesArray: any[] = []
                const walk = (node: Node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const textContent = node.textContent || ""
                        if (textContent.length === 0) return
                        const parentEl = node.parentElement || foundP
                        const comp = window.getComputedStyle(parentEl)
                        for (let charIdx = 0; charIdx < textContent.length; charIdx++) {
                            stylesArray.push({
                                color: color || comp.color,
                                fontSize: comp.getPropertyValue("--framer-font-size") || comp.fontSize,
                                fontWeight: comp.fontWeight,
                                fontStyle: comp.fontStyle,
                                textDecoration: comp.textDecoration,
                                letterSpacing: comp.getPropertyValue("--framer-letter-spacing") || comp.letterSpacing,
                                fontFamily: comp.getPropertyValue("--framer-font-family") || comp.fontFamily,
                                textTransform: comp.textTransform,
                            })
                        }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        node.childNodes.forEach(walk)
                    }
                }
                Array.from(foundP.childNodes).forEach(walk)
                setCharStyles(stylesArray)

                // Build Track layout mapping digits vs static symbols
                const trackList: Track[] = []
                const totalDigits = (text.match(/\d/g) || []).length
                let currentDigitIdx = 0

                for (let i = 0; i < text.length; i++) {
                    const char = text[i]
                    const isDigit = /\d/.test(char)
                    if (isDigit) {
                        const posFromRight = totalDigits - 1 - currentDigitIdx
                        trackList.push({
                            key: `digit-${currentDigitIdx}`,
                            char,
                            isDigit: true,
                            digitIndex: currentDigitIdx,
                            posFromRight,
                            domIndex: i
                        })
                        if (!digitMVs.current[currentDigitIdx]) {
                            digitMVs.current[currentDigitIdx] = motionValue(0)
                        }
                        currentDigitIdx++
                    } else {
                        trackList.push({
                            key: `static-${i}`,
                            char,
                            isDigit: false,
                            domIndex: i
                        })
                    }
                }
                setTracks(trackList)

                // Mask original text node instead of container
                foundP.style.opacity = "0"
                foundP.style.pointerEvents = "none"
                
                if (!observer) {
                    observer = new MutationObserver(() => {
                        const newText = foundP?.innerText || foundP?.textContent || ""
                        if (newText) {
                            discover()
                        }
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
    }, [target, color])

    // Compute Target Digits array matching DOM digit count
    const digitTracks = tracks.filter(t => t.isDigit)
    const totalDigitsInDom = digitTracks.length

    const targetInput = String(countTarget ?? "00100")
    const inputDigits = targetInput.replace(/[^0-9]/g, "").split("")

    let targetDigits: number[] = []
    if (totalDigitsInDom > 0) {
        if (inputDigits.length < totalDigitsInDom) {
            const padCount = totalDigitsInDom - inputDigits.length
            const padded = [...Array(padCount).fill("0"), ...inputDigits]
            targetDigits = padded.map(d => parseInt(d, 10))
        } else {
            targetDigits = inputDigits.slice(inputDigits.length - totalDigitsInDom).map(d => parseInt(d, 10))
        }
    }

    // Update Animations on countTarget change (Slot machine reel spin)
    useEffect(() => {
        if (!found || totalDigitsInDom === 0) return

        const isInitial = prevTargetRef.current === null

        digitTracks.forEach((t) => {
            const dIndex = t.digitIndex!
            const targetDigit = targetDigits[dIndex] ?? 0
            const mv = digitMVs.current[dIndex]
            if (!mv) return

            const isEven = (t.posFromRight ?? 0) % 2 === 0
            const direction = isEven ? evenRollDirection : oddRollDirection

            if (isInitial) {
                const targetSteps = direction === "up" 
                    ? targetDigit 
                    : ((10 - targetDigit) % 10)
                mv.set(targetSteps)
                currentStepsRef.current[dIndex] = targetSteps
            } else {
                const prevSteps = currentStepsRef.current[dIndex] ?? targetDigits[dIndex] ?? 0
                
                let candidate = 0
                if (direction === "up") {
                    candidate = prevSteps + ((targetDigit - (prevSteps % 10)) + 10) % 10
                } else {
                    const targetMod = (10 - targetDigit) % 10
                    candidate = prevSteps + ((targetMod - (prevSteps % 10)) + 10) % 10
                }

                const minLoops = 1
                const targetSteps = candidate + 10 * minLoops

                currentStepsRef.current[dIndex] = targetSteps

                const delay = (() => {
                    if (staggerDirection === "first") return dIndex * stagger
                    if (staggerDirection === "last") return (totalDigitsInDom - 1 - dIndex) * stagger
                    if (staggerDirection === "center") {
                        const mid = (totalDigitsInDom - 1) / 2
                        return Math.abs(dIndex - mid) * stagger
                    }
                    return 0
                })()

                animate(mv, targetSteps, {
                    ...transition,
                    delay: delay,
                })
            }
        })

        prevTargetRef.current = countTarget
    }, [found, countTarget, stagger, staggerDirection, transition, totalDigitsInDom, evenRollDirection, oddRollDirection])

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
                            {tracks.map((track, i) => {
                                const charStyle = charStyles[track.domIndex] || extractedStyles

                                return (
                                    <span 
                                        key={track.key} 
                                        style={{ 
                                            display: 'inline-flex', 
                                            marginLeft: i > 0 ? `${reelGap}px` : 0,
                                            fontSize: charStyle?.fontSize || 'inherit',
                                            fontWeight: charStyle?.fontWeight || 'inherit',
                                            color: charStyle?.color || 'inherit',
                                            fontFamily: charStyle?.fontFamily || 'inherit',
                                            letterSpacing: charStyle?.letterSpacing || 'inherit',
                                            textTransform: charStyle?.textTransform || 'none',
                                            fontStyle: charStyle?.fontStyle || 'normal',
                                            textDecoration: charStyle?.textDecoration || 'none',
                                        }}
                                    >
                                        {track.isDigit && track.digitIndex !== undefined ? (
                                            <Digit 
                                                mv={digitMVs.current[track.digitIndex] || motionValue(0)} 
                                                posFromRight={track.posFromRight ?? 0} 
                                                evenRollDirection={evenRollDirection}
                                                oddRollDirection={oddRollDirection}
                                            />
                                        ) : (
                                            <span style={{ height: DIGIT_HEIGHT, display: 'inline-flex', alignItems: 'center' }}>
                                                {track.char}
                                            </span>
                                        )}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                </div>,
                target.parentElement
            )}
        </div>
    )
}

addPropertyControls(TextCounter, {
    countTarget: {
        type: ControlType.String,
        title: "Count To",
        defaultValue: "00100",
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
    evenRollDirection: {
        type: ControlType.Enum,
        title: "Even Roll",
        options: ["up", "down"],
        optionTitles: ["Up", "Down"],
        defaultValue: "up",
    },
    oddRollDirection: {
        type: ControlType.Enum,
        title: "Odd Roll",
        options: ["up", "down"],
        optionTitles: ["Up", "Down"],
        defaultValue: "down",
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
})


