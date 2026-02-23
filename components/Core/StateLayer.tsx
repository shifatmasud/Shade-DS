/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StateLayerProps {
  color: string;
  isActive: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  forced?: boolean;
}

interface LayerInstance {
  id: number;
  isActive: boolean;
  frozenX?: number;
  frozenY?: number;
}

/**
 * 🔮 STATE LAYER (Interactive Soul of the UI)
 * 
 * An interactive soul that provides organic feedback relative to touch/cursor position.
 * Replaces the previous implementation with a physics-based animation
 * that grows/shrinks from the cursor position.
 * 
 * Update: Supports concurrent state layers. New interactions create new layers
 * without destroying exiting ones, allowing for smooth re-entry trails.
 */
const StateLayer: React.FC<StateLayerProps> = ({ 
  color, 
  isActive, 
  x, 
  y, 
  width, 
  height,
  opacity = 0.1,
  forced = false
}) => {
  // Secret #1: Calculate the diameter needed to cover the button from any point
  const maxDiameter = Math.hypot(width, height) * 2;
  
  const [layers, setLayers] = useState<LayerInstance[]>([]);
  const prevActive = useRef(isActive);

  useEffect(() => {
    if (forced) return; // Managed separately

    if (isActive && !prevActive.current) {
      // Enter: Spawn new layer
      setLayers(prev => [...prev, { id: Date.now() + Math.random(), isActive: true }]);
    } else if (!isActive && prevActive.current) {
      // Leave: Freeze and decay active layers
      setLayers(prev => prev.map(l => l.isActive ? { ...l, isActive: false, frozenX: x, frozenY: y } : l));
    }
    prevActive.current = isActive;
  }, [isActive, x, y, forced]);

  const removeLayer = (id: number) => {
    setLayers(prev => prev.filter(l => l.id !== id));
  };

  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: color,
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none', // Secret #2: Pass clicks through to the button
    zIndex: 0,
    opacity: opacity,
  };

  const containerStyle: React.CSSProperties = { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    width: '100%', 
    height: '100%', 
    overflow: 'hidden', 
    borderRadius: 'inherit', 
    pointerEvents: 'none' 
  };

  if (forced) {
    return (
      <div style={containerStyle}>
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: opacity }}
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: color,
                pointerEvents: 'none',
            }}
        />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
        {layers.map(layer => {
             // Use live props for active layers, frozen values for decaying layers
             const currentX = layer.isActive ? x : layer.frozenX;
             const currentY = layer.isActive ? y : layer.frozenY;

             return (
                <motion.div
                    key={layer.id}
                    style={{
                        ...baseStyles,
                        left: currentX,
                        top: currentY,
                    }}
                    initial={{ width: 0, height: 0 }}
                    animate={{
                        width: layer.isActive ? maxDiameter : 0,
                        height: layer.isActive ? maxDiameter : 0,
                    }}
                    transition={{
                        duration: 2.5,
                        ease: [0.2, 0, 0, 1]
                    }}
                    onAnimationComplete={() => {
                        if (!layer.isActive) removeLayer(layer.id);
                    }}
                />
             );
        })}
    </div>
  );
};

export default StateLayer;