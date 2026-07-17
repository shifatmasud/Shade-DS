import { ControlType, RenderTarget, useIsStaticRenderer } from "framer"
import { useEffect, useMemo, useState } from "react"

export const useDarkMode = () => {
    const [isDarkMode, setIsDarkMode] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        setIsDarkMode(mediaQuery.matches)

        const handler = (e) => setIsDarkMode(e.matches)
        mediaQuery.addListener(handler)

        return () => mediaQuery.removeListener(handler)
    }, [])

    return isDarkMode
}

export const CompatibleMedia = ({
    mediaType,
    mediaSrc,
    imageAlt,
    fit,
    loop,
    style = {},
    content = "",
    font = {
        color: "#000",
        size: 16,
        letter: 0,
        line: 1.4,
        align: "left",
        justify: "top",
        position: { offsetX: 0, offsetY: 0 },
        file: "preset",
        preset: undefined,
        upload: undefined,
        maxWidthType: false,
        maxWidthFixed: 800,
        maxWidthRel: "100%",
    },
    background,
    useCompatibility,
    ...props
}) => {
    const isStaticRenderer = useIsStaticRenderer()

    const defaultStyle = {
        width: "100%",
        height: "100%",
        objectFit: fit,
    }

    const toPx = (v, fallback = 0) =>
        typeof v === "number" ? `${v}px` : v || `${fallback}px`

    const fontUrl = useMemo(() => {
        const fallback =
            "https://fonts.gstatic.com/s/comfortaa/v12/1Ptsg8LJRfWJmhDAuUs4TYFs.woff"
        if (font?.file === "preset") return font?.preset || fallback
        if (font?.upload) return font.upload
        return fallback
    }, [font])

    const fontFamilyName = useMemo(() => {
        const base = typeof fontUrl === "string" ? fontUrl : "customFont"
        const tail = base.slice(-12).replace(/[^a-zA-Z0-9]/g, "")
        return `CompatFont_${tail || "Woff"}`
    }, [fontUrl])

    const verticalAlign = useMemo(() => {
        const j = (font?.justify || "top").toLowerCase()
        if (j === "middle" || j === "center") return "center"
        if (j === "bottom" || j === "end") return "flex-end"
        return "flex-start"
    }, [font?.justify])

    const resolvedMaxWidth = useMemo(() => {
        return font?.maxWidthType
            ? toPx(font?.maxWidthFixed ?? 800, 800)
            : font?.maxWidthRel || "100%"
    }, [font?.maxWidthType, font?.maxWidthFixed, font?.maxWidthRel])

    if (useCompatibility && ["image", "textImage"].includes(mediaType)) {
        return (
            <img
                src={mediaSrc}
                alt={imageAlt}
                style={{ ...defaultStyle, ...style }}
                crossOrigin="anonymous"
                {...props}
            />
        )
    }

    if (useCompatibility && ["video", "textVideo"].includes(mediaType)) {
        return (
            <video
                src={mediaSrc}
                autoPlay={!isStaticRenderer}
                muted
                playsInline
                loop={loop}
                style={{ ...defaultStyle, ...style }}
                crossOrigin="anonymous"
                {...props}
            />
        )
    }

    if (["text", "textImage", "textVideo"].includes(mediaType)) {
        const fontSize = font.size
        const lineHeight = font.line
        const letterSpacing = `${font.letter * font.size}px`

        return (
            <>
                <style>{`
          @font-face {
            font-family: '${fontFamilyName}';
            src: url('${fontUrl}') format('woff');
            font-style: normal;
            font-weight: 400;
            font-display: swap;
          }

          /* 选中文本时变透明
          .compat-text::selection {
            color: transparent !important;
            background: rgba(0,0,0,0.15); 
          } */
        `}</style>

                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: verticalAlign,
                        background: useCompatibility
                            ? background
                            : "transparent",
                        ...style,
                    }}
                    {...props}
                >
                    <p
                        className="compat-text"
                        style={{
                            width: "100%",
                            textAlign: (font?.align || "left").toLowerCase(),
                            color: useCompatibility
                                ? font?.color || "#000"
                                : "transparent",
                            fontFamily: fontFamilyName,
                            fontSize,
                            lineHeight,
                            letterSpacing,
                            margin: 0,
                            transform: `translate(${toPx(font?.position?.offsetX, 0)}, ${toPx(
                                font?.position?.offsetY,
                                0
                            )})`,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            background: "transparent",
                            userSelect: "text",
                        }}
                    >
                        <span
                            style={{
                                display: "inline-block",
                                maxWidth: resolvedMaxWidth,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {content}
                        </span>
                    </p>
                </div>
            </>
        )
    }

    return null
}

