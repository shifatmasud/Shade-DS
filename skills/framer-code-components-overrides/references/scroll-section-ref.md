# ScrollSectionRef (Undocumented Framer Control)

What is it?

"ControlType.ScrollSectionRef" is an undocumented/internal Framer property control that allows a code component to reference a Scroll Section selected by the designer in the Properties panel.

Unlike a string or component instance, Framer injects a live reference to the selected Scroll Section.

---

Define the property

addPropertyControls(Component, {
    section: {
        // @ts-ignore
        type: ControlType.ScrollSectionRef,
        title: "Section",
    },
    viewport: {
        type: ControlType.Enum,
        title: "Viewport",
        displaySegmentedControl: true,

        options: ["top", "center", "bottom"],
        optionTitles: [
            "Top (Viewport Top)",
            "Center (Viewport Center)",
            "Bottom (Viewport Bottom)",
        ],
        //@ts-ignore
        optionIcons: ["align-top", "align-middle", "align-bottom"],
        defaultValue: "bottom",
    },
})

---

Receive the prop

export default function Component({ section }) {
    // section is injected by Framer
}

---

Use the reference

The injected object appears to behave like a React ref.

const element = section?.current

element?.scrollIntoView()

element?.addEventListener("click", () => {})

It can also be passed directly to libraries expecting an "HTMLElement".

Example:

ScrollTrigger.create({
    trigger: section?.current,
})

---

Typical use cases

- GSAP ScrollTrigger
- Framer Motion "useScroll"
- IntersectionObserver
- Custom scroll animations
- Scroll-linked interactions
- DOM event listeners

---

Notes

- This is not part of Framer's public API.
- TypeScript requires:

// @ts-ignore
type: ControlType.ScrollSectionRef

- The exact object shape is undocumented and may change.
- Current evidence suggests it behaves like:

interface ScrollSectionRef {
    current: HTMLElement | null
}

---

Agent Rule

Use "ControlType.ScrollSectionRef" whenever a code component needs the user to select a Scroll Section from the Framer canvas instead of manually querying the DOM or asking for an element ID. Treat the injected value as a React-like ref and access the DOM element through "section?.current". 

**Crucial**: Whenever `ScrollSectionRef` is used, you MUST also include a `viewport` enum control (top, center, bottom) to allow the designer to specify the trigger point relative to the viewport.
