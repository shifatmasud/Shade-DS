//https://framer.com/m/Css-CN9WTK.js@npEmUMA0WRuuTCPiSYpx

import { addPropertyControls, ControlType } from "framer"
import { useEffect } from "react"

type Property = {
    key: string
    value: string
}

type Props = {
    names: string
    match: "exact" | "prefix" | "suffix"
    properties: Property[]
}

/**
 * Targets Framer layers by data-framer-name
 * and continuously applies custom CSS properties.
 */
export default function CSSProperties({
    names = "",
    match = "exact",
    properties = [],
}: Props) {
    useEffect(() => {
        const targetNames = names
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)

        if (!targetNames.length) return

        const cleanProperties = properties.filter(
            ({ key, value }) => key.trim() && value.trim()
        )

        if (!cleanProperties.length) return

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

                cleanProperties.forEach(({ key, value }) => {
                    htmlElement.style.setProperty(key.trim(), value.trim())
                })
            })
        }

        // Initial pass
        apply(document.body)

        // Keep Framer's dynamically-created DOM in sync
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

        return () => observer.disconnect()
    }, [names, match, properties])

    // Framer doesn't reliably like a component returning null.
    return <div style={{ opacity: 0 }} />
}

CSSProperties.displayName = "CSS Properties"

addPropertyControls(CSSProperties, {
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

    properties: {
        type: ControlType.Array,
        title: "CSS Properties",
        control: {
            type: ControlType.Object,
            controls: {
                key: {
                    type: ControlType.String,
                    title: "Key",
                    placeholder: "--my-property",
                },

                value: {
                    type: ControlType.String,
                    title: "Value",
                    placeholder: "20px",
                },
            },
        },
        defaultValue: [
            {
                key: "--custom-property",
                value: "20px",
            },
        ],
    },
})
