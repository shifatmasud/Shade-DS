/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';

/**
 * Fluid Motion Suite Variants
 * Combines Opacity, Scale, and Blur with a gentle spring.
 */
export const fluidMotionVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.92, 
    filter: 'blur(4px)',
  },
  animate: { 
    opacity: 1, 
    scale: 1, 
    filter: 'blur(0px)',
  },
  exit: { 
    opacity: 0, 
    scale: 1.05, 
    filter: 'blur(4px)',
  },
};

export const fluidMotionTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 1,
};

interface FluidContentProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  contentKey?: string | number;
  mode?: 'wait' | 'popLayout' | 'sync';
}

/**
 * FluidContent
 * A component that applies the Fluid Motion Suite to its children whenever they change.
 * Useful for labels, icons, and status text.
 */
export const FluidContent: React.FC<FluidContentProps> = ({ 
  children, 
  contentKey, 
  mode = 'wait',
  style,
  ...props 
}) => {
  // If no key is provided, we try to derive one from children if it's a primitive
  const derivedKey = contentKey ?? (typeof children === 'string' || typeof children === 'number' ? children : undefined);

  return (
    <AnimatePresence mode={mode} initial={false}>
      <motion.div
        key={derivedKey}
        variants={fluidMotionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={fluidMotionTransition}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default FluidContent;