export const useMediaSource = (
    media,
    file,
    urlVideo,
    upVideo,
    defaultImage,
    darkImage,
    dark,
    placeholder = "flower_dark" // 新增的 placeholder 参数，默认值为 "flower_dark"
) => {
    const isDarkMode = useDarkMode()

    // 根据 placeholder 参数选择对应的默认图像和 Alt 文本
    const getPlaceholderValues = useMemo(() => {
        const placeholderMap = {
            reveals: {
                image: "https://framerusercontent.com/images/6MTlf3HAzQ2kjMqPur2sdbkznQ.png?scale-down-to=2048",
                alt: "reveals original image.",
            },
            flower_light: {
                image: "https://framerusercontent.com/images/cz3ePY6OFcSC4EItQFuQxLrQbBA.jpg",
                alt: "A wilted tulip with red and yellow petals.",
            },
            flower_dark: {
                image: "https://framerusercontent.com/images/l4gFK0Yuorz9j7RwU2EbwWxpw.jpg",
                alt: "A bright yellow sunflower against a dark background.",
            },
            arch_dark: {
                image: "https://framerusercontent.com/images/kW9tNTLiYRYp7LGxfxbuywTR4I.jpg",
                alt: "A white sphere suspended among curved black metallic ribbons.",
            },
            dice_dark: {
                image: "https://framerusercontent.com/images/bXMH0vhJVBjFjMhCnvcVuK0KA0.jpg",
                alt: "A cluster of smooth, reflective metallic shapes on a dark background.",
            },
            astronaut: {
                image: "https://framerusercontent.com/images/K54OdkNAJ7dNPCQlcqviSKRrXAY.jpg?width=1920&height=1282",
                alt: "Close-up of an astronaut's face inside a reflective helmet.",
            },
            silhouetted: {
                image: "https://framerusercontent.com/images/CeZXMYBfdBEchX3ub79dGEHlyCQ.jpg?width=1920&height=1280",
                alt: "Silhouetted figure walking behind frosted glass panels.",
            },
            structure: {
                image: "https://framerusercontent.com/images/Ud6oqYomUb6OGy9FMr1VmAPXIU.jpg?width=1920&height=1280",
                alt: "Abstract red metal structure against a clear sky.",
            },
            dizzy: {
                image: "https://framerusercontent.com/images/JJmc0OZsfY0HhNmbr8W4De17Pw.jpg?width=1920&height=1343",
                alt: "Blurred portrait of a person in motion with hands near the head.",
            },
            hand: {
                image: "https://framerusercontent.com/images/qAQg0suczEYw3OPZEmj7XxyW0.jpg?width=1920&height=1440",
                alt: "A hand reaching toward a glowing blue light.",
            },
            porsche: {
                image: "https://framerusercontent.com/images/9bPvA91sUvfr4lgE2gQ1MbfUMDs.jpg?width=1920&height=1280",
                alt: "A silver sports car in the rain, seen from the rear side.",
            },
            wheat: {
                image: "https://framerusercontent.com/images/jhGTXFJ0WKeCaZXfyfE5pSL1Pbc.jpg?width=1920&height=1280",
                alt: "Golden grass glistening in sunlight.",
            },
            eye: {
                image: "https://framerusercontent.com/images/6g5J772895Wis8mrNdhoWPEsdw.jpg?width=1920&height=1219",
                alt: "Close-up of an eye lit by pink and blue neon lights.",
            },
            back: {
                image: "https://framerusercontent.com/images/RHX8fHuHrCwBGJEWS3m2XAlNLkY.jpg?width=1920&height=1280",
                alt: "Silhouette of a man in front of a glowing circular light.",
            },
            leaf: {
                image: "https://framerusercontent.com/images/H9Nc5IUkJTIgKtvYRfVWsJSrhHc.jpg?width=1920&height=1281",
                alt: "A dried brown leaf in soft sunlight.",
            },
            woman: {
                image: "https://framerusercontent.com/images/RsfeCfG4Cv3yUyoZebXoya00Ag.jpg?width=1920&height=1920",
                alt: "Silhouetted figure striking a graceful pose in dramatic lighting.",
            },
        }
        return placeholderMap[placeholder] || placeholderMap.flower_dark
    }, [placeholder])

    const imageSrc = useMemo(() => {
        if (dark && isDarkMode && darkImage?.src) {
            return darkImage.src
        }
        return defaultImage?.src || getPlaceholderValues.image
    }, [isDarkMode, defaultImage, darkImage, dark, getPlaceholderValues.image])

    const imageAlt = useMemo(() => {
        // image 和 text 类型都返回相同的 alt 文本
        if (media === "image" || media === "textImage" || media === "text") {
            if (dark && isDarkMode && darkImage?.alt) {
                return darkImage.alt
            }
            return defaultImage?.alt || getPlaceholderValues.alt
        }
    }, [
        media,
        isDarkMode,
        defaultImage,
        darkImage,
        dark,
        getPlaceholderValues.alt,
    ])

    const mediaSrc = useMemo(() => {
        // image 和 text 类型都返回 imageSrc
        if (media === "image" || media === "textImage" || media === "text") {
            return imageSrc
        }
        return file === "url" ? urlVideo : upVideo
    }, [
        media,
        file,
        imageSrc,
        urlVideo,
        upVideo,
        defaultImage,
        darkImage,
        dark,
    ])

    const mediaType = useMemo(() => {
        const mediaTypeMap = {
            image: "image",
            video: "video",
            text: "text",
            textImage: "textImage",
            textVideo: "textVideo",
        }
        return mediaTypeMap[media] || "image"
    }, [media])

    return {
        imageSrc,
        imageAlt,
        mediaSrc,
        mediaType,
    }
}

