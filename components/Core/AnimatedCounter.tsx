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
  const yTranslate = useTransform(mv, (v) => `${v}em`);

  return (
    <div style={styles.digitWrapper}>
      <motion.div
        style={{
          ...styles.digitColumn,
          y: yTranslate,
        }}
      >
        {[...Array(10).keys()].map(i => (
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

// Helper to partition formatted value to structural track keys
function getTracks(valueStr: string) {
  return valueStr.split('').map((char, idx) => ({
    key: `${idx}-${isNaN(parseInt(char, 10)) ? 'char' : 'digit'}`,
    char,
    isDigit: !isNaN(parseInt(char, 10)),
  }));
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, useFormatting = true }) => {
  // 1. Setup a fallback motion value if a primitive number is provided
  const localMV = useMotionValue(typeof value === 'number' ? value : 0);
  
  // Sync standard numbers when they change (such as FPS updates)
  useEffect(() => {
    if (typeof value === 'number') {
      localMV.set(value);
    }
  }, [value, localMV]);

  const activeMotionValue = isMotionValue(value) ? value : localMV;

  // 2. State management for the structural representation (digit columns)
  const [tracks, setTracks] = useState(() => {
    if (!activeMotionValue || typeof activeMotionValue.get !== 'function') return [];
    const val = activeMotionValue.get();
    const currentRounded = Math.round(val || 0);
    const currentValueStr = useFormatting ? currentRounded.toLocaleString() : String(currentRounded);
    return getTracks(currentValueStr);
  });

  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  // Keep a persistent array of motion value objects to direct transform each digit track
  const digitMotionValuesRef = useRef<MotionValue<number>[]>([]);

  // 🛡️ SHADE REWRITE: Populate/sync digit motion values during render to ensure 
  // they are available for the first render of Digit components.
  const digitCount = useMemo(() => tracks.filter(t => t.isDigit).length, [tracks]);
  if (digitMotionValuesRef.current.length < digitCount) {
    const diff = digitCount - digitMotionValuesRef.current.length;
    for (let i = 0; i < diff; i++) {
      digitMotionValuesRef.current.push(motionValue(0));
    }
  } else if (digitMotionValuesRef.current.length > digitCount) {
    digitMotionValuesRef.current = digitMotionValuesRef.current.slice(0, digitCount);
  }

  // 3. Setup subscriber to drive the individual digit transforms and structural updates
  useEffect(() => {
    const handleValueChange = (latest: number) => {
      try {
        const rounded = Math.round(latest);
        const valueStr = useFormatting ? rounded.toLocaleString() : String(rounded);
        const currentTracks = getTracks(valueStr);
        
        // Check if layout needs structure modification (React re-render is then permitted/needed)
        const hasStructureChanged = 
          currentTracks.length !== tracksRef.current.length ||
          currentTracks.some((t, idx) => t.key !== tracksRef.current[idx].key);

        if (hasStructureChanged) {
          // Sync ref immediately to prevent race conditions in subsequent events
          tracksRef.current = currentTracks;
          setTracks(currentTracks);
        }

        // Manage digit motion values count to match current structure (also done in render, but safe to repeat)
        const dCount = currentTracks.filter(t => t.isDigit).length;
        if (digitMotionValuesRef.current.length < dCount) {
          const diff = dCount - digitMotionValuesRef.current.length;
          for (let i = 0; i < diff; i++) {
            digitMotionValuesRef.current.push(motionValue(0));
          }
        } else if (digitMotionValuesRef.current.length > dCount) {
          digitMotionValuesRef.current = digitMotionValuesRef.current.slice(0, dCount);
        }

        // Target -> Mutate individual digit motion values with zero React re-renders
        let dIdx = 0;
        for (let i = 0; i < currentTracks.length; i++) {
          const track = currentTracks[i];
          if (track.isDigit) {
            const num = parseInt(track.char, 10);
            const mv = digitMotionValuesRef.current[dIdx];
            if (mv) {
              // We use animate for smooth transitions between digits
              animate(mv, -num, {
                type: 'spring',
                stiffness: 220,
                damping: 24
              });
            }
            dIdx++;
          }
        }
      } catch (err) {
        console.error("Error updating AnimatedCounter observer:", err);
      }
    };

    // Subscribing to "change" handles both structural checks and digit animations
    if (!activeMotionValue || typeof activeMotionValue.on !== 'function') return;

    const unsubscribe = activeMotionValue.on("change", handleValueChange);
    
    // Initial sync check after mount
    if (typeof activeMotionValue.get === 'function') {
      handleValueChange(activeMotionValue.get());
    }

    return () => unsubscribe();
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

  // Render the components
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
