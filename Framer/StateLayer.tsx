import React, { useState, useEffect, useRef, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addPropertyControls, ControlType, RenderTarget } from 'framer';

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 200
 */

interface LayerInstance {
  id: number;
  isActive: boolean;
  frozenX?: number;
  frozenY?: number;
}

export default function StateLayer(props: {
  color: string;
  opacity: number;
  transition: any;
}) {
  const { color, opacity, transition } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layers, setLayers] = useState<LayerInstance[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const prevActive = useRef(isActive);

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

  // Use grandparent element listeners to avoid blocking pointer events
  useEffect(() => {
    const target = containerRef.current?.parentElement?.parentElement;
    if (!target) return;

    const handleEnter = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      startTransition(() => {
        setDimensions({ width: rect.width, height: rect.height });
        setIsActive(true);
      });
    };

    const handleLeave = () => startTransition(() => setIsActive(false));

    const handleMove = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleDown = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      startTransition(() => {
        setDimensions({ width: rect.width, height: rect.height });
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      });
    };

    target.addEventListener('pointerenter', handleEnter as any);
    target.addEventListener('pointerleave', handleLeave);
    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerdown', handleDown as any);

    return () => {
      target.removeEventListener('pointerenter', handleEnter as any);
      target.removeEventListener('pointerleave', handleLeave);
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerdown', handleDown as any);
    };
  }, []);

  const maxDiameter = Math.hypot(dimensions.width, dimensions.height) * 2;

  // Logic from components/Core/StateLayer.tsx
  useEffect(() => {
    if (isActive && !prevActive.current) {
      // Enter: Spawn new layer
      startTransition(() => {
        setLayers(prev => [...prev, { id: Date.now() + Math.random(), isActive: true }]);
      });
    } else if (!isActive && prevActive.current) {
      // Leave: Freeze and decay active layers
      startTransition(() => {
        setLayers(prev => prev.map(l => l.isActive ? { ...l, isActive: false, frozenX: mousePos.x, frozenY: mousePos.y } : l));
      });
    }
    prevActive.current = isActive;
  }, [isActive, mousePos.x, mousePos.y]);

  const removeLayer = (id: number) => {
    startTransition(() => {
      setLayers(prev => prev.filter(l => l.id !== id));
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

  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: color,
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: opacity,
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
    >
      <AnimatePresence>
      {layers.map(layer => {
        // Use live mousePos for active layers, frozen values for decaying layers
        const currentX = layer.isActive ? mousePos.x : layer.frozenX;
        const currentY = layer.isActive ? mousePos.y : layer.frozenY;

        return (
          <motion.div
            key={layer.id}
            style={{
              ...baseStyles,
              left: currentX,
              top: currentY,
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: layer.isActive ? maxDiameter : 0,
              height: layer.isActive ? maxDiameter : 0,
              opacity: opacity,
            }}
            exit={{ width: 0, height: 0, opacity: 0 }}
            transition={transition}
            onAnimationComplete={() => {
              if (!layer.isActive) removeLayer(layer.id);
            }}
          />
        );
      })}
      </AnimatePresence>
    </div>
  );
}

/* 
 * SHADE DSL FRAMER STATE LAYER REFACTOR:
 * - Re-routed transition ease to 'easeInOut' to resolve the standard hover state layer transition behavior.
 * - To undo: Revert from ease: 'easeInOut' back to ease: [0.2, 0, 0, 1].
 */
StateLayer.defaultProps = {
  color: "#000000",
  opacity: 0.1,
  transition: {
    duration: 1.05,
    ease: 'easeInOut'
  },
};

addPropertyControls(StateLayer, {
  color: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#000000",
  },
  opacity: {
    type: ControlType.Number,
    title: "Opacity",
    defaultValue: 0.1,
    min: 0,
    max: 1,
    step: 0.01,
  },
  transition: {
    type: ControlType.Transition,
    title: "Transition",
    defaultValue: {
      duration: 1.05,
      ease: 'easeInOut'
    },
  },
});
