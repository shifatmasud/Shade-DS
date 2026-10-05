/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedCheckIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Expressive Animated Check Icon
 * Replaces standard Phosphor Check icons with a custom, high-fidelity animated SVG.
 */
export const AnimatedCheckIcon: React.FC<AnimatedCheckIconProps> = ({ 
  size = 16, 
  color = 'currentColor',
  strokeWidth = 24 // Increased from default 16 for better visibility at small UI scales
}) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      style={{ 
        width: size, 
        height: size, 
        flexShrink: 0,
        display: 'block'
      }}
      initial="initial"
      animate="animate"
      aria-hidden="true"
    >
      <rect width="256" height="256" fill="none" />
      <motion.polyline
        points="40 144 96 200 224 72"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        variants={{
          initial: { 
            pathLength: 0, 
            scale: 0.2, 
            opacity: 0, 
            rotate: -20,
            x: -5,
            y: 5
          },
          animate: { 
            pathLength: 1, 
            scale: 1, 
            opacity: 1, 
            rotate: 0,
            x: 0,
            y: 0,
            transition: {
              pathLength: { 
                duration: 0.45, 
                ease: [0.16, 1, 0.3, 1],
                delay: 0.05
              },
              scale: { 
                type: 'spring', 
                stiffness: 600, 
                damping: 18, 
                mass: 0.5 
              },
              rotate: { 
                type: 'spring', 
                stiffness: 400, 
                damping: 20 
              },
              opacity: { 
                duration: 0.15 
              },
              x: { type: 'spring', stiffness: 500, damping: 20 },
              y: { type: 'spring', stiffness: 500, damping: 20 }
            }
          }
        }}
      />
    </motion.svg>
  );
};
