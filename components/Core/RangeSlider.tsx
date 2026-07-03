
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { type MotionValue, motion, useVelocity, useTransform, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import AnimatedCounter from './AnimatedCounter.tsx';

/**
 * 🛠️ ValueDisplay Sub-component
 * Extracted outside the rendering scope of RangeSlider to completely eliminate
 * DOM Thrashing / constant mount/unmount and recreation during fast slide drags.
 * 
 * TO UNDO: Inline this component back into the RangeSlider return statement below.
 */
interface ValueDisplayProps {
  isEditingMV: MotionValue<number>;
  viewOpacity: MotionValue<number>;
  viewPointerEvents: MotionValue<any>;
  editOpacity: MotionValue<number>;
  editPointerEvents: MotionValue<any>;
  inputRef: React.RefObject<HTMLInputElement>;
  min: number;
  max: number;
  step: number;
  decimals: number;
  inputValue: string | number;
  displayValue: MotionValue<number>;
  inputStyle: React.CSSProperties;
  animatedCounterWrapperStyle: React.CSSProperties;
  numberInputContainerStyle: React.CSSProperties;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStartEdit: () => void;
}

const ValueDisplay: React.FC<ValueDisplayProps> = React.memo(({
  isEditingMV,
  viewOpacity,
  viewPointerEvents,
  editOpacity,
  editPointerEvents,
  inputRef,
  min,
  max,
  step,
  decimals,
  inputValue,
  displayValue,
  inputStyle,
  animatedCounterWrapperStyle,
  numberInputContainerStyle,
  onChange,
  onBlur,
  onKeyDown,
  onStartEdit,
}) => {
  return (
    <div style={numberInputContainerStyle}>
      {/* 
        SHADE REWRITE: Dual-mounting the input and counter. 
        Visibility is controlled purely by MotionValue transforms on opacity and pointerEvents.
        This completely eliminates the mount/unmount overhead and allows for zero-rerender mode switching.
      */}
      <motion.input
        ref={inputRef}
        type="number"
        min={min}
        max={max}
        step={step}
        value={inputValue}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        style={{
          ...inputStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: editOpacity,
          pointerEvents: editPointerEvents,
        }}
      />
      <motion.div
        style={{
          ...animatedCounterWrapperStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: viewOpacity,
          pointerEvents: viewPointerEvents,
        }}
        onClick={onStartEdit}
      >
        <AnimatedCounter value={displayValue} useFormatting={false} decimals={decimals} />
      </motion.div>
    </div>
  );
});

ValueDisplay.displayName = 'ValueDisplay';

interface RangeSliderProps {
  label: string;
  motionValue: MotionValue<number>;
  onCommit: (value: number) => void;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  trackBackground?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ 
  label, 
  motionValue, 
  onCommit, 
  onChange,
  min = 0, 
  max = 100,
  step = 1,
  trackBackground 
}) => {
  const { theme } = useTheme();
  const trackRef = useRef<HTMLDivElement>(null);

  // Derived precision for float handling
  const decimals = useMemo(() => {
    const stepStr = step.toString();
    if (stepStr.includes('.')) {
        return stepStr.split('.')[1].length;
    }
    return 0;
  }, [step]);

  // High-performance spring for the visual position to prevent "instant" snapping jumps
  const visualValue = useSpring(motionValue, {
    stiffness: 300,
    damping: 35,
    mass: 1,
    restDelta: 0.0001
  });
  
  // Velocity based rotation for tooltip - normalized across ranges for consistent feel
  const normalizedValue = useTransform(visualValue, [min, max], [0, 100]);
  const velocity = useVelocity(normalizedValue);
  
  // mapping normalized velocity (percentage per second) to rotation
  // 60deg max reached at 2.5 track-widths per second for intensity
  const rawRotate = useTransform(velocity, [-250, 250], [60, -60]);
  const rawSkew = useTransform(velocity, [-250, 250], [-15, 15]);

  // High-inertia lag spring for "heavy mechanical" feel
  const lagRotate = useSpring(rawRotate, {
    stiffness: 15, // Extremely low stiffness for intense lag
    damping: 8,    // Low damping for visceral bounce
    mass: 2.5      // Heavy mass for inertia
  });

  const lagSkew = useSpring(rawSkew, {
    stiffness: 15,
    damping: 8,
    mass: 2.5
  });

  // Zero re-render visibility and dragging state management
  const dragMV = useMotionValue(0); // 0 = not dragging, 1 = dragging
  const hoverMV = useMotionValue(0); // 0 = not hovered, 1 = hovered
  const isEditingMV = useMotionValue(0); // 0 = viewing, 1 = editing
  const [inputValue, setInputValue] = useState<string | number>(''); // Keeping for text input buffer
  const inputRef = useRef<HTMLInputElement>(null);

  // Combined visibility value for tooltip
  const tooltipVisibility = useTransform([dragMV, hoverMV], ([drag, hover]) => {
    return drag === 1 || hover === 1 ? 1 : 0;
  });

  // Mode visibility transforms
  const viewOpacity = useTransform(isEditingMV, [0, 1], [1, 0]);
  const viewPointerEvents = useTransform(isEditingMV, (v) => v === 0 ? 'auto' : 'none') as MotionValue<any>;
  const editOpacity = useTransform(isEditingMV, [0, 1], [0, 1]);
  const editPointerEvents = useTransform(isEditingMV, (v) => v === 1 ? 'auto' : 'none') as MotionValue<any>;

  // Scale value for thumb
  const thumbScale = useSpring(useTransform(dragMV, [0, 1], [1, 1.25]), {
    stiffness: 300,
    damping: 30
  });

  // Handle focus imperatively when editing mode starts
  useEffect(() => {
    const unsubscribe = isEditingMV.on("change", (v) => {
        if (v === 1 && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    });
    return unsubscribe;
  }, [isEditingMV]);

  const updateValueFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    
    // Robust stepped calculation with floating point correction
    const rawValue = min + percent * (max - min);
    const stepped = Math.round(rawValue / step) * step;
    const newValue = parseFloat(stepped.toFixed(decimals));
    
    // We only set the motion value, avoiding component-wide React virtual DOM re-renders during drag!
    motionValue.set(newValue);
    if (onChange) onChange(newValue);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragMV.set(1);
    trackRef.current?.setPointerCapture(e.pointerId);
    updateValueFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMV.get() === 1) {
      updateValueFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragMV.get() === 1) {
      dragMV.set(0);
      trackRef.current?.releasePointerCapture(e.pointerId);
      
      // Flush back to callback ONLY when pointer dragging is finalized
      onCommit(motionValue.get());
    }
  };

  const handleCommit = () => {
    isEditingMV.set(0);
    const v = parseFloat(String(inputValue));
    const clamped = isNaN(v) ? min : parseFloat(Math.min(Math.max(v, min), max).toFixed(decimals));
    motionValue.set(clamped);
    onCommit(clamped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const v = parseFloat(e.target.value);
    
    if (!isNaN(v)) {
        const clamped = parseFloat(Math.min(Math.max(v, min), max).toFixed(decimals));
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

  // Convert the current motion value to percentage translation style for zero re-render DOM sync
  const percentageStyle = useTransform(normalizedValue, (v) => `${v}%`);

  const numberInputContainerStyle: React.CSSProperties = {
    width: theme.space['Space.7XL'],
    height: theme.space['Space.XL'],
    position: 'relative',
    ...theme.Type.Readable.Body.M,
    textAlign: 'center',
    color: theme.Color.Base.Content[1],
  };
  
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    padding: `0 ${theme.space['Space.XS']}`,
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
    bottom: 'calc(100% + 5px)', // Arrow is 5px tall, so this makes tip touch handle exactly
    left: '50%',
    backgroundColor: theme.Color.Accent.Surface[1],
    color: theme.Color.Accent.Content[1],
    padding: `${theme.space['Space.XS']} ${theme.space['Space.S']}`,
    borderRadius: theme.radius['Radius.S'],
    ...theme.Type.Expressive.Data,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    boxShadow: theme.effects['Effect.Shadow.Drop.2'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: theme.space['Space.2XL'],
    height: theme.space['Space.XL'],
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
      <label style={{ ...theme.Type.Readable.Label.S, display: 'block', marginBottom: theme.space['Space.S'], color: theme.Color.Base.Content[2] }}>
        {label}
      </label>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.S'] }}>
        
        {/* Custom Track */}
        <div 
            ref={trackRef}
            style={{ 
                flex: 1, 
                height: theme.space['Space.2XL'], // Increased hit area
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                touchAction: 'none' // Prevent scrolling while dragging
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onMouseEnter={() => hoverMV.set(1)}
            onMouseLeave={() => hoverMV.set(0)}
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
                  <motion.div style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      height: '100%', 
                      width: percentageStyle, // Binds width directly to motion value transform
                      backgroundColor: theme.Color.Accent.Surface[1], 
                      borderRadius: '3px' 
                  }} />
                )}
                
                {/* Thumb Container for Positioning */}
                <motion.div style={{
                    position: 'absolute',
                    top: '50%',
                    left: percentageStyle, // Binds coordinates directly to motion value transform
                    transform: 'translate(-50%, -50%)',
                    width: theme.space['Space.L'], // Approximated from 18px
                    height: theme.space['Space.L'],
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}>
                    <motion.div
                        style={{
                            ...tooltipStyle,
                            opacity: tooltipVisibility,
                            x: "-50%",
                            rotate: lagRotate,
                            skewX: lagSkew,
                            transformOrigin: '50% 29px', // 24px height + 5px arrow
                        }}
                    >
                        <AnimatedCounter value={motionValue} useFormatting={false} decimals={decimals} />
                        <div style={arrowStyle} />
                    </motion.div>

                    {/* Thumb Visual */}
                    <motion.div 
                        style={{
                            scale: thumbScale,
                            width: theme.space['Space.L'], // Approximated from 18px
                            height: theme.space['Space.L'],
                            backgroundColor: theme.Color.Base.Surface[1],
                            border: `2px solid ${theme.Color.Accent.Surface[1]}`,
                            borderRadius: '50%',
                            boxShadow: theme.effects['Effect.Shadow.Drop.1'],
                            position: 'relative'
                        }} 
                    />
                </motion.div>
            </div>
        </div>

        {/* Number Input */}
        <ValueDisplay
          isEditingMV={isEditingMV}
          viewOpacity={viewOpacity}
          viewPointerEvents={viewPointerEvents}
          editOpacity={editOpacity}
          editPointerEvents={editPointerEvents}
          inputRef={inputRef}
          min={min}
          max={max}
          step={step}
          decimals={decimals}
          inputValue={inputValue}
          displayValue={motionValue}
          inputStyle={inputStyle}
          animatedCounterWrapperStyle={animatedCounterWrapperStyle}
          numberInputContainerStyle={numberInputContainerStyle}
          onChange={handleInputChange}
          onBlur={handleCommit}
          onKeyDown={handleInputKeyDown}
          onStartEdit={() => {
            setInputValue(motionValue.get());
            isEditingMV.set(1);
          }}
        />
      </div>
    </div>
  );
};

export default RangeSlider;
