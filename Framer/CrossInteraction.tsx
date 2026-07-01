import { ControlType, addPropertyControls, RenderTarget } from "framer"
import {
    useEffect,
    useRef,
    ReactNode,
    cloneElement,
    useState,
    ReactElement,
    useInsertionEffect,
} from "react"
import { useInView } from "framer-motion"

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //
type Mode = "trigger" | "target"
type Interaction =
    | "mouseEnter"
    | "mouseLeave"
    | "mouseDown"
    | "click"
    | "appear"
type ComponentWidth = "default" | "fill"
type ComponentHeight = "default" | "fill"
type Repeat = "once" | "cycle"
type OffScreen = "play" | "pause"

interface InteractionVariantPair {
    interactionId: string
    repeat: Repeat
    variant: string
}

// Add new interface for variant cycling
interface VariantCycleState {
    [interactionId: string]: {
        currentIndex: number
        variants: string[]
    }
}

interface VariantProps {
    variant: string
    children?: ReactNode
    width?: string | number
    height?: string | number
    style?: { [key: string]: any }
}

interface PropsWithChildren {
    children?: ReactNode
    width?: string | number
    height?: string | number
    style?: { [key: string]: any }
}

interface CrossCompInteractionsProps {
    mode: Mode
    // trigger
    interaction: Interaction
    interactionId: string
    delay: number
    offScreen: OffScreen

    // target
    nativeComponent: ReactNode[]
    componentWidth: ComponentWidth
    componentHeight: ComponentHeight
    interactionVariants: InteractionVariantPair[]
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //
addPropertyControls(CrossCompInteractions, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["trigger", "target"],
        optionTitles: ["Trigger", "Target"],
        defaultValue: "trigger",
        displaySegmentedControl: true,
    },
    //----------------------------- trigger ----------------------------- //
    interactionId: {
        type: ControlType.String,
        title: "ID",
        defaultValue: "interaction-1",
        hidden: (props) => props.mode === "target",
    },
    interaction: {
        type: ControlType.Enum,
        title: "On",
        options: ["mouseEnter", "mouseLeave", "mouseDown", "click", "appear"],
        optionTitles: [
            "Mouse Enter",
            "Mouse Leave",
            "Click Start",
            "Click",
            "Appear",
        ],
        defaultValue: "click",
        hidden: (props) => props.mode === "target",
    },
    offScreen: {
        type: ControlType.Enum,
        title: "Off Screen",
        options: ["play", "pause"],
        optionTitles: ["Play", "Pause"],
        defaultValue: "pause",
        displaySegmentedControl: true,
        hidden: (props) =>
            props.mode === "target" || props.interaction !== "appear",
    },
    delay: {
        type: ControlType.Number,
        title: "Delay",
        defaultValue: 0,
        min: 0,
        max: 10,
        step: 0.1,
        unit: "s",
        displayStepper: true,
        hidden: (props) => props.mode === "target",
    },

    //----------------------------- target ----------------------------- //
    nativeComponent: {
        type: ControlType.ComponentInstance,
        title: "Component",
        hidden: (props) => props.mode === "trigger",
    },
    componentWidth: {
        type: ControlType.Enum,
        title: "Width",
        options: ["default", "fill"],
        optionTitles: ["Default", "Fill"],
        defaultValue: "default",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        hidden: (props) => props.mode === "trigger",
    },
    componentHeight: {
        type: ControlType.Enum,
        title: "Height",
        options: ["default", "fill"],
        optionTitles: ["Default", "Fill"],
        defaultValue: "default",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        hidden: (props) => props.mode === "trigger",
    },

    interactionVariants: {
        type: ControlType.Array,
        title: "Interactions",
        control: {
            type: ControlType.Object,
            controls: {
                interactionId: {
                    type: ControlType.String,
                    title: "ID",
                    defaultValue: "interaction-1",
                },
                repeat: {
                    type: ControlType.Enum,
                    title: "Repeat",
                    options: ["once", "cycle"],
                    optionTitles: ["Once", "Cycle"],
                    defaultValue: "once",
                    displaySegmentedControl: true,
                },
                variant: {
                    type: ControlType.String,
                    title: "Variant",
                    placeholder: "Variant 2",
                    hidden: (props) => props.repeat === "cycle",
                    description:
                        "Exact name of the variant you want to switch to.",
                },
            },
        },
        defaultValue: [{ interactionId: "interaction-1", variant: "" }],
        hidden: (props) => props.mode === "trigger",
    },
})

