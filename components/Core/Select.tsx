/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import useOutsideClick from '../../hooks/useOutsideClick.ts';

/**
 * SHADE DSL ARCHITECTURE
 * ----------------------
 * DATA: 
 *   - props: { label, value, onChange, options }
 *   - state: isOpen (boolean)
 * 
 * LOGIC:
 *   - action.toggle: Toggles open state
 *   - action.select: Selects option and closes
 *   - effect.clickOutside: Closes on blur
 * 
 * RENDER:
 *   - view.container: Relative wrapper
 *   - element.label: Minimal uppercase tag
 *   - element.trigger: Clean input-like button
 *   - view.overlay: Relative-absolute floating menu
 *   - element.item: Interactive option row
 */

interface SelectProps<T extends string = string> {
  label: string;
  value: T;
  onChange: (e: { target: { value: T } }) => void;
  options: { value: T; label: string }[];
  style?: React.CSSProperties;
}

const Select = <T extends string = string>({ label, value, onChange, options, style }: SelectProps<T>) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mouseY, setMouseY] = useState(0);
  const [isHoveringMenu, setIsHoveringMenu] = useState(false);

  const currentOption = options.find(opt => opt.value === value);
  const currentLabel = currentOption?.label || value;

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsHoveringMenu(false);
    setHoveredIndex(null);
  }, []);
  
  useOutsideClick(containerRef, handleClose);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setMouseY(e.clientY - rect.top);
    }
  };

  const handleSelect = (newValue: string) => {
    onChange({ target: { value: newValue } as any });
    setIsOpen(false);
    setIsHoveringMenu(false);
    setHoveredIndex(null);
  };

  // STYLE OBJECTS
  const styles = {
    container: {
      position: 'relative' as const,
      width: '100%',
      ...style,
    },
    label: {
      ...theme.Type.Readable.Label.S,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      marginBottom: theme.space['Space.XS'],
      color: theme.Color.Base.Content[2],
      opacity: theme.opacity['Opacity.High'],
    },
    trigger: {
      width: '100%',
      height: theme.height['Height.M'],
      padding: `0 ${theme.space['Space.M']}`,
      borderRadius: theme.radius['Radius.S'],
      /* 
       * SHADE DSL REWRITE: Replaced 1px solid border with getBorder1px box shadow glow.
       * To undo: replace the spread below with border: `${theme.border['Border.Width.Main']} ${theme.border['Border.Style.Main']} ${isOpen ? theme.Color.Base.Content[1] : theme.Color.Base.Surface[3]}`
       */
      ...theme.border.getBorder1px(isOpen ? theme.Color.Base.Content[1] : theme.Color.Base.Surface[3]),
      backgroundColor: theme.Color.Base.Surface[1],
      color: theme.Color.Base.Content[1],
      ...theme.Type.Readable.Body.M,
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      outline: 'none',
      transition: `all ${theme.time['Time.2x']} cubic-bezier(0.4, 0, 0.2, 1)`,
      fontWeight: 500,
    },
    overlay: {
      position: 'absolute' as const,
      top: `calc(100% + ${theme.space['Space.XS']})`,
      left: 0,
      width: '100%',
      backgroundColor: theme.Color.Base.Surface[1],
      /* 
       * SHADE DSL REWRITE: Replaced 1px solid border with getBorder1px box shadow glow, merged with Drop-shadow.
       * To undo: restore separate border and boxShadow.
       */
      border: 'none',
      boxShadow: `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`,
      borderRadius: theme.radius['Radius.S'],
      zIndex: 1000,
      overflow: 'hidden',
      padding: theme.space['Space.XS'],
    },
    option: (isSelected: boolean) => ({
      position: 'relative' as const,
      zIndex: 1,
      height: theme.height['Height.XS'],
      padding: `0 ${theme.space['Space.M']}`,
      cursor: 'pointer',
      borderRadius: theme.radius['Radius.S'],
      color: isSelected ? theme.Color.Base.Content[1] : theme.Color.Base.Content[2],
      backgroundColor: 'transparent',
      ...theme.Type.Readable.Body.S,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: `color ${theme.time['Time.1x']} ease`,
    })
  };

  return (
    <div ref={containerRef} style={styles.container} onPointerDown={(e) => e.stopPropagation()}>
      <div style={styles.label}>{label}</div>
      
      <motion.button
        style={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ boxShadow: `0 0 1px 0px ${theme.Color.Base.Content[2]}, inset 0 0 1px 0px ${theme.Color.Base.Content[2]}` }}
        whileTap={{ scale: 0.995 }}
        type="button"
      >
        <span style={{ opacity: currentOption ? 1 : 0.5 }}>{currentLabel}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            style={styles.overlay}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHoveringMenu(true)}
            onMouseLeave={() => {
                setIsHoveringMenu(false);
                setHoveredIndex(null);
            }}
          >
            <div style={{ maxHeight: '240px', overflowY: 'auto', position: 'relative' }}>
              {/* FLUID HIGHLIGHT */}
              <motion.div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: theme.height['Height.XS'],
                  borderRadius: theme.radius['Radius.S'],
                  backgroundColor: theme.Color.Base.Surface[2],
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
                animate={{
                  y: hoveredIndex !== null ? hoveredIndex * parseInt(theme.height['Height.XS']) : mouseY - (parseInt(theme.height['Height.XS']) / 2),
                  opacity: isHoveringMenu ? 1 : 0,
                  scale: isHoveringMenu ? 1 : 0.95,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 35,
                  mass: 0.8
                }}
              />

              {options.map((option, idx) => (
                <motion.div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  style={styles.option(option.value === value)}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  whileTap={{ scale: 0.98 }}
                >
                  <span style={{ position: 'relative', zIndex: 1 }}>{option.label}</span>
                  {option.value === value && (
                    <motion.span layoutId="active-check" style={{ position: 'relative', zIndex: 1 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Select;
