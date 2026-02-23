/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

interface DockIconProps {
  icon: string;
  isActive: boolean;
  onClick: () => void;
}

const DockIcon: React.FC<DockIconProps> = ({ icon, isActive, onClick }) => {
  const { theme } = useTheme();
  return (
    <motion.button
      onClick={onClick}
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '16px',
        border: 'none',
        backgroundColor: isActive ? theme.Color.Accent.Surface[1] : 'transparent',
        color: isActive ? theme.Color.Accent.Content[1] : theme.Color.Base.Content[2],
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
      }}
      whileHover={{ scale: 1.1, backgroundColor: isActive ? theme.Color.Accent.Surface[1] : theme.Color.Base.Surface[2] }}
      whileTap={{ scale: 0.95 }}
    >
      <i className={`ph-bold ${icon}`} />
    </motion.button>
  );
};

export default DockIcon;