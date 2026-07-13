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
