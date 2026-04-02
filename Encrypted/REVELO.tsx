import {jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment} from "react/jsx-runtime";
import {addPropertyControls, ControlType, useIsOnFramerCanvas} from "framer";
import {useEffect, useRef, useState, useMemo} from "react";
import {SplitText} from "https://esm.sh/gsap@3.13.0/SplitText";
import {ScrollTrigger} from "https://esm.sh/gsap@3.13.0/ScrollTrigger";
import gsap from "https://esm.sh/gsap@3.13.0";
import {Children, isValidElement, cloneElement} from "react";
import ComponentPlaceholder from "https://framer.com/m/Component-Placeholder-tT4T.js@2q81HdTqDPDbdK8wHUgC";
const version = "2.0.0";
gsap.registerPlugin(ScrollTrigger);
if (typeof window !== "undefined") {
    window.revelo = {
        version
    };
    const css = `.revelo-fallback, .revelo-fallback * { color: #0000 !important; -webkit-text-stroke-color: #0000 !important; } .revelo .elements>:not(:first-child),.revelo .lines>:not(:first-child):not(p),.revelo .words>:not(:first-child),.revelo .chars>:not(:first-child) { inset:0; position:absolute; } .revelo [data-framer-name] {height:auto;width: 100% !important; opacity:1 !important} .elements *,.lines *,.words *,.chars *{transform-style:preserve-3d;} .lines{white-space:nowrap;}`
      , head = document.head || document.getElementsByTagName("head")[0]
      , style = document.createElement("style");
    head.appendChild(style);
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
}
function setProperty(name="Property", {min=0, max=1, defaultValue=1, defaultFromValue=defaultValue, defaultToValue=defaultValue, step=1, unit="", render=v => v, from=false, type=ControlType.Number, optional=true}={}) {
    return {
        title: name,
        type: ControlType.Object,
        icon: "effect",
        render,
        optional,
        controls: {
            from: from && {
                title: "From",
                type,
                defaultValue: defaultFromValue,
                min,
                max,
                unit,
                step
            },
            to: {
                title: "To",
                type,
                defaultValue: defaultToValue,
                min,
                max,
                unit,
                step
            }
        }
    };
}
function setAnimatedProperties(legacy=false) {
    const from = true;
    return {
        ...legacy ? {
            mask: {
                type: ControlType.Enum,
                title: "Overflow",
                defaultValue: "false",
                options: ["false", "yes", "x", "y"],
                optionTitles: ["Visible", "Clip X and Y", "Clip X", "Clip Y"]
            }
        } : {},
        clip: {
            type: ControlType.Object,
            optional: true,
            controls: {
                top: {
                    type: ControlType.Number,
                    title: "Top",
                    min: -100,
                    max: 100,
                    defaultValue: 0,
                    unit: "%"
                },
                bottom: {
                    type: ControlType.Number,
                    title: "Bottom",
                    min: -100,
                    max: 100,
                    defaultValue: 0,
                    unit: "%"
                },
                right: {
                    type: ControlType.Number,
                    title: "Right",
                    min: -100,
                    max: 100,
                    defaultValue: 0,
                    unit: "%"
                },
                left: {
                    type: ControlType.Number,
                    title: "Left",
                    min: -100,
                    max: 100,
                    defaultValue: 0,
                    unit: "%"
                },
                debug: {
                    title: "Debug",
                    type: ControlType.Color,
                    optional: true,
                    defaultValue: "#0000ff",
                    description: `Clip your element with a rectangular mask.
The top, right, bottom, and left sliders (in %) control how much of each edge is trimmed.`
                }
            }
        },
        color: setProperty("Color", {
            type: ControlType.Color,
            from,
            optional: true
        }),
        textStrokeColor: setProperty("Stroke Color", {
            type: ControlType.Color,
            from,
            optional: true
        }),
        textStrokeWidth: setProperty("Stroke Thickness", {
            min: 0,
            defaultValue: 0,
            defaultFromValue: 0,
            max: 10,
            step: .01,
            from,
            optional: true
        }),
        letterSpacing: setProperty("Letter Spacing", {
            min: -10,
            defaultValue: 0,
            defaultFromValue: 0,
            max: 10,
            step: .01,
            from,
            optional: true,
            render: v => `${v}em`
        }),
        opacity: setProperty("Opacity", {
            min: 0,
            defaultValue: 1,
            defaultFromValue: 1,
            max: 1,
            step: .01,
            from
        }),
        maskImage: {
            title: "Mask",
            type: ControlType.Object,
            optional: true,
            controls: {
                progress: setProperty("Progress", {
                    min: 0,
                    defaultValue: 1,
                    defaultFromValue: 0,
                    max: 1,
                    step: .01,
                    from,
                    optional: false
                }),
                angle: setProperty("Angle", {
                    min: -360,
                    defaultValue: 45,
                    defaultFromValue: 45,
                    max: 360,
                    step: 1,
                    from,
                    optional: false
                }),
                spread: setProperty("Spread", {
                    min: 0,
                    defaultValue: 1,
                    defaultFromValue: 1,
                    max: 1,
                    step: .01,
                    from,
                    optional: false
                }),
                invert: {
                    type: ControlType.Boolean,
                    defaultValue: false
                }
            }
        },
        transformOriginX: {
            type: ControlType.Enum,
            title: "Origin X",
            defaultValue: "center",
            options: ["left", "center", "right"],
            optionTitles: ["Left", "Center", "Right"]
        },
        transformOriginY: {
            type: ControlType.Enum,
            title: "Origin Y",
            defaultValue: "center",
            options: ["top", "center", "bottom"],
            optionTitles: ["Top", "Center", "Bottom"]
        },
        perspective: {
            type: ControlType.Number,
            step: 1,
            min: 0,
            max: 2e3,
            defaultValue: 1e3,
            unit: "px"
        },
        x: setProperty("Translate X", {
            min: -300,
            defaultValue: 0,
            max: 300,
            unit: "%",
            step: 1,
            render: v => `${v}%`,
            from
        }),
        y: setProperty("Translate Y", {
            min: -300,
            defaultValue: 0,
            max: 300,
            unit: "%",
            step: 1,
            render: v => `${v}%`,
            from
        }),
        z: setProperty("Translate Z", {
            min: -300,
            defaultValue: 0,
            max: 300,
            unit: "px",
            step: 1,
            render: v => `${v}px`,
            from
        }),
        scaleX: setProperty("Scale X", {
            min: 0,
            defaultValue: 1,
            max: 1,
            step: .01,
            from
        }),
        scaleY: setProperty("Scale Y", {
            min: 0,
            defaultValue: 1,
            max: 1,
            step: .01,
            from
        }),
        filter: setProperty("Blur", {
            min: 0,
            defaultValue: 0,
            max: 100,
            step: 1,
            render: v => `blur(${v}px)`,
            from
        }),
        rotateX: setProperty("Rotate X", {
            min: -360,
            defaultValue: 0,
            max: 360,
            unit: "\xb0",
            step: 1,
            render: v => `${v}deg`,
            from
        }),
        rotateY: setProperty("Rotate Y", {
            min: -360,
            defaultValue: 0,
            max: 360,
            unit: "\xb0",
            step: 1,
            render: v => `${v}deg`,
            from
        }),
        ...legacy ? {
            rotate: setProperty("Rotate Z", {
                min: -360,
                defaultValue: 0,
                max: 360,
                unit: "\xb0",
                step: 1,
                render: v => `${v}deg`,
                from
            })
        } : {
            rotateZ: setProperty("Rotate Z", {
                min: -360,
                defaultValue: 0,
                max: 360,
                unit: "\xb0",
                step: 1,
                render: v => `${v}deg`,
                from
            })
        },
        skewX: setProperty("Skew X", {
            min: -360,
            defaultValue: 0,
            max: 360,
            step: 1,
            unit: "\xb0",
            render: v => `${v}deg`,
            from
        }),
        skewY: setProperty("Skew Y", {
            min: -360,
            defaultValue: 0,
            max: 360,
            step: 1,
            unit: "\xb0",
            render: v => `${v}deg`,
            from
        }),
        duration: {
            type: ControlType.Number,
            min: 0,
            defaultValue: 1,
            max: 10,
            step: .01
        },
        stagger: {
            type: ControlType.Number,
            min: 0,
            defaultValue: .1,
            max: 1,
            step: .001
        },
        delay: {
            type: ControlType.Number,
            min: 0,
            defaultValue: 0,
            max: 10,
            step: .001
        },
        origin: {
            type: ControlType.Enum,
            defaultValue: "start",
            // displaySegmentedControl: true,
            // segmentedControlDirection: "vertical",
            options: ["start", "center", "edges", "random", "end"],
            optionTitles: ["Start", "Center", "Edges", "Random", "End"]
        },
        ease: {
            type: ControlType.Enum,
            defaultValue: "expo.out",
            description: "Learn more about [GSAP easings](https://gsap.com/docs/v3/Eases/).",
            options: ["linear", "power1.in", "power1.out", "power1.inOut", "power2.in", "power2.out", "power2.inOut", "power3.in", "power3.out", "power3.inOut", "power4.in", "power4.out", "power4.inOut", "bounce.in", "bounce.out", "bounce.inOut", "circ.in", "circ.out", "circ.inOut", "expo.in", "expo.out", "expo.inOut", "sine.in", "sine.out", "sine.inOut"]
        }
    };
}
const animatedProperties = setAnimatedProperties();
function getValues(object, type="from") {
    if (!object)
        return {};
    return Object.fromEntries(Object.entries(object).map( ([key,value]) => {
        if (value === undefined)
            return;
        const property = animatedProperties[key];
        if (!property?.controls || !property?.render)
            return;
        return [key, property.render(value[type])];
    }
    ).filter(v => v));
}
function applyTransformOrigin(nodes, {x="center", y="center"}) {
    nodes.forEach(node => {
        node.style.setProperty("transform-origin", `${x} ${y}`);
    }
    );
}
function applyOverflow(nodes, mask) {
    nodes.forEach(node => {
        node.style.removeProperty("overflow");
        switch (mask) {
        case "false":
            node.style.removeProperty("clip-path");
            break;
        case "yes":
            node.style.setProperty("clip-path", "inset(0%)");
            break;
        case "x":
            // node.style.setProperty("overflow-x", "clip")
            node.style.setProperty("clip-path", "inset(-999% 0% -999% 0%)");
            break;
        case "y":
            // node.style.setProperty("overflow-y", "clip")
            node.style.setProperty("clip-path", "inset(0% -999% 0% -999%)");
            break;
        }
    }
    );
}
function applyClip(nodes, clip, isOnFramerCanvas) {
    nodes.forEach(node => {
        node.style.setProperty("clip-path", `inset(${clip?.top}% ${clip?.right}% ${clip?.bottom}% ${clip?.left}%)`);
        const debugElement = document.createElement("div");
        if (clip.debug && isOnFramerCanvas) {
            debugElement.style.cssText = `
            position: absolute;
            inset: ${clip?.top}% ${clip?.right}% ${clip?.bottom}% ${clip?.left}%;
            border: 1px solid ${clip.debug};
        `;
            node.appendChild(debugElement);
        }
    }
    );
}
function recursiveMap(children, fn) {
    const map = Children.map(children, child => {
        if (!/*#__PURE__*/
        isValidElement(child)) {
            return child;
        }
        if (child.props.children) {
            child = /*#__PURE__*/
            cloneElement(child, {
                children: recursiveMap(child.props.children, fn)
            });
        }
        const newChild = fn(child);
        return newChild;
    }
    );
    return map?.length === 1 ? map[0] : map;
}
/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 800
 * @framerCanvasComponentVariantDetails {"propertyName":"variant","data":{"default":{"layout":["fixed","auto"]}}}
 * @framerDisableUnlink
 */
