
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useEffect, useState } from 'react';
import { type MotionValue, motion, useVelocity, useTransform, AnimatePresence, useSpring } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import AnimatedCounter from './AnimatedCounter.tsx';

interface RangeSliderProps {
  label: string;
  motionValue: MotionValue<number>;
  onCommit: (value: number) => void;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  trackBackground?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ 
  label, 
  motionValue, 
  onCommit, 
  onChange,
  min = 0, 
  max = 100,
  trackBackground 
}) => {
  const { theme } = useTheme();
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Use a fallback for the initial value to avoid NaN in calculations
  const [internalValue, setInternalValue] = useState(() => {
    const val = motionValue.get();
    return typeof val === 'number' ? val : min;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState<string | number>('');

  // Velocity based rotation for tooltip - high intensity bounciness
  const velocity = useVelocity(motionValue);
  // mapping velocity to wider rotation range (60deg max) for more pronounced lag
  const rawRotate = useTransform(velocity, [-1000, 1000], [60, -60]);
  const skew = useTransform(velocity, [-1000, 1000], [-12, 12]);

  // Add severe lag for visceral feel as requested
  const lagRotate = useSpring(rawRotate, {
    stiffness: 30, // Lower stiffness = slower response/more lag
    damping: 15,    // Lower damping = more bounciness
    mass: 1.2
  });

  const lagSkew = useSpring(skew, {
    stiffness: 30,
    damping: 15
  });

  // Sync internal state with external motion value updates (e.g. undo/redo)
  useEffect(() => {
    const unsubscribe = motionValue.on("change", (v) => {
      if (!isDragging) {
        setInternalValue(v);
      }
    });
    return unsubscribe;
  }, [motionValue, isDragging]);

  const updateValueFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const newValue = Math.round(min + percent * (max - min));
    
    setInternalValue(newValue);
    motionValue.set(newValue); // Real-time update
    if (onChange) onChange(newValue);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    trackRef.current?.setPointerCapture(e.pointerId);
    updateValueFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateValueFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      trackRef.current?.releasePointerCapture(e.pointerId);
      onCommit(internalValue); // Commit only on release
    }
  };

  const handleCommit = () => {
    setIsEditing(false);
    const v = parseInt(String(inputValue), 10);
    const clamped = isNaN(v) ? min : Math.min(Math.max(v, min), max);
    setInternalValue(clamped);
    motionValue.set(clamped);
    onCommit(clamped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const v = parseInt(e.target.value, 10);
    
    if (!isNaN(v)) {
        const clamped = Math.min(Math.max(v, min), max);
        motionValue.set(clamped);
        if (onChange) onChange(clamped);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      handleCommit();
      (e.target as HTMLInputElement).blur();
    }
  };

  const percentage = Math.max(0, Math.min(100, ((internalValue - min) / (max - min)) * 100));

  const numberInputContainerStyle: React.CSSProperties = {
    width: '60px',
    height: '24px',
    position: 'relative',
    fontFamily: theme.Type.Readable.Body.M.fontFamily,
    fontSize: '14px',
    textAlign: 'center',
    color: theme.Color.Base.Content[1],
  };
  
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    padding: `0 ${theme.spacing['Space.XS']}`,
    borderRadius: theme.radius['Radius.S'],
    border: `1px solid ${theme.Color.Base.Surface[3]}`,
    backgroundColor: theme.Color.Base.Surface[2],
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    textAlign: 'inherit',
    outline: 'none',
  };

  const animatedCounterWrapperStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontVariantNumeric: 'tabular-nums',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 'calc(100% + 10px)', // Precise offset for arrow tip
    left: '50%',
    backgroundColor: theme.Color.Accent.Surface[1],
    color: theme.Color.Accent.Content[1],
    padding: `${theme.spacing['Space.XS']} ${theme.spacing['Space.S']}`,
    borderRadius: theme.radius['Radius.S'],
    fontSize: '12px',
    fontFamily: theme.Type.Expressive.Data.fontFamily,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    boxShadow: theme.effects['Effect.Shadow.Drop.2'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '24px',
    zIndex: 100,
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    borderTop: `5px solid ${theme.Color.Accent.Surface[1]}`,
  };

  // Tactile bouncy spring config
  const tactileSpring = {
    type: 'spring' as const,
    damping: 12,
    stiffness: 60,
    mass: 1,
  };

  return (
    <div onPointerDown={(e) => e.stopPropagation()}>
      <label style={{ ...theme.Type.Readable.Label.S, display: 'block', marginBottom: theme.spacing['Space.S'], color: theme.Color.Base.Content[2] }}>
        {label}
      </label>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing['Space.S'] }}>
        
        {/* Custom Track */}
        <div 
            ref={trackRef}
            style={{ 
                flex: 1, 
                height: '32px', // Increased hit area
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                touchAction: 'none' // Prevent scrolling while dragging
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={{ 
                position: 'relative', 
                width: '100%', 
                height: '6px', 
                // Use the shorthand 'background' solely to avoid conflicts with 'backgroundColor'
                background: trackBackground || theme.Color.Base.Surface[3],
                borderRadius: '3px',
                overflow: 'visible' 
            }}>
                {/* Fill Bar (Only show if no custom background gradient) */}
                {!trackBackground && (
                  <div style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      height: '100%', 
                      width: `${percentage}%`, 
                      backgroundColor: theme.Color.Accent.Surface[1], 
                      borderRadius: '3px' 
                  }} />
                )}
                
                {/* Thumb Container for Positioning */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${percentage}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '18px',
                    height: '18px',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}>
                    <AnimatePresence>
                        {(isDragging || isHovered) && (
                            <motion.div
                                initial={{ opacity: 0, y: 12, scale: 0.8, rotate: 0 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 12, scale: 0.8 }}
                                transition={tactileSpring}
                                style={{
                                    ...tooltipStyle,
                                    x: "-50%",
                                    rotate: lagRotate,
                                    skewX: lagSkew,
                                    transformOrigin: '50% 29px', // 24px height + 5px arrow
                                }}
                            >
                                <AnimatedCounter value={Math.round(internalValue)} useFormatting={false} />
                                <div style={arrowStyle} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Thumb Visual */}
                    <motion.div 
                        animate={{ 
                            scale: isDragging ? 1.25 : 1,
                            backgroundColor: isDragging ? theme.Color.Base.Surface[1] : theme.Color.Base.Surface[1]
                        }}
                        transition={tactileSpring}
                        style={{
                            width: '18px',
                            height: '18px',
                            backgroundColor: theme.Color.Base.Surface[1],
                            border: `2px solid ${theme.Color.Accent.Surface[1]}`,
                            borderRadius: '50%',
                            boxShadow: theme.effects['Effect.Shadow.Drop.1'],
                            position: 'relative'
                        }} 
                    />
                </div>
            </div>
        </div>

        {/* Number Input */}
        <div style={numberInputContainerStyle}>
          {isEditing ? (
            <input
              type="number"
              min={min}
              max={max}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleCommit}
              onKeyDown={handleInputKeyDown}
              autoFocus
              style={inputStyle}
            />
          ) : (
            <div
              style={animatedCounterWrapperStyle}
              onClick={() => {
                setInputValue(Math.round(internalValue));
                setIsEditing(true)
              }}
            >
              <AnimatedCounter value={Math.round(internalValue)} useFormatting={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;
