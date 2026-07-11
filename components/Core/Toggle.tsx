/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
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

  const motionX = useMotionValue(isOn ? 16 : 0);
  const springX = useSpring(motionX, { stiffness: 600, damping: 35, mass: 1 });

  useEffect(() => {
    motionX.set(isOn ? 16 : 0);
  }, [isOn, motionX]);

  // Map the spring-driven x position to a gentle squish effect.
  // Max squish at the midpoint (8px). 
  // We use a slight curve-like mapping by defining the midpoint.
  const scaleX = useTransform(springX, [0, 8, 16], [1, 1.25, 1]);
  const scaleY = useTransform(springX, [0, 8, 16], [1, 0.75, 1]);

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
          style={{ 
            ...thumbStyle, 
            x: springX,
            scaleX,
            scaleY,
            originX: 0.5, 
            originY: 0.5 
          }}
        />
      </motion.div>
    </div>
  );
};

export default Toggle;