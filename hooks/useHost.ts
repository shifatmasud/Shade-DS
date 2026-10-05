import { useState, useLayoutEffect, useEffect, type RefObject } from 'react';

/**
 * 🏷️ Framer Component Types
 */
export type FramerNativeType = 'Path' | 'SVG' | 'VectorSet' | 'Image' | 'Text' | 'RichTextContainer' | 'Container';

/**
 * 🔗 useHost (Parasitic DOM Binding Hook)
 * Finds and binds to a host element (parent, sibling, shared-parent, or named ancestor).
 */
export const useHost = (
  ref: RefObject<HTMLElement | null>,
  mode: 'parent' | 'sibling' | 'shared-parent' | 'ancestor' = 'parent',
  ancestorName?: string
) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;

    let target: HTMLElement | null = null;

    if (mode === 'parent') {
      target = ref.current.parentElement;
    } else if (mode === 'sibling') {
      target = (ref.current.previousElementSibling || ref.current.nextElementSibling) as HTMLElement | null;
    } else if (mode === 'shared-parent') {
      // Specialized for Framer: Find the nearest structural parent that acts as a layout container
      let candidate = ref.current.parentElement;
      while (candidate && candidate.children.length <= 1 && candidate.tagName !== 'BODY') {
        candidate = candidate.parentElement;
      }
      target = candidate;
    } else if (mode === 'ancestor') {
      let candidate = ref.current.parentElement;
      while (candidate && candidate.tagName !== 'BODY') {
        if (ancestorName && candidate.getAttribute('data-framer-name') === ancestorName) {
          target = candidate;
          break;
        }
        if (!ancestorName && candidate.hasAttribute('data-framer-root')) {
          target = candidate;
          break;
        }
        candidate = candidate.parentElement;
      }
      if (!target && candidate) target = candidate;
    }

    // Framer Detection Fallback: Move to parent if current target is a transparent wrapper or specific wrapper
    if (mode === 'parent' && target) {
      const isFramerWrapper =
        target.hasAttribute('data-framer-component-type') ||
        target.hasAttribute('data-framer-generated') ||
        target.hasAttribute('data-framer-background-image-wrapper');
      const isTransparent = window.getComputedStyle(target).pointerEvents === 'none';

      if ((isFramerWrapper || isTransparent) && target.parentElement && target.parentElement.tagName !== 'BODY') {
        target = target.parentElement;
      }
    }

    setHost(target);
  }, [ref, mode, ancestorName]);

  return host;
};

/**
 * 🔍 getFramerComponentType
 * Detects the Framer native component type based on attributes and DOM node properties.
 *
 * Handles:
 * 1. Path: div [data-framer-component-type="SVG"]
 * 2. Vector Set: svg [data-framer-name] (direct <svg> element)
 * 3. Image: element containing [data-framer-background-image-wrapper] or <img>
 * 4. Text: div [data-framer-component-type="RichTextContainer"] or element containing <p>, <span>
 */
export const getFramerComponentType = (el: HTMLElement | SVGElement | null): FramerNativeType => {
  if (!el) return 'Container';

  const typeAttr = el.getAttribute('data-framer-component-type');
  const tagName = el.tagName.toLowerCase();

  if (typeAttr === 'SVG') return 'Path';
  if (tagName === 'svg') return 'VectorSet';
  if (typeAttr === 'RichTextContainer') return 'Text';

  if (
    el.hasAttribute('data-framer-background-image-wrapper') ||
    el.querySelector('[data-framer-background-image-wrapper]') ||
    el.querySelector('img') ||
    tagName === 'img'
  ) {
    return 'Image';
  }

  if (el.querySelector('p, span, h1, h2, h3, h4, h5, h6')) {
    return 'Text';
  }

  if (el.querySelector('svg')) {
    return 'Path';
  }

  return 'Container';
};

/**
 * 🎯 getFramerInnerTarget
 * Extracts the inner native interactive DOM target from a Framer component wrapper.
 * - Text -> <p> / <span>
 * - Path / Vector Set -> <svg> or <use> / <path>
 * - Image -> <img> or [data-framer-background-image-wrapper]
 */
