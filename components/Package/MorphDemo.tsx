/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

/**
 * 🌀 MorphDemo
 * Demonstrates a scroll-scrubbed "layout morph" using Framer Motion.
 * This is the functional equivalent of what the user is asking about
 * regarding element-scoped view transitions with scroll scrubbing.
 */
export const MorphDemo = () => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track scroll progress within this component's container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Smooth out the scroll progress for a more "physical" feel
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Interpolate values based on scroll progress
  // 0.0 -> Start State (Small Card)
  // 1.0 -> End State (Full Screen Hero)
  
  const cardWidth = useTransform(smoothProgress, [0, 0.5], ['300px', '100%']);
  const cardHeight = useTransform(smoothProgress, [0, 0.5], ['200px', '400px']);
  const borderRadius = useTransform(smoothProgress, [0, 0.5], [theme.radius['Radius.L'], '0px']);
  const titleSize = useTransform(smoothProgress, [0, 0.5], ['24px', '48px']);
  const contentOpacity = useTransform(smoothProgress, [0.4, 0.6], [0, 1]);
  const yOffset = useTransform(smoothProgress, [0, 0.5], [0, 0]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '300vh', // Long scrollable area to enable scrubbing
        position: 'relative',
        background: theme.Color.Base.Surface[2],
        overflowX: 'hidden'
      }}
    >
      {/* Sticky Container for the Morphing Element */}
      <div style={{
        position: 'sticky',
        top: 0,
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        
        <motion.div
          layout
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius: borderRadius,
            backgroundColor: theme.Color.Accent.Surface[1],
            color: theme.Color.Accent.Content[1],
            padding: theme.space['Space.XL'],
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            boxShadow: theme.effects['Effect.Shadow.Drop.3'],
            ...theme.border.getBorder1px(theme.Color.Base.Surface[3])
          }}
        >
          <motion.h2 
            layout="position"
            style={{ 
              ...theme.Type.Expressive.Display.S,
              fontSize: titleSize,
              margin: 0,
              textAlign: 'center'
            }}
          >
            Layout Morph
          </motion.h2>

          <motion.div
            style={{
              opacity: contentOpacity,
              marginTop: theme.space['Space.L'],
              textAlign: 'center',
              maxWidth: '600px'
            }}
          >
            <p style={{ ...theme.Type.Readable.Body.L }}>
              This state transition is being "scrubbed" by your scroll position.
              While the CSS View Transitions API Level 2 (Element-Scoped) 
              is designed for discrete transitions, Framer Motion's layout 
              engine is optimized for this type of continuous interpolation.
            </p>
          </motion.div>
          
          <motion.div 
            layout
            style={{
              position: 'absolute',
              bottom: theme.space['Space.L'],
              left: theme.space['Space.L'],
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: theme.Color.Active.Surface[1],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '10px', color: theme.Color.Active.Content[1] }}>
              {Math.round(scrollYProgress.get() * 100)}%
            </span>
          </motion.div>
        </motion.div>

        {/* Instructions */}
        <div style={{
          position: 'absolute',
          bottom: theme.space['Space.XL'],
          color: theme.Color.Base.Content[3],
          ...theme.Type.Readable.Label.S,
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          Scroll down to morph
        </div>
      </div>
    </div>
  );
};
