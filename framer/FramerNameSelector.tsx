import { addPropertyControls, ControlType } from "framer"
import { useEffect } from "react"

export default function Target({ dataFramerName = "0" }) {
    useEffect(() => {
        const elements = document.querySelectorAll<HTMLElement>(
            `[data-framer-name="${CSS.escape(dataFramerName)}"]`
        )

        elements.forEach((element) => {
            element.style.opacity = "0.5"
        })
    }, [dataFramerName])

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

addPropertyControls(Target, {
    dataFramerName: {
        type: ControlType.String,
        title: "Framer Name",
        defaultValue: "0",
    },
})