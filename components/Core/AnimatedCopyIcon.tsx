/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCheckIcon } from './AnimatedCheckIcon.tsx';

const copyPath = "M216,40H88a8,8,0,0,0-8,8V88H40a8,8,0,0,0-8,8v120a8,8,0,0,0,8,8H160a8,8,0,0,0,8-8V184h48a8,8,0,0,0,8-8V48A8,8,0,0,0,216,40Zm-56,168H48V104H160Zm48-48H176V96a8,8,0,0,0-8-8H96V56H208Z";

interface AnimatedCopyIconProps {
    isCopied: boolean;
}

export const AnimatedCopyIcon: React.FC<AnimatedCopyIconProps> = ({ isCopied }) => {
  return (
    <div style={{ 
      width: 14, 
      height: 14, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative'
    }}>
      <AnimatePresence mode="wait">
        {isCopied ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <AnimatedCheckIcon size={14} strokeWidth={32} />
          </motion.div>
        ) : (
          <motion.svg
            key="copy"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            style={{ width: 14, height: 14 }}
            fill="currentColor"
            initial={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            aria-hidden="true"
          >
            <path d={copyPath} />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
};
