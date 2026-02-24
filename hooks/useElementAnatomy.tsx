/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useLayoutEffect, RefObject } from 'react';

export interface BoxModel {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementAnatomy {
  // Container Metrics (CSS Pixels)
  width: number;
  height: number;
  scaleFactor: number;
  
  // Box Model
  padding: BoxModel;
  border: BoxModel;
  
  // Content Box (Inner area after border/padding)
  contentBox: NormalizedRect;

  // Normalized Children Coordinates (Relative to container 0,0)
  children: Record<string, NormalizedRect | null>;
  
  // Calculated Spacing
  gap: number;
}

interface Selectors {
  [key: string]: string;
}

/**
 * 🕵️‍♂️ Inspector Engine
 * A robust hook that acts as a "DevTools" library for specific elements.
 * It normalizes measurements against CSS transforms (scale) to return
 * "true" logical pixel values, essential for accurate blueprints.
 */
export const useElementAnatomy = (
  ref: RefObject<HTMLElement>,
  selectors: Selectors,
  deps: any[] = []
): ElementAnatomy | null => {
  const [anatomy, setAnatomy] = useState<ElementAnatomy | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    let rafId: number;

    const measure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // 1. Get Viewport Metrics (Scaled)
        const rect = element.getBoundingClientRect();
        
        // 2. Get Source of Truth (CSS)
        const computed = window.getComputedStyle(element);
        
        // 3. Calculate Scale Factor
        const scaleX = (element.offsetWidth && rect.width) ? rect.width / element.offsetWidth : 1;
        const scaleY = (element.offsetHeight && rect.height) ? rect.height / element.offsetHeight : 1;
        
        // 4. Parse Box Model
        const padding = {
          top: parseFloat(computed.paddingTop) || 0,
          right: parseFloat(computed.paddingRight) || 0,
          bottom: parseFloat(computed.paddingBottom) || 0,
          left: parseFloat(computed.paddingLeft) || 0,
        };
        
        const border = {
          top: parseFloat(computed.borderTopWidth) || 0,
          right: parseFloat(computed.borderRightWidth) || 0,
          bottom: parseFloat(computed.borderBottomWidth) || 0,
          left: parseFloat(computed.borderLeftWidth) || 0,
        };

        // 5. Measure Children & Normalize
        const childrenMetrics: Record<string, NormalizedRect | null> = {};
        let firstChildRect: NormalizedRect | null = null;
        let lastChildRect: NormalizedRect | null = null;

        Object.entries(selectors).forEach(([key, selector]) => {
          const child = element.querySelector<HTMLElement>(selector);
          if (child) {
            const childRect = child.getBoundingClientRect();
            
            const normalized: NormalizedRect = {
              x: scaleX !== 0 ? (childRect.left - rect.left) / scaleX : 0,
              y: scaleY !== 0 ? (childRect.top - rect.top) / scaleY : 0,
              width: scaleX !== 0 ? childRect.width / scaleX : 0,
              height: scaleY !== 0 ? childRect.height / scaleY : 0,
            };
            
            childrenMetrics[key] = normalized;
            
            if (!firstChildRect || normalized.x < firstChildRect.x) firstChildRect = normalized;
            if (!lastChildRect || normalized.x > lastChildRect.x) lastChildRect = normalized;
          } else {
            childrenMetrics[key] = null;
          }
        });

        // 6. Calculate Internal Gap
        let gap = 0;
        if (firstChildRect && lastChildRect && firstChildRect !== lastChildRect) {
          gap = lastChildRect.x - (firstChildRect.x + firstChildRect.width);
          gap = Math.max(0, gap);
        }

        setAnatomy({
          width: element.offsetWidth,
          height: element.offsetHeight,
          scaleFactor: scaleX,
          padding,
          border,
          contentBox: {
              x: padding.left + border.left,
              y: padding.top + border.top,
              width: element.offsetWidth - (padding.left + padding.right + border.left + border.right),
              height: element.offsetHeight - (padding.top + padding.bottom + border.top + border.bottom),
          },
          children: childrenMetrics,
          gap,
        });
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(element, { attributes: true, childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, JSON.stringify(selectors), ...deps]);

  return anatomy;
};
