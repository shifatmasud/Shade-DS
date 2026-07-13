import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../Theme.tsx';
import { AnimatedCheckIcon } from './AnimatedCheckIcon.tsx';
import { useHost } from '../../../hooks/useHost.ts';

export interface SuccessLayerProps {
  /** Trigger for the success animation */
  isSuccess: boolean;
  /** Optional manual position override. If not provided, derived from last parent interaction */
  position?: { x: string; y: string };
  /** Mask color. Defaults to theme Success color */
  color?: string;
  /** Success label text. Defaults to "Success!" */
  label?: string;
  /** Success typography size. Defaults to "M" */
  size?: 'S' | 'M' | 'L';
  /** Callback when animation finishes */
  onComplete?: () => void;
  /** Layer z-index. Defaults to 0 to stay behind content */
  zIndex?: number;
  /** Binding mode: 'parent' or 'sibling' */
  mode?: 'parent' | 'sibling';
}

/**
 * ✨ SUCCESS LAYER (Parasitic Self-Aware Mask)
 * 
 * Laps onto its parent element, mirrors its geometry, and performs a 
 * circular expansion mask transition from the last interaction point.
 * Now contains the success icon and label text.
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
  const [parentStyle, setParentStyle] = useState<React.CSSProperties>({});
  const [lastPos, setLastPos] = useState({ x: '50%', y: '50%' });

  // Self-aware binding and live mouse tracking
  useLayoutEffect(() => {
    if (!target) return;
    
    const computed = window.getComputedStyle(target);
    
    // Ensure parent can contain absolute layers
    if (computed.position === 'static') {
      target.style.position = 'relative';
    }
    
    // Mirror border radius
    setParentStyle({
      borderRadius: computed.borderRadius,
    });

    const updatePos = (e: MouseEvent | TouchEvent | PointerEvent) => {
      const rect = target.getBoundingClientRect();
      let clientX, clientY;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      
      setLastPos({ x: `${x}%`, y: `${y}%` });
    };

    // Track movement to know where to expand from
    target.addEventListener('mousemove', updatePos);
    target.addEventListener('touchstart', updatePos, { passive: true });
    target.addEventListener('mousedown', updatePos);

    return () => {
      target.removeEventListener('mousemove', updatePos);
      target.removeEventListener('touchstart', updatePos);
      target.removeEventListener('mousedown', updatePos);
    };
  }, [target]);

  // Use manual position if provided, otherwise last tracked pos
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
        ...parentStyle,
      }}
      data-success-layer
    >
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ clipPath: `circle(0% at ${resolvedPosition.x} ${resolvedPosition.y})` }}
            animate={{ clipPath: `circle(150% at ${resolvedPosition.x} ${resolvedPosition.y})` }}
            exit={{ clipPath: `circle(0% at ${resolvedPosition.x} ${resolvedPosition.y})` }}
            transition={{ 
              type: 'spring', 
              stiffness: 80, 
              damping: 24,
              mass: 1 
            }}
            onAnimationComplete={() => {
              if (isSuccess && onComplete) {
                onComplete();
              }
            }}
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '120%',
              height: '120%',
              backgroundColor: resolvedColor,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Success UI Content - Vertically and Horizontally Centered */}
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
                // Offset back the 10% translation of the parent to center perfectly relative to the actual button
                transform: 'translate(0, 0)', 
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
