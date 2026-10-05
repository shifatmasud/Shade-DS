import React, { useRef, useState, useEffect, useLayoutEffect } from "react"
import { animate, useScroll, useMotionValueEvent, type AnimationPlaybackControls } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
// @ts-ignore
import { gsap } from "https://esm.sh/gsap"
// @ts-ignore
import { useGSAP } from "https://esm.sh/@gsap/react?external=react"
// @ts-ignore
import { SplitText } from "https://esm.sh/gsap/SplitText"

// Register GSAP SplitText plugin on client side
if (typeof window !== "undefined") {
    gsap.registerPlugin(SplitText)
}

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 160
 * @framerSupportedLayoutWidth "any"
 * @framerSupportedLayoutHeight "auto"
 */

export interface TextMaskSlideProps {
    trigger?: "fromProp" | "scroll" | "onScroll"
    animeType?: "slideUp" | "slideLeft" | "slideRight" | "slideDown"
    animeState?: "start" | "end"
    splitMode?: "lines" | "words" | "chars"
    transition?: any
    stagger?: number
    fade?: boolean
    blur?: number
    scrollsectionref?: any
    scrollOffsetStart?: string
    scrollOffsetEnd?: string
    style?: React.CSSProperties
    mask?: boolean
    animateOnLoad?: boolean
}

/**
 * Helper to find the sibling text element
 */
function findSiblingTextElement(refEl: HTMLElement | null): HTMLElement | null {
    if (!refEl || typeof window === "undefined") return null

    // 1. Robust parent-traversal search (from TextCounter.tsx)
    let sharedParent = refEl.parentElement
    while (sharedParent && sharedParent.children.length <= 1 && sharedParent.tagName !== "BODY") {
        sharedParent = sharedParent.parentElement
    }
    if (sharedParent) {
        let foundContainer: HTMLElement | null = null
        let foundP: HTMLElement | null = null

        Array.from(sharedParent.children).forEach((child) => {
            if (child === refEl || child.contains(refEl)) return
            const type = child.getAttribute("data-framer-component-type")
            const hasTextChild = child.querySelector("p, span, h1, h2, h3, h4, h5, h6")
            if ((type === "RichTextContainer" || hasTextChild) && !foundContainer) {
                foundContainer = child as HTMLElement
                foundP = (child.querySelector("p, span, h1, h2, h3, h4, h5, h6, div") as HTMLElement | null) || (child as HTMLElement)
            }
        })
        if (foundContainer) return foundContainer
        if (foundP) return foundP
    }

    // 2. Direct sibling fallback
    const directParent = refEl.parentElement
    if (!directParent) return null

    const children = Array.from(directParent.children) as HTMLElement[]
    const selfIndex = children.indexOf(refEl)
    if (selfIndex === -1) return null

    const candidates = [
        children[selfIndex - 1],
        children[selfIndex + 1],
        ...children.filter((_, idx) => Math.abs(idx - selfIndex) > 1),
    ].filter(Boolean)

    for (const candidate of candidates) {
        if (
            candidate.tagName.match(/^(P|SPAN|H[1-6]|DIV)$/) ||
            candidate.getAttribute("data-framer-component-type") === "RichTextContainer" ||
            candidate.querySelector("p, span, h1, h2, h3, h4, h5, h6")
        ) {
            return candidate
        }
    }

    return null
}

/**
 * Compute starting, resting, and ending coordinates based on animation type and zone
 */
function getCoordinates(
    zone: "entering" | "stationary" | "exiting",
    type: "slideUp" | "slideLeft" | "slideRight" | "slideDown",
    fade: boolean,
    blur: number
) {
    let x = "0%"
    let y = "0%"
    let opacity = 1
    let blurVal = "none"

    if (blur <= 0) {
        return { x, y, opacity, blurVal: "none" }
    }

    if (zone === "stationary") {
        return { x, y, opacity, blurVal: "blur(0px)" }
    }

    opacity = fade ? 0 : 1
    blurVal = `blur(${blur}px)`

    switch (type) {
        case "slideUp":
            y = zone === "entering" ? "110%" : "-110%"
            break
        case "slideDown":
            y = zone === "entering" ? "-110%" : "110%"
            break
        case "slideLeft":
            x = zone === "entering" ? "110%" : "-110%"
            break
        case "slideRight":
            x = zone === "entering" ? "-110%" : "110%"
            break
    }

    return { x, y, opacity, blurVal }
}

