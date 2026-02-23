/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface RippleLayerProps {
  color: string;
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
  opacity = 0.25,
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
            }}
            animate={{
              width: maxDiameter,
              height: maxDiameter,
              opacity: [opacity * 0.5, opacity, 0], // Flash then fade
              filter: 'blur(8px)', // Soft blur
            }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: ripple.y,
              left: ripple.x,
              backgroundColor: color,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
            transition={{
              duration: 2.5, // Ultra-slow liquid ripple
              ease: [0.2, 0, 0, 1], // Deep ease-out
            }}
            onAnimationComplete={() => onRippleComplete(ripple.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default RippleLayer;