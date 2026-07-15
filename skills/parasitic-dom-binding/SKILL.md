# Parasitic DOM Binding Skill

This skill defines the architectural pattern for "Parasitic Self-Aware" components that bind directly to DOM elements (parent or sibling) to augment behavior or rendering without explicit prop-drilling or complex state orchestration from the host.

## Core Philosophy & Principles
Parasitic components are "dropped" into a DOM tree to "latch onto" a target. They observe, listen, or mirror geometry to provide enhanced visual effects (Ripples, Overlays, Success Masks) with minimal integration friction.

1. **Zero-Config Drops**: Functional out-of-the-box with minimal props.
2. **DOM Discovery**: Use `useLayoutEffect` to find targets via `parentElement` or `previousElementSibling`.
3. **Geometry Mirroring**: Overlay targets using `position: absolute; inset: 0; border-radius: inherit; pointer-events: none;`.
4. **Event Augmentation**: Attach native listeners directly to the host DOM node.
5. **State Autonomy**: Independent animation state management.

## Container Strategies
The strategy depends on whether the component provides invisible logic or a visible UI layer.

### 1. Logic Injectors (Invisible)
For components that only augment the host without needing visible UI (e.g., `StyleInjector`, `ScrollTransformInjector`), use a zero-size invisible container:

```tsx
<div
    ref={containerRef}
    style={{
        width: 0, height: 0, position: "absolute", top: 0, left: 0,
        pointerEvents: "none", opacity: 0, zIndex: -1, visibility: "hidden"
    }}
/>
```

### 2. UI Layers (Visible)
For components rendering visible overlays (e.g., `StateLayer`, `RippleLayer`, `SuccessLayer`), the container must cover the host bounds:

```tsx
<div
    ref={containerRef}
    style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        borderRadius: "inherit", overflow: "hidden", zIndex: 0
    }}
>
    {/* Visual Elements */}
</div>
```

## Binding Patterns

### Parent Binding (Standard)
The most common pattern for adding feedback layers to buttons or containers.
- **Pattern**: Component finds `ref.current.parentElement`.
- **Use Cases**: `RippleLayer`, `StateLayer`, `SuccessLayer`.

### Sibling Binding (Replacement)
Used for components that "take over" the rendering of a sibling element.
- **Pattern**: Component finds `ref.current.previousElementSibling`, hides it, and renders a dynamic replacement.
- **Use Cases**: `AnimatedCounter` (syncs with numeric text), `DoubleLayeredText` (shimmer/typewriter effects).

## Framer Canvas Specifics (Parasitic Discovery)
In Framer, components and canvas elements (Text, SVG, Frames) are often wrapped in dynamic container divs. Standard `previousElementSibling` may fail if the target is sibling-once-removed or nested.

### 1. The "Single File" Rule
When deploying to the Framer Canvas as a Code Component:
- **Constraint**: The component MUST be a single, self-contained file.
- **Version**: Use React 18.2.0 compatible syntax.
- **Dependency Immunity**: Avoid importing from internal project paths (e.g., `../../Theme`). Use standard CSS or inline styles to ensure the component is portable and doesn't break when copy-pasted into the Framer Editor.
- **Export**: Use `export default function ComponentName()`.

### 2. Shared Layout Parent Strategy
Instead of adjacent sibling lookup, use the `shared-parent` mode in `useHost` (or manual climbing) to find the nearest structural parent (Frame or Stack) and scan its children.

```tsx
// Discovery Strategy: Shared Parent Scan
const host = useHost(ref, "shared-parent"); // Climbs until it finds a multi-child container

if (host) {
    Array.from(host.children).forEach((child) => {
        if (child === el || child.contains(el)) return;
        
        // Target via stable Framer attributes
        const type = child.getAttribute("data-framer-component-type");
        if (type === "RichTextContainer") { /* Target Text */ }
        if (type === "SVG" || child.querySelector("svg")) { /* Target SVG */ }
    });
}
```