/**
 * Interpolates coordinates, opacity, and blur values based on 0-1 enter and exit progress.
 */
function interpolateStyle(tEnter: number, tExit: number, animeType: string, fade: boolean, blur: number) {
    let enteringOffset = 110
    let exitingOffset = -110

    if (animeType === "slideDown") {
        enteringOffset = -110
        exitingOffset = 110
    } else if (animeType === "slideLeft") {
        enteringOffset = 110
        exitingOffset = -110
    } else if (animeType === "slideRight") {
        enteringOffset = -110
        exitingOffset = 110
    }

    let xPct = 0
    let yPct = 0

    if (tExit > 0) {
        const offset = exitingOffset * tExit
        if (animeType === "slideLeft" || animeType === "slideRight") {
            xPct = offset
        } else {
            yPct = offset
        }
    } else {
        const offset = enteringOffset * (1 - tEnter)
        if (animeType === "slideLeft" || animeType === "slideRight") {
            xPct = offset
        } else {
            yPct = offset
        }
    }

    let opacity = 1
    if (fade) {
        if (tExit > 0) {
            opacity = 1 - tExit
        } else {
            opacity = tEnter
        }
    }

    let blurPx = 0
    if (blur > 0) {
        if (tExit > 0) {
            blurPx = blur * tExit
        } else {
            blurPx = blur * (1 - tEnter)
        }
    }

    return {
        transform: `translate3d(${xPct}%, ${yPct}%, 0)`,
        opacity: String(opacity),
        filter: blurPx > 0 ? `blur(${blurPx}px)` : "none"
    }
}

