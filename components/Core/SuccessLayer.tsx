import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

export interface SuccessLayerProps {
  isSuccess: boolean;
  position: { x: string; y: string };
  color?: string;
  onComplete?: () => void;
  zIndex?: number;
}

/**
 * ✨ SUCCESS LAYER (Circular Expansion Mask Layer)
 * 
 * Expands organically from the actual touch or click coordinates.
 * Always fills 120% of the parent button width/height to cover rounded corners and subpixels cleanly.
 * Keeps the button size identical (zero layout shift).
 */
export default function SuccessLayer({
  isSuccess,
  position,
  color,
  onComplete,
  zIndex = 0.5,
}: SuccessLayerProps) {
  const { theme } = useTheme();
  const resolvedColor = color || theme.Color.Success.Surface['1'];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: 'inherit',
        pointerEvents: 'none',
        zIndex,
      }}
    >
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ clipPath: `circle(0% at ${position.x} ${position.y})` }}
            animate={{ clipPath: `circle(150% at ${position.x} ${position.y})` }}
            exit={{ clipPath: `circle(0% at ${position.x} ${position.y})` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
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
              borderRadius: 'inherit',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