### 2. Targeting Stable Attributes
Avoid dynamic class names (`framer-1hu7...`). Use `[data-framer-component-type]` to identify siblings:
- `RichTextContainer`: Contains `p`, `span`, or `h1-h6`.
- `SVG`: Contains the semantic `svg` node.
- `Frame`: Layout containers.

### 3. Deep Semantic Manipulation
Once the container is found, use `querySelector` to find the actual element for manipulation:
- **Text**: `container.querySelector("p, span")`.
- **SVG**: `container.querySelector("svg")`.
- **SVG Fills**: SVGs in Framer often require fill overrides on inner graphics (`path, use, rect, circle`). Always use `querySelectorAll` to apply colors to the entire graphic.

### 4. Mutation & Polling
Framer's DOM can be dynamic or deferred during hydration.
- **Polling**: Use a short `setTimeout` (500-1000ms) for discovery fallback.
- **MutationObserver**: Observe the `sharedParent` for `childList` changes to detect new siblings or state changes.

## Specialized: SVG Path Injection
Targeting SVGs in Framer requires handling unique DOM structures like `<use>` tags and using advanced animation APIs.

### 1. The <use> Tag Resolution
Framer often uses `<use href="#id">` to render SVGs. To animate paths, you must resolve these to actual DOM nodes:
```tsx
const resolveUseTags = (svg: SVGSVGElement) => {
    const useTags = svg.querySelectorAll("use")
    useTags.forEach((use) => {
        const href = use.getAttribute("href") || use.getAttribute("xlink:href")
        if (!href || !href.startsWith("#")) return
        const targetId = href.substring(1)
        const targetElement = document.getElementById(targetId)
        if (targetElement) {
            const clone = targetElement.cloneNode(true) as HTMLElement
            // If it's a symbol, append its children
            if (clone.tagName.toLowerCase() === "symbol") {
                const fragment = document.createDocumentFragment()
                while (clone.firstChild) fragment.appendChild(clone.firstChild)
                use.parentElement?.insertBefore(fragment, use)
            } else {
                use.parentElement?.insertBefore(clone, use)
            }
            use.style.display = "none" // Hide original
        }
    })
}
```

### 2. High-Precision Animation with `svgEffect`
For "drawing" animations, use Framer Motion's `svgEffect` for performant per-frame updates without React re-renders:
```tsx
import { svgEffect, motionValue, animate } from "framer-motion"

// Bind effect to targets (path, rect, circle, etc.)
const progress = motionValue(0)
const cancel = svgEffect(drawableElements, {
    pathLength: progress
})

// Animate progress 0 -> 1
animate(progress, 1, { duration: 1.5 })

// Cleanup on unmount
return () => cancel()
```

## UI Pattern: Injector Visuals
Since Injectors are purely behavioral, they should provide visual feedback in the Framer Canvas while remaining invisible or subtle in the final site.

1. **Editor Visibility**: Use a dashed border and clear label (e.g., "SVG INJECTOR") when `found` state is detected.
2. **Interactive States**: Provide hover/click feedback in the editor to test the "Injector" logic.
3. **Status Indicators**: Use small color dots (Green = Found, Red = Searching) to help users debug layout hierarchy.

## Implementation Harness (`useHost.ts`)
The `hooks/useHost.ts` utility provides the standard infrastructure for all parasitic components:

- **`useHost(ref, mode)`**: Finds the target (detects Framer wrappers automatically).
- **`useHostRect(host)`**: Returns a live `DOMRect` of the target via `ResizeObserver`.
- **`useHostEvents(host, events)`**: Attaches native listeners (e.g., `mousedown`, `mouseenter`).
- **`useHostStyles(host, styles)`**: Temporarily overrides or backups target styles.

## Applications & Benefits
- **Visual Decorations**: Ripples, success flashes, focus rings.
- **Micro-Interactions**: Hover/press states, physics-driven trackers.
- **Text Enhancements**: Taking over static text nodes for high-performance counters.
- **Separation of Concerns**: Keeps host components clean; decoration logic is isolated.
- **Performance**: Direct DOM binding bypasses React re-render cycles for high-frequency events.
