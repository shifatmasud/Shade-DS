/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

/**
 * 🧱 Floating Window Component
 * This component is now a pure presentational component for a draggable window.
 * Its mounting/unmounting (and thus its open/closed state and animations) are
 * controlled by AnimatePresence in its parent component.
 */
interface FloatingWindowProps {
  title: string;
  zIndex: number;
  x: number;
  y: number;
  onClose: () => void;
  onFocus: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onResize?: (height: number) => void;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({
  title,
  zIndex,
  x: initialX,
  y: initialY,
  onClose,
  onFocus,
  children,
  footer,
}) => {
  const { theme, themeName } = useTheme();
  const dragControls = useDragControls();
  
  // Initialize MotionValues with the position from props. Because this component
  // is now unmounted when closed, these will be correctly re-initialized each time.
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);

  const styles: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: theme.space['Space.Panel.Width'],
    height: 'auto',
    maxHeight: theme.space['Space.Panel.Height'],
    backgroundColor: `${theme.Color.Base.Surface[1]}dd`,
    backdropFilter: 'blur(20px)',
    borderRadius: theme.radius['Radius.L'],
    boxShadow: themeName === 'dark'
      ? `0 0 1px 0px rgba(255, 255, 255, 0.12), inset 0 0 1px 0px rgba(255, 255, 255, 0.12), ${theme.effects['Effect.Shadow.Drop.3']}`
      : `0 0 1px 0px rgba(0, 0, 0, 0.08), inset 0 0 1px 0px rgba(0, 0, 0, 0.08), ${theme.effects['Effect.Shadow.Drop.3']}`,
    /* 
     * SHADE DSL REWRITE: Replaced 1px border with double box shadow glass glows.
     * To undo: restore separate border and boxShadow.
     */
    border: 'none',
    zIndex: zIndex,
    display: 'flex',
    flexDirection: 'column',
    translate: '-50% -50%',
  };

  const headerStyle: React.CSSProperties = {
    height: theme.space['Space.5XL'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${theme.space['Space.L']}`,
    borderBottom: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[2]}`,
    cursor: 'grab',
    userSelect: 'none',
    flexShrink: 0,
    touchAction: 'none',
  };

  const contentStyle: React.CSSProperties = {
    padding: theme.space['Space.L'],
    overflowY: 'auto',
    flex: 1,
    color: theme.Color.Base.Content[1],
    position: 'relative',
  };

  const footerStyle: React.CSSProperties = {
    height: theme.space['Space.5XL'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: `0 ${theme.space['Space.L']}`,
    borderTop: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[2]}`,
    cursor: 'grab',
    userSelect: 'none',
    
    flexShrink: 0,
    touchAction: 'none',
  };

  return (
    <motion.div
      style={{ ...styles, x, y }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      drag
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      onPointerDown={() => onFocus()}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
    >
      <div
        style={headerStyle}
        onPointerDown={(e) => {
          e.preventDefault();
          dragControls.start(e);
        }}
      >
          <span style={{ ...theme.Type.Readable.Label.M, color: theme.Color.Base.Content[1], letterSpacing: '0.05em' }}>
            {title.toUpperCase()}
          </span>
          <motion.button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              width: theme.space['Space.M'], // Approximated from 14px to token
              height: theme.space['Space.M'],
              borderRadius: theme.radius['Radius.Full'],
              backgroundColor: theme.Color.Error.Content[1],
              border: 'none',
              cursor: 'pointer',
              boxShadow: theme.effects['Effect.Shadow.Inset.1'],
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Close"
            onPointerDown={(e) => e.stopPropagation()}
          />
      </div>
      
      <div
        style={contentStyle}
        onPointerDown={(e) => {
          e.stopPropagation(); 
        }}
      >
        {children}
      </div>
      {footer && (
        <div
          style={footerStyle}
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
        >
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export default FloatingWindow;