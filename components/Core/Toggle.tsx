/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

interface ToggleProps {
  label: string;
  isOn: boolean;
  onToggle: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, isOn, onToggle }) => {
  const { theme } = useTheme();

  // Use Active Content for the active color.
  // In Light Mode, Active Surface is pastel, so Content (Strong Purple) gives the correct "On" state.
  // In Dark Mode, Active Surface is dark, so Content (Light Purple) gives the correct high-contrast "On" state.
  const activeColor = theme.Color.Active.Content[1];

  const trackStyle: React.CSSProperties = {
    width: '40px',
    height: '24px',
    borderRadius: theme.radius['Radius.Full'],
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    cursor: 'pointer',
    flexShrink: 0,
  };

  const thumbStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: theme.Color.Base.Surface[1],
    boxShadow: theme.effects['Effect.Shadow.Drop.1'],
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2] }}>
        {label}
      </label>
      <motion.div 
        style={trackStyle} 
        onClick={onToggle}
        initial={false}
        animate={{ backgroundColor: isOn ? activeColor : theme.Color.Base.Surface[3] }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          style={{ ...thumbStyle, originX: 0.5, originY: 0.5 }}
          initial={false}
          animate={{ 
            x: isOn ? 16 : 0,
            scaleX: [1, 1.25, 1],
            scaleY: [1, 0.8, 1],
          }}
          whileTap={{ 
            scaleX: 1.1, 
            scaleY: 0.9,
            transition: { duration: 0.1 }
          }}
          transition={{ 
            x: { type: 'spring', stiffness: 500, damping: 30, mass: 1 },
            scaleX: { times: [0, 0.5, 1], duration: 0.3 },
            scaleY: { times: [0, 0.5, 1], duration: 0.3 },
          }}
        />
      </motion.div>
    </div>
  );
};

export default Toggle;