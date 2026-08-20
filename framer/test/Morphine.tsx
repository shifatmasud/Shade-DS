import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef } from "react"
import { animateView } from "framer-motion"



addPropertyControls(Morphine, {
    snapshotId: {
        type: ControlType.String,
        title: "SNAPSHOT ID",
        defaultValue: "article-card",
        description: "Shared ID between source card and destination page.",
    },
    targetName: {
        type: ControlType.String,
        title: "Target Div Name",
        defaultValue: "Card",
        description:
            "data-framer-name of the shared div container to capture.",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
    },
})