const presetFonts = {
    title: ["Roboto", "Noto Sans", "Comfortaa", "Cookie"],
    url: [
        "https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff",
        "https://fonts.gstatic.com/s/notosans/v7/o-0IIpQlx3QUlC5A4PNr5TRG.woff",
        "https://fonts.gstatic.com/s/comfortaa/v12/1Ptsg8LJRfWJmhDAuUs4TYFs.woff",
        "https://fonts.gstatic.com/s/cookie/v8/syky-y18lb0tSbf9kgqU.woff",
    ],
}

export const propertyControls = {
    media: {
        type: {
            type: ControlType.Enum,
            title: "Media",
            options: ["image", "video", "text", "textImage", "textVideo"],
            optionTitles: [
                "Image",
                "Video",
                "Text (Beta)",
                "Text & Image (Beta)",
                "Text & Video (Beta)",
            ],
            displaySegmentedControl: false,
            defaultValue: "image",
        },
        file: {
            type: ControlType.Enum,
            title: "File",
            options: ["url", "upload"],
            optionTitles: ["URL", "Upload"],
            displaySegmentedControl: true,
            defaultValue: "url",
            hidden(props) {
                return !["video", "textVideo"].includes(props.type)
            },
        },
        defaultImage: {
            type: ControlType.ResponsiveImage,
            title: "Image",
            hidden(props) {
                return !["image", "textImage"].includes(props.type)
            },
        },
        // dark: {
        //     type: ControlType.Boolean,
        //     title: "Dark Mode",
        //     defaultValue: false,
        //     hidden(props) {
        //         return props.type !== "image"
        //     },
        // },
        // darkImage: {
        //     type: ControlType.ResponsiveImage,
        //     title: "Dark Image",
        //     hidden(props) {
        //         return props.dark
        //             ? props.type === "image"
        //                 ? false
        //                 : true
        //             : true
        //     },
        // },
        urlVideo: {
            type: ControlType.String,
            title: "URL",
            defaultValue:
                "https://framerusercontent.com/assets/Jhocnrz23GM4PK1CT7mBiwAu5U.mp4",
            // description: "Use video will affect performance more.",
            hidden(props) {
                return props.file === "url"
                    ? !["video", "textVideo"].includes(props.type)
                    : true
            },
        },
        upVideo: {
            type: ControlType.File,
            title: "Upload",
            allowedFileTypes: ["mp4", "webm"],
            description: "Use video will affect performance more.",
            hidden(props) {
                return props.file === "upload"
                    ? !["video", "textVideo"].includes(props.type)
                    : true
            },
        },
        loop: {
            type: ControlType.Boolean,
            title: "Loop",
            defaultValue: true,
            hidden(props) {
                return !["video", "textVideo"].includes(props.type)
            },
        },
        content: {
            type: ControlType.String,
            title: "Content",
            defaultValue: "Text",
            hidden(props) {
                return !["text", "textImage", "textVideo"].includes(props.type)
            },
        },
        font: {
            type: ControlType.Object,
            title: "Font",
            buttonTitle: "Font",
            icon: "text",
            hidden(props) {
                return !["text", "textImage", "textVideo"].includes(props.type)
            },
            controls: {
                file: {
                    type: ControlType.Enum,
                    title: "Font",
                    options: ["preset", "upload"],
                    optionTitles: ["Preset", "Upload"],
                    displaySegmentedControl: true,
                    defaultValue: "preset",
                },
                preset: {
                    type: ControlType.Enum,
                    title: "Preset",
                    options: presetFonts.url,
                    optionTitles: presetFonts.title,
                    defaultValue: "file2",
                    hidden(props) {
                        return props.file === "upload"
                    },
                },
                upload: {
                    type: ControlType.File,
                    title: "File",
                    allowedFileTypes: ["woff", "otf", "ttf"],
                    description: ".woff/.otf file.",
                    hidden(props) {
                        return props.file === "preset"
                    },
                },
                // weight: {
                //     type: ControlType.Enum,
                //     title: "Weight",
                //     options: ["normal", "bold"],
                //     optionTitles: ["Normal", "Bold"],
                //     defaultValue: "normal",
                // },
                color: {
                    type: ControlType.Color,
                    title: "Color",
                    defaultValue: "#ffffff",
                },
                size: {
                    type: ControlType.Number,
                    title: "Size",
                    displayStepper: true,
                    step: 1,
                    min: 0,
                    defaultValue: 128,
                },
                letter: {
                    type: ControlType.Number,
                    title: "Letter",
                    displayStepper: true,
                    step: 0.01,
                    defaultValue: 0,
                },
                line: {
                    type: ControlType.Number,
                    title: "Line",
                    displayStepper: true,
                    step: 0.1,
                    defaultValue: 1,
                },
                align: {
                    type: ControlType.Enum,
                    title: "Align",
                    options: ["left", "center", "right"],
                    optionIcons: [
                        "text-align-left",
                        "text-align-center",
                        "text-align-right",
                    ],
                    displaySegmentedControl: true,
                    defaultValue: "center",
                },
                justify: {
                    type: ControlType.Enum,
                    title: "Justify",
                    options: ["top", "middle", "bottom"],
                    optionIcons: [
                        "text-align-top",
                        "text-align-middle",
                        "text-align-bottom",
                    ],
                    displaySegmentedControl: true,
                    defaultValue: "middle",
                },
                maxWidthType: {
                    title: "Max Width",
                    type: ControlType.Boolean,
                    enabledTitle: "Fixed",
                    disabledTitle: "Relative",
                    defaultValue: false,
                },
                maxWidthFixed: {
                    type: ControlType.Number,
                    title: " ",
                    step: 1,
                    min: 0,
                    defaultValue: 800,
                    hidden(props) {
                        return !props.maxWidthType
                    },
                },
                maxWidthRel: {
                    type: ControlType.Number,
                    title: " ",
                    unit: "%",
                    step: 1,
                    min: 0,
                    max: 100,
                    defaultValue: 100,
                    hidden(props) {
                        return props.maxWidthType
                    },
                },
                position: {
                    type: ControlType.Object,
                    title: "Offset",
                    controls: {
                        offsetX: {
                            type: ControlType.Number,
                            title: "X",
                            displayStepper: false,
                            step: 1,
                            defaultValue: 0,
                        },
                        offsetY: {
                            type: ControlType.Number,
                            title: "Y",
                            displayStepper: false,
                            step: 1,
                            defaultValue: 0,
                        },
                        offsetZ: {
                            type: ControlType.Number,
                            title: "Z",
                            displayStepper: false,
                            step: 1,
                            defaultValue: 0,
                        },
                    },
                },
            },
        },
        background: {
            type: ControlType.Color,
            title: "Background",
            defaultValue: "rgba(0,0,0,1)",
            hidden(props) {
                return props.type !== "text"
            },
        },
    },
    mediaNoText: {
        type: {
            type: ControlType.Enum,
            title: "Media",
            options: ["image", "video"],
            optionTitles: ["Image", "Video"],
            displaySegmentedControl: true,
            defaultValue: "image",
        },
        file: {
            type: ControlType.Enum,
            title: "File",
            options: ["url", "upload"],
            optionTitles: ["URL", "Upload"],
            displaySegmentedControl: true,
            defaultValue: "url",
            hidden(props) {
                return props.type !== "video"
            },
        },
        defaultImage: {
            type: ControlType.ResponsiveImage,
            title: "Image",
            hidden(props) {
                return props.type !== "image"
            },
        },
        urlVideo: {
            type: ControlType.String,
            title: "URL",
            defaultValue:
                "https://framerusercontent.com/assets/Jhocnrz23GM4PK1CT7mBiwAu5U.mp4",
            // description: "Use video will affect performance more.",
            hidden(props) {
                return props.file === "url"
                    ? props.type === "video"
                        ? false
                        : true
                    : true
            },
        },
        upVideo: {
            type: ControlType.File,
            title: "Upload",
            allowedFileTypes: ["mp4", "webm"],
            description: "Use video will affect performance more.",
            hidden(props) {
                return props.file === "upload"
                    ? props.type === "video"
                        ? false
                        : true
                    : true
            },
        },
        loop: {
            type: ControlType.Boolean,
            title: "Loop",
            defaultValue: true,
            hidden(props) {
                return props.type !== "video"
            },
        },
    },
    size: {
        fit: {
            type: ControlType.Enum,
            title: "Fit",
            options: ["cover", "contain"],
            optionTitles: ["Cover", "Contain"],
            defaultValue: "cover",
            hidden(props) {
                return props.type === "text"
            },
        },
    },
    animateControls: {
        type: {
            type: ControlType.Enum,
            title: "Type",
            options: ["disable", "appear", "enter", "transform", "variant"],
            optionTitles: [
                "Disable",
                "Appear",
                "Enter",
                "Transform",
                "Variant",
            ],
            defaultValue: "appear",
        },
        replay: {
            type: ControlType.Boolean,
            title: "Replay",
            defaultValue: true,
            hidden(props) {
                return props.type !== "enter"
            },
        },
        trigger: {
            type: ControlType.Enum,
            title: "Trigger",
            options: ["layer", "section"],
            optionTitles: ["Layer in View", "Section in View"],
            defaultValue: "layer",
            description:
                "Play animation when how much of the media comes into view.",
            hidden(props) {
                return (
                    props.type == "appear" ||
                    props.type == "disable" ||
                    props.type == "variant"
                )
            },
        },
        // section: {
        //     // @ts-ignore
        //     type: ControlType.ScrollSectionRef,
        //     title: "Section",
        //     hidden(props) {
        //         if (
        //             (props.type === "transform" || props.type === "enter") &&
        //             props.trigger === "section"
        //         ) {
        //             return false
        //         }
        //         return true
        //     },
        // },
        amount: {
            type: ControlType.Enum,
            title: "Amount",
            options: [1, 0.5, 0],
            optionTitles: ["Top", "Center", "Bottom"],
            displaySegmentedControl: true,
            defaultValue: 0,
            description:
                "Play animation when how much of the media comes into view.",
            hidden(props) {
                return props.type !== "enter"
            },
        },
        viewport: {
            type: ControlType.Enum,
            title: "Viewport",
            options: ["top", "center", "bottom"],
            optionTitles: ["Top", "Center", "Bottom"],
            displaySegmentedControl: true,
            defaultValue: "bottom",
            description:
                "Start transforming when how much of the media comes into view.",
            hidden(props) {
                return props.type !== "transform"
            },
        },
    },
    scrollControls: {
        section: {
            // @ts-ignore
            type: ControlType.ScrollSectionRef,
            title: "Section",
            hidden(props) {
                if (
                    (props.animateProp.type === "transform" ||
                        props.animateProp.type === "enter") &&
                    props.animateProp.trigger === "section"
                ) {
                    return false
                }
                return true
            },
        },
    },

    accessibility: {
        accessibility: {
            type: ControlType.Object,
            title: "Accessibility",
            buttonTitle: "Aria Label",
            icon: "boolean",
            description: "Learn more on [Reveals](https://reveals.cool).",
            controls: {
                enableAria: {
                    type: ControlType.Boolean,
                    title: "Aria Label",
                    defaultValue: false,
                },
                compatibility: {
                    type: ControlType.Boolean,
                    title: "Compatibility",
                    defaultValue: false,
                    description:
                        "Disable effects and use regular *image/video* elements. e.g. use on Phone layout for better performance.",
                },
                reduce: {
                    type: ControlType.Enum,
                    title: "Reduce Motion",
                    displaySegmentedControl: true,
                    segmentedControlDirection: "horizontal",
                    options: [true, false],
                    optionTitles: ["Allow", "Block"],
                    defaultValue: false,
                    description:
                        "Whether to allow Reduce Motion to control animation.",
                },
                renderer: {
                    type: ControlType.Enum,
                    title: "Renderer",
                    displaySegmentedControl: true,
                    segmentedControlDirection: "horizontal",
                    options: ["auto", "always"],
                    optionTitles: ["Auto", "Always"],
                    defaultValue: "auto",
                    description: "Control when the renderer will render.",
                },
            },
        },
        ariaLabel: {
            type: ControlType.String,
            title: "Aria Label",
            defaultValue: "",
            hidden(props) {
                return !props.accessibility.enableAria
            },
        },
    },
    eventHandler: {
        onLoad: {
            type: ControlType.EventHandler,
            title: "Load",
        },
        // onError: {
        //     type: ControlType.EventHandler,
        //     title: "Error",
        // },
        onVideoEnd: {
            type: ControlType.EventHandler,
            title: "Video End",
        },
        onAnimationComplete: {
            type: ControlType.EventHandler,
            title: "Animation Complete",
        },
    },
}