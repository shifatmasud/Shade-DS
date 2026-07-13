/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import { useHost } from '../../../hooks/useHost.ts';

export interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface RippleLayerProps {
  color: string | MotionValue<string>;
  opacity?: number;
  transition?: any;
  forced?: boolean;
  parentRef?: React.RefObject<any>;
  mode?: 'parent' | 'sibling';
}

/**
 * 💧 SMART RIPPLE LAYER (Self-Aware Tap / Click Burst)
 * Handles transient burst animations (ripples) for click/tap interactions.
 * Binds automatically to its parent element or a provided parentRef.
 */
export default function RippleLayer({
  color,
  opacity = 0.15,
  transition = { type: 'spring', stiffness: 40, damping: 20 },
  forced = false,
  parentRef,
  mode = 'parent'
}: RippleLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const target = useHost(containerRef, mode);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const maxDiameter = Math.hypot(dimensions.width, dimensions.height) * 2.5;

  // Use parent element listeners to avoid blocking pointer events
  useEffect(() => {
    const activeTarget = parentRef?.current || target;
    if (!activeTarget) return;

    const handleClick = (e: MouseEvent) => {
      // Guard: Do not trigger ripple when parent is showing success or is disabled
      if (activeTarget.getAttribute('data-success') === 'true' || activeTarget.getAttribute('disabled') !== null) {
        return;
      }

      const rect = activeTarget.getBoundingClientRect();
      let x, y;
      
      // Handle Keyboard click (coordinates are 0)
      if (e.detail === 0) {
        x = rect.width / 2;
        y = rect.height / 2;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      
      setDimensions({ width: rect.width, height: rect.height });
      setRipples(prev => [...prev, { id: Date.now() + Math.random(), x, y }]);
    };

    activeTarget.addEventListener('click', handleClick);
    return () => {
      activeTarget.removeEventListener('click', handleClick);
    };
  }, [parentRef, parentRef?.current, target]);

  const removeRipple = (id: number) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  };

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 'inherit',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  };

  if (forced) {
    return (
        <div style={containerStyle}>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: opacity, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: color as any,
                    pointerEvents: 'none'
                }}
            />
        </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={containerStyle}
    >
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{
              width: 0,
              height: 0,
              opacity: 0,
              borderWidth: 0,
            }}
            animate={{
              width: maxDiameter,
              height: maxDiameter,
              opacity: [opacity * 0.5, opacity, 0], // Flash then fade
              borderWidth: 80, // Fixed 80px thickness
            }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: ripple.y,
              left: ripple.x,
              backgroundColor: 'transparent',
              borderStyle: 'solid',
              borderColor: color as any,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
            transition={transition}
            onAnimationComplete={() => removeRipple(ripple.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
