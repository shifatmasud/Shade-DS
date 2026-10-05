import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef } from "react"

type MatchType = "exact" | "prefix" | "suffix"

type Props = {
    names?: string
    match?: MatchType
    opacity?: number
    dataFramerName?: string
}

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 */
export default function Target({
    names = "",
    match = "exact",
    opacity = 0.5,
    dataFramerName,
}: Props) {
    const appliedElementsRef = useRef<Set<HTMLElement>>(new Set())

    useEffect(() => {
        const rawNames = names || dataFramerName || ""
        const targetNames = rawNames
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)

        const appliedElements = appliedElementsRef.current
        appliedElements.clear()

        if (!targetNames.length) {
            return () => {
                appliedElements.forEach((el) => {
                    el.style.removeProperty("opacity")
                })
                appliedElements.clear()
            }
        }

        const matches = (element: Element) => {
            const name = element.getAttribute("data-framer-name")
            if (!name) return false

            return targetNames.some((target) => {
                switch (match) {
                    case "prefix":
                        return name.startsWith(target)

                    case "suffix":
                        return name.endsWith(target)

                    case "exact":
                    default:
                        return name === target
                }
            })
        }

        const apply = (root: Node) => {
            if (!(root instanceof Element)) return

            const elements: Element[] = []

            if (matches(root)) {
                elements.push(root)
            }

            elements.push(
                ...Array.from(
                    root.querySelectorAll("[data-framer-name]")
                ).filter(matches)
            )

            elements.forEach((element) => {
                const htmlElement = element as HTMLElement
                htmlElement.style.opacity = String(opacity)
                appliedElements.add(htmlElement)
            })
        }

        // Initial pass
        apply(document.body)

        // Keep Framer's dynamically created DOM in sync
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach(apply)

                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "data-framer-name" &&
                    mutation.target instanceof Element
                ) {
                    apply(mutation.target)
                }
            })
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-framer-name"],
        })

        return () => {
            observer.disconnect()
            appliedElements.forEach((el) => {
                el.style.removeProperty("opacity")
            })
            appliedElements.clear()
        }
    }, [names, match, opacity, dataFramerName])

    return (
        <div
            style={{
                width: 1,
                height: 1,
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
            }}
        />
    )
}

Target.displayName = "Framer Name Selector"

addPropertyControls(Target, {
    names: {
        type: ControlType.String,
        title: "Names",
        placeholder: "Hero, Card, Button",
        description: "Comma-separated data-framer-name values",
    },

    match: {
        type: ControlType.Enum,
        title: "Match",
        options: ["exact", "prefix", "suffix"],
        optionTitles: ["Exact", "Prefix", "Suffix"],
        defaultValue: "exact",
        displaySegmentedControl: true,
    },

    opacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
    },
})