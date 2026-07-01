/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useTransform, animate, motionValue, useMotionValue, MotionValue } from 'framer-motion';

// --- REF STRUCTURE ---
// SHADE REWRITE SAFETY: This component avoids React-level state updates during slider movements.
// Animation is offloaded directly to Framer Motion values.
// To undo: revert this file to the original version where we pass a standard value prop
// and let <motion.div animate={{ y: ... }} /> re-render digit states of parent layout.

const DIGIT_HEIGHT = '1em'; // Corresponds to the font size

interface DigitProps {
  mv: MotionValue<number>;
}

// 🛡️ Digit component receives a direct reference motion value and binds directly to y translate
// bypassing any React state edits or parent component re-renders during slide animations.
const Digit: React.FC<DigitProps> = React.memo(({ mv }) => {
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

  // Maps the current negative digit value to the vertical em shift
  // We use animate() externally to drive this mv smoothly
  const yTranslate = useTransform(mv, (v) => `${v}em`);

  return (
    <div style={styles.digitWrapper}>
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
    </div>
  );
});

Digit.displayName = 'Digit';

interface AnimatedCounterProps {
  value: number | MotionValue<number>;
  useFormatting?: boolean;
}

const isMotionValue = (val: any): val is MotionValue<number> => {
  return val && typeof val === 'object' && 'get' in val && 'on' in val;
};

function getTracks(valueStr: string) {
  return valueStr.split('').map((char, idx) => ({
    key: `${idx}-${isNaN(parseInt(char, 10)) ? 'char' : 'digit'}-${char}`,
    char,
    isDigit: !isNaN(parseInt(char, 10)),
  }));
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, useFormatting = true }) => {
  const localMV = useMotionValue(typeof value === 'number' ? value : 0);
  
  useEffect(() => {
    if (typeof value === 'number') {
      localMV.set(value);
    }
  }, [value, localMV]);

  const activeMotionValue = isMotionValue(value) ? value : localMV;

  // Initialize tracks with the current value
  const [tracks, setTracks] = useState(() => {
    const val = activeMotionValue.get();
    const rounded = Math.round(val || 0);
    const valStr = useFormatting ? rounded.toLocaleString() : String(rounded);
    return getTracks(valStr);
  });

  const tracksRef = useRef(tracks);
  const digitMotionValuesRef = useRef<MotionValue<number>[]>([]);

  // Sync digit motion values count
  const digitCount = useMemo(() => tracks.filter(t => t.isDigit).length, [tracks]);
  if (digitMotionValuesRef.current.length < digitCount) {
    const diff = digitCount - digitMotionValuesRef.current.length;
    for (let i = 0; i < diff; i++) {
      digitMotionValuesRef.current.push(motionValue(0));
    }
  } else if (digitMotionValuesRef.current.length > digitCount) {
    digitMotionValuesRef.current = digitMotionValuesRef.current.slice(0, digitCount);
  }

  useEffect(() => {
    const updateDigits = (val: number) => {
      const rounded = Math.round(val);
      const valStr = useFormatting ? rounded.toLocaleString() : String(rounded);
      const newTracks = getTracks(valStr);

      const hasStructureChanged = 
        newTracks.length !== tracksRef.current.length ||
        newTracks.some((t, idx) => t.key !== tracksRef.current[idx].key);

      if (hasStructureChanged) {
        tracksRef.current = newTracks;
        // Schedule state update to avoid "update during render" warning
        // especially if this is called during the same tick as a parent render
        Promise.resolve().then(() => {
            setTracks(newTracks);
        });
      }

      // Update digit motion values
      let dIdx = 0;
      for (let i = 0; i < newTracks.length; i++) {
        const track = newTracks[i];
        if (track.isDigit) {
          const num = parseInt(track.char, 10);
          const mv = digitMotionValuesRef.current[dIdx];
          if (mv) {
            animate(mv, -num, {
              type: 'spring',
              stiffness: 260,
              damping: 30
            });
          }
          dIdx++;
        }
      }
    };

    // Initial sync
    updateDigits(activeMotionValue.get());

    return activeMotionValue.on("change", (latest) => {
      updateDigits(latest);
    });
  }, [activeMotionValue, useFormatting]);

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: DIGIT_HEIGHT,
      fontVariantNumeric: 'tabular-nums',
    } as React.CSSProperties,
    char: {
      height: DIGIT_HEIGHT,
    },
  };

  let digitIndex = 0;
  return (
    <div style={styles.container}>
      {tracks.map((track) => {
        if (!track.isDigit) {
          return (
            <span key={track.key} style={styles.char}>
              {track.char}
            </span>
          );
        } else {
          const mv = digitMotionValuesRef.current[digitIndex];
          digitIndex++;
          return <Digit key={track.key} mv={mv} />;
        }
      })}
    </div>
  );
};

export default AnimatedCounter;
