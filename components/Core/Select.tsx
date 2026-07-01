/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

/**
 * SHADE DSL ARCHITECTURE
 * ----------------------
 * DATA: 
 *   - props: { label, value, onChange, options }
 *   - state: isOpen (boolean), rect (DOMRect | null)
 * 
 * LOGIC:
 *   - action.toggle: Toggles open state
 *   - action.select: Selects option and closes
 *   - action.updatePosition: Calculates trigger rect for portal placement
 *   - effect.clickOutside: Closes on blur
 *   - effect.syncPosition: Updates rect on scroll/resize when open
 * 
 * RENDER:
 *   - view.container: Relative wrapper
 *   - element.label: Minimal uppercase tag
 *   - element.trigger: Clean input-like button
 *   - view.overlay (Portal): Fixed-position floating menu
 *   - element.item: Interactive option row
 */

interface SelectProps<T extends string = string> {
  label: string;
  value: T;
  onChange: (e: { target: { value: T } }) => void;
  options: { value: T; label: string }[];
  style?: React.CSSProperties;
}

interface SelectOverlayProps {
  triggerRef: React.RefObject<HTMLButtonElement>;
  isOpen: boolean;
  theme: any;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (value: string) => void;
  instanceId: string;
}

const SelectOverlay: React.FC<SelectOverlayProps> = ({ 
  triggerRef, 
  isOpen, 
  theme, 
  options, 
  value, 
  onSelect,
  instanceId
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use MotionValues for high-frequency updates to avoid React re-renders
  const mouseY = useMotionValue(0);
  const hoveredIndex = useMotionValue(-1); // -1 means no index is hovered
  const isHoveringMenu = useMotionValue(0); // 0 or 1 for opacity/scale

  const updateRect = useCallback(() => {
    if (triggerRef.current) {
      const newRect = triggerRef.current.getBoundingClientRect();
      setRect(prev => {
        if (!prev) return newRect;
        if (
          prev.top === newRect.top && 
          prev.left === newRect.left && 
          prev.width === newRect.width && 
          prev.height === newRect.height
        ) {
          return prev;
        }
        return newRect;
      });
    }
  }, [triggerRef]);

  useLayoutEffect(() => {
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [updateRect]);

  useLayoutEffect(() => {
    updateRect();
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      mouseY.set(e.clientY - rect.top);
    }
  };

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: rect ? rect.bottom + parseInt(theme.space['Space.XS']) : 0,
      left: rect ? rect.left : 0,
      width: rect ? rect.width : 'auto',
      backgroundColor: theme.Color.Base.Surface[1],
      border: 'none',
      boxShadow: `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`,
      borderRadius: theme.radius['Radius.S'],
      zIndex: 1000,
      overflow: 'hidden',
      padding: theme.space['Space.XS'],
      opacity: rect ? 1 : 0, // Prevent flash at (0,0)
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

  // Derive the highlight position from MotionValues
  const highlightY = useTransform([hoveredIndex, mouseY], ([idx, y]: any[]) => {
    if (idx !== -1) {
      return idx * parseInt(theme.height['Height.XS']);
    }
    return y - (parseInt(theme.height['Height.XS']) / 2);
  });

  return (
    <motion.div
      ref={dropdownRef}
      style={styles.overlay}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => isHoveringMenu.set(1)}
      onMouseLeave={() => {
          isHoveringMenu.set(0);
          hoveredIndex.set(-1);
      }}
    >
      <div style={{ maxHeight: '240px', overflowY: 'auto', position: 'relative' }}>
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
            y: highlightY,
            opacity: isHoveringMenu,
            scale: useTransform(isHoveringMenu, [0, 1], [0.95, 1]),
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
            onClick={() => onSelect(option.value)}
            style={styles.option(option.value === value)}
            onMouseEnter={() => hoveredIndex.set(idx)}
            whileTap={{ scale: 0.98 }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>{option.label}</span>
            {option.value === value && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const Select = <T extends string = string>({ label, value, onChange, options, style }: SelectProps<T>) => {
  const { theme } = useTheme();
  const instanceId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentOption = options.find(opt => opt.value === value);
  const currentLabel = currentOption?.label || value;

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target as Node);
      if (isOutsideContainer) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  const handleSelect = (newValue: string) => {
    onChange({ target: { value: newValue } as any });
    setIsOpen(false);
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
      ...theme.border.getBorder1px(isOpen ? theme.Color.Base.Content[1] : theme.Color.Base.Surface[3]),
      backgroundColor: theme.Color.Base.Surface[1],
      color: theme.Color.Base.Content[1],
      ...theme.Type.Readable.Body.M,
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      outline: 'none',
      transition: `box-shadow ${theme.time['Time.2x']} cubic-bezier(0.4, 0, 0.2, 1), transform ${theme.time['Time.2x']} cubic-bezier(0.4, 0, 0.2, 1)`,
      fontWeight: 500,
    }
  };

  return (
    <motion.div layout ref={containerRef} style={styles.container} onPointerDown={(e) => e.stopPropagation()}>
      <div style={styles.label}>{label}</div>
      
      <motion.button
        layout
        ref={triggerRef}
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

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <SelectOverlay
              triggerRef={triggerRef}
              isOpen={isOpen}
              theme={theme}
              options={options}
              value={value}
              onSelect={handleSelect}
              instanceId={instanceId}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default Select;