export default function TextMaskSlide(props: TextMaskSlideProps) {
    const {
        trigger = "fromProp",
        animeType = "slideUp",
        animeState = "end",
        splitMode = "words",
        transition = {
            type: "spring",
            damping: 26,
            stiffness: 180,
            mass: 0.9,
        },
        stagger = 0.05,
        fade = true,
        blur = 0,
        scrollsectionref,
        scrollOffsetStart = "start end",
        scrollOffsetEnd = "end start",
        style,
        mask = true,
        animateOnLoad = true,
    } = props

    const [isClient, setIsClient] = useState(false)
    const [resizeKey, setResizeKey] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const activeControlsRef = useRef<AnimationPlaybackControls[]>([])
    const splitInstancesRef = useRef<{ child: any; parent: any } | null>(null)
    const lastStateRef = useRef<"entering" | "stationary" | "exiting" | null>(null)
    const initialMountRef = useRef(true)
    const isNewElementsRef = useRef(true)
    const [animationTriggerKey, setAnimationTriggerKey] = useState(0)

    const stopActiveControls = () => {
        activeControlsRef.current.forEach((ctrl) => {
            try {
                ctrl.stop()
            } catch {
                // ignore
            }
        })
        activeControlsRef.current = []
    }

    const isScrollTrigger = trigger === "scroll" || trigger === "onScroll"

    // Safely resolve scroll target element
    const [resolvedScrollTarget, setResolvedScrollTarget] = useState<any>(null)

    useEffect(() => {
        if (!isScrollTrigger) return
        if (!scrollsectionref) {
            setResolvedScrollTarget(null)
            return
        }

        if (typeof scrollsectionref === "string") {
            const el = document.getElementById(scrollsectionref) || document.querySelector(scrollsectionref)
            if (el) {
                setResolvedScrollTarget({ current: el })
                return
            }
        }

        if (scrollsectionref.current) {
            setResolvedScrollTarget(scrollsectionref)
            return
        }

        if (scrollsectionref instanceof HTMLElement) {
            setResolvedScrollTarget({ current: scrollsectionref })
            return
        }

        setResolvedScrollTarget({ current: scrollsectionref })
    }, [scrollsectionref, isScrollTrigger])

    // Scroll progress mapping
    const { scrollYProgress } = useScroll({
        target: resolvedScrollTarget || undefined,
        offset: [scrollOffsetStart, scrollOffsetEnd] as any,
    })

    useEffect(() => {
        setIsClient(true)
    }, [])

    useGSAP(
        () => {
            if (!isClient) return

            const sibling = findSiblingTextElement(containerRef.current)
            if (!sibling) return

            // Revert previous splits
            if (splitInstancesRef.current) {
                splitInstancesRef.current.parent?.revert()
                splitInstancesRef.current.child?.revert()
                sibling.style.overflow = ""
                sibling.querySelectorAll("p").forEach((p) => {
                    ;(p as HTMLElement).style.overflow = ""
                })
            }

            try {
                const childSplit = new SplitText(sibling, {
                    type: splitMode,
                    tag: "div",
                    wordsClass: "split-word-inner",
                    charsClass: "split-char-inner",
                    linesClass: "split-line-inner",
                })

                const parentSplit = new SplitText(childSplit[splitMode], {
                    type: splitMode,
                    tag: "div",
                    wordsClass: "split-word-outer",
                    charsClass: "split-char-outer",
                    linesClass: "split-line-outer",
                })

                splitInstancesRef.current = { child: childSplit, parent: parentSplit }

                const animateTargets = (childSplit[splitMode] || []) as HTMLElement[]
                const parentTargets = (parentSplit[splitMode] || []) as HTMLElement[]

                // Initial Styles
                animateTargets.forEach((el) => {
                    el.style.display = "inline-block"
                    el.style.willChange = "transform, opacity" + (blur > 0 ? ", filter" : "")
                    el.style.backfaceVisibility = "hidden"
                    el.style.webkitBackfaceVisibility = "hidden"
                })

                parentTargets.forEach((el) => {
                    el.style.display = splitMode === "lines" ? "block" : "inline-block"
                    el.style.overflow = mask ? "hidden" : "visible"
                    el.style.verticalAlign = "bottom"
                    el.style.lineHeight = "inherit"
                })

                if (mask) {
                    sibling.style.overflow = "hidden"
                    sibling.querySelectorAll("p").forEach((p) => {
                        ;(p as HTMLElement).style.overflow = "hidden"
                    })
                }

                // Apply initial start styles synchronously before paint
                const tempTargetState = animeState === "start" ? "entering" : "stationary"
                const tempIsImmediate = initialMountRef.current && !animateOnLoad
                const tempStartState = tempIsImmediate
                    ? tempTargetState
                    : (lastStateRef.current || (tempTargetState === "stationary" ? "entering" : "stationary"))
                const initialCoords = getCoordinates(tempStartState, animeType, fade, blur)

                animateTargets.forEach((el) => {
                    el.style.transform = `translate3d(${initialCoords.x}, ${initialCoords.y}, 0)`
                    el.style.opacity = String(initialCoords.opacity)
                    el.style.filter = (tempStartState === "stationary" && blur > 0) ? "none" : initialCoords.blurVal
                })

                isNewElementsRef.current = true
                setAnimationTriggerKey((prev) => prev + 1)
            } catch (e) {
                console.error("SplitText/GSAP Logic failed:", e)
            }
        },
        {
            dependencies: [
                isClient,
                splitMode,
                mask,
                resizeKey,
            ],
            revertOnUpdate: true,
        }
    )

    useEffect(() => {
        if (!isClient) return
        if (!splitInstancesRef.current) return

        const animateTargets = (splitInstancesRef.current.child[splitMode] || []) as HTMLElement[]
        if (animateTargets.length === 0) return

        // Handle Prop-based Animation
        if (!isScrollTrigger) {
            const targetState = animeState === "start" ? "entering" : "stationary"
            const isImmediate = initialMountRef.current && !animateOnLoad

            stopActiveControls()

            const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
            if (prefersReducedMotion) {
                animateTargets.forEach((el) => {
                    el.style.transform = "none"
                    el.style.opacity = "1"
                    el.style.filter = "none"
                })
            } else {
                // Determine the starting point for this transition
                // If we have a last state, we start from there to maintain continuity.
                // Otherwise, we default to the opposite of our target state.
                const startState = isImmediate
                    ? targetState
                    : (lastStateRef.current || (targetState === "stationary" ? "entering" : "stationary"))

                const startCoords = getCoordinates(startState, animeType, fade, blur)
                const targetCoords = getCoordinates(targetState, animeType, fade, blur)

                animateTargets.forEach((el, index) => {
                    const startValues: any = {
                        x: startCoords.x,
                        y: startCoords.y,
                        opacity: startCoords.opacity,
                    }
                    if (blur > 0) {
                        startValues.filter = startState === "stationary" ? "blur(0px)" : startCoords.blurVal
                    }

                    const targetValues: any = {
                        x: targetCoords.x,
                        y: targetCoords.y,
                        opacity: targetCoords.opacity,
                    }
                    if (blur > 0) {
                        targetValues.filter = targetState === "stationary" ? "blur(0px)" : targetCoords.blurVal
                    }

                    if (isNewElementsRef.current) {
                        // Initialize elements with zero-duration animate call to sync Framer Motion internal cache
                        animate(el as any, startValues, { duration: 0 })
                        if (startState === "stationary") {
                            el.style.filter = "none"
                        }
                    }

                    if (isImmediate) {
                        animate(el as any, targetValues, { duration: 0 })
                        if (targetState === "stationary") {
                            el.style.filter = "none"
                        }
                    } else {
                        const isReversed = targetState === "entering"
                        const itemDelay = isReversed
                            ? (animateTargets.length - 1 - index) * stagger
                            : index * stagger

                        // Only animate filter via Framer Motion if blur > 0
                        const animProps: any = { ...targetValues }
                        if (blur > 0) {
                            const fromBlur = startState === "stationary" ? "blur(0px)" : startCoords.blurVal
                            const toBlur = targetState === "stationary" ? "blur(0px)" : targetCoords.blurVal
                            animProps.filter = [fromBlur, toBlur]
                        }

                        const controls = animate(
                            el as any,
                            animProps,
                            {
                                ...transition,
                                delay: itemDelay,
                                onComplete: () => {
                                    if (targetState === "stationary" && blur > 0) {
                                        requestAnimationFrame(() => {
                                            el.style.filter = "none"
                                        })
                                    }
                                }
                            }
                        )
                        activeControlsRef.current.push(controls)
                    }
                })

                isNewElementsRef.current = false
            }
            lastStateRef.current = targetState
        } else {
            // Scroll Mode
            applyScrollScrub(scrollYProgress.get())
        }

        initialMountRef.current = false
    }, [
        isClient,
        animationTriggerKey,
        animeState,
        animeType,
        fade,
        blur,
        stagger,
        transition,
        trigger,
        animateOnLoad,
    ])

    const applyScrollScrub = (latest: number) => {
        const animateTargets = (splitInstancesRef.current?.child[splitMode] || []) as HTMLElement[]
        if (animateTargets.length === 0) return

        const N = animateTargets.length

        // Entering bounds
        const enterStartProgress = 0.0
        const enterEndProgress = 0.4
        // Exiting bounds
        const exitStartProgress = 0.6
        const exitEndProgress = 1.0

        animateTargets.forEach((el, index) => {
            // Incorporate stagger shift
            const itemShift = Math.min(0.2, index * (stagger * 0.5))

            // Enter t
            const itemStart = Math.min(enterEndProgress - 0.05, enterStartProgress + itemShift)
            const itemEnd = enterEndProgress
            let tEnter = 1
            if (latest < itemStart) {
                tEnter = 0
            } else if (latest < itemEnd) {
                tEnter = (latest - itemStart) / (itemEnd - itemStart)
            }

            // Exit t
            const itemExitStart = Math.min(exitEndProgress - 0.05, exitStartProgress + itemShift)
            const itemExitEnd = exitEndProgress
            let tExit = 0
            if (latest > itemExitEnd) {
                tExit = 1
            } else if (latest > itemExitStart) {
                tExit = (latest - itemExitStart) / (itemExitEnd - itemExitStart)
            }

            const styles = interpolateStyle(tEnter, tExit, animeType, fade, blur)
            el.style.transform = styles.transform
            el.style.opacity = styles.opacity
            el.style.filter = styles.filter
        })
    }

    // Trigger Mode: scroll / onScroll -> smooth scrub!
    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        if (!isClient || !isScrollTrigger) return
        applyScrollScrub(latest)
    })

    // Window Resize Recalculation for Line Splitting
    useEffect(() => {
        if (!isClient || splitMode !== "lines") return

        let timer: any
        const handleResize = () => {
            clearTimeout(timer)
            timer = setTimeout(() => {
                setResizeKey((prev) => prev + 1)
            }, 250)
        }

        window.addEventListener("resize", handleResize)
        return () => {
            window.removeEventListener("resize", handleResize)
            clearTimeout(timer)
        }
    }, [splitMode, isClient])

    const isOnCanvas = RenderTarget.current() === RenderTarget.canvas

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                display: isOnCanvas ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 16px",
                borderRadius: 8,
                background: "rgba(136, 80, 255, 0.1)",
                border: "1px dashed rgb(136, 80, 255)",
                color: "rgb(136, 80, 255)",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "default",
            }}
        >
            ⚡ Text Mask Slide: Sibling Mode
        </div>
    )
}

