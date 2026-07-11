/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import FluidContent from './FluidContent.tsx';

const ThemeToggleButton = () => {
  const { themeName, setThemeName, theme } = useTheme();

  const toggleTheme = () => {
    setThemeName(themeName === 'light' ? 'dark' : 'light');
  };
  
  const styles: { [key: string]: React.CSSProperties } = {
    button: {
      position: 'absolute',
      top: theme.space['Space.L'],
      right: theme.space['Space.L'],
      width: theme.space['Space.4XL'],
      height: theme.space['Space.4XL'],
      borderRadius: theme.radius['Radius.Full'],
      backgroundColor: theme.Color.Base.Surface['2'],
      border: 'none',
      cursor: 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.Color.Base.Content['2'],
      boxShadow: theme.effects['Effect.Shadow.Drop.1'],
      overflow: 'hidden', // Ensures icons don't pop out during animation
      zIndex: 1001,
      touchAction: 'none',
    },
    icon: {
      ...theme.Type.Expressive.Headline.S,
      lineHeight: '0', // Prevents layout shifts from line-height
      pointerEvents: 'none',
      display: 'block',
    }
  };

  return (
    <motion.button
      style={styles.button}
      onClick={toggleTheme}
      aria-label={`Switch to ${themeName === 'light' ? 'dark' : 'light'} mode`}
      whileHover={{ scale: 1.1, boxShadow: theme.effects['Effect.Shadow.Drop.2'] }}
      whileTap={{ scale: 0.95 }}
      whileDrag={{ scale: 1.1, cursor: 'grabbing', boxShadow: theme.effects['Effect.Shadow.Drop.3'] }}
      drag
      dragMomentum={false}
      transition={{ duration: 0.2 }}
    >
      <FluidContent 
        contentKey={themeName}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
      >
        <span
          className={themeName === 'dark' ? 'ph-bold ph-moon' : 'ph-bold ph-sun'}
          style={styles.icon}
        />
      </FluidContent>
    </motion.button>
  );
};

export default ThemeToggleButton;