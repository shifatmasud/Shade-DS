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

  // Use Signal Content for the active color.
  // In Light Mode, Signal Surface is pastel, so Content (Strong Purple) gives the correct "On" state.
  // In Dark Mode, Signal Surface is dark, so Content (Light Purple) gives the correct high-contrast "On" state.
  const activeColor = theme.Color.Signal.Content[1];

  const trackStyle: React.CSSProperties = {
    width: '40px',
    height: '24px',
    borderRadius: theme.radius['Radius.Full'],
    backgroundColor: isOn ? activeColor : theme.Color.Base.Surface[3],
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    cursor: 'pointer',
    transition: `background-color ${theme.time['Time.2x']} ease`,
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
    <div onPointerDown={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2] }}>
        {label}
      </label>
      <div style={trackStyle} onClick={onToggle}>
        <motion.div
          style={{ ...thumbStyle }}
          initial={false}
          animate={{ x: isOn ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        />
      </div>
    </div>
  );
};

export default Toggle;