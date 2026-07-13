/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import { useHost, useHostEvents, useHostRect } from '../../../hooks/useHost.ts';

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
  const activeTarget = parentRef?.current || target;
  const rect = useHostRect(activeTarget);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const maxDiameter = rect ? Math.hypot(rect.width, rect.height) * 2.5 : 0;

  useHostEvents(activeTarget, {
    click: (e: MouseEvent) => {
      if (!activeTarget || activeTarget.getAttribute('data-success') === 'true' || activeTarget.getAttribute('disabled') !== null) return;

      const currentRect = activeTarget.getBoundingClientRect();
      const x = e.detail === 0 ? currentRect.width / 2 : e.clientX - currentRect.left;
      const y = e.detail === 0 ? currentRect.height / 2 : e.clientY - currentRect.top;

      setRipples(prev => [...prev, { id: Date.now() + Math.random(), x, y }]);
    }
  });

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 'inherit',
    pointerEvents: 'none',
  };

  if (forced) {
    return (
      <div style={containerStyle}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: opacity, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ width: '100%', height: '100%', backgroundColor: color as any, pointerEvents: 'none' }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ width: 0, height: 0, opacity: 0, borderWidth: 0 }}
            animate={{ width: maxDiameter, height: maxDiameter, opacity: [opacity * 0.5, opacity, 0], borderWidth: 80 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: ripple.y,
              left: ripple.x,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              borderColor: color as any,
              borderStyle: 'solid',
            }}
            transition={transition}
            onAnimationComplete={() => setRipples(prev => prev.filter(r => r.id !== ripple.id))}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
