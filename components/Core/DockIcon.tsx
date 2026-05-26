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
  
  // 🔮 STYLE.Active: Soft active state configuration
  const activeBg = isActive ? `${theme.Color.Accent.Surface[1]}15` : 'rgba(0,0,0,0)'; // 15% opacity tint
  const activeColor = isActive ? theme.Color.Accent.Surface[1] : theme.Color.Base.Content[2];

  return (
    <motion.button
      onClick={onClick}
      style={{
        position: 'relative',
        width: '48px',
        height: '48px',
        borderRadius: theme.radius['Radius.Full'],
        border: 'none',
        backgroundColor: activeBg,
        color: activeColor,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.Type.Expressive.Headline.S,
        overflow: "hidden",
        transition: 'background-color 0.3s ease, color 0.3s ease'
      }}
      whileHover={{ 
        scale: 1.1, 
        backgroundColor: isActive ? `${theme.Color.Accent.Surface[1]}25` : theme.Color.Base.Surface[2] 
      }}
      whileTap={{ scale: 0.95 }}
    >
      <i className={`ph-bold ${icon}`} />
    </motion.button>
  );
};

export default DockIcon;
