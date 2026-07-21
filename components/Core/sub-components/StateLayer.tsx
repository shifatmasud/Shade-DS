/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import { useHost, useHostEvents, useHostRect } from '../../../hooks/useHost.ts';

interface LayerInstance {
  id: number;
  isActive: boolean;
  frozenX?: number;
  frozenY?: number;
}

export interface StateLayerProps {
  color: string | MotionValue<string>;
  opacity?: number;
  transition?: any;
  forced?: boolean;
  parentRef?: React.RefObject<any>;
  mode?: 'parent' | 'sibling';
}

/**
 * 🔮 SMART STATE LAYER (Self-Aware Interactive Soul)
 */
export default function StateLayer({
  color,
  opacity = 0.1,
  transition = { duration: 1.05, ease: 'easeInOut' },
  forced = false,
  parentRef,
  mode = 'parent'
}: StateLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const target = useHost(containerRef, mode);
  const activeTarget = parentRef?.current || target;
  const rect = useHostRect(activeTarget);
  
  const [layers, setLayers] = useState<LayerInstance[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const prevActive = useRef(isActive);

  const maxDiameter = rect ? Math.hypot(rect.width, rect.height) * 2 : 0;

  useHostEvents(activeTarget, {
    pointerenter: () => {
      if (activeTarget?.getAttribute('disabled') !== null) return;
      setIsActive(true);
    },
    pointerleave: () => setIsActive(false),
    pointermove: (e: PointerEvent) => {
      if (!rect || activeTarget?.getAttribute('disabled') !== null) return;
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    touchmove: (e: TouchEvent) => {
      if (!rect || activeTarget?.getAttribute('disabled') !== null) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
        setIsActive(isInside);
        if (isInside) setMousePos({ x, y });
      }
    },
    pointerdown: (e: PointerEvent) => {
      if (!rect || activeTarget?.getAttribute('disabled') !== null) return;
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  });

  useEffect(() => {
    if (isActive && !prevActive.current) {
      setLayers(prev => [...prev, { id: Date.now() + Math.random(), isActive: true }]);
    } else if (!isActive && prevActive.current) {
      setLayers(prev => prev.map(l => l.isActive ? { ...l, isActive: false, frozenX: mousePos.x, frozenY: mousePos.y } : l));
    }
    prevActive.current = isActive;
  }, [isActive, mousePos.x, mousePos.y]);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 'inherit',
    pointerEvents: 'none',
    touchAction: 'none',
  };

  if (forced) {
    return (
      <div style={containerStyle}>
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: opacity, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ position: 'absolute', inset: 0, backgroundColor: color as any }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      <AnimatePresence>
        {layers.map(layer => {
          const currentX = layer.isActive ? mousePos.x : layer.frozenX;
          const currentY = layer.isActive ? mousePos.y : layer.frozenY;

          return (
            <motion.div
              key={layer.id}
              style={{
                position: 'absolute',
                left: currentX,
                top: currentY,
                backgroundColor: color as any,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: opacity,
              }}
              initial={{ width: 0, height: 0 }}
              animate={{ width: layer.isActive ? maxDiameter : 0, height: layer.isActive ? maxDiameter : 0 }}
              exit={{ width: 0, height: 0 }}
              transition={transition}
              onAnimationComplete={() => { if (!layer.isActive) setLayers(prev => prev.filter(l => l.id !== layer.id)); }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
