import { useState, useLayoutEffect, useEffect, type RefObject } from 'react';

/**
 * 🔗 useHost (Parasitic DOM Binding Hook)
 * 
 * Dynamically finds and binds to a host element (parent or sibling).
 * Includes specialized detection for Framer components to avoid binding to wrappers.
 * 
 * @param ref - The ref of the parasitic component itself
 * @param mode - Whether to bind to 'parent' or 'sibling'
 */
export const useHost = (ref: RefObject<HTMLElement>, mode: 'parent' | 'sibling' = 'parent') => {
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
      
      // Secondary Framer Detection: div/span wrappers without attributes but serving as layout containers
      // We check if the target has a 'framer-' class or common Framer patterns if needed.
    } else {
      // Sibling Mode: Binds to the immediate previous sibling
      target = ref.current.previousElementSibling as HTMLElement | null;
    }
    
    setHost(target);
  }, [ref, mode]);

  return host;
};

/**
 * 📏 useHostRect
 * Observes and returns the bounding rectangle of the host.
 */
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

/**
 * 👂 useHostEvents
 * Attaches native event listeners directly to the host DOM node.
 */
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

/**
 * 🎨 useHostStyles
 * Mirror specific styles from the host or apply temporary overrides.
 */
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
        if (host) {
          (host.style as any)[key] = originalStyles[key as string];
        }
      });
    };
  }, [host, styles]);
};
