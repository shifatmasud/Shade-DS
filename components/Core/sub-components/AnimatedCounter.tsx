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
  decimals?: number;
}

const isMotionValue = (val: any): val is MotionValue<number> => {
  return val && typeof val === 'object' && 'get' in val && 'on' in val;
};

function getTracks(valueStr: string) {
  const chars = valueStr.split('');
  return chars.map((char, idx) => {
    const isDigit = !isNaN(parseInt(char, 10));
    // Stable keys: digits are keyed by their position from the RIGHT.
    // This ensures units (rightmost) stay as units, tens as tens, etc.
    // across structural changes like 9 -> 10.
    const posFromRight = chars.length - 1 - idx;
    const key = isDigit ? `digit-${posFromRight}` : `char-${idx}`;
    return { key, char, isDigit };
  });
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  value, 
  useFormatting = true,
  decimals = 0 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState<number>(0);
  const localMV = useMotionValue(0);
  
  // Parasitic Sibling Binding Logic
  useLayoutEffect(() => {
    const sibling = containerRef.current?.previousSibling;
    if (!sibling) return;

    let targetElement: HTMLElement | null = null;
    let targetTextNode: Text | null = null;

    if (sibling.nodeType === Node.ELEMENT_NODE) {
      targetElement = sibling as HTMLElement;
    } else if (sibling.nodeType === Node.TEXT_NODE) {
      targetTextNode = sibling as Text;
    }

    const updateFromDOM = () => {
      const text = targetElement ? targetElement.innerText : targetTextNode?.textContent || '';
      const num = parseFloat(text.replace(/[^0-9.-]+/g, ""));
      if (!isNaN(num)) {
        setInternalValue(num);
      }
    };

    // Initial sync
    updateFromDOM();

    // Hide original text to avoid double rendering
    if (targetElement) {
      targetElement.style.visibility = 'hidden';
      targetElement.style.position = 'absolute';
      targetElement.style.pointerEvents = 'none';
    } else if (targetTextNode) {
      // Harder to hide a raw text node without wrapping, 
      // but we can try to empty it (though this might break parent React state)
      // For now, assume it's an element sibling if possible.
    }

    // Observe changes to sibling text
    const observer = new MutationObserver(updateFromDOM);
    if (targetElement) {
      observer.observe(targetElement, { characterData: true, childList: true, subtree: true });
    } else if (targetTextNode) {
      observer.observe(targetTextNode, { characterData: true });
    }

    return () => {
      observer.disconnect();
      if (targetElement) {
        targetElement.style.visibility = '';
        targetElement.style.position = '';
        targetElement.style.pointerEvents = '';
      }
    };
  }, []);

  // Sync motion value with either prop value or internal parsed value
  useEffect(() => {
    if (value !== undefined) {
      if (typeof value === 'number') {
        localMV.set(value);
      }
    } else {
      localMV.set(internalValue);
    }
  }, [value, internalValue, localMV]);

  const activeMotionValue = isMotionValue(value) ? value : localMV;

  // Helper to format value string based on decimals
  const formatValue = (val: number) => {
    // toFixed is significantly faster than toLocaleString for high-frequency updates
    if (useFormatting && decimals > 0) {
      return val.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return val.toFixed(decimals);
  };

  // Initialize tracks with the current value
  const [tracks, setTracks] = useState(() => {
    const val = activeMotionValue.get();
    const valStr = formatValue(val || 0);
    return getTracks(valStr);
  });

  const tracksRef = useRef(tracks);
  const digitMotionValuesRef = useRef<Record<string, MotionValue<number>>>({});
  const targetValuesRef = useRef<Record<string, number>>({});

  // 1. Sync digit motion values by key to ensure stability during structural shifts (e.g. 9 -> 10)
  tracks.forEach(track => {
    if (track.isDigit && !digitMotionValuesRef.current[track.key]) {
       digitMotionValuesRef.current[track.key] = motionValue(0);
       targetValuesRef.current[track.key] = 0;
    }
  });

  // 2. Function to update digit animations based on current tracks
  const updateDigitAnimations = (currentTracks: typeof tracks) => {
      for (let i = 0; i < currentTracks.length; i++) {
        const track = currentTracks[i];
        if (track.isDigit) {
          const num = parseInt(track.char, 10);
          const mv = digitMotionValuesRef.current[track.key];
          const target = -num;
          
          if (mv && (targetValuesRef.current[track.key] !== target)) {
            targetValuesRef.current[track.key] = target;
            animate(mv, target, {
              type: 'spring',
              stiffness: 260,
              damping: 30
            });
          }
        }
      }
  };

  // 3. Synchronize animations whenever tracks state changes
  React.useLayoutEffect(() => {
    updateDigitAnimations(tracks);
  }, [tracks]);

  useEffect(() => {
    const handleValueChange = (val: number) => {
      const valStr = formatValue(val);
      const newTracks = getTracks(valStr);

      const hasStructureChanged = 
        newTracks.length !== tracksRef.current.length ||
        newTracks.some((t, idx) => t.key !== tracksRef.current[idx].key);

      if (hasStructureChanged) {
        tracksRef.current = newTracks;
        // Schedule state update
        setTracks(newTracks);
        // Targets will be re-synced via the layout effect
      } else {
        // If structure is same, we can animate digits immediately for low latency
        updateDigitAnimations(newTracks);
      }
    };

    // Initial sync
    handleValueChange(activeMotionValue.get());

    return activeMotionValue.on("change", (latest) => {
      handleValueChange(latest);
    });
  }, [activeMotionValue, useFormatting, decimals]);

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

  return (
    <div ref={containerRef} style={styles.container}>
      {tracks.map((track) => {
        if (!track.isDigit) {
          return (
            <span key={track.key} style={styles.char}>
              {track.char}
            </span>
          );
        } else {
          const mv = digitMotionValuesRef.current[track.key];
          return <Digit key={track.key} mv={mv} />;
        }
      })}
    </div>
  );
};

export default AnimatedCounter;
