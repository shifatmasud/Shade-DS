import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import AnimatedNavigation from "https://framer.com/m/Animated-Navigation-lwywlI.js@Vg51Ty0kv4CfBaGYZsUZ"

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 60
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function NavigationControl(props) {
    const { variant, ...rest } = props

    return (
        <AnimatedNavigation
            {...rest}
            variant={variant}
            style={{
                width: "100%",
                height: "100%",
            }}
        />
    )
}

NavigationControl.defaultProps = {
    variant: "Small", // Defaulting to Small as requested "sets its variant to Small from Desktop"
    width: 1200,
    height: 60,
}

addPropertyControls(NavigationControl, {
    variant: {
        type: ControlType.Enum,
        title: "Variant",
        options: ["Desktop", "Small"],
        optionTitles: ["Desktop", "Small"],
        defaultValue: "Small",
    },
})