export default function Component({viewport, section, elements, lines, words, chars, elementsArray=[], linesArray=[], wordsArray=[], charsArray=[], preview, animations, textComponent, type, replay, repeat, reverse, debug, ...props}) {
    const isOnFramerCanvas = useIsOnFramerCanvas();
    const isLegacyMode = Boolean(lines || words || chars);
    if (elementsArray.length === 0 && elements) {
        elementsArray = [elements];
    }
    if (isLegacyMode) {
        if (lines)
            lines.rotateZ = lines.rotate;
        if (words)
            words.rotateZ = words.rotate;
        if (chars)
            chars.rotateZ = chars.rotate;
        if (linesArray.length === 0 && lines) {
            linesArray = [lines];
        }
        if (wordsArray.length === 0 && words) {
            wordsArray = [words];
        }
        if (charsArray.length === 0 && chars) {
            charsArray = [chars];
        }
    }
    if (debug) {
        console.log({
            viewport,
            section,
            elements,
            lines,
            words,
            chars,
            elementsArray,
            linesArray,
            wordsArray,
            charsArray,
            preview,
            animations,
            textComponent,
            type,
            replay,
            repeat,
            reverse,
            debug,
            ...props
        });
    }
    if (!textComponent || textComponent?.length === 0) {
        if (isOnFramerCanvas) {
            return /*#__PURE__*/
            _jsx(ComponentPlaceholder, {
                style: {
                    width: "100%"
                },
                title: "Revelo",
                text: "<p>To add text to reveal on your page:<br/><br/>First, create a Text directly on Framer canvas (outside of any Breakpoint),<br/> and make sure to wrap it inside a Stack.<br/><br/>Then, select it via the 'Text Stack' dropdown in Revelo's properties panel.<br/>Or connect it using the component handle.<br/></p>"
            });
        }
    }
    // const children = Children.map(textComponent, (child) =>
    //     isValidElement(child)
    //         ? cloneElement(child, {
    //               style: {
    //                   ...child.props.style,
    //                   height: "auto",
    //                   width: "100%",
    //               },
    //           })
    //         : child
    // )
    const children = useMemo( () => recursiveMap(textComponent, child => child.props["data-framer-name"] ? /*#__PURE__*/
    cloneElement(child, {
        style: {
            ...child.props.style,
            height: "auto",
            width: "100%",
            opacity: "1"
        }
    }) : child), [textComponent]);
    if (debug) {
        console.log(children, textComponent);
    }
    // const children = textComponent
    // const children = recursiveMap(textComponent, (child) => {
    //     console.log(child)
    //     return child
    // })
    // if (debug) {
    //     console.log(textComponent, children)
    // }
    const isStatic = linesArray.length === 0 && wordsArray.length === 0 && charsArray.length === 0 && elementsArray.length === 0;
    // return <div className="revelo">{children}</div>
    const elementRef = useRef();
    const fallbackRef = useRef();
    const splitRef = useRef();
    // const isHoveringRef = useRef(false)
    const [timeline,setTimeline] = useState();
    const [reverseTimeline,setReverseTimeline] = useState();
    useEffect( () => {
        window.revelo.isLegacyMode = isLegacyMode;
        if (!linesArray.length && !wordsArray.length && !charsArray.length && !elementsArray.length)
            return;
        // if (!linesArray.length && !wordsArray.length && !charsArray.length) {
        //     if (elementRef.current) {
        //         elementRef.current.style.removeProperty("opacity")
        //     }
        //     return
        // }
        if (!splitRef.current)
            return;
        document.fonts.ready.then( () => {
            function findDeepestElement(element) {
                if (!element)
                    return null;
                if (element.children.length !== element.childNodes.length) {
                    return element;
                }
                if (element.children.length === 1) {
                    return findDeepestElement(element.children[0]);
                }
                return element;
            }
            const timeline = gsap.timeline();
            const reverseTimeline = gsap.timeline();
            // let scrollTrigger
            // let intersectionObserver
            // const controller = new AbortController()
            const deepestElement = findDeepestElement(splitRef.current);
            deepestElement.classList.add("elements");
            const type = `${linesArray.length > 0 ? "lines," : ""}${wordsArray.length > 0 ? "words," : ""}${charsArray.length > 0 ? "chars" : ""}`;
            // @ts-ignore
            const splitted = SplitText.create(deepestElement, {
                type,
                // mask:
                //     lines?.mask && lines?.mask !== "false"
                //         ? "lines"
                //         : words?.mask && words?.mask !== "false"
                //           ? "words"
                //           : chars?.mask && chars?.mask !== "false" && "chars",
                linesClass: "lines",
                wordsClass: "words",
                charsClass: "chars",
                // autoSplit: !isOnFramerCanvas,
                aria: "hidden",
                // onRevert: () => {},
                // reduceWhiteSpace: false,
                // ignore: "br",
                // deepSlice: true,
                // autoSplit: true,
                onSplit: splitted => {
                    // hotfix !! (should work as expected here: https://codepen.io/ClementRoche/pen/myPXJRO)
                    // if (splitted.lines.length === 1) {
                    //     splitted.lines.forEach((line) => {
                    //         line.classList.toggle("lines", false)
                    //     })
                    //     splitted.lines = [
                    //         ...splitted.lines
                    //             .map((line) => [...line.querySelectorAll("p")])
                    //             .flat(),
                    //     ]
                    //     splitted.lines.forEach((line) => {
                    //         line.classList.toggle("lines", true)
                    //     })
                    //     // hotfix !!
                    // }
                    // if (debug) {
                    splitted.lines.forEach(line => {
                        if (line.textContent === "") {
                            line.innerHTML = "&nbsp;";
                        }
                    }
                    );
                    // return
                    // }
                    if (elementRef.current) {
                        elementRef.current.style.removeProperty("opacity");
                    }
                    // return
                    const entries = {
                        elements: elementsArray,
                        lines: linesArray,
                        words: wordsArray,
                        chars: charsArray
                    };
                    Object.entries(entries).forEach( ([key,values]) => {
                        const splittedNodes = [...splitRef.current?.querySelectorAll(`.${key}`)];
                        // const splittedNodes = splitted[key]
                        console.log(key, splittedNodes);
                        const isSingle = values.length === 1;
                        if (splittedNodes.length > 0 && values.length > 0) {
                            splittedNodes.forEach( (node, nodeIndex) => {
                                const innerHTML = Array.from({
                                    length: values.length
                                }).map( () => isSingle ? `<div>${node.innerHTML}</div>` : `<div><div>${node.innerHTML}</div></div>`).join("");
                                node.innerHTML = innerHTML;
                            }
                            );
                            // return
                            values.forEach( (value, valueIndex) => {
                                const nodes = splittedNodes.map(node => isSingle ? node.children[valueIndex] : node.children[valueIndex].children[0]);
                                const parentNodes = nodes.map(node => node.parentNode);
                                const maskImageFrom = value?.maskImage && `linear-gradient(${value?.maskImage?.angle?.from}deg, ${value?.maskImage?.invert ? "transparent" : "black"} ${(-value?.maskImage?.spread?.from + value?.maskImage?.progress?.from) * 100}%, ${value?.maskImage?.invert ? "black" : "transparent"} ${value?.maskImage?.progress?.from * 100}%)`;
                                const maskImageTo = value?.maskImage && `linear-gradient(${value?.maskImage?.angle?.to}deg, ${value?.maskImage?.invert ? "transparent" : "black"} ${value?.maskImage?.progress?.to * 100}%, ${value?.maskImage?.invert ? "black" : "transparent"} ${(value?.maskImage?.progress?.to + value?.maskImage?.spread?.to) * 100}%)`;
                                const animatedNodes = nodes.map(node => findDeepestElement(node));
                                if (type === "trigger") {
                                    reverseTimeline.fromTo([...animatedNodes].reverse(), //[...nodes].reverse(),
                                    {
                                        ...getValues(value, "to"),
                                        maskImage: maskImageTo
                                    }, {
                                        ...getValues(value, "from"),
                                        maskImage: maskImageFrom,
                                        duration: value.duration,
                                        ease: value.ease,
                                        ...!isOnFramerCanvas && repeat && {
                                            // repeat: repeat?.count,
                                            // repeatDelay: repeat?.delay,
                                            yoyo: repeat?.yoyo
                                        },
                                        delay: -value.delay,
                                        force3D: false,
                                        stagger: {
                                            amount: value.stagger,
                                            from: value.origin
                                        }
                                    }, 0);
                                }
                                timeline.fromTo(animatedNodes, //nodes,
                                {
                                    ...getValues(value, "from"),
                                    maskImage: maskImageFrom
                                }, {
                                    ...getValues(value, "to"),
                                    maskImage: maskImageTo,
                                    duration: value.duration,
                                    ease: value.ease,
                                    ...!isOnFramerCanvas && repeat && {
                                        // repeat: repeat?.count,
                                        // repeatDelay: repeat?.delay,
                                        yoyo: repeat?.yoyo,
                                        yoyoEase: repeat?.yoyo
                                    },
                                    delay: value.delay,
                                    force3D: false,
                                    stagger: {
                                        amount: value.stagger,
                                        from: value.origin
                                    }
                                }, 0);
                                // return
                                // splitted[key].forEach((node) => {
                                //     node.innerHTML = `<div>${node.innerHTML}</div><div class="revelo-clone">${node.innerHTML}</div>`
                                // })
                                if (value.perspective > 0) {
                                    parentNodes.forEach(node => {
                                        node.style.setProperty("perspective", `${value.perspective}px`);
                                    }
                                    );
                                }
                                applyTransformOrigin(nodes, {
                                    x: value.transformOriginX,
                                    y: value.transformOriginY
                                });
                                // if (splitted.vars.mask === key) {
                                // applyOverflow(splitted[key], value?.mask)
                                if (value?.clip) {
                                    applyClip(parentNodes, value.clip, isOnFramerCanvas);
                                } else if (value?.mask) {
                                    // legacy
                                    applyOverflow(parentNodes, value?.mask);
                                }
                                // } else {
                                // }
                            }
                            );
                        }
                    }
                    );
                    reverseTimeline.pause();
                    reverseTimeline.progress(1);
                    timeline.pause();
                    timeline.progress(0);
                    setTimeline(timeline);
                    setReverseTimeline(reverseTimeline);
                    // if (!isOnFramerCanvas) {
                    //     if (type === "click") {
                    //         section?.current.addEventListener(
                    //             "click",
                    //             () => {
                    //                 timeline.play(0)
                    //             },
                    //             { signal: controller.signal }
                    //         )
                    //     } else if (type === "hover") {
                    //         section?.current.addEventListener(
                    //             "mouseenter",
                    //             () => {
                    //                 timeline.play(0)
                    //                 // isHoveringRef.current = true
                    //             },
                    //             { signal: controller.signal }
                    //         )
                    //     } else {
                    //         if (type === "trigger" && replay) {
                    //             intersectionObserver = new IntersectionObserver(
                    //                 ([entry]) => {
                    //                     if (!entry.isIntersecting) {
                    //                         timeline.pause()
                    //                         timeline.progress(0)
                    //                     }
                    //                 }
                    //             )
                    //             intersectionObserver.observe(fallbackRef.current, {
                    //                 rootMargin: "0px",
                    //                 threshold: 0,
                    //             })
                    //         }
                    //         scrollTrigger = ScrollTrigger.create({
                    //             trigger: section?.current,
                    //             scrub: type === "scrub",
                    //             start: `top ${viewport}`,
                    //             end:
                    //                 type === "trigger"
                    //                     ? `top ${viewport}`
                    //                     : `bottom ${viewport}`,
                    //             once: !replay && type === "trigger",
                    //             onEnter: () => {
                    //                 if (type === "trigger") {
                    //                     if (timeline.progress() === 0) {
                    //                         timeline.play(0)
                    //                     }
                    //                 }
                    //             },
                    //             onEnterBack: () => {
                    //                 if (type === "trigger") {
                    //                     if (timeline.progress() === 0) {
                    //                         timeline.play(0)
                    //                     }
                    //                 }
                    //             },
                    //             onUpdate: ({ progress }) => {
                    //                 if (type === "scrub") {
                    //                     timeline.progress(progress)
                    //                 }
                    //             },
                    //         })
                    //     }
                    // } else if (preview) {
                    //     timeline.repeat(Infinity)
                    //     timeline.play(0)
                    // } else {
                    //     timeline.pause()
                    //     timeline.progress(1)
                    // }
                    return timeline;
                }
            });
        }
        );
        return () => {
            // timeline.revert()
            // timeline.kill()
            // splitted.revert()
            if (fallbackRef.current && splitRef.current) {
                splitRef.current.innerHTML = fallbackRef.current.innerHTML;
            }
            setTimeline(null);
            setReverseTimeline(null);
            // if (intersectionObserver) {
            //     intersectionObserver?.disconnect()
            // }
            // if (scrollTrigger) {
            //     scrollTrigger?.kill()
            // }
            // if (controller) {
            //     controller?.abort()
            // }
            if (elementRef.current) {
                elementRef.current.style.setProperty("opacity", 1);
            }
        }
        ;
    }
    , [isOnFramerCanvas, type, preview, children, replay, repeat, viewport, // JSON.stringify(lines),
    // JSON.stringify(words),
    // JSON.stringify(chars),
    JSON.stringify(linesArray), JSON.stringify(wordsArray), JSON.stringify(charsArray)]);
    const [isHovered,setIsHovered] = useState(null);
    useEffect( () => {
        console.log({
            isHovered
        });
    }
    , [isHovered]);
    useEffect( () => {
        if (!section)
            return;
        if (type !== "hover")
            return;
        const controller = new AbortController;
        section?.current.addEventListener("mouseenter", () => {
            setIsHovered(true);
        }
        , {
            signal: controller.signal
        });
        section?.current.addEventListener("mouseleave", () => {
            setIsHovered(false);
        }
        , {
            signal: controller.signal
        });
        return () => {
            controller.abort();
        }
        ;
    }
    , [section, type]);
    const progressRef = useRef(0);
    useEffect( () => {
        if (!timeline)
            return;
        if (isHovered === null)
            return;
        console.log(timeline);
        if (isHovered) {
            // timeline.play(0)
            timeline.progress(progressRef.current);
            timeline.play();
        } else {
            timeline.progress(progressRef.current);
            timeline.reverse();
        }
        return () => {
            progressRef.current = timeline.progress();
        }
        ;
    }
    , [timeline, isHovered]);
    useEffect( () => {
        if (!timeline)
            return;
        if (!reverseTimeline)
            return;
        if (isOnFramerCanvas) {
            if (preview) {
                timeline.repeat(Infinity);
                timeline.play(0);
            } else {
                timeline.pause();
                timeline.progress(1);
            }
            return;
        }
        if (!section)
            return;
        let scrollTrigger;
        let intersectionObserver;
        const controller = new AbortController;
        if (type === "click") {
            section?.current.addEventListener("click", () => {
                timeline.play(0);
            }
            , {
                signal: controller.signal
            });
            // } else if (type === "hover") {
            //     console.log("hover")
            //     section?.current.addEventListener(
            //         "mouseenter",
            //         () => {
            //             timeline.play(0)
            //             console.log("mousenter")
            //         },
            //         { signal: controller.signal }
            //     )
        } else if (type === "trigger" || type === "scrub") {
            // if (type === "trigger" && replay) {
            //     intersectionObserver = new IntersectionObserver(([entry]) => {
            //         if (!entry.isIntersecting) {
            //             timeline.pause()
            //             timeline.reverse()
            //         }
            //     })
            //     intersectionObserver.observe(fallbackRef.current, {
            //         rootMargin: "0px",
            //         threshold: 0,
            //     })
            // }
            function onEnter() {
                if (!timeline)
                    return;
                if (!reverseTimeline)
                    return;
                if (type === "trigger") {
                    if (repeat) {
                        reverseTimeline.progress(1);
                        reverseTimeline.pause();
                        timeline.repeat(repeat?.count).repeatDelay(repeat?.delay).yoyo(repeat?.yoyo).play(0);
                    } else {
                        reverseTimeline.progress(1);
                        reverseTimeline.pause();
                        timeline.play(0);
                    }
                }
            }
            function onEnterBack() {
                if (!timeline)
                    return;
                if (!reverseTimeline)
                    return;
                if (type === "trigger") {
                    // if (timeline.progress() === 0) {
                    if (repeat) {
                        timeline.progress(1);
                        timeline.pause();
                        reverseTimeline.repeat(repeat?.count).repeatDelay(repeat?.delay).yoyo(repeat?.yoyo).play(0);
                        // }
                    } else {
                        timeline.progress(1);
                        timeline.pause();
                        reverseTimeline.play(0);
                    }
                }
            }
            scrollTrigger = ScrollTrigger.create({
                trigger: section?.current,
                scrub: type === "scrub",
                start: `top ${viewport}`,
                // end:
                //     type === "trigger"
                //         ? `top ${viewport}`
                //         : `bottom ${viewport}`,
                end: `bottom ${viewport}`,
                once: !replay && type === "trigger",
                onEnter: onEnter,
                onEnterBack: reverse ? onEnterBack : onEnter,
                onUpdate: ({progress}) => {
                    if (type === "scrub") {
                        timeline.progress(progress);
                    }
                }
            });
        }
        return () => {
            controller.abort();
            scrollTrigger?.kill();
            intersectionObserver?.disconnect();
        }
        ;
    }
    , [section, type, isOnFramerCanvas, preview, viewport, timeline, reverseTimeline, repeat, replay, reverse]);
    if (isStatic) {
        return /*#__PURE__*/
        _jsx("div", {
            className: "revelo",
            children: children
        });
    }
    return /*#__PURE__*/
    _jsx(_Fragment, {
        children: /*#__PURE__*/
        _jsxs("div", {
            ref: elementRef,
            style: {
                opacity: 0
            },
            className: "revelo",
            children: [/*#__PURE__*/
            _jsx("div", {
                ref: splitRef,
                children: children
            }), /*#__PURE__*/
            _jsx("div", {
                ref: fallbackRef,
                className: "revelo-fallback",
                style: {
                    position: "absolute",
                    inset: 0
                },
                children: children
            })]
        })
    });
}
Component.displayName = "Revelo";
addPropertyControls(Component, {
    textComponent: {
        title: "Text Stack",
        type: ControlType.ComponentInstance
    },
    type: {
        title: "Trigger",
        type: ControlType.Enum,
        defaultValue: "scrub",
        // displaySegmentedControl: true,
        // segmentedControlDirection: "horizontal",
        options: ["scrub", "trigger", "click", "hover"],
        optionTitles: ["Scroll Progress", "In View", "Click", "Hover"]
    },
    section: {
        title: "Section",
        type: ControlType.ScrollSectionRef
    },
    viewport: {
        type: ControlType.Enum,
        defaultValue: "bottom",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        options: ["top", "center", "bottom"],
        optionIcons: ["align-top", "align-middle", "align-bottom"],
        hidden: props => {
            return props.type !== "trigger" && props.type !== "scrub";
        }
        ,
        description: "───────────"
    },
    replay: {
        title: "Replay",
        type: ControlType.Boolean,
        defaultValue: false,
        hidden: props => props.type !== "trigger"
    },
    reverse: {
        title: "Reverse",
        type: ControlType.Boolean,
        defaultValue: false,
        hidden: props => props.type !== "trigger" || !props.replay
    },
    repeat: {
        title: "Repeat",
        type: ControlType.Object,
        controls: {
            count: {
                type: ControlType.Number,
                min: -1,
                defaultValue: -1,
                step: 1,
                description: "Use -1 to repeat indefinitely"
            },
            delay: {
                type: ControlType.Number,
                min: 0,
                step: .1,
                max: 10,
                defaultValue: 0
            },
            yoyo: {
                type: ControlType.Boolean,
                defaultValue: false
            }
        },
        optional: true,
        hidden: props => props.type !== "trigger",
        description: "───────────"
    },
    lines: {
        title: "Lines",
        buttonTitle: "Properties",
        type: ControlType.Object,
        optional: true,
        controls: setAnimatedProperties(true)
    },
    words: {
        title: "Words",
        buttonTitle: "Properties",
        type: ControlType.Object,
        controls: setAnimatedProperties(true),
        optional: true
    },
    chars: {
        title: "Letters",
        buttonTitle: "Properties",
        type: ControlType.Object,
        controls: setAnimatedProperties(true),
        optional: true,
        // hidden: true, // legacy 1.0
        description: "Cooked and served by [darkroom.engineering](https://darkroom.engineering)."
    },
    elementsArray: {
        title: "Element",
        // type: ControlType.Object,
        //controls: setAnimatedProperties(),
        // optional: true,
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: setAnimatedProperties()
        },
        optional: true
    },
    linesArray: {
        title: "Lines",
        buttonTitle: "Properties",
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: setAnimatedProperties()
        },
        optional: true
    },
    wordsArray: {
        title: "Words",
        buttonTitle: "Properties",
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: setAnimatedProperties()
        },
        optional: true
    },
    charsArray: {
        title: "Letters",
        buttonTitle: "Properties",
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: setAnimatedProperties()
        },
        optional: true,
        description: "Cooked and served by [darkroom.engineering](https://darkroom.engineering)."
    },
    preview: {
        title: "Preview",
        type: ControlType.Boolean,
        defaultValue: true
    },
    debug: {
        defaultValue: false,
        type: ControlType.Boolean
    }
});
export const __FramerMetadata__ = {
    "exports": {
        "default": {
            "type": "reactComponent",
            "name": "Component",
            "slots": [],
            "annotations": {
                "framerSupportedLayoutHeight": "auto",
                "framerContractVersion": "1",
                "framerIntrinsicWidth": "800",
                "framerDisableUnlink": "",
                "framerCanvasComponentVariantDetails": "{\"propertyName\":\"variant\",\"data\":{\"default\":{\"layout\":[\"fixed\",\"auto\"]}}}",
                "framerSupportedLayoutWidth": "any"
            }
        },
        "__FramerMetadata__": {
            "type": "variable"
        }
    }
}
//# sourceMappingURL=./Revelo.map
