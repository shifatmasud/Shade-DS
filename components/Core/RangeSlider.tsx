
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useEffect, useState } from 'react';
import { type MotionValue } from 'framer-motion';
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
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState<string | number>('');

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
                height: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                touchAction: 'none' // Prevent scrolling while dragging
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
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
                
                {/* Thumb */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${percentage}%`,
                    width: '18px',
                    height: '18px',
                    backgroundColor: theme.Color.Base.Surface[1],
                    border: `2px solid ${theme.Color.Accent.Surface[1]}`,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: theme.effects['Effect.Shadow.Drop.1'],
                    transition: 'transform 0.1s ease',
                    transformOrigin: 'center'
                }} />
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
              onPointerDown={() => {
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