/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';

const copyPath = "M216,40H88a8,8,0,0,0-8,8V88H40a8,8,0,0,0-8,8v120a8,8,0,0,0,8,8H160a8,8,0,0,0,8-8V184h48a8,8,0,0,0,8-8V48A8,8,0,0,0,216,40Zm-56,168H48V104H160Zm48-48H176V96a8,8,0,0,0-8-8H96V56H208Z";
const checkPath = "M229.66,77.66l-120,120a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L104,178.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z";

interface AnimatedCopyIconProps {
    isCopied: boolean;
}

export const AnimatedCopyIcon: React.FC<AnimatedCopyIconProps> = ({ isCopied }) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      style={{ width: 14, height: 14 }}
      fill="currentColor"
      aria-hidden="true"
    >
      <motion.path
        initial={false}
        animate={{ d: isCopied ? checkPath : copyPath }}
        transition={{ 
            type: 'spring', 
            stiffness: 350, 
            damping: 25,
            mass: 0.7,
        }}
      />
    </motion.svg>
  );
};
