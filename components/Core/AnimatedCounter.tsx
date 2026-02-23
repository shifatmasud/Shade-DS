/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';

const DIGIT_HEIGHT = '1em'; // Corresponds to the font size

interface DigitProps {
  digit: string;
}

const Digit: React.FC<DigitProps> = ({ digit }) => {
  const styles = {
    digitWrapper: {
      height: DIGIT_HEIGHT,
      overflow: 'hidden',
    },
    digitColumn: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
    } as React.CSSProperties,
  };

  const number = parseInt(digit);

  return (
    <div style={styles.digitWrapper}>
      <motion.div
        style={styles.digitColumn}
        animate={{ y: `-${number * 1}em` }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        {[...Array(10).keys()].map(i => (
          <span key={i}>{i}</span>
        ))}
      </motion.div>
    </div>
  );
};

interface AnimatedCounterProps {
  value: number;
  useFormatting?: boolean;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, useFormatting = true }) => {
  const formattedValue = useFormatting ? value.toLocaleString() : String(value);
  // FIX: `Array.from(string)` was inferring the type of `char` as `unknown`, causing a type error. Using `split('')` correctly types the `chars` array as `string[]`, resolving the issue.
  const chars = formattedValue.split('');

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: DIGIT_HEIGHT,
    } as React.CSSProperties,
    char: {
      height: DIGIT_HEIGHT,
    },
  };

  return (
    <div style={styles.container}>
      {chars.map((char, index) =>
        isNaN(parseInt(char)) ? (
          <span key={index} style={styles.char}>{char}</span>
        ) : (
          <Digit key={index} digit={char} />
        )
      )}
    </div>
  );
};

export default AnimatedCounter;
