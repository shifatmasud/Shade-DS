import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef, useState, startTransition } from "react"

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 40
 * @framerIntrinsicHeight 40
 */
export default function Styler(props) {
    const {
        targetMode,
        targetId,
        manualId,
        classNameId,
        domLevel,
        blur,
        backgroundColor,
        enabled,
        showDebug,
    } = props

    const stylerRef = useRef<HTMLDivElement>(null)
    const [debugInfo, setDebugInfo] = useState<string>("Waiting...")
    const originalStylesMap = useRef<Map<HTMLElement, any>>(new Map())
    const targetElementsRef = useRef<HTMLElement[]>([])

    useEffect(() => {
        if (!enabled) {
            startTransition(() => setDebugInfo("Disabled"))
            return
        }

        // Helper to calculate DOM depth
        const getDepth = (el: HTMLElement | null) => {
            let depth = 0
            let curr = el
            while (curr && curr.parentElement) {
                depth++
                curr = curr.parentElement
            }
            return depth
        }

        // Discovery Logic: Manual ID takes precedence, then Picker
        const effectiveId = manualId || (typeof targetId === "string" ? targetId : targetId?.section || targetId?.id)
        
        const applyStylesToElement = (el: HTMLElement) => {
            if (!el || !el.style) return

            // Save original styles once per element
            if (!originalStylesMap.current.has(el)) {
                originalStylesMap.current.set(el, {
                    filter: el.style.filter,
                    backgroundColor: el.style.backgroundColor,
                    transition: el.style.transition,
                })
            }

            // Apply Values
            el.style.filter = blur > 0 ? `blur(${blur}px)` : "none"
            el.style.backgroundColor = backgroundColor
        }

        const restoreElement = (el: HTMLElement) => {
            const styles = originalStylesMap.current.get(el)
            if (el && styles) {
                Object.assign(el.style, styles)
                originalStylesMap.current.delete(el)
            }
        }

        const restoreAllStyles = () => {
            originalStylesMap.current.forEach((styles, el) => {
                if (el && styles) {
                    Object.assign(el.style, styles)
                }
            })
            originalStylesMap.current.clear()
            targetElementsRef.current = []
        }

        let searchInterval: number | null = null

        const findElements = () => {
            let candidates: HTMLElement[] = []
            let isLevelsMode = targetMode === "Levels"
            let isClassesMode = targetMode === "Classes"

            if (isLevelsMode) {
                // DOM Levels mode always starts from self
                if (stylerRef.current) {
                    candidates.push(stylerRef.current)
                }
            } else if (isClassesMode) {
                // Classes mode: Use CSS selector targeting
                if (classNameId && typeof classNameId === "string") {
                    const selector = classNameId.startsWith(".") ? classNameId : `.${classNameId}`
                    try {
                        candidates = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
                    } catch (e) {}
                }
            } else {
                // Reference mode: Try pattern matching for manual ID or Picked ID
                if (effectiveId && typeof effectiveId === "string") {
                    // Exact matches
                    const exactIds = Array.from(document.querySelectorAll(`[id="${effectiveId}"], [data-framer-section-id="${effectiveId}"], [data-framer-name="${effectiveId}"]`)) as HTMLElement[]
                    candidates.push(...exactIds)

                    // Pattern matches (Stem/Prefix/Suffix targeting)
                    const selectors = [
                        `[id^="${effectiveId}"]`, // Prefix
                        `[id$="${effectiveId}"]`, // Suffix
                        `[id*="-${effectiveId}"]`, // Targeted Stem
                        `[id*="${effectiveId}-"]`, // Targeted Stem
                        `[data-framer-name^="${effectiveId}"]`,
                        `[data-framer-name$="${effectiveId}"]`,
                        `[data-framer-name*="${effectiveId}"]`,
                    ]
                    
                    try {
                        const patternIds = Array.from(document.querySelectorAll(selectors.join(","))) as HTMLElement[]
                        candidates.push(...patternIds)
                    } catch (e) {
                        // Fallback
                    }
                }

                // Try Ref Current if available (from Picker)
                if (candidates.length === 0 && targetId?.current) {
                    candidates.push(targetId.current)
                }
            }

            // Apply DOM Level traversal ONLY if in Levels mode
            const targetedElements = candidates.map(el => {
                let current = el
                if (isLevelsMode) {
                    for (let i = 0; i < domLevel; i++) {
                        if (current.parentElement) {
                            current = current.parentElement
                        } else {
                            break
                        }
                    }
                }
                return current
            }).filter((el, index, self) => el instanceof HTMLElement && self.indexOf(el) === index)

            // Dynamic Undo: Restore elements that are no longer targeted
            const prevElements = targetElementsRef.current
            const removed = prevElements.filter(el => !targetedElements.includes(el))
            removed.forEach(restoreElement)

            if (targetedElements.length > 0) {
                if (searchInterval) clearInterval(searchInterval)
                
                targetedElements.forEach(applyStylesToElement)
                targetElementsRef.current = targetedElements

                startTransition(() => {
                    const first = targetedElements[0]
                    const stylerDepth = getDepth(stylerRef.current)
                    const targetDepth = getDepth(first)
                    const relativeDepth = targetDepth - stylerDepth

                    const idLabel = isLevelsMode ? "Self" : (isClassesMode ? (classNameId || "Class") : (effectiveId || "Target"))
                    const info = [
                        targetedElements.length > 1 ? `[${targetedElements.length}]` : (first.id || idLabel),
                        `LV:${relativeDepth}`,
                        first.className ? `.${first.className.split(" ").filter(Boolean).slice(0, 2).join(".")}` : ""
                    ].filter(Boolean).join(" | ")
                    setDebugInfo(info)
                })
            } else {
                startTransition(() => {
                    setDebugInfo(isLevelsMode ? "Injecting..." : `No targets found for "${isClassesMode ? classNameId : effectiveId || "..."}"`)
                })
            }
        }

        findElements()
        // Aggressive search for Framer Canvas hydration
        searchInterval = window.setInterval(findElements, 1000)

        return () => {
            if (searchInterval) clearInterval(searchInterval)
            restoreAllStyles()
        }
    }, [
        enabled,
        targetMode,
        targetId,
        manualId,
        classNameId,
        domLevel,
        blur,
        backgroundColor,
        showDebug,
    ])

    return (
        <div
            ref={stylerRef}
            style={{
                width: "100%",
                height: "100%",
                display: RenderTarget.current() === RenderTarget.canvas || showDebug ? "flex" : "none",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 153, 255, 0.05)",
                border: "1px dashed rgba(0, 153, 255, 0.4)",
                borderRadius: 8,
                overflow: "hidden",
                fontSize: 9,
                color: "#09f",
                fontFamily: "monospace",
                textAlign: "center",
                padding: 4,
                pointerEvents: "none",
            }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: 4 }}
            >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            {showDebug && (
                <div style={{ wordBreak: "break-all", background: "rgba(255, 255, 255, 0.9)", padding: "1px 3px", borderRadius: 3, border: "1px solid rgba(0, 153, 255, 0.2)" }}>
                    {debugInfo}
                </div>
            )}
        </div>
    )
}

