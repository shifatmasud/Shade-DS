# Inherit Property Controls

## Purpose

When wrapping an existing Framer Design or Code Component, inherit its Property Controls so designers continue editing it exactly as before.

This avoids duplicating control definitions and keeps the wrapper synchronized with the original component.

---

## Why

A wrapper component becomes the component Framer exposes in the canvas.

Without inheriting Property Controls:

- Original controls disappear.
- Designers cannot edit wrapped component props.
- Controls must be manually recreated.
- Wrapper and source controls can drift over time.

Using `getPropertyControls()` copies the original control definitions automatically.

---

## Pattern

```tsx
import {
    addPropertyControls,
    getPropertyControls,
    ControlType,
} from "framer"

// Example: Importing a component from a Framer URL or local file
import Card from "https://framer.com/m/Card.js"

export default function AnimatedCard(props) {
    return <Card {...props} />
}

addPropertyControls(AnimatedCard, {
    ...getPropertyControls(Card),

    animateOnScroll: {
        type: ControlType.Boolean,
        title: "Scroll FX",
        defaultValue: true,
    },
})
```

---

## Use Cases

Use this pattern when:

- Wrapping Design Components
- Wrapping Code Components
- Adding animation
- Adding scroll behavior
- Adding analytics
- Adding accessibility improvements
- Adding state management
- Adding 3D backgrounds
- Extending components without changing their editing experience

---

## Benefits

- Zero duplicated Property Controls
- Automatically stays synchronized
- Better designer experience
- Easier maintenance
- Add new controls without removing existing ones

---

## Do

- Spread inherited controls first.
- Add wrapper-specific controls afterward.
- Forward all props to the wrapped component.

---

## Don't

- Recreate existing controls manually.
- Remove inherited controls unless intentional.
- Forget to pass props to the wrapped component.

---

## Mental Model

`getPropertyControls()` clones the Property Panel of another component so a wrapper behaves like the original while exposing additional functionality.

---

## Agent Rule

Use `getPropertyControls()` whenever a wrapper component should preserve the original Framer editing experience of its child. Always spread the inherited controls first and ensure all props are forwarded to the wrapped component.
