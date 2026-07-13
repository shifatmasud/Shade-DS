# Parasitic Layer Component Skill

This skill defines the architectural pattern for "Parasitic Self-Aware" components that bind directly to DOM elements to augment behavior or rendering without explicit prop-drilling or complex state orchestration from the host component.

## Core Philosophy
Parasitic components are "dropped into" a DOM tree and "latch onto" a target. They observe the target, listen to its events, or mirror its geometry to provide enhanced visual effects with minimal integration friction.

## Key Principles (v2)
1. **Zero-Config Drops**: The component should require minimal to no props to function.
2. **Grandparent Discovery (Framer)**: Framer often wraps children in an intermediate DOM element. Parasites must detect this and bind to the **Grandparent** to ensure correct overlay alignment and event capture.
3. **Immaculate Cleanup**: Every parasite MUST restore anything it changes. This includes removing listeners, disconnecting observers, restoring original styles, and cancelling animations on unmount.
4. **Layout Vigilance**: Use `ResizeObserver` (and `MutationObserver` if necessary) to keep overlays synced with the host's geometry.
5. **Mutation Restraint**: Avoid mutating the host's styles (e.g., `parent.style.position = "relative"`) unless absolutely necessary. Prefer warning in development or using a host wrapper helper.

## Shared Utilities (The Harness)
Most parasites require the same infrastructure. Use these patterns inside your components:

```tsx
/**
 * Shared Infrastructure for Parasitic Binding
 */

export const useHost = (ref: React.RefObject<HTMLElement>) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    
    // Standard Parent
    let target = ref.current.parentElement;
    
    // Framer Detection: If parent is a Framer wrapper, move to grandparent
    // Framer wrappers often have 'data-framer-component-type' or are just div/span wrappers
    if (target && (target.hasAttribute('data-framer-component-type') || target.hasAttribute('data-framer-generated'))) {
       target = target.parentElement;
    }
    
    setHost(target);
  }, []);

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

## Implementation Pattern (Framer-Ready)
```tsx
const RippleLayer = () => {
  const ref = useRef<HTMLDivElement>(null);
  const host = useHost(ref);
  const rect = useHostRect(host);

  // Auto-Cleanup Events
  useHostEvents(host, {
    mousedown: (e) => triggerRipple(e),
    touchstart: (e) => triggerRipple(e)
  });

  if (!host || !rect) return <div ref={ref} />;

  return (
    <motion.div 
      style={{ 
        position: 'absolute', 
        left: 0, 
        top: 0, 
        width: rect.width, 
        height: rect.height,
        pointerEvents: 'none',
        borderRadius: window.getComputedStyle(host).borderRadius
      }}
    >
      {/* Ripple Elements */}
    </motion.div>
  );
};
```

## When to Use
- **Visual Decorations**: Ripples, success flashes, focus rings.
- **Micro-Interactions**: Hover states, press states.
- **Framer Overrides**: When building components that must perfectly overlay Framer-generated elements.
- **Global Constraints**: When you cannot modify the parent component's code but want to add behavior.

## Why use this?
- **Separation of Concerns**: The host doesn't need to know about the complex decoration logic.
- **Immaculate DOM**: Automatic cleanup ensures the page stays clean as components mount/unmount.
- **Resilient Layout**: `ResizeObserver` ensures decorations stay perfectly aligned even during layout shifts or browser resizing.
