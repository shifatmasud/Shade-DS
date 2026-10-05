import { addPropertyControls, ControlType } from "framer"
import { useScroll, useSpring, useTransform } from "framer-motion"
import { useEffect, useRef } from "react"

interface Props {
    dataFramerName: string
    scrollSection: any
    offsetStart: string
    offsetEnd: string
    transition: any
}

export default function ScrollScale(props: Props) {
    const {
        dataFramerName,
        scrollSection,
        offsetStart,
        offsetEnd,
        transition,
    } = props

    const { scrollYProgress } = useScroll({
        target: scrollSection,
        offset: [offsetStart, offsetEnd],
    })

    const progress = useSpring(scrollYProgress, transition)

    const width = useRef(0)
    const height = useRef(0)

    useEffect(() => {
        if (!dataFramerName) return

        const selector = `[data-framer-name="${CSS.escape(dataFramerName)}"]`

        const target = document.querySelector(selector) as HTMLElement | null

        if (!target) return

        /*
         * Fixed pivot.
         *
         * We NEVER change transform-origin.
         */
        target.style.setProperty("transform-origin", "0% 100%", "important")

        const measure = () => {
            width.current = target.offsetWidth
            height.current = target.offsetHeight
        }

        measure()

        const resizeObserver = new ResizeObserver(measure)
        resizeObserver.observe(target)

        /*
         * Keep whatever transform Framer already has.
         */
        const originalTransform = getComputedStyle(target).transform

        const base =
            originalTransform === "none"
                ? new DOMMatrix()
                : new DOMMatrix(originalTransform)

        const update = (rawProgress: number) => {
            const p = Math.max(0, Math.min(1, rawProgress))

            let scale = 0
            let x = 0
            let y = 0

            if (p <= 0.5) {
                /*
                 * HALF 1
                 *
                 * bottom-left pivot
                 *
                 * 0 → 1
                 */
                const t = p / 0.5

                scale = t
            } else {
                /*
                 * HALF 2
                 *
                 * top-right pivot
                 *
                 * 1 → 0
                 */
                const t = (p - 0.5) / 0.5

                /*
                 * t:
                 * 0 → 1
                 *
                 * scale:
                 * 1 → 0
                 */
                scale = 1 - t

                /*
                 * Pivot compensation.
                 *
                 * bottom-left → top-right
                 */
                const amount = t

                x = width.current * amount
                y = -height.current * amount
            }

            /*
             * This matrix is:
             *
             * translate(x, y)
             * scale(scale)
             *
             * with transform-origin fixed at bottom-left.
             */
            const animation = new DOMMatrix().translate(x, y).scale(scale)

            /*
             * Apply the animation in local space.
             */
            const finalMatrix = base.multiply(animation)

            target.style.transform = `matrix3d(${Array.from(
                finalMatrix.toFloat64Array()
            ).join(",")})`
        }

        const unsubscribe = progress.on("change", update)

        update(progress.get())

        return () => {
            unsubscribe()
            resizeObserver.disconnect()

            target.style.transform = ""
            target.style.removeProperty("transform-origin")
        }
    }, [dataFramerName, offsetStart, offsetEnd, transition, progress])

    return <div />
}

ScrollScale.defaultProps = {
    dataFramerName: "",
    scrollSection: undefined,

    offsetStart: "start end",
    offsetEnd: "end start",

    transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 1,
    },
}

addPropertyControls(ScrollScale, {
    dataFramerName: {
        type: ControlType.String,
        title: "Target",
    },

    scrollSection: {
        type: ControlType.ScrollSectionRef as any,
        title: "Scroll Section",
    },

    offsetStart: {
        type: ControlType.String,
        title: "Offset Start",
        defaultValue: "start end",
    },

    offsetEnd: {
        type: ControlType.String,
        title: "Offset End",
        defaultValue: "end start",
    },

    transition: {
        type: ControlType.Transition,
        title: "Transition",
    },
})