// ------------------------------------------------------------ //
// DEFAULT PROPS
// ------------------------------------------------------------ //
CrossCompInteractions.defaultProps = {
    mode: "trigger",
    // trigger
    interaction: "click",
    interactionId: "interaction-1",
    offScreen: "pause",
    delay: 0,

    // target
    nativeComponent: null,
    componentWidth: "default",
    componentHeight: "default",
    interactionVariants: [
        { interactionId: "interaction-1", variant: "", repeat: "once" },
    ],
}

// ------------------------------------------------------------ //
// MAIN COMPONENT
// ------------------------------------------------------------ //
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function CrossCompInteractions(
    props: CrossCompInteractionsProps
) {
    const isOnFramerCanvas = RenderTarget.hasRestrictions()
    const containerRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(containerRef, {
        once: false,
        amount: "some",
    })

    const offScreenIsInView = props.offScreen === "pause" ? isInView : true

    // Use custom hooks
    useTrigger({
        mode: props.mode,
        containerRef: containerRef,
        interactionId: props.interactionId,
        variant: "",
        interaction: props.interaction,
        isInView: offScreenIsInView,
        delay: props.delay,
    })

    const clonedContent = useTarget(
        props.mode,
        props.nativeComponent,
        props.interactionVariants,
        props.componentWidth,
        props.componentHeight
    )

    return (
        <div
            id={`${props.interactionId}-${props.mode}`}
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
            }}
        >
            <div
                style={{
                    width:
                        props.componentWidth === "default"
                            ? "fit-content"
                            : "100%",
                    height:
                        props.componentHeight === "default"
                            ? "fit-content"
                            : "100%",
                    display: "flex",
                }}
            >
                {clonedContent}
            </div>
        </div>
    )
}

// ------------------------------------------------------------ //
// CUSTOM HOOKS
// ------------------------------------------------------------ //
interface UseTriggerProps {
    mode: Mode
    containerRef: React.RefObject<HTMLDivElement | null>
    interactionId: string
    variant: string
    interaction: Interaction
    isInView: boolean
    delay: number
}

const useTrigger = (props: UseTriggerProps) => {
    useEffect(() => {
        if (props.mode !== "trigger" || !props.containerRef.current) return

        const subparent = props.containerRef.current.parentElement
        const parent = subparent?.parentElement

        if (!parent) return

        // Handle "appear" interaction separately
        if (props.interaction === "appear") {
            if (props.isInView) {
                setTimeout(() => {
                    InteractionManager.getInstance().trigger(
                        props.interactionId,
                        ""
                    )
                }, props.delay * 1000) // Convert seconds to milliseconds
            }
            return
        }

        // Map Framer interaction types to DOM events
        const eventMap: { [key in Interaction]: string } = {
            mouseEnter: "mouseenter",
            mouseLeave: "mouseleave",
            mouseDown: "mousedown",
            click: "click",
            appear: "none", // We handle this separately
        }

        // Get the corresponding DOM event
        const domEvent = eventMap[props.interaction]

        // Event handler function
        const handleInteraction = () => {
            setTimeout(() => {
                InteractionManager.getInstance().trigger(
                    props.interactionId,
                    ""
                )
            }, props.delay * 1000) // Convert seconds to milliseconds
        }

        // Add event listener only for non-appear interactions
        if (domEvent !== "none") {
            parent.addEventListener(domEvent, handleInteraction)

            // Cleanup function to remove event listener
            return () => {
                parent.removeEventListener(domEvent, handleInteraction)
            }
        }
    }, [
        props.mode,
        props.interactionId,
        props.interaction,
        props.isInView,
        props.containerRef,
        props.delay,
    ])
}

