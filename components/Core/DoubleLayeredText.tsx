/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

interface DoubleLayeredTextProps {
  /** The text content to write and shimmer */
  text: string;
  /** Primary text color */
  color?: string;
  /** Glowing shimmer color. Default is white */
  shimmerColor?: string;
  /** Time in seconds per character typing */
  typingSpeed?: number;
  /** Delay before typing starts in seconds */
  delay?: number;
  /** Optional callback when the typewriter effect completes */
  onComplete?: () => void;
  /** Should the shimmer loop continuously after typing finishes? */
  repeatShimmer?: boolean;
  /** Delay in seconds between shimmer repetitions */
  shimmerDelay?: number;
  /** Controls when the typing sequence starts. Set to false to queue. */
  active?: boolean;
}

/**
 * DoubleLayeredText Component
 * 
 * Performs a dual-layered letter-by-letter typewriter animation.
 * Once typing completes, it executes a highly-polished horizontal shimmer light sweep
 * with a soft, diffused volumetric glow, clipped directly to the text path.
 */
const DoubleLayeredText: React.FC<DoubleLayeredTextProps> = ({
  text,
  color,
  shimmerColor = '#ffffff',
  typingSpeed = 0.012,
  delay = 0,
  onComplete,
  repeatShimmer = true,
  shimmerDelay = 4,
  active = true,
}) => {
  const { theme } = useTheme();
  const [displayedCount, setDisplayedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Default color if none provided
  const activeColor = color || theme.Color.Base.Content[1];

  // Split text into characters
  const characters = Array.from(text);

  useEffect(() => {
    // Reset state when text/speed changes or if deactivated
    setIsComplete(false);
    setDisplayedCount(0);

    if (!active) {
      return;
    }

    let startTimeout: NodeJS.Timeout;
    let typingInterval: NodeJS.Timeout;

    const startTyping = () => {
      // If text is empty, complete immediately
      if (characters.length === 0) {
        setIsComplete(true);
        return;
      }

      typingInterval = setInterval(() => {
        setDisplayedCount((prev) => {
          const next = prev + 1;
          if (next >= characters.length) {
            clearInterval(typingInterval);
            setIsComplete(true);
            return characters.length;
          }
          return next;
        });
      }, typingSpeed * 1000);
    };

    if (delay > 0) {
      startTimeout = setTimeout(startTyping, delay * 1000);
    } else {
      startTyping();
    }

    return () => {
      clearTimeout(startTimeout);
      clearInterval(typingInterval);
    };
  }, [text, typingSpeed, delay, active]);

  // Dedicated useEffect to trigger onComplete on parent in a safe phase
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  // Common typography/wrap styles to ensure identical rendering across layers
  const commonTextStyle: React.CSSProperties = {
    fontFamily: theme.Type.Expressive.Data.fontFamily || "'JetBrains Mono', monospace",
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      {/* 
        LAYER 1: Backdrop Base Layer
        This layer types out character by character. It preserves layout space.
      */}
      <span
        style={{
          ...commonTextStyle,
          color: activeColor,
          display: 'inline-block',
          width: '100%',
        }}
      >
        {characters.slice(0, displayedCount).map((char, index) => (
          <span
            key={`${char}-${index}`}
            style={{ 
              display: 'inline-block', 
              whiteSpace: 'pre' 
            }}
          >
            {char}
          </span>
        ))}

        {/* Tactile Blinking Terminal Cursor */}
        {!isComplete && active && (
          <motion.span
            animate={{ opacity: [1, 1, 0, 0, 1] }}
            transition={{ 
              duration: 0.8, 
              repeat: Infinity, 
              ease: 'linear'
            }}
            style={{
              display: 'inline-block',
              marginLeft: '2px',
              width: '6px',
              height: '13px',
              backgroundColor: activeColor,
              verticalAlign: 'baseline',
            }}
          />
        )}
      </span>

      {/* 
        LAYER 2 & 3: Shimmer & Glow Overlays
        These overlays become active when typing is complete. They are absolutely positioned 
        directly over Layer 1 and clip a moving gradient to the text bounds.
      */}
      <AnimatePresence>
        {isComplete && (
          <>
            {/* LAYER 2: Highly Diffused Volumetric Glow */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.45, 0],
                backgroundPosition: ['150% 0%', '-50% 0%']
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: {
                  duration: 1.5,
                  repeat: repeatShimmer ? Infinity : 0,
                  repeatDelay: shimmerDelay,
                  ease: 'easeInOut'
                },
                backgroundPosition: {
                  duration: 1.5,
                  repeat: repeatShimmer ? Infinity : 0,
                  repeatDelay: shimmerDelay,
                  ease: 'easeInOut'
                }
              }}
              style={{
                ...commonTextStyle,
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                // Linear gradient sweep
                background: `linear-gradient(90deg, transparent 0%, transparent 35%, ${shimmerColor} 50%, transparent 65%, transparent 100%)`,
                backgroundSize: '200% 100%',
                backgroundPosition: '150% 0%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'inline-block',
                // Filter to create soft, diffused glow
                filter: 'blur(5px)',
                mixBlendMode: 'screen',
                zIndex: 1,
              }}
            >
              {text}
            </motion.span>

            {/* LAYER 3: Sharp Clipped Core Shimmer */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                backgroundPosition: ['150% 0%', '-50% 0%']
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: {
                  duration: 1.5,
                  repeat: repeatShimmer ? Infinity : 0,
                  repeatDelay: shimmerDelay,
                  ease: 'easeInOut'
                },
                backgroundPosition: {
                  duration: 1.5,
                  repeat: repeatShimmer ? Infinity : 0,
                  repeatDelay: shimmerDelay,
                  ease: 'easeInOut'
                }
              }}
              style={{
                ...commonTextStyle,
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                // Core bright shimmer gradient
                background: `linear-gradient(90deg, transparent 0%, transparent 40%, #ffffff 50%, transparent 60%, transparent 100%)`,
                backgroundSize: '200% 100%',
                backgroundPosition: '150% 0%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'inline-block',
                zIndex: 2,
              }}
            >
              {text}
            </motion.span>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoubleLayeredText;
