import React, { useRef, useState, useEffect, useLayoutEffect } from "react"
import { motion, motionValue, animate, useScroll, useMotionValue, MotionValue, useTransform, useInView } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

/**
 * 📝 ParasiticTextCounter
 * 
 * An advanced Framer Code Component that replaces adjacent or sibling text nodes
 * in-place, adopting their exact layout, typography, margin, and positioning,
 * and rendering a high-performance character-by-character counter reel.
 * 
 * Architecture: Parasitic Layout-Replacing Engine (No portals, no absolute coord syncing)
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
        let val = v % 10
        if (val < 0) val += 10
        
        // We use the middle set (indices 10-19) for smooth wrapping.
        const offset = isEven ? -(10 + val) : -(10 + (9 - val))
        return `${offset}em`
    })

    return (
        <div style={{ height: DIGIT_HEIGHT, overflow: 'hidden' }} id={`digit-container-${posFromRight}`}>
            <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', y: yTranslate }}>
                {digits.map((num, i) => (
                    <span key={i} style={{ height: DIGIT_HEIGHT, display: 'block' }}>{num}</span>
                ))}
            </motion.div>
        </div>
    )
})
Digit.displayName = 'Digit'

// --- HELPER: ROBUST TEXT TARGET DISCOVERY ---
function findTextTarget(selfElement: HTMLElement): { target: HTMLElement; container: HTMLElement } | null {
    let sharedParent = selfElement.parentElement
    // Crawl upwards to find a parent that has other children (i.e. not just wrapping our component)
    while (sharedParent && sharedParent.children.length <= 1 && sharedParent.tagName !== "BODY") {
        sharedParent = sharedParent.parentElement
    }
    if (!sharedParent) return null

    // 1. Search for data-framer-component-type="RichTextContainer" first
    for (const child of Array.from(sharedParent.children)) {
        const element = child as HTMLElement
        if (element === selfElement || element.contains(selfElement)) continue
        
        const type = element.getAttribute("data-framer-component-type")
        if (type === "RichTextContainer") {
            const p = element.querySelector("p, span, h1, h2, h3, h4, h5, h6, div") as HTMLElement | null
            if (p) return { target: p, container: element }
        }
    }
    
    // 2. Search for raw text elements as direct siblings
    for (const child of Array.from(sharedParent.children)) {
        const element = child as HTMLElement
        if (element === selfElement || element.contains(selfElement)) continue
        
        const tagName = element.tagName.toLowerCase()
        if (["p", "span", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
            return { target: element, container: element }
        }
    }

    // 3. Deep search inside direct siblings for any text content container
    for (const child of Array.from(sharedParent.children)) {
        const element = child as HTMLElement
        if (element === selfElement || element.contains(selfElement)) continue
        
        const textElement = element.querySelector("p, span, h1, h2, h3, h4, h5, h6") as HTMLElement | null
        if (textElement) {
            return { target: textElement, container: element }
        }
    }
    
    return null
}

export default function ParasiticTextCounter(props: any) {
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

    const replacementRef = useRef<HTMLDivElement>(null)
    const [target, setTarget] = useState<HTMLElement | null>(null)
    const [rawText, setRawText] = useState("")
    const [paddingLength, setPaddingLength] = useState(0)
    const [decimalCount, setDecimalCount] = useState(0)
    const [extractedStyles, setExtractedStyles] = useState<React.CSSProperties>({})
    
    // Track State & Motion Values
    const [tracks, setTracks] = useState<{ key: string, char: string, isDigit: boolean }[]>([])
    const digitMVs = useRef<Record<string, MotionValue<number>>>({})
    const targetValues = useRef<Record<string, number>>({})
    const countMV = useMotionValue(0)

    const found = !!target

    // References for DOM position backup & restoration
    const hasReparented = useRef(false)
    const originalParentRef = useRef<HTMLElement | null>(null)
    const originalNextSiblingRef = useRef<ChildNode | null>(null)
    const originalTargetDisplay = useRef<string>("")

    // 🕵️ DOM Replacement & Sibling Discovery Lifecycle
    useLayoutEffect(() => {
        const selfEl = replacementRef.current
        if (!selfEl) return

        // Back up original React mount positions
        originalParentRef.current = selfEl.parentElement
        originalNextSiblingRef.current = selfEl.nextSibling

        let observer: MutationObserver | null = null

        const discoverAndReplace = () => {
            const foundNode = findTextTarget(selfEl)
            if (foundNode) {
                const { target: textTarget } = foundNode
                setTarget(textTarget)

                const initialText = textTarget.innerText || textTarget.textContent || ""
                setRawText(initialText)

                // Track decimal length and integer padding from original text
                const [intPart, decPart] = initialText.split('.')
                const intDigits = intPart ? (intPart.match(/\d/g)?.length || 0) : 0
                const decDigits = decPart ? (decPart.match(/\d/g)?.length || 0) : 0
                
                setPaddingLength(intDigits)
                setDecimalCount(decDigits)

                // Read computed styles from original text target
                const computed = window.getComputedStyle(textTarget)
                
                const fSize = textTarget.style.getPropertyValue("--framer-font-size") || computed.fontSize
                const rawLHeight = textTarget.style.getPropertyValue("--framer-line-height") || computed.lineHeight
                const tAlign = textTarget.style.getPropertyValue("--framer-text-alignment") || computed.textAlign
                const fFamily = textTarget.style.getPropertyValue("--framer-font-family") || computed.fontFamily
                const lSpacing = textTarget.style.getPropertyValue("--framer-letter-spacing") || computed.letterSpacing

                let lHeight = rawLHeight
                if (!isNaN(parseFloat(rawLHeight)) && !rawLHeight.includes("px") && !rawLHeight.includes("%")) {
                    lHeight = `${parseFloat(rawLHeight) * parseFloat(fSize)}px`
                }

                // Compile exact style matching dictionary
                setExtractedStyles({
                    // Typography
                    fontSize: fSize,
                    fontWeight: computed.fontWeight,
                    lineHeight: lHeight,
                    letterSpacing: lSpacing,
                    textAlign: tAlign as any,
                    fontFamily: fFamily,
                    color: color || computed.color,
                    textTransform: computed.textTransform as any,
                    fontStyle: computed.fontStyle,
                    textDecoration: computed.textDecoration,
                    direction: computed.direction as any,
                    whiteSpace: "nowrap",
                    wordSpacing: computed.wordSpacing,
                    fontVariantNumeric: "tabular-nums",
                    fontStretch: computed.fontStretch,

                    // Margin / Padding adoption
                    marginTop: computed.marginTop,
                    marginRight: computed.marginRight,
                    marginBottom: computed.marginBottom,
                    marginLeft: computed.marginLeft,
                    paddingTop: computed.paddingTop,
                    paddingRight: computed.paddingRight,
                    paddingBottom: computed.paddingBottom,
                    paddingLeft: computed.paddingLeft,

                    // Exact dimension & scaling adoption
                    width: computed.width || "auto",
                    height: computed.height || "auto",
                    flexGrow: computed.flexGrow,
                    flexShrink: computed.flexShrink,
                    alignSelf: computed.alignSelf,
                    verticalAlign: computed.verticalAlign,
                })

                // Imperatively replace target element in-flow
                if (textTarget.parentElement && !hasReparented.current) {
                    originalTargetDisplay.current = textTarget.style.display
                    textTarget.style.display = "none"
                    
                    // Insert replacement component directly before target text in layout tree
                    textTarget.parentElement.insertBefore(selfEl, textTarget)
                    hasReparented.current = true
                }

                // Track live updates to the target's original text (e.g. from Framer content controls)
                if (!observer) {
                    observer = new MutationObserver(() => {
                        const updatedText = textTarget.innerText || textTarget.textContent || ""
                        setRawText(updatedText)
                    })
                    observer.observe(textTarget, { characterData: true, childList: true, subtree: true })
                }

                return true
            }
            return false
        }

        // Run immediately or fallback to periodic polling to catch lazy elements
        if (!discoverAndReplace()) {
            const timer = setInterval(() => {
                if (discoverAndReplace()) clearInterval(timer)
            }, 300)
            return () => {
                clearInterval(timer)
                if (observer) observer.disconnect()
            }
        }

        return () => {
            if (observer) observer.disconnect()
            
            // Clean restore on unmount to satisfy Framer viewport / React reconcile logic
            if (target) {
                target.style.display = originalTargetDisplay.current
            }

            if (hasReparented.current && originalParentRef.current && selfEl) {
                if (originalNextSiblingRef.current) {
                    originalParentRef.current.insertBefore(selfEl, originalNextSiblingRef.current)
                } else {
                    originalParentRef.current.appendChild(selfEl)
                }
                hasReparented.current = false
            }
        }
    }, [target, color, trigger])

    // --- CHARACTER TRACK PROCESSING & FORMATTING ---
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
                        // Infinite Roll wrap logic (shortest angular distance)
                        if (diff > 5) diff -= 10
                        if (diff < -5) diff += 10
                        
                        const nextTarget = currentTarget + diff
                        targetValues.current[t.key] = nextTarget
                        
                        // stagger direction mapping
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

    // Update digits initially on track changes
    useLayoutEffect(() => {
        tracks.forEach((t) => {
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
    const targetRef = (scrollsectionref && scrollsectionref.current) ? scrollsectionref : replacementRef
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: [scrollOffsetStart as any, scrollOffsetEnd as any]
    })

    // Setup Viewport Intersection
    const isInView = useInView(replacementRef, { once: true, margin: "-10%" })

    useEffect(() => {
        if (!found) return
        
        let targetValue = countTarget
        if (countTarget === 0 && rawText) {
            const parsed = parseFloat(rawText.replace(/[^0-9.]/g, ""))
            if (!isNaN(parsed)) targetValue = parsed
        }

        if (trigger === "mount" || trigger === "prop") {
            animate(countMV, targetValue, transition)
        } else if (trigger === "in-view") {
            if (isInView) {
                animate(countMV, targetValue, transition)
            }
        } else if (trigger === "scroll") {
            const unsub = scrollYProgress.on("change", (latest) => {
                countMV.set(latest * targetValue)
            })
            return () => unsub()
        }
    }, [trigger, found, countTarget, transition, scrollYProgress, rawText, countMV, isInView])

    // Combine adopting styles with inline structural alignment
    const commonTextStyle: React.CSSProperties = {
        ...extractedStyles,
        display: found ? (extractedStyles.display || "inline-flex") : "none",
        alignItems: "center",
        justifyContent: extractedStyles.textAlign === "center" ? "center" : extractedStyles.textAlign === "right" ? "flex-end" : "flex-start",
    }

    return (
        <div
            ref={replacementRef}
            style={found ? commonTextStyle : { display: "none" }}
            id="parasitic-text-counter"
        >
            <div style={{ display: "inline-flex", fontVariantNumeric: 'tabular-nums' }}>
                {tracks.map((track, i) => (
                    <span 
                        key={track.key} 
                        style={{ 
                            display: 'inline-flex', 
                            marginLeft: i > 0 ? `${reelGap}px` : 0 
                        }}
                    >
                        {track.isDigit ? (
                            <Digit mv={digitMVs.current[track.key]} posFromRight={parseInt(track.key.split('-')[1], 10)} />
                        ) : (
                            track.char
                        )}
                    </span>
                ))}
            </div>
        </div>
    )
}

addPropertyControls(ParasiticTextCounter, {
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["mount", "in-view", "scroll", "prop"],
        optionTitles: ["On Mount", "Once In View", "Scroll Linked", "From Prop"],
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