const useTarget = (
    mode: Mode,
    nativeComponent: ReactNode[],
    interactionVariants: InteractionVariantPair[],
    componentWidth: ComponentWidth,
    componentHeight: ComponentHeight
) => {
    const [clonedContent, setClonedContent] =
        useState<ReactNode[]>(nativeComponent)
    const cycleStateRef = useRef<VariantCycleState>({})
    const lastUpdateTimeRef = useRef<{ [key: string]: number }>({})
    const isInitializedRef = useRef<{ [key: string]: boolean }>({})
    const DEBOUNCE_TIME = 50 // ms

    // Pre-render width and height adjustment using useInsertionEffect
    useInsertionEffect(() => {
        if (mode !== "target" || !nativeComponent.length) return

        const sizeAdjustedContent = nativeComponent.map((component) => {
            if (!isReactElement(component)) return component

            return cloneElement(component as React.ReactElement, {
                // @ts-expect-error this is Framer layer
                style: {
                    // @ts-expect-error this is Framer layer
                    ...(component as React.ReactElement).props.style,
                    width:
                        componentWidth === "fill"
                            ? "100%"
                            : // @ts-expect-error this is Framer layer
                              (component as React.ReactElement).props.width,
                    height:
                        componentHeight === "fill"
                            ? "100%"
                            : // @ts-expect-error this is Framer layer
                              (component as React.ReactElement).props.height,
                },
            })
        })

        setClonedContent(sizeAdjustedContent)
    }, [mode, nativeComponent, componentWidth, componentHeight])

    // Clear interaction manager on mount in preview mode, but only once
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            window.location.href.includes("framercanvas.com")
        ) {
            InteractionManager.clearPreviewOnce()
        }
    }, [])

    // Extract all available variants from the target component
    useEffect(() => {
        if (mode !== "target" || !nativeComponent.length) return

        const findPropertyControls = (element: any): any => {
            if (!element) return null

            if (
                element.type?.propertyControls?.variant?.options &&
                element.type?.propertyControls?.variant?.optionTitles
            ) {
                return element.type.propertyControls.variant
            }

            if (element.props?.children) {
                return findPropertyControls(element.props.children)
            }

            return null
        }

        const variantControl = findPropertyControls(nativeComponent[0])
        if (!variantControl) {
            return
        }

        const { options } = variantControl

        // Get the default variant from the component props
        const getDefaultVariant = (component: any): string | undefined => {
            if (!component) return undefined
            if (component.props?.variant) return component.props.variant
            if (component.props?.children)
                return getDefaultVariant(component.props.children)
            return undefined
        }

        const defaultVariant = getDefaultVariant(nativeComponent[0])

        // Initialize variant cycles for each interaction
        const newVariantCycles: VariantCycleState = {}
        interactionVariants.forEach((pair) => {
            if (pair.repeat === "cycle") {
                // Find the index of the default variant
                const startIndex = defaultVariant
                    ? options.indexOf(defaultVariant)
                    : 0
                newVariantCycles[pair.interactionId] = {
                    currentIndex: startIndex >= 0 ? startIndex : 0,
                    variants: options,
                }
            }
        })

        cycleStateRef.current = newVariantCycles

        // Apply initial variants for cycling interactions
        // First ensure we have size-adjusted content
        const sizeAdjustedContent = nativeComponent.map((component) => {
            if (!isReactElement(component)) return component
            return cloneElement(component as React.ReactElement, {
                // @ts-expect-error this is Framer layer
                style: {
                    // @ts-expect-error this is Framer layer
                    ...(component as React.ReactElement).props.style,
                    width:
                        componentWidth === "fill"
                            ? "100%"
                            : // @ts-expect-error this is Framer layer
                              (component as React.ReactElement).props.width,
                    height:
                        componentHeight === "fill"
                            ? "100%"
                            : // @ts-expect-error this is Framer layer
                              (component as React.ReactElement).props.height,
                },
            })
        })

        // Then apply cycling variants while preserving size adjustments and respecting default variant
        const initialContent = sizeAdjustedContent.map((component) => {
            const cyclingPairs = interactionVariants.filter(
                (pair) => pair.repeat === "cycle"
            )
            if (cyclingPairs.length > 0) {
                // For cycling variants, keep the default variant
                cyclingPairs.forEach((pair) => {
                    const cycle = newVariantCycles[pair.interactionId]
                    if (cycle && cycle.variants.length > 0) {
                        isInitializedRef.current[pair.interactionId] = true
                        if (defaultVariant) {
                            // Keep the default variant
                            // @ts-expect-error this is Framer layer
                            component = cloneWithVariant(
                                component,
                                defaultVariant,
                                componentWidth,
                                componentHeight
                            )
                        }
                    }
                })
            }
            return component
        })
        setClonedContent(initialContent)
    }, [
        mode,
        nativeComponent,
        interactionVariants,
        componentWidth,
        componentHeight,
    ])

    useEffect(() => {
        if (mode !== "target") return

        const handleVariantChange = (interactionId: string) => {
            const now = Date.now()
            const lastUpdate = lastUpdateTimeRef.current[interactionId] || 0

            // Debounce check
            if (now - lastUpdate < DEBOUNCE_TIME) {
                return
            }

            lastUpdateTimeRef.current[interactionId] = now

            // Find the matching variant pair for this interaction ID
            const matchingPair = interactionVariants.find(
                (pair) => pair.interactionId === interactionId
            )

            if (!matchingPair) {
                return
            }

            // Handle cycling if repeat is "cycle"
            if (matchingPair.repeat === "cycle") {
                const cycle = cycleStateRef.current[interactionId]

                if (!cycle || !cycle.variants || cycle.variants.length === 0) {
                    return
                }

                // Calculate next index
                const nextIndex =
                    (cycle.currentIndex + 1) % cycle.variants.length
                const nextVariant = cycle.variants[nextIndex]

                // First ensure we have size-adjusted content
                const sizeAdjustedContent = nativeComponent.map((component) => {
                    if (!isReactElement(component)) return component
                    return cloneElement(component as React.ReactElement, {
                        // @ts-expect-error this is Framer layer
                        style: {
                            // @ts-expect-error this is Framer layer
                            ...(component as React.ReactElement).props.style,
                            width:
                                componentWidth === "fill"
                                    ? "100%"
                                    : // @ts-expect-error this is Framer layer
                                      (component as React.ReactElement).props
                                          .width,
                            height:
                                componentHeight === "fill"
                                    ? "100%"
                                    : // @ts-expect-error this is Framer layer
                                      (component as React.ReactElement).props
                                          .height,
                        },
                    })
                })

                // Then apply the next variant while preserving size adjustments
                const newContent = sizeAdjustedContent.map((component) =>
                    cloneWithVariant(
                        component,
                        nextVariant,
                        componentWidth,
                        componentHeight
                    )
                )
                setClonedContent(newContent)

                // Update the ref
                cycleStateRef.current = {
                    ...cycleStateRef.current,
                    [interactionId]: {
                        ...cycle,
                        currentIndex: nextIndex,
                    },
                }
            } else {
                // First ensure we have size-adjusted content
                const sizeAdjustedContent = nativeComponent.map((component) => {
                    if (!isReactElement(component)) return component
                    return cloneElement(component as React.ReactElement, {
                        // @ts-expect-error this is Framer layer
                        style: {
                            // @ts-expect-error this is Framer layer
                            ...(component as React.ReactElement).props.style,
                            width:
                                componentWidth === "fill"
                                    ? "100%"
                                    : // @ts-expect-error this is Framer layer
                                      (component as React.ReactElement).props
                                          .width,
                            height:
                                componentHeight === "fill"
                                    ? "100%"
                                    : // @ts-expect-error this is Framer layer
                                      (component as React.ReactElement).props
                                          .height,
                        },
                    })
                })

                // Then apply the variant while preserving size adjustments
                const newContent = sizeAdjustedContent.map((component) =>
                    cloneWithVariant(
                        component,
                        matchingPair.variant,
                        componentWidth,
                        componentHeight
                    )
                )
                setClonedContent(newContent)
            }
        }

        // Only set initial content if not already initialized and has cycling variants
        const hasUninitializedCycles = interactionVariants.some(
            (pair) =>
                pair.repeat === "cycle" &&
                !isInitializedRef.current[pair.interactionId]
        )
        if (hasUninitializedCycles) {
            // First apply size adjustments
            const sizeAdjustedContent = nativeComponent.map((component) => {
                if (!isReactElement(component)) return component
                return cloneElement(component as React.ReactElement, {
                    // @ts-expect-error this is Framer layer
                    style: {
                        // @ts-expect-error this is Framer layer
                        ...(component as React.ReactElement).props.style,
                        width:
                            componentWidth === "fill"
                                ? "100%"
                                : // @ts-expect-error this is Framer layer
                                  (component as React.ReactElement).props.width,
                        height:
                            componentHeight === "fill"
                                ? "100%"
                                : // @ts-expect-error this is Framer layer
                                  (component as React.ReactElement).props
                                      .height,
                    },
                })
            })
            setClonedContent(sizeAdjustedContent)
        }

        // Get interaction manager instance
        const interactionManager = InteractionManager.getInstance()

        // Store listeners for cleanup
        const listeners: { [key: string]: Listener } = {}

        // Register listeners for all interaction IDs
        interactionVariants.forEach((pair) => {
            const listener = () => handleVariantChange(pair.interactionId)
            listeners[pair.interactionId] = listener
            interactionManager.addListener(pair.interactionId, listener)
        })

        // Cleanup listeners on unmount
        return () => {
            Object.entries(listeners).forEach(([interactionId, listener]) => {
                interactionManager.removeListener(interactionId, listener)
            })
        }
    }, [
        nativeComponent,
        mode,
        interactionVariants,
        componentWidth,
        componentHeight,
    ])

    return clonedContent
}

