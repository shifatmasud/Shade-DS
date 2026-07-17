import * as React from "react"
import { Frame, addPropertyControls, ControlType } from "framer"

type OriginalGridStyles = {
    gridColumnStart: string
    gridColumnEnd: string
    gridRowStart: string
    gridRowEnd: string
}

export function GridLayoutGhost(props) {
    const { columnStart, columnEnd, rowStart, rowEnd, levels } = props

    const ref = React.useRef<HTMLDivElement>(null)
    const originalStylesRef = React.useRef<OriginalGridStyles | null>(null)

    React.useEffect(() => {
        const element = ref.current
        if (!element) return

        // Climb up the DOM tree
        let target: HTMLElement | null = element
        for (let i = 0; i < levels; i++) {
            target = target?.parentElement
            if (!target) break
        }

        if (!target) {
            console.error("GridLayoutGhost: No valid target found.")
            return
        }

        // Save original styles once
        if (originalStylesRef.current === null) {
            originalStylesRef.current = {
                gridColumnStart: target.style.gridColumnStart,
                gridColumnEnd: target.style.gridColumnEnd,
                gridRowStart: target.style.gridRowStart,
                gridRowEnd: target.style.gridRowEnd,
            }
        }

        // Apply grid styles
        if (columnStart) target.style.gridColumnStart = columnStart
        if (columnEnd) target.style.gridColumnEnd = columnEnd
        if (rowStart) target.style.gridRowStart = rowStart
        if (rowEnd) target.style.gridRowEnd = rowEnd

        // 🧹 Restore original styles on cleanup
        return () => {
            if (target && originalStylesRef.current) {
                Object.assign(target.style, originalStylesRef.current)
            }
        }
    }, [columnStart, columnEnd, rowStart, rowEnd, levels])

    return (
        <Frame
            ref={ref}
            name="Grid Layout Ghost"
            background={null}
            size={0}
            style={{ position: "absolute", visibility: "hidden" }}
        />
    )
}

addPropertyControls(GridLayoutGhost, {
    columnStart: {
        type: ControlType.String,
        title: "Column Start",
        placeholder: "e.g. 2",
    },
    columnEnd: {
        type: ControlType.String,
        title: "Column End",
        placeholder: "e.g. span 2",
    },
    rowStart: {
        type: ControlType.String,
        title: "Row Start",
        placeholder: "e.g. 2",
    },
    rowEnd: {
        type: ControlType.String,
        title: "Row End",
        placeholder: "e.g. span 2",
    },
    levels: {
        type: ControlType.Number,
        title: "DOM Levels",
        defaultValue: 2,
        min: 1,
        max: 5,
        step: 1,
    },
})
