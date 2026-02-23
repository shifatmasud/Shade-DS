/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

const ThemeToggleButton = () => {
  const { themeName, setThemeName, theme } = useTheme();

  const toggleTheme = () => {
    setThemeName(themeName === 'light' ? 'dark' : 'light');
  };
  
  const iconVariants = {
    hidden: { opacity: 0, rotate: -90, scale: 0.5 },
    visible: { opacity: 1, rotate: 0, scale: 1 },
    exit: { opacity: 0, rotate: 90, scale: 0.5 },
  };
  
  const styles: { [key: string]: React.CSSProperties } = {
    button: {
      position: 'absolute',
      top: theme.spacing['Space.L'],
      right: theme.spacing['Space.L'],
      width: '44px',
      height: '44px',
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
      fontSize: '24px',
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
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={themeName}
          className={themeName === 'dark' ? 'ph-bold ph-moon' : 'ph-bold ph-sun'}
          style={styles.icon}
          variants={iconVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        />
      </AnimatePresence>
    </motion.button>
  );
};

export default ThemeToggleButton;