// ------------------------------------------------------------ //
// HELPERS
// ------------------------------------------------------------ //

// Type guard to ensure we're working with a ReactElement
const isReactElement = (el: any): el is ReactElement => {
    return el && typeof el === "object" && "props" in el
}

// Clone with variant function
const cloneWithVariant = (
    element: ReactElement | ReactNode,
    targetVariant: string,
    componentWidth: ComponentWidth,
    componentHeight: ComponentHeight
): ReactElement | ReactNode => {
    // Early return for non-element nodes
    if (!isReactElement(element)) {
        return element
    }

    // Type guard for variant props
    const hasVariantProp = (props: any): props is VariantProps => {
        return props && typeof props === "object" && "variant" in props
    }

    // Type guard for children props
    const hasChildrenProp = (props: any): props is PropsWithChildren => {
        return props && typeof props === "object" && "children" in props
    }

    // Check if this element has a variant prop
    if (hasVariantProp(element.props)) {
        const newProps: any = {
            ...element.props,
            variant: targetVariant,

            style: {
                ...element.props.style,
                width: componentWidth === "fill" ? "100%" : element.props.width,
                height:
                    componentHeight === "fill" ? "100%" : element.props.height,
            },
        }

        // Clone children recursively
        newProps.children = element.props.children
            ? cloneWithVariant(
                  element.props.children,
                  targetVariant,
                  componentWidth,
                  componentHeight
              )
            : element.props.children

        return cloneElement(element as ReactElement<VariantProps>, newProps)
    }

    // If it has children, recursively clone them
    if (hasChildrenProp(element.props)) {
        return cloneElement(element as ReactElement<PropsWithChildren>, {
            ...element.props,

            style: {
                ...element.props.style,
                width: componentWidth === "fill" ? "100%" : element.props.width,
                height:
                    componentHeight === "fill" ? "100%" : element.props.height,
            },
            children: cloneWithVariant(
                element.props.children,
                targetVariant,
                componentWidth,
                componentHeight
            ),
        })
    }

    return element
}

