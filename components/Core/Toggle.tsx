/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { playSound } from '../../services/soundService';

interface ToggleProps {
  label: string;
  isOn: boolean;
  onToggle: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, isOn, onToggle }) => {
  const { theme } = useTheme();

  const activeColor = theme.Color.Active.Content[1];

  const motionX = useMotionValue(isOn ? 16 : 0);
  const springX = useSpring(motionX, { stiffness: 220, damping: 22, mass: 1 });

  useEffect(() => {
    motionX.set(isOn ? 16 : 0);
  }, [isOn, motionX]);

  const scaleX = useTransform(springX, [0, 8, 16], [1, 1.75, 1]);

  const trackStyle: React.CSSProperties = {
    width: '40px',
    height: '24px',
    borderRadius: theme.radius['Radius.Full'],
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    cursor: 'pointer',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.Color.Base.Surface[3],
  };

  const thumbStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: theme.Color.Base.Surface[1],
    boxShadow: theme.effects['Effect.Shadow.Drop.1'],
    position: 'relative',
    zIndex: 2,
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2] }}>
        {label}
      </label>
      <motion.div 
        style={trackStyle} 
        onClick={() => {
          playSound('toggle');
          onToggle();
        }}
      >
        <AnimatePresence mode="popLayout">
          {isOn && (
            <motion.div
              key="active-bg"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              exit={{ clipPath: 'inset(0 0 0 100%)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: activeColor,
                zIndex: 1,
              }}
            />
          )}
        </AnimatePresence>
        <motion.div
          layout="size"
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          style={{ 
            ...thumbStyle, 
            x: springX,
            scaleX,
            originX: 0.5, 
            originY: 0.5 
          }}
        />
      </motion.div>
    </div>
  );
};

export default Toggle;