/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState, useEffect } from 'react';
import { motion, useTransform, useMotionValue, MotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import AnimatedCounter from '../Core/AnimatedCounter.tsx';

interface FillSliderProps {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  value?: MotionValue<number>;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
  formatValue?: (value: number) => React.ReactNode;
}

/**
 * 🎚️ FillSlider Component
 * A minimalist slider where the entire track area fills up to represent the value.
 * Integrates label and animated value directly into the track.
 */
const FillSlider: React.FC<FillSliderProps> = ({
  label = "Scale",
  min = 0,
  max = 1,
  step = 0.01,
  defaultValue = 0.7,
  value: externalValue,
  onChange,
  onCommit,
  formatValue
}) => {
  const { theme } = useTheme();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 1. Setup MotionValue (internal or external)
  const internalMV = useMotionValue(defaultValue);
  const activeMV = externalValue || internalMV;

  // 2. Derive visual percentage for the fill width
  const percentage = useTransform(activeMV, [min, max], [0, 100]);
  const widthStyle = useTransform(percentage, (p) => `${p}%`);

  // 3. Setup Counter Value (0-100 for AnimatedCounter)
  // Since AnimatedCounter rounds to nearest integer, we map the scale 0-1 to 0-100
  const counterMV = useTransform(activeMV, [min, max], [0, 100]);

  const updateValueFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const rawValue = min + percent * (max - min);
    
    // Snap to step if provided
    const steppedValue = Math.round(rawValue / step) * step;
    const finalValue = Math.min(Math.max(steppedValue, min), max);

    activeMV.set(finalValue);
    if (onChange) onChange(finalValue);
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
      if (onCommit) onCommit(activeMV.get());
    }
  };

  // 4. Styles using Shade DSL patterns (JS objects)
  const styles = {
    container: {
      width: '100%',
      height: theme.height['Height.L'], // 56px
      position: 'relative',
      borderRadius: theme.radius['Radius.L'],
      backgroundColor: theme.Color.Base.Surface[2],
      overflow: 'hidden',
      cursor: 'pointer',
      userSelect: 'none',
      touchAction: 'none',
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
    } as React.CSSProperties,

    fill: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      backgroundColor: theme.Color.Base.Surface[3],
      zIndex: 1,
    } as React.CSSProperties,

    content: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${theme.space['Space.L']}`,
      zIndex: 2,
      pointerEvents: 'none', // Allow clicks to pass through to container
    } as React.CSSProperties,

    label: {
      ...theme.Type.Readable.Body.M,
      color: theme.Color.Base.Content[2],
      fontWeight: 500,
    } as React.CSSProperties,

    valueWrapper: {
      ...theme.Type.Expressive.Data,
      color: theme.Color.Base.Content[1],
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
    } as React.CSSProperties,
  };

  return (
    <div
      ref={trackRef}
      style={styles.container}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Fill Layer */}
      <motion.div
        style={{
          ...styles.fill,
          width: widthStyle,
        }}
      />

      {/* Content Overlay */}
      <div style={styles.content}>
        <span style={styles.label}>{label}</span>
        
        <div style={styles.valueWrapper}>
          {formatValue ? (
            formatValue(activeMV.get())
          ) : (
            <>
              {/* Default formatting: "0.XX" */}
              <span>0.</span>
              <AnimatedCounter value={counterMV} useFormatting={false} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FillSlider;