// ------------------------------------------------------------ //
// INTERACTION MANAGER
// ------------------------------------------------------------ //
export type Listener = (variant: string) => void

export class InteractionManager {
    private static instance: InteractionManager
    private listeners: { [key: string]: Listener[] } = {}
    private static instanceId: string = Math.random().toString(36).substring(7)
    private static isPreviewCleared: boolean = false

    private constructor() {
        // Listen for preview reloads
        if (typeof window !== "undefined") {
            window.addEventListener("unload", () => {
                this.clearAllListeners()
            })
        }
    }

    static getInstance(): InteractionManager {
        if (!InteractionManager.instance) {
            InteractionManager.instance = new InteractionManager()
        }
        return InteractionManager.instance
    }

    addListener(interactionId: string, listener: Listener) {
        if (!this.listeners[interactionId]) {
            this.listeners[interactionId] = []
        }
        // Attach current instanceId to listener to avoid executing stale ones
        ;(listener as any)._instanceId = InteractionManager.instanceId
        this.listeners[interactionId].push(listener)
    }

    removeListener(interactionId: string, listener: Listener) {
        if (!this.listeners[interactionId]) return
        this.listeners[interactionId] = this.listeners[interactionId].filter(
            (l) => l !== listener
        )
        // Clean up empty listener arrays
        if (this.listeners[interactionId].length === 0) {
            delete this.listeners[interactionId]
        }
    }

    clearAllListeners() {
        this.listeners = {}
        // Generate new instance ID to invalidate old listeners
        InteractionManager.instanceId = Math.random().toString(36).substring(7)
    }

    private getCurrentInstanceId(): string {
        return InteractionManager.instanceId
    }

    trigger(interactionId: string, variant: string) {
        if (!this.listeners[interactionId]) return
        this.listeners[interactionId].forEach((listener) => {
            if ((listener as any)._instanceId === InteractionManager.instanceId) {
                listener(variant)
            }
        })
    }

    static clearPreviewOnce() {
        if (!InteractionManager.isPreviewCleared) {
            InteractionManager.getInstance().clearAllListeners()
            InteractionManager.isPreviewCleared = true
        }
    }
}

CrossCompInteractions.displayName = "Cross Comp Interactions"
