import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../Theme.tsx';
import { AnimatedCheckIcon } from './AnimatedCheckIcon.tsx';
import { useHost, useHostEvents, useHostStyles, useHostRect } from '../../../hooks/useHost.ts';

export interface SuccessLayerProps {
  isSuccess: boolean;
  position?: { x: string; y: string };
  color?: string;
  label?: string;
  size?: 'S' | 'M' | 'L';
  onComplete?: () => void;
  onExitComplete?: () => void;
  zIndex?: number;
  mode?: 'parent' | 'sibling';
  parentRef?: React.RefObject<any>;
}

/**
 * ✨ SUCCESS LAYER (Parasitic Self-Aware Mask)
 */
export default function SuccessLayer({
  isSuccess,
  position,
  color,
  label = 'Success!',
  size = 'M',
  onComplete,
  onExitComplete,
  zIndex = 0, 
  mode = 'parent',
  parentRef,
}: SuccessLayerProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const target = useHost(containerRef, mode);
  const activeTarget = parentRef?.current || target;
  const rect = useHostRect(activeTarget);
  const resolvedColor = color || theme.Color.Success.Surface['1'];
  const livePos = useRef({ x: '50%', y: '50%' });
  const [instances, setInstances] = useState<Array<{ id: number; x: string; y: string }>>([]);

  // Calculate a safe radius that covers the entire button diagonal
  const safeRadius = rect ? Math.hypot(rect.width, rect.height) : 500;

  const updateLivePos = (clientX: number, clientY: number) => {
    if (!activeTarget) return;
    const r = activeTarget.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    
    livePos.current = { 
      x: `${((clientX - r.left) / r.width) * 100}%`, 
      y: `${((clientY - r.top) / r.height) * 100}%` 
    };
  };

  const addInstance = () => {
    const id = Date.now() + Math.random();
    const newInstance = { id, ...livePos.current };
    setInstances(prev => [...prev, newInstance]);
    
    // Success state duration is usually 2s, we shrink a bit before that
    setTimeout(() => {
      setInstances(prev => prev.filter(inst => inst.id !== id));
    }, 1200); 
  };

  // Memoize event handlers to prevent constant listener re-binding and ensure stable closures
  const handlers = React.useMemo(() => ({
    pointermove: (e: PointerEvent) => updateLivePos(e.clientX, e.clientY),
    pointerenter: (e: PointerEvent) => updateLivePos(e.clientX, e.clientY),
    pointerdown: (e: PointerEvent) => updateLivePos(e.clientX, e.clientY),
    mousedown: (e: MouseEvent) => updateLivePos(e.clientX, e.clientY),
    touchstart: (e: TouchEvent) => {
      if (e.touches[0]) updateLivePos(e.touches[0].clientX, e.touches[0].clientY);
    },
    touchmove: (e: TouchEvent) => {
      if (e.touches[0]) updateLivePos(e.touches[0].clientX, e.touches[0].clientY);
    },
    click: () => {
      // Subsequent ripples: only add if already in success state
      if (isSuccess) {
        addInstance();
        onComplete?.();
      }
    }
  }), [isSuccess, addInstance, onComplete]);

  useHostEvents(activeTarget, handlers);

  // Handle the first trigger if it didn't come from a click (e.g. programmatically)
  const lastIsSuccess = useRef(false);
  useEffect(() => {
    if (isSuccess && !lastIsSuccess.current) {
      addInstance();
      // RELIABLE GLOW TRIGGER: Ensure the glow (shadow) starts as soon as success is detected.
      // This bypasses the timing issues of native click listeners.
      onComplete?.();
    } else if (!isSuccess && lastIsSuccess.current) {
      setInstances([]);
    }
    lastIsSuccess.current = isSuccess;
  }, [isSuccess]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex,
        borderRadius: 'inherit',
      }}
      data-success-layer
    >
      <AnimatePresence onExitComplete={onExitComplete}>
        {instances.map((instance) => (
          <motion.div
            key={instance.id}
            initial={{ clipPath: `circle(0px at ${instance.x} ${instance.y})` }}
            animate={{ clipPath: `circle(${safeRadius}px at ${instance.x} ${instance.y})` }}
            exit={{ clipPath: `circle(0px at ${instance.x} ${instance.y})` }}
            transition={{ type: 'spring', stiffness: 80, damping: 24, mass: 1 }}
            style={{
              position: 'absolute',
              inset: -1, // Overfill by 1px to prevent micro-gaps at button edges
              backgroundColor: resolvedColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.space['Space.S'],
                color: theme.Color.Success.Content['1'],
                width: '100%',
                height: '100%',
                ...(size === 'S' ? theme.Type.Readable.Label.S : (size === 'L' ? theme.Type.Readable.Label.L : theme.Type.Readable.Label.M))
              }}
            >
              <AnimatedCheckIcon size={size === 'S' ? 14 : (size === 'L' ? 22 : 18)} color={theme.Color.Success.Content['1']} />
              <span>{label}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
