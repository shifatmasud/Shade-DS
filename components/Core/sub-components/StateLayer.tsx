/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type MotionValue } from 'framer-motion';

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
}

/**
 * 🔮 SMART STATE LAYER (Self-Aware Interactive Soul)
 * 
 * An interactive soul that provides organic feedback relative to touch/cursor position.
 * Binds automatically to its parent element or a provided parentRef.
 */
export default function StateLayer({
  color,
  opacity = 0.1,
  transition = { duration: 1.05, ease: 'easeInOut' },
  forced = false,
  parentRef
}: StateLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layers, setLayers] = useState<LayerInstance[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const prevActive = useRef(isActive);

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

  // Use parent element listeners to avoid blocking pointer events
  useEffect(() => {
    let target = parentRef ? parentRef.current : (containerRef.current?.parentElement as HTMLElement | null);
    if (!target && !parentRef) {
      // Find nearest interactive ancestor if parentRef is not provided and immediate parent is none
      let current = containerRef.current?.parentElement as HTMLElement | null;
      while (current) {
        try {
          const style = window.getComputedStyle(current);
          if (style.pointerEvents !== 'none') {
            target = current;
            break;
          }
        } catch (e) {
          break;
        }
        current = current.parentElement;
      }
    }
    if (!target) return;

    const handleEnter = (e: PointerEvent) => {
      if (target.getAttribute('data-success') === 'true' || target.getAttribute('disabled') !== null) {
        setIsActive(false);
        return;
      }
      const rect = target.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
      setIsActive(true);
    };

    const handleLeave = () => setIsActive(false);

    const handleMove = (e: PointerEvent) => {
      if (target.getAttribute('data-success') === 'true' || target.getAttribute('disabled') !== null) {
        setIsActive(false);
        return;
      }
      const rect = target.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (target.getAttribute('data-success') === 'true' || target.getAttribute('disabled') !== null) {
        setIsActive(false);
        return;
      }
      // Prevent scrolling when scrubbing the state layer
      if (e.cancelable) e.preventDefault();
      const rect = target.getBoundingClientRect();
      const touch = e.touches[0];
      if (touch) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Hit testing for touch scrubbing parity
        const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
        
        if (isInside) {
          setIsActive(true);
          setMousePos({ x, y });
        } else {
          setIsActive(false);
        }
      }
    };

    const handleDown = (e: PointerEvent) => {
      if (target.getAttribute('data-success') === 'true' || target.getAttribute('disabled') !== null) {
        setIsActive(false);
        return;
      }
      const rect = target.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    target.addEventListener('pointerenter', handleEnter as any);
    target.addEventListener('pointerleave', handleLeave);
    target.addEventListener('pointermove', handleMove);
    target.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    target.addEventListener('pointerdown', handleDown as any);

    return () => {
      target.removeEventListener('pointerenter', handleEnter as any);
      target.removeEventListener('pointerleave', handleLeave);
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('touchmove', handleTouchMove as any);
      target.removeEventListener('pointerdown', handleDown as any);
    };
  }, [parentRef, parentRef?.current]);

  const maxDiameter = Math.hypot(dimensions.width, dimensions.height) * 2;

  useEffect(() => {
    if (isActive && !prevActive.current) {
      // Enter: Spawn new layer
      setLayers(prev => [...prev, { id: Date.now() + Math.random(), isActive: true }]);
    } else if (!isActive && prevActive.current) {
      // Leave: Freeze and decay active layers
      setLayers(prev => prev.map(l => l.isActive ? { ...l, isActive: false, frozenX: mousePos.x, frozenY: mousePos.y } : l));
    }
    prevActive.current = isActive;
  }, [isActive, mousePos.x, mousePos.y]);

  const removeLayer = (id: number) => {
    setLayers(prev => prev.filter(l => l.id !== id));
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
    touchAction: 'none',
  };

  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: color as any,
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: opacity,
  };

  if (forced) {
    return (
      <div style={containerStyle}>
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: opacity, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 1
            }}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: color as any,
                pointerEvents: 'none',
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
      {layers.map(layer => {
        const currentX = layer.isActive ? mousePos.x : layer.frozenX;
        const currentY = layer.isActive ? mousePos.y : layer.frozenY;

        return (
          <motion.div
            key={layer.id}
            style={{
              ...baseStyles,
              left: currentX,
              top: currentY,
            }}
            initial={{ width: 0, height: 0, opacity: opacity }}
            animate={{
              width: layer.isActive ? maxDiameter : 0,
              height: layer.isActive ? maxDiameter : 0,
              opacity: opacity,
            }}
            exit={{ width: 0, height: 0, opacity: opacity }}
            transition={transition}
            onAnimationComplete={() => {
              if (!layer.isActive) removeLayer(layer.id);
            }}
          />
        );
      })}
      </AnimatePresence>
    </div>
  );
}
