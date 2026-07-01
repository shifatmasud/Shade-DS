/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion, AnimatePresence, MotionValue } from 'framer-motion';

export interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface RippleLayerProps {
  color: string | MotionValue<string>;
  ripples: Ripple[];
  onRippleComplete: (id: number) => void;
  width: number;
  height: number;
  opacity?: number;
  forced?: boolean;
}

/**
 * 💧 RIPPLE LAYER (Tap / Click Burst)
 * Handles transient burst animations (ripples) for click/tap interactions.
 * This is fully decoupled from the persistent StateLayer.
 */
const RippleLayer: React.FC<RippleLayerProps> = ({ 
  color, 
  ripples, 
  onRippleComplete,
  width,
  height,
  opacity = 0.15,
  forced = false
}) => {
  // Calculate the diameter needed to cover the component from the center or furthest corner.
  const maxDiameter = Math.hypot(width, height) * 2.5;

  const styles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: 0, // Sits on top of background but below content
  };

  if (forced) {
    return (
        <div style={styles}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: opacity }}
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: color,
                    pointerEvents: 'none'
                }}
            />
        </div>
    );
  }

  return (
    <div style={styles}>
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
              /* 
               * SHADE DSL RIPPLE OPTIMIZATION:
               * - Removed 'filter: blur(12px)' to make interactions ultra-crisp.
               * - To undo: add filter: 'blur(12px)' back here.
               */
            }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: ripple.y,
              left: ripple.x,
              backgroundColor: 'transparent',
              borderStyle: 'solid',
              borderColor: color,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
            /* 
             * SHADE DSL RIPPLE MOVEMENT:
             * - Shifted transition to 'spring' type to align with physical organic design criteria.
             * - To undo: revert back to duration: 2.5 and ease: [0.2, 0, 0, 1].
             */
            transition={{
              type: 'spring',
              stiffness: 40,
              damping: 20,
            }}
            onAnimationComplete={() => onRippleComplete(ripple.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default RippleLayer;