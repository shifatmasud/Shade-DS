/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../Theme.tsx';

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
  text: propText,
  color,
  shimmerColor = '#ffffff',
  typingSpeed = 0.004,
  delay = 0,
  onComplete,
  repeatShimmer = true,
  shimmerDelay = 4,
  active = true,
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalText, setInternalText] = useState('');
  const [displayedCount, setDisplayedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

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
      const domText = targetElement ? targetElement.innerText : targetTextNode?.textContent || '';
      if (domText && !propText) {
        setInternalText(domText);
      }
    };

    // Initial sync
    updateFromDOM();

    // Hide original text to avoid double rendering
    if (targetElement) {
      targetElement.style.visibility = 'hidden';
      targetElement.style.position = 'absolute';
      targetElement.style.pointerEvents = 'none';
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
  }, [propText]);

  const text = propText || internalText;
  
  // Default color if none provided
  const activeColor = color || theme.Color.Base.Content[1];

  useEffect(() => {
    // Reset state when text/speed changes or if deactivated
    setIsComplete(false);
    setDisplayedCount(0);

    if (!active || !text) {
      return;
    }

    let startTimeout: NodeJS.Timeout;
    let frameId: number;
    let startTime: number | null = null;
    const textLength = text.length;

    const startTyping = () => {
      // If text is empty, complete immediately
      if (textLength === 0) {
        setIsComplete(true);
        return;
      }

      // Calculate total duration in milliseconds
      const duration = textLength * typingSpeed * 1000;

      const tick = (timestamp: number) => {
        if (!startTime) {
          startTime = timestamp;
        }
        const elapsed = timestamp - startTime;

        if (duration <= 0) {
          setDisplayedCount(textLength);
          setIsComplete(true);
          return;
        }

        const progress = Math.min(elapsed / duration, 1);
        const nextCount = Math.floor(progress * textLength);
        
        setDisplayedCount(nextCount);

        if (progress < 1) {
          frameId = requestAnimationFrame(tick);
        } else {
          setIsComplete(true);
        }
      };

      frameId = requestAnimationFrame(tick);
    };

    if (delay > 0) {
      startTimeout = setTimeout(startTyping, delay * 1000);
    } else {
      startTyping();
    }

    return () => {
      clearTimeout(startTimeout);
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
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
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
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
        {text.slice(0, displayedCount)}

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
                opacity: [0, 0.28, 0],
                backgroundPosition: ['150% 0%', '-50% 0%']
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: {
                  duration: 3.0,
                  repeat: repeatShimmer ? Infinity : 0,
                  repeatDelay: shimmerDelay,
                  ease: 'easeInOut'
                },
                backgroundPosition: {
                  duration: 3.0,
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
                // Linear gradient sweep with wider transparent transitions
                backgroundImage: `linear-gradient(90deg, transparent 0%, transparent 20%, ${shimmerColor} 50%, transparent 80%, transparent 100%)`,
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
                opacity: [0, 0.65, 0],
                backgroundPosition: ['150% 0%', '-50% 0%']
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: {
                  duration: 3.0,
                  repeat: repeatShimmer ? Infinity : 0,
                  repeatDelay: shimmerDelay,
                  ease: 'easeInOut'
                },
                backgroundPosition: {
                  duration: 3.0,
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
                // Core bright shimmer gradient with wider transition
                backgroundImage: `linear-gradient(90deg, transparent 0%, transparent 30%, #ffffff 50%, transparent 70%, transparent 100%)`,
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
