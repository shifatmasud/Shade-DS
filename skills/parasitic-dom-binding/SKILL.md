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

## Invisible Component Pattern
Parasitic components should ideally not impact the layout. Use an invisible container to bind to the DOM without rendering any visible UI directly:

```tsx
<div
    ref={containerRef}
    style={{
        width: 0,
        height: 0,
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        opacity: 0,
        zIndex: -1,
    }}
/>
```

## Shared Utilities (The Harness)
Most parasites require the same infrastructure. Use these patterns inside your components:

```tsx
/**
 * Shared Infrastructure for Parasitic Binding
 */

export const useHost = (ref: React.RefObject<HTMLElement>, mode: 'parent' | 'sibling' = 'parent') => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    
    let target: HTMLElement | null = null;
    
    if (mode === 'parent') {
      target = ref.current.parentElement;
      
      // Framer Detection: If parent is a Framer wrapper, move to grandparent
      // Framer wrappers often have 'data-framer-component-type' or are just div/span wrappers
      if (target && (target.hasAttribute('data-framer-component-type') || target.hasAttribute('data-framer-generated'))) {
         target = target.parentElement;
      }
    } else {
      // Sibling Mode: Binds to the immediate previous sibling
      target = ref.current.previousElementSibling as HTMLElement | null;
    }
    
    setHost(target);
  }, [mode]);

  return host;
};

export const useHostRect = (host: HTMLElement | null) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!host) return;

    const observer = new ResizeObserver(() => {
      setRect(host.getBoundingClientRect());
    });

    observer.observe(host);
    setRect(host.getBoundingClientRect());

    return () => observer.disconnect();
  }, [host]);

  return rect;
};

export const useHostEvents = (host: HTMLElement | null, events: Record<string, (e: any) => void>) => {
  useEffect(() => {
    if (!host) return;
    
    const entries = Object.entries(events);
    entries.forEach(([name, handler]) => host.addEventListener(name, handler));
    
    return () => {
      entries.forEach(([name, handler]) => host.removeEventListener(name, handler));
    };
  }, [host, events]);
};

export const useHostStyles = (host: HTMLElement | null, styles: Partial<CSSStyleDeclaration>) => {
  useLayoutEffect(() => {
    if (!host) return;
    
    const originalStyles: Record<string, string> = {};
    const keys = Object.keys(styles) as Array<keyof CSSStyleDeclaration>;
    
    // Backup and Apply
    keys.forEach(key => {
      originalStyles[key as string] = host.style[key] as string;
      (host.style as any)[key] = styles[key as any];
    });
    
    return () => {
      // Restore
      keys.forEach(key => {
        host.style[key as any] = originalStyles[key as string] as any;
      });
    };
  }, [host, styles]);
};
```

## Implementation Pattern (Parent Binding)
```tsx
const ParasiticLayer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const target = useHost(containerRef);

  useLayoutEffect(() => {
    if (target) {
      // Ensure parent has position for absolute children
      const computedStyle = window.getComputedStyle(target);
      if (computedStyle.position === 'static') {
        target.style.position = 'relative';
      }
    }
  }, [target]);

  useHostEvents(target, {
    mousedown: () => { /* trigger logic */ }
  });

  return <div ref={containerRef} style={{ width: 0, height: 0, position: 'absolute', top: 0, left: 0, pointerEvents: 'none', opacity: 0, zIndex: -1 }} />;
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
