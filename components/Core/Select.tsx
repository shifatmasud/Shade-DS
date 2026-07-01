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
  options: { value: T; label: string; icon?: string }[];
  style?: React.CSSProperties;
  variant?: 'default' | 'icon-grid';
}

interface SelectOverlayProps {
  triggerRef: React.RefObject<HTMLButtonElement>;
  isOpen: boolean;
  theme: any;
  options: { value: string; label: string; icon?: string }[];
  value: string;
  onSelect: (value: string) => void;
  instanceId: string;
  variant?: 'default' | 'icon-grid';
}

const SelectOverlay: React.FC<SelectOverlayProps> = ({ 
  triggerRef, 
  isOpen, 
  theme, 
  options, 
  value, 
  onSelect,
  instanceId,
  variant = 'default'
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isGrid = variant === 'icon-grid';
  
  const globalMouseX = useMotionValue(0);
  const globalMouseY = useMotionValue(0);

  const updateRect = useCallback(() => {
    if (triggerRef.current) {
      const newRect = triggerRef.current.getBoundingClientRect();
      setRect(prev => {
        if (!prev) return newRect;
        if (prev.top === newRect.top && prev.left === newRect.left) return prev;
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

  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [highlightStyle, setHighlightStyle] = useState<{ top: number; left: number; width: number; height: number; opacity: number }>({
    top: 0, left: 0, width: 0, height: 0, opacity: 0
  });

  const updateHighlight = useCallback(() => {
    if (hoveredIdx === -1 || !dropdownRef.current) {
      setHighlightStyle(prev => ({ ...prev, opacity: 0 }));
      return;
    }
    const selector = isGrid ? '[data-grid-item]' : '[data-list-item]';
    const items = dropdownRef.current.querySelectorAll(selector);
    const targetItem = items[hoveredIdx] as HTMLElement;
    
    if (targetItem) {
      const dRect = dropdownRef.current.getBoundingClientRect();
      const iRect = targetItem.getBoundingClientRect();
      
      setHighlightStyle({
        top: iRect.top - dRect.top,
        left: iRect.left - dRect.left,
        width: iRect.width,
        height: iRect.height,
        opacity: 1
      });
    } else {
      setHighlightStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [hoveredIdx, isGrid]);

  useEffect(() => {
    updateHighlight();
  }, [updateHighlight]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const selector = isGrid ? '[data-grid-item]' : '[data-list-item]';
    const items = dropdownRef.current?.querySelectorAll(selector);
    if (!items) return;

    let foundIndex = -1;
    items.forEach((item, idx) => {
      const rect = item.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        foundIndex = idx;
      }
    });

    if (foundIndex !== hoveredIdx) {
      setHoveredIdx(foundIndex);
    }
    globalMouseX.set(e.clientX);
    globalMouseY.set(e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dropdownRef.current) {
      const touch = e.touches[0];
      const selector = isGrid ? '[data-grid-item]' : '[data-list-item]';
      const items = dropdownRef.current.querySelectorAll(selector);
      let foundIndex = -1;
      items.forEach((item, idx) => {
        const itemRect = item.getBoundingClientRect();
        if (
          touch.clientX >= itemRect.left &&
          touch.clientX <= itemRect.right &&
          touch.clientY >= itemRect.top &&
          touch.clientY <= itemRect.bottom
        ) {
          foundIndex = idx;
        }
      });

      if (foundIndex !== hoveredIdx) {
        setHoveredIdx(foundIndex);
      }
      globalMouseX.set(touch.clientX);
      globalMouseY.set(touch.clientY);
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
      opacity: rect ? 1 : 0,
      minWidth: isGrid ? '240px' : '160px',
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
      justifyContent: 'center', // Changed from space-between to center
      transition: `color ${theme.time['Time.1x']} ease`,
      gap: theme.space['Space.S'],
    }),
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: theme.space['Space.XS'],
      padding: theme.space['Space.XS'],
      position: 'relative' as const,
    },
    gridItem: (isSelected: boolean) => ({
      position: 'relative' as const,
      width: '100%',
      aspectRatio: '1/1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius['Radius.S'],
      cursor: 'pointer',
      color: isSelected ? theme.Color.Base.Content[1] : theme.Color.Base.Content[2],
      fontSize: '20px',
      zIndex: 1,
      transition: `color ${theme.time['Time.1x']} ease`,
    }),
    floatingLabel: {
      position: 'fixed' as const,
      pointerEvents: 'none' as const,
      zIndex: 1001,
      backgroundColor: theme.Color.Accent.Surface[1],
      color: theme.Color.Accent.Content[1],
      padding: `${theme.space['Space.2XS']} ${theme.space['Space.S']}`,
      borderRadius: theme.radius['Radius.S'],
      ...theme.Type.Expressive.Data,
      fontSize: '10px',
      textTransform: 'uppercase' as const,
      boxShadow: theme.effects['Effect.Shadow.Drop.2'],
      whiteSpace: 'nowrap' as const,
      x: globalMouseX,
      y: useTransform(globalMouseY, (v) => v - 30),
      opacity: hoveredIdx === -1 ? 0 : 1,
      scale: hoveredIdx === -1 ? 0.8 : 1,
    }
  };

  const hoveredLabel = hoveredIdx !== -1 ? options[hoveredIdx].label : '';

  return (
    <motion.div
      ref={dropdownRef}
      data-select-overlay={instanceId}
      style={styles.overlay}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => {
        if (hoveredIdx !== -1) {
          onSelect(options[hoveredIdx].value);
        }
      }}
      onMouseLeave={() => {
          setHoveredIdx(-1);
      }}
    >
      <div style={{ maxHeight: '240px', overflowY: 'auto', position: 'relative' }}>
        <motion.div
          animate={{
            top: highlightStyle.top,
            left: highlightStyle.left,
            width: highlightStyle.width,
            height: highlightStyle.height,
            opacity: highlightStyle.opacity,
          }}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 0,
            backgroundColor: theme.Color.Base.Surface[2],
            borderRadius: theme.radius['Radius.S'],
          }}
          transition={{ type: 'spring', stiffness: 450, damping: 40, mass: 1 }}
        />

        {isGrid ? (
          <div style={styles.gridContainer}>
            {options.map((option, idx) => (
              <motion.div
                key={option.value}
                data-grid-item
                onClick={() => onSelect(option.value)}
                style={styles.gridItem(option.value === value)}
                onMouseEnter={() => setHoveredIdx(idx)}
                whileTap={{ scale: 0.95 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
                  {option.icon ? (
                    <i className={`ph-bold ${option.icon}`} style={{ display: 'block', lineHeight: 1 }} />
                  ) : (
                    <span style={{ fontSize: '14px', lineHeight: 1, display: 'block' }}>{option.label.slice(0, 2)}</span>
                  )}
                </div>
                {option.value === value && (
                   <motion.div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: theme.radius['Radius.S'],
                      backgroundColor: theme.Color.Base.Surface[3],
                      zIndex: -1,
                      opacity: hoveredIdx === idx ? 0 : 1,
                    }}
                   />
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          options.map((option, idx) => (
            <motion.div
              key={option.value}
              data-list-item
              onClick={() => onSelect(option.value)}
              style={styles.option(option.value === value)}
              onMouseEnter={() => setHoveredIdx(idx)}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: theme.space['Space.S'] }}>
                <span style={{ lineHeight: 1 }}>{option.label}</span>
                {option.value === value && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </motion.span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {isGrid && (
        <motion.div style={styles.floatingLabel}>
          <motion.span>{hoveredLabel}</motion.span>
        </motion.div>
      )}
    </motion.div>
  );
};

const Select = <T extends string = string>({ label, value, onChange, options, style, variant = 'default' }: SelectProps<T>) => {
  const { theme } = useTheme();
  const instanceId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentOption = options.find(opt => opt.value === value);
  const currentLabel = currentOption?.label || value;
  const currentIcon = currentOption?.icon;

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      
      // Also check if we're clicking inside the portal (dropdown menu)
      // Since it's in a portal, it won't be inside containerRef.
      // We search for the select overlay by the instance ID or a data attribute.
      const isInsideOverlay = document.querySelector(`[data-select-overlay="${instanceId}"]`)?.contains(target);

      if (isOutsideContainer && !isInsideOverlay) {
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
  }, [isOpen, handleClose, instanceId]);

  const handleSelect = (newValue: string) => {
    onChange({ target: { value: newValue } as any });
    setIsOpen(false);
  };

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
      transition: `box-shadow ${theme.time['Time.2x']} ease, transform ${theme.time['Time.2x']} ease`,
      fontWeight: 500,
    }
  };

  return (
    <motion.div layout ref={containerRef} style={styles.container}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.S'], opacity: currentOption ? 1 : 0.5 }}>
          {currentIcon && <i className={`ph-bold ${currentIcon}`} style={{ fontSize: '18px' }} />}
          <span>{currentLabel}</span>
        </div>
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
              variant={variant}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default Select;
