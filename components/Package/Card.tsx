/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../Theme.tsx';
import { motion, type MotionValue, useTransform, useMotionValue } from 'framer-motion';
import StateLayer from '../Core/StateLayer.tsx';
import RippleLayer, { Ripple } from '../Core/RippleLayer.tsx';

interface CardProps {
  label: string; // Used as title
  variant?: 'primary' | 'secondary' | 'outline' | 'tertiary';
  customFill?: string;
  customColor?: string;
  customRadius?: string | MotionValue<string>;
  disabled?: boolean;
  layerSpacing?: MotionValue<number>;
  view3D?: boolean;
  forcedHover?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  forcedActive?: boolean;
  forcedFocus?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  label,
  variant = 'secondary',
  customFill,
  customColor,
  customRadius,
  disabled = false,
  layerSpacing,
  view3D = false,
  forcedHover = false,
  onClick,
  forcedActive = false,
  forcedFocus = false,
}, ref) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const effectiveHover = forcedHover || isHovered;

  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const defaultLayerSpacing = useMotionValue(0);
  const effectiveLayerSpacing = layerSpacing || defaultLayerSpacing;

  // 3D Layer Transforms
  const zStateLayer = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v}px)`);
  const zRippleLayer = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 1.5}px)`);
  const zContent = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 2}px)`);
  const zMedia = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 3}px)`);

  // --- Dynamic Inner Radius Logic ---
  const paddingValue = parseInt(theme.spacing['Space.XL']) || 24;
  
  const getNumericRadius = (r: string | MotionValue<string> | undefined): number => {
    if (!r) return 0;
    if (typeof r === 'string') return parseInt(r) || 0;
    const val = r.get();
    return typeof val === 'string' ? parseInt(val) || 0 : 0;
  };

  const outerRadiusMV = useMotionValue(getNumericRadius(customRadius));
  
  useEffect(() => {
    if (!customRadius) return;
    if (typeof customRadius === 'string') {
        outerRadiusMV.set(parseInt(customRadius) || 0);
    } else {
        const unsub = (customRadius as MotionValue<string>).on("change", (v) => {
            outerRadiusMV.set(parseInt(v) || 0);
        });
        outerRadiusMV.set(getNumericRadius(customRadius));
        return unsub;
    }
  }, [customRadius, outerRadiusMV]);

  const innerRadiusMV = useTransform(outerRadiusMV, (v) => `${Math.max(0, v - paddingValue)}px`);

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });
    setIsHovered(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDimensions({ width: rect.width, height: rect.height });
  };
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (e.detail === 0) { // Keyboard click
       x = dimensions.width / 2;
       y = dimensions.height / 2;
    }

    setRipples(prev => [...prev, { id: Date.now() + Math.random(), x, y }]);

    if (onClick) onClick(e);
  };

  const handleRippleComplete = (id: number) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  };


  // Determine Semantic Colors
  const isPrimary = variant === 'primary';
  const bgColor = customFill || (isPrimary ? theme.Color.Accent.Surface[1] : theme.Color.Base.Surface[1]);
  const contentColor1 = customColor || (isPrimary ? theme.Color.Accent.Content[1] : theme.Color.Base.Content[1]);
  const contentColor2 = isPrimary ? theme.Color.Accent.Content[2] : theme.Color.Base.Content[2];

  const styles: React.CSSProperties = {
    position: 'relative',
    width: '320px', 
    padding: theme.spacing['Space.XL'], 
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: bgColor,
    color: contentColor1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing['Space.XL'], // 24px gap between Media and Content Area
    boxShadow: theme.effects['Effect.Shadow.Drop.2'],
    transformStyle: 'preserve-3d',
    border: variant === 'outline' ? `1px solid ${theme.Color.Base.Content[3]}` : `1px solid ${theme.Color.Base.Surface[3]}`,
    opacity: disabled ? 0.5 : 1,
    transition: `background-color ${theme.time['Time.2x']} ease, border-color ${theme.time['Time.2x']} ease`,
    userSelect: 'none',
  };

  return (
    <motion.div
      ref={ref}
      style={{
        ...styles,
        borderRadius: customRadius || theme.radius['Radius.L'],
      }}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      animate={{
        y: effectiveHover ? -12 : 0,
        boxShadow: effectiveHover ? theme.effects['Effect.Shadow.Drop.3'] : theme.effects['Effect.Shadow.Drop.2'],
      }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      {/* FOCUS RING (2D overlay, not part of 3D stack) */}
      <motion.div 
        style={{ 
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
        }}
        animate={{ 
            opacity: forcedFocus ? 1 : 0,
            scale: forcedFocus ? 1 : 0.9,
        }}
        transition={{ duration: 0.2 }}
      >
         <div style={{
             position: 'absolute',
             top: '-4px', left: '-4px', right: '-4px', bottom: '-4px', // 4px offset ring
             borderRadius: 'inherit',
             border: `2px solid ${theme.Color.Focus.Content[1]}`,
             pointerEvents: 'none',
             boxShadow: forcedFocus ? `0 0 12px ${theme.Color.Focus.Surface[1]}` : 'none',
         }} />
      </motion.div>

      <motion.div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', transform: zStateLayer, overflow: 'hidden', pointerEvents: 'none' }}>
        <StateLayer 
            color={contentColor1} 
            isActive={effectiveHover} 
            x={coords.x} 
            y={coords.y} 
            width={dimensions.width} 
            height={dimensions.height}
            forced={forcedHover}
            opacity={0.06}
        />
      </motion.div>
      
      <motion.div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', transform: zRippleLayer, overflow: 'hidden', pointerEvents: 'none' }}>
        <RippleLayer
            color={contentColor1}
            ripples={ripples}
            onRippleComplete={handleRippleComplete}
            width={dimensions.width} 
            height={dimensions.height}
            forced={forcedActive}
            opacity={0.15}
        />
      </motion.div>

      <motion.div 
        className="card-media"
        style={{ 
            height: '180px', 
            backgroundColor: theme.Color.Base.Surface[2], 
            borderRadius: innerRadiusMV, 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: zMedia,
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${theme.Color.Base.Surface[3]}`
        }}
      >
          <div style={{ 
              position: 'absolute', 
              inset: 0, 
              opacity: 0.1, 
              background: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${theme.Color.Base.Content[3]} 10px, ${theme.Color.Base.Content[3]} 11px)` 
          }} />
          
          <motion.div
            animate={{ scale: effectiveHover ? 1.1 : 1, opacity: effectiveHover ? 0.6 : 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing['Space.XL'] }}
          >
            <i className="ph-bold ph-image" draggable={false} style={{ fontSize: '48px', color: theme.Color.Base.Content[2] }} />
            <span draggable={false} style={{ 
              ...theme.Type.Readable.Label.S, 
              color: theme.Color.Base.Content[2], 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em' 
            }}>
              Media Area
            </span>
          </motion.div>
      </motion.div>

      {/* Content Area */}
      <motion.div style={{ 
          transformStyle: 'preserve-3d', 
          transform: zContent, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: theme.spacing['Space.XS'] // Unified 4px rhythm within the text block
      }}>
        <span draggable={false} style={{ 
            ...theme.Type.Readable.Label.S, 
            color: contentColor2, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            fontWeight: 700 
        }}>
            Interactive Prototype
        </span>
        
        <h3 className="card-title" draggable={false} style={{ 
            ...theme.Type.Expressive.Headline.S, 
            margin: 0, 
            color: contentColor1,
            fontSize: '32px', 
            lineHeight: 1
        }}>
            {label}
        </h3>
        
        <p className="card-body" draggable={false} style={{ 
            ...theme.Type.Readable.Body.M, 
            margin: 0, 
            color: contentColor2,
            lineHeight: 1.5,
            // Constraints
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            // Orphan prevention
            textWrap: 'pretty' as any,
        }}>
          A dynamic component demonstrating nested radius math and expressive typography. 
          Perfect for modern, data-driven interfaces with accessible color contrast 
          and tight vertical rhythm.
        </p>
      </motion.div>
    </motion.div>
  );
});

export default Card;
