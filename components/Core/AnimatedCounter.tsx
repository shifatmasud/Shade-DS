/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { motion, useTransform, animate, motionValue, useMotionValue, MotionValue } from 'framer-motion';

// --- REF STRUCTURE ---
// SHADE REWRITE SAFETY: This component avoids React-level state updates during slider movements.
// Animation is offloaded directly to Framer Motion values.
// To undo: revert this file to the original version where we pass a standard value prop
// and let <motion.div animate={{ y: ... }} /> re-render digit states of parent layout.

const DIGIT_HEIGHT = '1em'; // Corresponds to the font size
const MAX_SLOTS = 20; // Support very large numbers

interface DigitProps {
  mv: MotionValue<number>;
  opacity: MotionValue<number>;
  width: MotionValue<any>;
}

const Digit: React.FC<DigitProps> = React.memo(({ mv, opacity, width }) => {
  const styles = {
    digitWrapper: {
      height: DIGIT_HEIGHT,
      overflow: 'hidden',
    },
    digitColumn: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    } as React.CSSProperties,
  };

  const yTranslate = useTransform(mv, (v) => `${v}em`);

  return (
    <motion.div style={{ ...styles.digitWrapper, opacity, width }}>
      <motion.div
        style={{
          ...styles.digitColumn,
          y: yTranslate,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
          <span key={i} style={{ height: DIGIT_HEIGHT, display: 'block' }}>{i}</span>
        ))}
      </motion.div>
    </motion.div>
  );
});

Digit.displayName = 'Digit';

interface AnimatedCounterProps {
  value: number | MotionValue<number>;
  useFormatting?: boolean;
  decimals?: number;
}

const isMotionValue = (val: any): val is MotionValue<number> => {
  return val && typeof val === 'object' && 'get' in val && 'on' in val;
};

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  value, 
  useFormatting = true,
  decimals = 0 
}) => {
  const localMV = useMotionValue(typeof value === 'number' ? value : 0);
  
  useEffect(() => {
    if (typeof value === 'number') {
      localMV.set(value);
    }
  }, [value, localMV]);

  const activeMotionValue = isMotionValue(value) ? value : localMV;

  // Helper to format value string based on decimals
  const formatValue = (val: number) => {
    if (useFormatting && decimals > 0) {
      return val.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return val.toFixed(decimals);
  };

  /**
   * SHADE REWRITE: Fixed-Slot Architecture
   * Instead of using useState to track the "tracks" (which triggers React re-renders),
   * we pre-allocate a fixed number of slots. Each slot's content and visibility
   * is driven purely by MotionValues and transforms.
   */
  const slots = useMemo(() => Array.from({ length: MAX_SLOTS }), []);
  
  // We need a stable reference to the formatted string to drive the slots
  const formattedMV = useTransform(activeMotionValue, (val) => formatValue(val || 0));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: DIGIT_HEIGHT,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {slots.map((_, i) => (
        <Slot key={i} index={i} formattedMV={formattedMV} />
      ))}
    </div>
  );
};

interface SlotProps {
  index: number;
  formattedMV: MotionValue<string>;
}

const Slot: React.FC<SlotProps> = React.memo(({ index, formattedMV }) => {
  // Each slot decides what character it displays based on the current formatted string
  // We reverse the index so Slot 0 is the rightmost character (units or last decimal)
  const charMV = useTransform(formattedMV, (s) => {
    const chars = s.split('');
    const char = chars[chars.length - 1 - index];
    return char || '';
  });

  const isDigitMV = useTransform(charMV, (c) => !isNaN(parseInt(c, 10)) && c !== '');
  const opacity = useTransform(charMV, (c) => c === '' ? 0 : 1);
  const width = useTransform(charMV, (c) => c === '' ? 0 : 'auto');

  // For digits, we create a sub-motion value for the scroll position
  const digitValueMV = useMotionValue(isNaN(parseInt(charMV.get(), 10)) ? 0 : -parseInt(charMV.get(), 10));
  
  useEffect(() => {
    return charMV.on("change", (c) => {
      const num = parseInt(c, 10);
      if (!isNaN(num)) {
        animate(digitValueMV, -num, {
          type: 'spring',
          stiffness: 260,
          damping: 30
        });
      }
    });
  }, [charMV, digitValueMV]);

  // If it's not a digit, we just show the character
  const displayChar = useTransform(charMV, (c) => {
    const isDigit = !isNaN(parseInt(c, 10)) && c !== '';
    return isDigit ? '' : c;
  });

  return (
    <motion.div style={{ display: 'flex', opacity, width, height: DIGIT_HEIGHT, overflow: 'hidden' }}>
      <Digit mv={digitValueMV} opacity={isDigitMV as any} width={isDigitMV as any} />
      <motion.span style={{ height: DIGIT_HEIGHT, display: 'block' }}>
        {displayChar}
      </motion.span>
    </motion.div>
  );
});

export default AnimatedCounter;