export const getFramerInnerTarget = (el: HTMLElement | SVGElement | null): HTMLElement | SVGElement | null => {
  if (!el) return null;

  const type = getFramerComponentType(el);

  if (type === 'Text') {
    return (el.querySelector('p, span, h1, h2, h3, h4, h5, h6') as HTMLElement) || (el as HTMLElement);
  }

  if (type === 'Path') {
    return (el.querySelector('svg') as SVGElement) || (el as SVGElement);
  }

  if (type === 'VectorSet') {
    return (el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg')) as SVGElement;
  }

  if (type === 'Image') {
    return (
      (el.querySelector('img, [data-framer-background-image-wrapper]') as HTMLElement) ||
      (el as HTMLElement)
    );
  }

  return el as HTMLElement;
};

/**
 * 🔍 findSiblingByType
 * Scans a shared parent for a specific Framer component type or DOM selector.
 */
export const findSiblingByType = (
  parent: HTMLElement | null,
  type: string,
  selector?: string
): HTMLElement | null => {
  if (!parent) return null;

  const children = Array.from(parent.children) as HTMLElement[];
  const normalizedType = type.toLowerCase();

  for (const child of children) {
    const compType = child.getAttribute('data-framer-component-type');
    const detectedType = getFramerComponentType(child);

    const matchesType =
      (compType && compType.toLowerCase() === normalizedType) ||
      detectedType.toLowerCase() === normalizedType ||
      (normalizedType === 'svg' && (compType === 'SVG' || child.tagName.toLowerCase() === 'svg' || child.querySelector('svg'))) ||
      (normalizedType === 'path' && (compType === 'SVG' || child.querySelector('svg'))) ||
      (normalizedType === 'vectorset' && child.tagName.toLowerCase() === 'svg') ||
      (normalizedType === 'text' && (compType === 'RichTextContainer' || child.querySelector('p, span'))) ||
      (normalizedType === 'richtextcontainer' && compType === 'RichTextContainer') ||
      (normalizedType === 'image' && (child.querySelector('[data-framer-background-image-wrapper], img') || child.hasAttribute('data-framer-background-image-wrapper')));

    if (matchesType) {
      if (selector) {
        const found = child.querySelector(selector) as HTMLElement | null;
        if (found) return found;
      }
      return getFramerInnerTarget(child) as HTMLElement;
    }

    // Fallback selector search inside child
    if (selector && child.querySelector(selector)) {
      return child.querySelector(selector) as HTMLElement;
    }
  }
  return null;
};

/**
 * 🔍 findSiblingsByType
 * Scans a shared parent for ALL siblings matching a specific Framer component type.
 */
export const findSiblingsByType = (
  parent: HTMLElement | null,
  type: string,
  selector?: string
): HTMLElement[] => {
  if (!parent) return [];

  const children = Array.from(parent.children) as HTMLElement[];
  const normalizedType = type.toLowerCase();
  const results: HTMLElement[] = [];

  for (const child of children) {
    const compType = child.getAttribute('data-framer-component-type');
    const detectedType = getFramerComponentType(child);

    const matchesType =
      (compType && compType.toLowerCase() === normalizedType) ||
      detectedType.toLowerCase() === normalizedType ||
      (normalizedType === 'svg' && (compType === 'SVG' || child.tagName.toLowerCase() === 'svg' || child.querySelector('svg'))) ||
      (normalizedType === 'path' && (compType === 'SVG' || child.querySelector('svg'))) ||
      (normalizedType === 'vectorset' && child.tagName.toLowerCase() === 'svg') ||
      (normalizedType === 'text' && (compType === 'RichTextContainer' || child.querySelector('p, span'))) ||
      (normalizedType === 'image' && (child.querySelector('[data-framer-background-image-wrapper], img') || child.hasAttribute('data-framer-background-image-wrapper')));

    if (matchesType) {
      if (selector) {
        const found = child.querySelector(selector) as HTMLElement | null;
        if (found) results.push(found);
      } else {
        const inner = getFramerInnerTarget(child) as HTMLElement;
        if (inner) results.push(inner);
      }
    }
  }

  return results;
};

/**
 * 🏷️ findSiblingByName
 * Scans a shared parent for a child matching [data-framer-name="<name>"].
 */
export const findSiblingByName = (
  parent: HTMLElement | null,
  name: string,
  selector?: string
): HTMLElement | null => {
  if (!parent) return null;

  const children = Array.from(parent.children) as HTMLElement[];

  for (const child of children) {
    const framerName = child.getAttribute('data-framer-name');
    if (framerName === name) {
      if (selector) {
        const target = child.querySelector(selector) as HTMLElement | null;
        if (target) return target;
      }
      return getFramerInnerTarget(child) as HTMLElement;
    }

    // Also check descendant named nodes
    const descendant = child.querySelector(`[data-framer-name="${name}"]`) as HTMLElement | null;
    if (descendant) {
      if (selector) {
        const target = descendant.querySelector(selector) as HTMLElement | null;
        if (target) return target;
      }
      return getFramerInnerTarget(descendant) as HTMLElement;
    }
  }

  return null;
};

/**
 * 🏷️ findSiblingsByName
 * Scans a shared parent for ALL children matching [data-framer-name="<name>"].
 */
export const findSiblingsByName = (
  parent: HTMLElement | null,
  name: string
): HTMLElement[] => {
  if (!parent) return [];

  const matched = parent.querySelectorAll(`[data-framer-name="${name}"]`);
  const results: HTMLElement[] = [];

  matched.forEach((el) => {
    const inner = getFramerInnerTarget(el as HTMLElement) as HTMLElement;
    if (inner) results.push(inner);
  });

  return results;
};

/**
 * 🛠️ resolveFramerUseTags
 * Resolves Framer's SVG <use href="#id"> references to actual path geometry nodes for direct manipulation.
 */
export const resolveFramerUseTags = (svg: SVGSVGElement | null): void => {
  if (!svg) return;

  const useTags = svg.querySelectorAll('use');
  useTags.forEach((use) => {
    const href = use.getAttribute('href') || use.getAttribute('xlink:href');
    if (!href || !href.startsWith('#')) return;

    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      const clone = targetElement.cloneNode(true) as HTMLElement;
      if (clone.tagName.toLowerCase() === 'symbol') {
        const fragment = document.createDocumentFragment();
        while (clone.firstChild) fragment.appendChild(clone.firstChild);
        use.parentElement?.insertBefore(fragment, use);
      } else {
        use.parentElement?.insertBefore(clone, use);
      }
      (use as unknown as HTMLElement).style.display = 'none';
    }
  });
};

