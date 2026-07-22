/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence, animateView, useMotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { playSound } from '../../services/soundService';

const ThemeToggleButton = () => {
  const { themeName, setThemeName, theme } = useTheme();

  // High-performance MotionValue for local drag offsets, ensuring exactly 0 offset on mount
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.width / 2;
    const y = rect.height / 2;

    // Play sparkle for light mode, bloom for dark mode
    if (themeName === 'light') {
      playSound('bloom');
    } else {
      playSound('sparkle');
    }

    animateView(() => {
      flushSync(() => {
        setThemeName(prev => (prev === 'light' ? 'dark' : 'light'));
      });
    }).new({ 
      clipPath: [`circle(0% at ${x}px ${y}px)`, `circle(150% at ${x}px ${y}px)`],
    }, { duration: 1.2, ease: "easeInOut" });
  };
  
  const iconVariants = {
    hidden: { opacity: 0, rotate: -90, scale: 0.5, filter: 'blur(4px)' },
    visible: { opacity: 1, rotate: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, rotate: 90, scale: 0.5, filter: 'blur(4px)' },
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
      style={{
        ...styles.button,
        x: dragX,
        y: dragY,
      }}
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
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      </AnimatePresence>
    </motion.button>
  );
};

export default ThemeToggleButton;