TextMaskSlide.displayName = "Text Mask Slide"

addPropertyControls(TextMaskSlide, {
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["fromProp", "scroll"],
        optionTitles: ["From Prop", "Scroll"],
        defaultValue: "fromProp",
    },
    animeType: {
        type: ControlType.Enum,
        title: "Anime Type",
        options: ["slideUp", "slideLeft", "slideRight", "slideDown"],
        optionTitles: ["Slide Up", "Slide Left", "Slide Right", "Slide Down"],
        defaultValue: "slideUp",
    },
    animeState: {
        type: ControlType.Enum,
        title: "Anime State",
        options: ["start", "end"],
        optionTitles: ["Start (Hidden)", "End (Visible)"],
        defaultValue: "end",
        hidden(props) {
            return props.trigger !== "fromProp"
        },
    },
    splitMode: {
        type: ControlType.Enum,
        title: "Split Mode",
        options: ["words", "lines", "chars"],
        optionTitles: ["Words", "Lines", "Characters"],
        defaultValue: "words",
    },
    scrollsectionref: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Scroll Section",
        hidden(props) {
            return props.trigger !== "scroll"
        },
    },
    scrollOffsetStart: {
        type: ControlType.String,
        title: "Scroll Start",
        defaultValue: "start end",
        hidden(props) {
            return props.trigger !== "scroll"
        },
    },
    scrollOffsetEnd: {
        type: ControlType.String,
        title: "Scroll End",
        defaultValue: "end start",
        hidden(props) {
            return props.trigger !== "scroll"
        },
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: {
            type: "spring",
            damping: 26,
            stiffness: 180,
            mass: 0.9,
        },
    },
    stagger: {
        type: ControlType.Number,
        title: "Stagger",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.05,
    },
    fade: {
        type: ControlType.Boolean,
        title: "Fade",
        defaultValue: true,
    },
    blur: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 0,
    },
    mask: {
        type: ControlType.Boolean,
        title: "Mask",
        defaultValue: true,
    },
    animateOnLoad: {
        type: ControlType.Boolean,
        title: "Animate On Load",
        defaultValue: true,
        hidden(props) {
            return props.trigger !== "fromProp"
        },
    },
})