Styler.defaultProps = {
    enabled: true,
    showDebug: true,
    targetMode: "Reference",
    manualId: "",
    classNameId: "",
    targetId: "",
    domLevel: 0,
    blur: 0,
    backgroundColor: "purple",
}

addPropertyControls(Styler, {
    enabled: {
        type: ControlType.Boolean,
        title: "Enabled",
        defaultValue: true,
    },
    showDebug: {
        type: ControlType.Boolean,
        title: "Debug Info",
        defaultValue: true,
    },
    targetMode: {
        type: ControlType.Enum,
        title: "Target Mode",
        options: ["Reference", "Classes", "Levels"],
        optionTitles: ["Reference", "Classes", "DOM Levels"],
        defaultValue: "Reference",
    },
    manualId: {
        type: ControlType.String,
        title: "Manual ID",
        placeholder: "Type Layer ID...",
        defaultValue: "",
        hidden: (props) => props.targetMode !== "Reference",
    },
    targetId: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Scroll Section Picker",
        hidden: (props) => props.targetMode !== "Reference",
    },
    classNameId: {
        type: ControlType.String,
        title: "CSS Classes",
        placeholder: ".my-class, .btn",
        defaultValue: "",
        hidden: (props) => props.targetMode !== "Classes",
    },
    domLevel: {
        type: ControlType.Number,
        title: "DOM Level",
        min: 0,
        max: 10,
        step: 1,
        defaultValue: 0,
        displayStepper: true,
        hidden: (props) => props.targetMode !== "Levels",
    },
    blur: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 20,
        defaultValue: 0,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "purple",
    },
})
