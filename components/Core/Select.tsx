/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
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
 *   - animation.highlight: useMotionValue driven follower fill
 * 
 * RENDER:
 *   - view.container: Relative wrapper
 *   - element.label: Minimal uppercase tag
 *   - element.trigger: Clean input-like button
 *   - view.overlay (Portal): Fixed-position floating menu
 *   - element.item: Interactive option row
 *   - element.indicator: Tiny dot for selected state in grid
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const isGrid = variant === 'icon-grid';
  
  const globalMouseX = useMotionValue(0);
  const globalMouseY = useMotionValue(0);

  // Motion Values for high-performance highlight
  const hTop = useMotionValue(0);
  const hLeft = useMotionValue(0);
  const hWidth = useMotionValue(0);
  const hHeight = useMotionValue(0);
  const hOpacity = useMotionValue(0);

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

  const updateHighlight = useCallback(() => {
    if (hoveredIdx === -1 || !dropdownRef.current || !scrollRef.current) {
      animate(hOpacity, 0, { duration: 0.1 });
      return;
    }
    const selector = isGrid ? '[data-grid-item]' : '[data-list-item]';
    const items = scrollRef.current.querySelectorAll(selector);
    const targetItem = items[hoveredIdx] as HTMLElement;
    
    if (targetItem) {
      const sRect = scrollRef.current.getBoundingClientRect();
      const iRect = targetItem.getBoundingClientRect();
      
      const target = {
        top: iRect.top - sRect.top,
        left: iRect.left - sRect.left,
        width: iRect.width,
        height: iRect.height,
      };

      animate(hTop, target.top, { type: 'spring', stiffness: 500, damping: 45, mass: 1 });
      animate(hLeft, target.left, { type: 'spring', stiffness: 500, damping: 45, mass: 1 });
      animate(hWidth, target.width, { type: 'spring', stiffness: 500, damping: 45, mass: 1 });
      animate(hHeight, target.height, { type: 'spring', stiffness: 500, damping: 45, mass: 1 });
      animate(hOpacity, 1, { duration: 0.1 });
    } else {
      animate(hOpacity, 0, { duration: 0.1 });
    }
  }, [hoveredIdx, isGrid, hTop, hLeft, hWidth, hHeight, hOpacity]);

  useEffect(() => {
    updateHighlight();
  }, [updateHighlight]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    const selector = isGrid ? '[data-grid-item]' : '[data-list-item]';
    const items = scrollRef.current.querySelectorAll(selector);
    
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
    if (scrollRef.current) {
      const touch = e.touches[0];
      const selector = isGrid ? '[data-grid-item]' : '[data-list-item]';
      const items = scrollRef.current.querySelectorAll(selector);
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
      padding: 0, // Removed padding for flush highlight
      opacity: rect ? 1 : 0,
      minWidth: isGrid ? '240px' : '160px',
    },
    option: (isSelected: boolean) => ({
      position: 'relative' as const,
      zIndex: 1,
      height: theme.height['Height.XS'],
      padding: `0 ${theme.space['Space.M']}`,
      cursor: 'pointer',
      borderRadius: 0, // Flush with container
      color: isSelected ? theme.Color.Base.Content[1] : theme.Color.Base.Content[2],
      backgroundColor: 'transparent',
      ...theme.Type.Readable.Body.S,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: `color ${theme.time['Time.1x']} ease`,
    }),
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '1px', // Minimal gap for flush look
      padding: 0,
      position: 'relative' as const,
    },
    gridItem: (isSelected: boolean) => ({
      position: 'relative' as const,
      width: '100%',
      aspectRatio: '1/1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 0, // Flush with grid
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
      <div ref={scrollRef} style={{ maxHeight: '240px', overflowY: 'auto', position: 'relative' }}>
        <motion.div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 0,
            backgroundColor: theme.Color.Base.Surface[2],
            borderRadius: theme.radius['Radius.S'],
            top: hTop,
            left: hLeft,
            width: hWidth,
            height: hHeight,
            opacity: hOpacity,
          }}
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
                {option.icon ? (
                  <i className={`ph-bold ${option.icon}`} />
                ) : (
                  <span style={{ fontSize: '14px' }}>{option.label.slice(0, 2)}</span>
                )}
                {option.value === value && (
                   <motion.div
                    layoutId={`selected-dot-${instanceId}`}
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '50%',
                      translateX: '-50%',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor: theme.Color.Base.Content[1],
                      zIndex: 2,
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
