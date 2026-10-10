# Dynamic FAQ Accordion

Make a FAQ accordion where opening one item automatically closes the others, without wrapping everything in a single Framer component or manually wiring every variant.

Apply this override to each FAQ item on the canvas. The item must be a component with two variants named `Closed` and `Opened`. A shared store tracks which item is open; `useId` gives each instance a stable unique id, so the override swaps the variant and toggles open/closed on tap.

```tsx
import type { ComponentType } from "react"
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"
import { useId } from "react"

const useFAQStore = createStore({
    openId: null as string | null,
})

export function withFAQItem(Component): ComponentType {
    return (props) => {
        const [store, setStore] = useFAQStore()
        const myId = useId()
        const isOpen = store.openId === myId

        return (
            <Component
                {...props}
                variant={isOpen ? "Opened" : "Closed"}
                onTap={() => setStore({ openId: isOpen ? null : myId })}
            />
        )
    }
}
```

Why it works:
- `createStore` gives every instance access to the same `openId`, so opening one item closes whichever was previously open.
- `useId` generates a stable id per instance across renders (no need to hand-assign ids to each FAQ).
- Tapping an already-open item sets `openId` back to `null`, collapsing everything.

Requirements:
- The FAQ component has variants named exactly `Closed` and `Opened` (rename in the code if you use different names).
- The override is applied to the outer tappable element of each FAQ item.
