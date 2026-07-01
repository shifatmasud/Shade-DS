import React, { useState, useEffect, useRef, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addPropertyControls, ControlType } from 'framer';

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 200
 */

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function RippleLayer(props: {
  color: string;
  opacity: number;
  transition: any;
}) {
  const { color, opacity, transition } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const maxDiameter = Math.hypot(dimensions.width, dimensions.height) * 2.5;

  // Use grandparent element listeners to avoid blocking pointer events
  useEffect(() => {
    const target = containerRef.current?.parentElement?.parentElement;
    if (!target) return;

    const handleClick = (e: MouseEvent) => {
      const rect = target.getBoundingClientRect();
      let x, y;
      
      // Handle Keyboard click (coordinates are 0)
      if (e.detail === 0) {
        x = rect.width / 2;
        y = rect.height / 2;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      
      startTransition(() => {
        setDimensions({ width: rect.width, height: rect.height });
        setRipples(prev => [...prev, { id: Date.now() + Math.random(), x, y }]);
      });
    };

    target.addEventListener('click', handleClick);
    return () => {
      target.removeEventListener('click', handleClick);
    };
  }, []);

  const removeRipple = (id: number) => {
    startTransition(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    });
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 'inherit',
    backgroundColor: 'transparent',
    pointerEvents: 'none', // Transparent to pointer events to avoid blocking children/siblings
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
    >
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{
              width: 0,
              height: 0,
              opacity: 0,
              borderWidth: 0,
            }}
            animate={{
              width: maxDiameter,
              height: maxDiameter,
              opacity: [opacity * 0.5, opacity, 0], // Flash then fade
              borderWidth: 80, // Fixed 80px thickness
              /* 
               * SHADE DSL FRAMER RIPPLE OPTIMIZATION:
               * - Removed 'filter: blur(12px)' to make interactions ultra-crisp.
               * - To undo: add filter: 'blur(12px)' back here.
               */
            }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: ripple.y,
              left: ripple.x,
              backgroundColor: 'transparent',
              borderStyle: 'solid',
              borderColor: color,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
            transition={transition}
            onAnimationComplete={() => removeRipple(ripple.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* 
 * SHADE DSL FRAMER RIPPLE REFACTOR:
 * - Changed default transition to spring physics.
 * - To undo: revert back to duration: 2.5 and ease: [0.2, 0, 0, 1].
 */
RippleLayer.defaultProps = {
  color: "#000000",
  opacity: 0.15,
  transition: {
    type: 'spring',
    stiffness: 40,
    damping: 20,
  },
};

addPropertyControls(RippleLayer, {
  color: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#000000",
  },
  opacity: {
    type: ControlType.Number,
    title: "Opacity",
    defaultValue: 0.15,
    min: 0,
    max: 1,
    step: 0.01,
  },
  transition: {
    type: ControlType.Transition,
    title: "Transition",
    defaultValue: {
      type: 'spring',
      stiffness: 40,
      damping: 20,
    },
  },
});
