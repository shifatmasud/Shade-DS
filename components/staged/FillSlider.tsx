/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, useTransform, useMotionValue, MotionValue, useSpring } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import AnimatedCounter from '../Core/sub-components/AnimatedCounter.tsx';

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
  
  // Use MotionValues for binary interaction states
  const isDraggingMV = useMotionValue(0);
  const isHoveredMV = useMotionValue(0);

  // 1. Setup MotionValue (internal or external)
  const internalMV = useMotionValue(defaultValue);
  const activeMV = externalValue || internalMV;

  const inputRange = useMemo(() => [min, max], [min, max]);
  const outputRange = useMemo(() => [0, 100], []);

  // Derived precision for float handling
  const decimals = useMemo(() => {
    const stepStr = step.toString();
    if (stepStr.includes('.')) {
        return stepStr.split('.')[1].length;
    }
    return 0;
  }, [step]);

  // 2. Derive visual percentage for the fill width
  const visualValue = useSpring(activeMV, {
    stiffness: 400,
    damping: 40,
    mass: 1,
    restDelta: 0.001
  });

  const percentage = useTransform(visualValue, inputRange, outputRange);
  const widthStyle = useTransform(percentage, (p) => `${p}%`);

  // 3. Setup Counter Value
  // We use the spring value for the counter so numbers "roll" smoothly even on snap
  const counterMV = visualValue;

  const updateValueFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const rawValue = min + percent * (max - min);
    
    // Robust stepped calculation with floating point correction
    const stepped = Math.round(rawValue / step) * step;
    const finalValue = parseFloat(Math.min(Math.max(stepped, min), max).toFixed(decimals));

    activeMV.set(finalValue);
    if (onChange) onChange(finalValue);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingMV.set(1);
    if (trackRef.current) {
        trackRef.current.setPointerCapture(e.pointerId);
        trackRef.current.style.cursor = 'grabbing';
    }
    updateValueFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingMV.get() === 1) {
      updateValueFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingMV.get() === 1) {
      isDraggingMV.set(0);
      if (trackRef.current) {
          trackRef.current.releasePointerCapture(e.pointerId);
          trackRef.current.style.cursor = 'pointer';
      }
      if (onCommit) onCommit(activeMV.get());
    }
  };

  // 4. Styles using Shade DSL patterns (JS objects)
  const styles = {
    container: {
      base: {
        width: '100%',
        height: theme.height['Height.L'],
        position: 'relative' as const,
        borderRadius: theme.radius['Radius.L'],
        backgroundColor: theme.Color.Base.Surface[2],
        overflow: 'hidden' as const,
        cursor: 'pointer',
        userSelect: 'none' as const,
        touchAction: 'none' as const,
        ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
      }
    },

    fill: {
      base: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        height: '100%',
        backgroundColor: theme.Color.Base.Content[3],
        opacity: 0.25,
        zIndex: 1,
      },
    },

    thumb: {
      base: {
        position: 'absolute' as const,
        top: '10%',
        height: '80%',
        width: '2px',
        borderRadius: theme.radius['Radius.Full'],
        backgroundColor: theme.Color.Base.Content[1],
        zIndex: 3,
        translateX: '-50%',
        pointerEvents: 'none' as const,
      },
    },

    content: {
      base: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${theme.space['Space.L']}`,
        zIndex: 2,
        pointerEvents: 'none' as const,
      },
    },

    label: {
      base: {
        ...theme.Type.Readable.Body.M,
        color: theme.Color.Base.Content[2],
        fontWeight: 500,
      },
    },

    valueWrapper: {
      base: {
        ...theme.Type.Expressive.Data,
        color: theme.Color.Base.Content[1],
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
      },
    },
  };

  const getStyle = (config: any) => ({ ...config.base });

  // Composite interaction state for opacity
  const thumbOpacity = useTransform(
      [isHoveredMV, isDraggingMV],
      ([hover, drag]) => (hover || drag ? 1 : 0)
  );

  return (
    <div
      ref={trackRef}
      style={getStyle(styles.container)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => isHoveredMV.set(1)}
      onPointerLeave={() => isHoveredMV.set(0)}
    >
      {/* Fill Layer */}
      <motion.div
        style={{
          ...getStyle(styles.fill),
          width: widthStyle,
        }}
      />

      {/* Thumb Layer */}
      <motion.div
        style={{
          ...getStyle(styles.thumb),
          left: widthStyle,
          opacity: thumbOpacity,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Content Overlay */}
      <div style={getStyle(styles.content)}>
        <span style={getStyle(styles.label)}>{label}</span>
        
        <div style={getStyle(styles.valueWrapper)}>
          {formatValue ? (
            formatValue(activeMV.get())
          ) : (
            <AnimatedCounter value={activeMV} useFormatting={false} decimals={decimals} />
          )}
        </div>
      </div>
    </div>
  );
};

export default FillSlider;