/**
 * 🛰️ useFramerDiscovery
 * Reactive hook that discovers Framer native sibling elements under a shared parent,
 * complete with MutationObserver and polling fallback for hydration.
 */
export interface FramerDiscoveryResult {
  sharedParent: HTMLElement | null;
  pathNodes: HTMLElement[];
  vectorSetNodes: HTMLElement[];
  imageNodes: HTMLElement[];
  textNodes: HTMLElement[];
  findByName: (name: string) => HTMLElement | null;
  findByType: (type: string) => HTMLElement | null;
}

export const useFramerDiscovery = (
  ref: RefObject<HTMLElement | null>
): FramerDiscoveryResult => {
  const [parent, setParent] = useState<HTMLElement | null>(null);
  const [pathNodes, setPathNodes] = useState<HTMLElement[]>([]);
  const [vectorSetNodes, setVectorSetNodes] = useState<HTMLElement[]>([]);
  const [imageNodes, setImageNodes] = useState<HTMLElement[]>([]);
  const [textNodes, setTextNodes] = useState<HTMLElement[]>([]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Ascend to shared layout parent
    let sharedParent = el.parentElement;
    while (sharedParent && sharedParent.children.length <= 1 && sharedParent.tagName !== 'BODY') {
      sharedParent = sharedParent.parentElement;
    }

    if (!sharedParent) return;
    setParent(sharedParent);

    const discover = () => {
      if (!sharedParent) return;

      const paths: HTMLElement[] = [];
      const vectorSets: HTMLElement[] = [];
      const images: HTMLElement[] = [];
      const texts: HTMLElement[] = [];

      Array.from(sharedParent.children).forEach((child) => {
        const htmlChild = child as HTMLElement;
        if (htmlChild === el || htmlChild.contains(el)) return;

        const type = getFramerComponentType(htmlChild);

        if (type === 'Path') {
          const target = getFramerInnerTarget(htmlChild);
          if (target) paths.push(target as HTMLElement);
        } else if (type === 'VectorSet') {
          const target = getFramerInnerTarget(htmlChild);
          if (target) vectorSets.push(target as HTMLElement);
        } else if (type === 'Image') {
          const target = getFramerInnerTarget(htmlChild);
          if (target) images.push(target as HTMLElement);
        } else if (type === 'Text') {
          const target = getFramerInnerTarget(htmlChild);
          if (target) texts.push(target as HTMLElement);
        }
      });

      setPathNodes(paths);
      setVectorSetNodes(vectorSets);
      setImageNodes(images);
      setTextNodes(texts);
    };

    discover();
    const timer = setTimeout(discover, 800);

    const observer = new MutationObserver(discover);
    observer.observe(sharedParent, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [ref]);

  const findByName = (name: string) => findSiblingByName(parent, name);
  const findByType = (type: string) => findSiblingByType(parent, type);

  return {
    sharedParent: parent,
    pathNodes,
    vectorSetNodes,
    imageNodes,
    textNodes,
    findByName,
    findByType,
  };
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
    window.addEventListener('resize', update);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
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
    entries.forEach(([name, handler]) =>
      host.addEventListener(name, handler, name === 'touchmove' ? { passive: false } : undefined)
    );

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
