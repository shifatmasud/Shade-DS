import { useState, useLayoutEffect, useEffect, type RefObject } from 'react';

/**
 * 🔗 useHost (Parasitic DOM Binding Hook)
 * Finds and binds to a host element (parent or sibling).
 */
export const useHost = (ref: RefObject<HTMLElement>, mode: 'parent' | 'sibling' = 'parent') => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    
    let target = mode === 'parent' 
      ? ref.current.parentElement 
      : ref.current.previousElementSibling as HTMLElement | null;
      
    // Framer Detection: Move to grandparent if parent is a wrapper
    if (target && (target.hasAttribute('data-framer-component-type') || target.hasAttribute('data-framer-generated'))) {
       target = target.parentElement;
    }
    
    setHost(target);
  }, [ref, mode]);

  return host;
};

/**
 * 📏 useHostRect
 * Returns a live bounding rectangle of the host using ResizeObserver.
 */
export const useHostRect = (host: HTMLElement | null) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!host) return;

    const update = () => setRect(host.getBoundingClientRect());
    const observer = new ResizeObserver(update);
    
    observer.observe(host);
    update();

    return () => observer.disconnect();
  }, [host]);

  return rect;
};

/**
 * 👂 useHostEvents
 * Centralized native event binding for parasitic components.
 */
export const useHostEvents = (host: HTMLElement | null, events: Record<string, (e: any) => void>) => {
  useEffect(() => {
    if (!host) return;
    
    const entries = Object.entries(events);
    entries.forEach(([name, handler]) => host.addEventListener(name, handler, name === 'touchmove' ? { passive: false } : undefined));
    
    return () => {
      entries.forEach(([name, handler]) => host.removeEventListener(name, handler));
    };
  }, [host, events]);
};

/**
 * 🎨 useHostStyles
 * Temporarily applies styles to the host (e.g., setting position: relative).
 */
export const useHostStyles = (host: HTMLElement | null, styles: Partial<CSSStyleDeclaration>) => {
  useLayoutEffect(() => {
    if (!host) return;
    
    const backups = new Map<string, string>();
    const entries = Object.entries(styles);
    
    entries.forEach(([key, value]) => {
      if (value !== undefined) {
        backups.set(key, (host.style as any)[key]);
        (host.style as any)[key] = value;
      }
    });
    
    return () => {
      backups.forEach((originalValue, key) => {
        (host.style as any)[key] = originalValue;
      });
    };
  }, [host, styles]);
};
