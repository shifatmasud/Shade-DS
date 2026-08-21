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

    const scale = useTransform(progress, [0, 0.5, 1], [0, 1, 0])

    const x = useTransform(progress, () => {
        const p = progress.get()

        if (p <= 0.5) return 0

        const s = 2 * (1 - p)

        return width.current * (1 - s)
    })

    const y = useTransform(progress, () => {
        const p = progress.get()

        if (p <= 0.5) return 0

        const s = 2 * (1 - p)

        return -height.current * (1 - s)
    })

    useEffect(() => {
        if (!dataFramerName) return

        const selector = `[data-framer-name="${CSS.escape(dataFramerName)}"]`

        const wrappers = new WeakMap<Element, HTMLElement>()

        const setup = () => {
            document.querySelectorAll(selector).forEach((target) => {
                if (wrappers.has(target)) return

                const parent = target.parentNode
                if (!parent) return

                const wrapper = document.createElement("div")

                wrapper.dataset.scrollScaleWrapper = "true"
                wrapper.style.position = "relative"
                wrapper.style.width = "100%"
                wrapper.style.height = "100%"

                // Permanent pivot.
                wrapper.style.transformOrigin = "0% 100%"
                wrapper.style.willChange = "transform"

                parent.insertBefore(wrapper, target)
                wrapper.appendChild(target)

                wrappers.set(target, wrapper)

                const resizeObserver = new ResizeObserver(([entry]) => {
                    width.current = entry.contentRect.width
                    height.current = entry.contentRect.height
                })

                resizeObserver.observe(target)

                const rect = target.getBoundingClientRect()

                width.current = rect.width
                height.current = rect.height
                ;(
                    wrapper as HTMLElement & {
                        __resizeObserver?: ResizeObserver
                    }
                ).__resizeObserver = resizeObserver
            })
        }

        setup()

        const unsubscribeScale = scale.on("change", update)

        const unsubscribeX = x.on("change", update)

        const unsubscribeY = y.on("change", update)

        function update() {
            document.querySelectorAll(selector).forEach((target) => {
                const wrapper = wrappers.get(target)

                if (!wrapper) return

                wrapper.style.transform = `translate3d(${x.get()}px, ${y.get()}px, 0) scale(${scale.get()})`
            })
        }

        update()

        return () => {
            unsubscribeScale()
            unsubscribeX()
            unsubscribeY()

            document
                .querySelectorAll('[data-scroll-scale-wrapper="true"]')
                .forEach((wrapper) => {
                    const observer = (
                        wrapper as HTMLElement & {
                            __resizeObserver?: ResizeObserver
                        }
                    ).__resizeObserver

                    observer?.disconnect()

                    const target = wrapper.firstElementChild

                    const parent = wrapper.parentNode

                    if (target && parent) {
                        parent.insertBefore(target, wrapper)
                        wrapper.remove()
                    }
                })
        }
    }, [dataFramerName, scale, x, y])

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
      //@ts-ignore
        type: ControlType.ScrollSectionRef,
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
