/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FluidContent from './FluidContent.tsx';
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
      <FluidContent contentKey={isCopied ? 'check' : 'copy'}>
        {isCopied ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatedCheckIcon size={14} strokeWidth={32} />
          </div>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            style={{ width: 14, height: 14 }}
            fill="currentColor"
            aria-hidden="true"
          >
            <path d={copyPath} />
          </svg>
        )}
      </FluidContent>
    </div>
  );
};
