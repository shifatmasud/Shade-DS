/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { useTheme } from '../../Theme.tsx';
import { motion, type MotionValue, useTransform, useMotionValue } from 'framer-motion';
import StateLayer from '../Core/StateLayer.tsx';
import RippleLayer, { Ripple } from '../Core/RippleLayer.tsx';
import { playSound } from '../../services/soundService';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'destructive';
export type ButtonSize = 'S' | 'M' | 'L';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  icon?: string;
  onClick?: () => void;
  customFill?: string | MotionValue<string>;
  customColor?: string | MotionValue<string>;
  customRadius?: string | MotionValue<string>;
  disabled?: boolean;
  layerSpacing?: MotionValue<number>;
  view3D?: boolean;
  // Forced States
  forcedHover?: boolean;
  forcedFocus?: boolean;
  forcedActive?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'L',
  label,
  icon,
  onClick,
  customFill,
  customColor,
  customRadius,
  disabled = false,
  layerSpacing,
  view3D = false,
  forcedHover = false,
  forcedFocus = false,
  forcedActive = false,
}, ref) => {
  const { theme } = useTheme();
  
  // Interaction State
  const [isHovered, setIsHovered] = useState(false);
  const effectiveHover = forcedHover || isHovered;
  
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // 3D Layer Transforms
  const defaultLayerSpacing = useMotionValue(0);
  const effectiveLayerSpacing = layerSpacing || defaultLayerSpacing;

  const zStateLayer = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v}px)`);
  const zRippleLayer = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 2}px)`);
  const zContent = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 3}px)`);
  
  // Helper to calculate relative coordinates
  const getCoords = (e: React.PointerEvent | React.MouseEvent) => {
    const buttonEl = e.currentTarget as HTMLButtonElement;
    const rect = buttonEl.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  // Pointer Event Handlers
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (disabled) return;
    const { width, height } = getCoords(e);
    setDimensions({ width, height });
    setIsHovered(true);
    playSound('hover');
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (disabled) return;
    const { x, y } = getCoords(e);
    setCoords({ x, y });
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const { x, y, width, height } = getCoords(e);
    setCoords({ x, y });
    setDimensions({ width, height });
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    // Trigger Ripple on valid Click/Tap only
    const { width, height } = getCoords(e);
    let { x, y } = getCoords(e);

    // Handle Keyboard click (coordinates are 0)
    if (e.detail === 0) {
       x = width / 2;
       y = height / 2;
    }

    setRipples(prev => [...prev, { id: Date.now() + Math.random(), x, y }]);
    playSound('click');

    // Forward event
    if (onClick) onClick();
  };

  const handleRippleComplete = (id: number) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  };

  // Style Logic
  const useResolvedMotionValue = (prop: any, fallback: string): any => {
    const isMV = prop && typeof prop === 'object' && 'get' in prop && 'on' in prop;
    const localMV = useMotionValue(isMV ? prop.get() : (prop || fallback));
    
    React.useEffect(() => {
      if (!isMV) {
        localMV.set(prop || fallback);
      }
    }, [prop, isMV, fallback]);

    return useTransform(isMV ? prop : localMV, (v: any) => v || fallback);
  };

  const fallbackBg = variant === 'primary' 
    ? theme.Color.Accent.Surface[1] 
    : (variant === 'destructive' 
       ? theme.Color.Error.Surface[1] 
       : (variant === 'secondary' ? theme.Color.Base.Surface[2] : 'transparent'));

  const fallbackColor = variant === 'primary' 
    ? theme.Color.Accent.Content[1] 
    : (variant === 'destructive' 
       ? theme.Color.Error.Content[1] 
       : theme.Color.Base.Content[1]);

  const resolvedFill = useResolvedMotionValue(customFill, fallbackBg);
  const resolvedColor = useResolvedMotionValue(customColor, fallbackColor);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
          boxShadow: theme.effects['Effect.Shadow.Drop.2'],
        };
      case 'secondary':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: resolvedColor,
          ...theme.border.getBorder1px(theme.Color.Base.Content[3]),
        };
      case 'destructive':
        return {
          backgroundColor: resolvedFill,
          color: resolvedColor,
          border: 'none',
          boxShadow: `0 0 1px 0px ${theme.Color.Error.Content[1]}, inset 0 0 1px 0px ${theme.Color.Error.Content[1]}, ${theme.effects['Effect.Shadow.Drop.2']}`,
        };
      case 'tertiary':
        return {
          backgroundColor: 'transparent',
          color: resolvedColor,
          border: 'none',
          boxShadow: 'none',
        };
      default:
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'S': return { height: theme.height['Height.XS'], padding: `0 ${theme.space['Space.M']}`, ...theme.Type.Readable.Label.S };
      case 'L': return { height: theme.height['Height.L'], padding: `0 ${theme.space['Space.XL']}`, ...theme.Type.Readable.Label.L };
      case 'M': 
      default: return { height: theme.height['Height.M'], padding: `0 ${theme.space['Space.L']}`, ...theme.Type.Readable.Label.M };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  // Combined Styles
  const styles: any = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space['Space.S'],
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? theme.opacity['Opacity.Disabled'] : 1, 
    filter: disabled ? 'grayscale(100%)' : 'none',
    overflow: 'visible',
    fontWeight: 600,
    ...theme.Type.Readable.Label.M,
    transformStyle: 'preserve-3d',
    ...variantStyles,
    ...sizeStyles,
    boxShadow: undefined, 
  };

  // State Layer Opacity
  const stateLayerOpacity = theme.opacity['Opacity.Subtle']; 

  // Layer wrapper styles for 3D
  const layerWrapperStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: 'inherit',
      pointerEvents: 'none',
      transformStyle: 'preserve-3d',
  };

  const contentWrapperStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: theme.space['Space.S'],
    pointerEvents: 'none',
    userSelect: 'none',
  };

  // 3D Debug Colors
  const colors = {
      surface: theme.Color.Error.Content[1],
      state: theme.Color.Active.Content[1],
      ripple: theme.Color.Focus.Content[1],
      content: theme.Color.Success.Content[1],
  };

  const getDebugBorder = (color: string) => view3D ? `1px solid ${color}` : 'none';

  // Calculate Animate Props for Premium Feel
  const getAnimateState = () => {
    if (disabled) return { y: 0, scale: 1, boxShadow: 'none' };
    
    const isTertiary = variant === 'tertiary';
    
    // Active (Pressed)
    if (forcedActive) {
        return { 
            y: 2, 
            scale: 0.95, 
            boxShadow: 'none' 
        };
    }
    
    // Hover (Mouse)
    if (effectiveHover) {
         return {
            y: -4, 
            scale: 1.05, 
            boxShadow: isTertiary ? 'none' : theme.effects['Effect.Shadow.Drop.3']
         };
    }
    
    // Idle
    return { 
        y: 0, 
        scale: 1, 
        boxShadow: isTertiary ? 'none' : (variantStyles.boxShadow || 'none') 
    };
  };

  return (
    <motion.button
      ref={ref}
      style={{
        ...styles,
        borderRadius: customRadius || theme.radius['Radius.Full'],
      }}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      animate={getAnimateState()}
      whileTap={forcedActive ? undefined : { scale: 0.95, y: 2, boxShadow: 'none' }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* 0. SURFACE LAYER (Base Z=0) */}
      <motion.div style={{ ...layerWrapperStyle, zIndex: 0, border: getDebugBorder(colors.surface) }} />

      {/* 0.5 FOCUS RING LAYER (Dedicated Element - NOT in 3D stack) */}
      <motion.div 
        style={{ 
            ...layerWrapperStyle, 
            zIndex: 1,
        }}
        animate={{ 
            opacity: forcedFocus ? 1 : 0,
            scale: forcedFocus ? 1 : 0.9,
        }}
        transition={{ duration: 0.2 }}
      >
         <div style={{
             position: 'absolute',
             top: `calc(-1 * ${theme.space['Space.XS']})`, 
             left: `calc(-1 * ${theme.space['Space.XS']})`, 
             right: `calc(-1 * ${theme.space['Space.XS']})`, 
             bottom: `calc(-1 * ${theme.space['Space.XS']})`, 
             borderRadius: 'inherit',
             ...theme.border.getOutline2px(theme.Color.Focus.Content[1]),
             pointerEvents: 'none',
             boxShadow: forcedFocus ? `0 0 12px ${theme.Color.Focus.Surface[1]}` : 'none',
         }} />
      </motion.div>

      {/* 1. STATE LAYER (Bottom) */}
      <motion.div style={{ ...layerWrapperStyle, transform: zStateLayer }}>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit', border: getDebugBorder(colors.state) }}>
            <StateLayer 
                color={resolvedColor} 
                isActive={effectiveHover} 
                opacity={stateLayerOpacity}
                x={coords.x} 
                y={coords.y} 
                width={dimensions.width} 
                height={dimensions.height}
                forced={forcedHover}
            />
        </div>
      </motion.div>
      
      {/* 2. RIPPLE LAYER (Middle) */}
      <motion.div style={{ ...layerWrapperStyle, transform: zRippleLayer }}>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit', border: getDebugBorder(colors.ripple) }}>
            <RippleLayer
                color={resolvedColor}
                ripples={ripples}
                onRippleComplete={handleRippleComplete}
                width={dimensions.width} 
                height={dimensions.height}
                forced={forcedActive}
            />
        </div>
      </motion.div>
      
      {/* 3. CONTENT LAYER (Top) */}
      <motion.div style={{ ...layerWrapperStyle, transform: zContent, border: getDebugBorder(colors.content) }} />

      <motion.div style={{ ...contentWrapperStyle, transform: zContent }}>
        {icon && <i className={`ph-bold ${icon}`} draggable={false} style={{ fontSize: '1.25em' }} />}
        <span draggable={false}>{label}</span>
      </motion.div>
    </motion.button>
  );
});

export default Button;
