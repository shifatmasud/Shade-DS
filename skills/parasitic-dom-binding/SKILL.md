# Parasitic DOM Binding Skill

This skill defines the architectural pattern for "Parasitic Self-Aware" components that bind directly to DOM elements (parent or sibling) to augment behavior or rendering without explicit prop-drilling or complex state orchestration from the host component.

## Core Philosophy
Parasitic components are "dropped into" a DOM tree and "latch onto" a target (usually their parent or first sibling). They observe the target, listen to its events, or mirror its geometry to provide enhanced visual effects (Ripples, State Overlays, Success Masks, Typewriter effects) with minimal integration friction.

## Key Principles
1. **Zero-Config Drops**: The component should require minimal to no props to function in its default state.
2. **DOM Discovery**: Use `useLayoutEffect` and `ref.current.parentElement` or `ref.current.previousElementSibling` to find the target.
3. **Geometry Mirroring**: Often uses `position: absolute; inset: 0; border-radius: inherit; pointer-events: none;` to perfectly overlay the target.
4. **Event Hijacking/Augmentation**: Attaches native event listeners directly to the target DOM node to trigger internal animations (e.g., Ripple on `mousedown`).
5. **State Autonomy**: Manages its own animation state independently of the React component tree of the host.

## Implementation Pattern (Parent Binding)
```tsx
const ParasiticLayer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (containerRef.current?.parentElement) {
      const parent = containerRef.current.parentElement;
      setTarget(parent);
      
      // Ensure parent has position for absolute children
      const computedStyle = window.getComputedStyle(parent);
      if (computedStyle.position === 'static') {
        parent.style.position = 'relative';
      }
    }
  }, []);

  useEffect(() => {
    if (!target) return;
    const handleEvent = () => { /* trigger logic */ };
    target.addEventListener('mousedown', handleEvent);
    return () => target.removeEventListener('mousedown', handleEvent);
  }, [target]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
};
```

## Implementation Pattern (Sibling Binding)
Used for components that enhance text or specific elements without wrapping them in the JSX.
```tsx
const SiblingEnhancer = () => {
  const ref = useRef<HTMLDivElement>(null);
  
  useLayoutEffect(() => {
    const sibling = ref.current?.previousElementSibling;
    if (sibling instanceof HTMLElement) {
      // Mirror styles or hide sibling to take over rendering
      // sibling.style.visibility = 'hidden';
    }
  }, []);

  return <div ref={ref} />;
};
```

## When to Use
- **Visual Decorations**: Ripples, success flashes, focus rings.
- **Micro-Interactions**: Hover states, press states.
- **Text Enhancements**: Typewriter effects, animated counters that "take over" a static text node.
- **Global Constraints**: When you cannot modify the parent component's code but want to add behavior.

## Why use this?
- **Separation of Concerns**: The parent doesn't need to know about the complex animation logic of a Ripple or a Success flash.
- **Performance**: Direct DOM binding can sometimes bypass React re-render cycles for high-frequency interactions (like mouse tracking).
- **Clean JSX**: Keeps the host component's return statement focused on structure, not decoration.
