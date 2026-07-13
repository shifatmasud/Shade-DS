import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../Theme.tsx';
import { AnimatedCheckIcon } from './AnimatedCheckIcon.tsx';
import { useHost, useHostEvents, useHostStyles } from '../../../hooks/useHost.ts';

export interface SuccessLayerProps {
  isSuccess: boolean;
  position?: { x: string; y: string };
  color?: string;
  label?: string;
  size?: 'S' | 'M' | 'L';
  onComplete?: () => void;
  zIndex?: number;
  mode?: 'parent' | 'sibling';
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
  zIndex = 0, 
  mode = 'parent',
}: SuccessLayerProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const target = useHost(containerRef, mode);
  const resolvedColor = color || theme.Color.Success.Surface['1'];
  const [lastPos, setLastPos] = useState({ x: '50%', y: '50%' });

  // Ensure target can contain absolute layers
  useHostStyles(target, { position: 'relative' });

  useHostEvents(target, {
    mousemove: (e: MouseEvent) => {
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setLastPos({ x: `${((e.clientX - rect.left) / rect.width) * 100}%`, y: `${((e.clientY - rect.top) / rect.height) * 100}%` });
    },
    touchstart: (e: TouchEvent) => {
      if (!target || !e.touches[0]) return;
      const rect = target.getBoundingClientRect();
      setLastPos({ x: `${((e.touches[0].clientX - rect.left) / rect.width) * 100}%`, y: `${((e.touches[0].clientY - rect.top) / rect.height) * 100}%` });
    },
    mousedown: (e: MouseEvent) => {
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setLastPos({ x: `${((e.clientX - rect.left) / rect.width) * 100}%`, y: `${((e.clientY - rect.top) / rect.height) * 100}%` });
    }
  });

  const resolvedPosition = position || lastPos;

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
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ clipPath: `circle(0% at ${resolvedPosition.x} ${resolvedPosition.y})` }}
            animate={{ clipPath: `circle(150% at ${resolvedPosition.x} ${resolvedPosition.y})` }}
            exit={{ clipPath: `circle(0% at ${resolvedPosition.x} ${resolvedPosition.y})` }}
            transition={{ type: 'spring', stiffness: 80, damping: 24, mass: 1 }}
            onAnimationComplete={() => isSuccess && onComplete?.()}
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '120%',
              height: '120%',
              backgroundColor: resolvedColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
