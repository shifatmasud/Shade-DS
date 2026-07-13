/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { useTheme } from '../../Theme.tsx';
import { motion, type MotionValue, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import StateLayer from '../Core/sub-components/StateLayer.tsx';
import RippleLayer from '../Core/sub-components/RippleLayer.tsx';
import { SuccessLayer } from '../Core';
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
  enableSuccess?: boolean;
  successLabel?: string;
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
  enableSuccess = false,
  successLabel,
}, ref) => {
  const { theme } = useTheme();
  const localRef = React.useRef<HTMLButtonElement>(null);

  React.useImperativeHandle(ref, () => localRef.current!);
  
  // Interaction State
  const [isHovered, setIsHovered] = useState(false);
  const effectiveHover = forcedHover || isHovered;
  
  // Success State
  const [isSuccess, setIsSuccess] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [successPos, setSuccessPos] = useState({ x: '50%', y: '50%' });

  // SAFE TIMEOUT CLEANUP: Automatically reset success state after 2 seconds to prevent memory leaks and state updates on unmounted nodes
  React.useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        setIsSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowGlow(false);
    }
  }, [isSuccess]);

  // 3D Layer Transforms
  const defaultLayerSpacing = useMotionValue(0);
  const effectiveLayerSpacing = layerSpacing || defaultLayerSpacing;

  const zStateLayer = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v}px)`);
  const zRippleLayer = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 2}px)`);
  const zContent = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 3}px)`);
  const zSuccess = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 4}px)`);

  // Pointer Event Handlers
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsHovered(true);
    if (e.pointerType !== 'touch') {
      playSound('hover');
    }
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Return early if disabled or already showing success state
    if (disabled || isSuccess) return;

    let xStr = '50%';
    let yStr = '50%';
    if (localRef.current && e.clientX !== 0 && e.clientY !== 0) {
      const rect = localRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) + 0.1 * rect.width;
      const y = (e.clientY - rect.top) + 0.1 * rect.height;
      xStr = `${x}px`;
      yStr = `${y}px`;
    }
    setSuccessPos({ x: xStr, y: yStr });
    
    if (enableSuccess) {
      setIsSuccess(true);
      playSound('success');
    } else {
      playSound('click');
    }

    // Forward event
    if (onClick) onClick();
  };

  // Style Logic
  const useResolvedMotionValue = (prop: any, fallback: string): any => {
    const isMV = prop && typeof prop === 'object' && 'get' in prop && 'on' in prop;
    const resolvedMV = useMotionValue(isMV ? (prop.get() || fallback) : (prop || fallback));
    
    React.useEffect(() => {
      const updateValue = () => {
        const currentVal = isMV ? prop.get() : prop;
        resolvedMV.set(currentVal || fallback);
      };
      
      updateValue();
      
      if (isMV) {
        const unsubscribe = prop.on("change", (v: any) => {
          resolvedMV.set(v || fallback);
        });
        return unsubscribe;
      }
    }, [prop, isMV, fallback]);

    return resolvedMV;
  };

  const fallbackBg = variant === 'primary' 
    ? theme.Color.Accent.Surface['1'] 
    : (variant === 'destructive' 
       ? theme.Color.Error.Surface['1'] 
       : (variant === 'secondary' ? theme.Color.Base.Surface['2'] : 'transparent'));

  const fallbackColor = variant === 'primary' 
    ? theme.Color.Accent.Content['1'] 
    : (variant === 'destructive' 
       ? theme.Color.Error.Content['1'] 
       : theme.Color.Base.Content['1']);

  const isOutlineOrTertiary = variant === 'outline' || variant === 'tertiary';
  const resolvedFill = useResolvedMotionValue(isOutlineOrTertiary ? 'transparent' : customFill, fallbackBg);
  const resolvedColor = useResolvedMotionValue(customColor, fallbackColor);

  const getButtonShadow = (state: 'idle' | 'hover' | 'active' | 'disabled') => {
    if (isSuccess && showGlow) {
      return `0 0 24px ${theme.Color.Success.Surface['1']}, 0 0 6px ${theme.Color.Success.Content['1']}`;
    }
    const isTertiary = variant === 'tertiary';
    if (isTertiary) return 'none';

    // 1. Define the base border shadow layer for variants that use it
    const borderShadow = variant === 'outline'
      ? `0 0 1px 0px ${theme.Color.Base.Content['3']}, inset 0 0 1px 0px ${theme.Color.Base.Content['3']}`
      : (variant === 'destructive'
         ? `0 0 1px 0px ${theme.Color.Error.Content['1']}, inset 0 0 1px 0px ${theme.Color.Error.Content['1']}`
         : '');

    // 2. Define the drop shadow layer based on state
    let dropShadow = '';
    if (state === 'idle') {
      if (variant === 'primary' || variant === 'destructive') {
        dropShadow = theme.effects['Effect.Shadow.Drop.2'];
      }
    } else if (state === 'hover') {
      dropShadow = theme.effects['Effect.Shadow.Drop.3'];
    }

    // 3. Combine them
    if (borderShadow && dropShadow) {
      return `${borderShadow}, ${dropShadow}`;
    }
    return borderShadow || dropShadow || 'none';
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
        };
      case 'secondary':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
        };
      case 'outline':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
        };
      case 'destructive':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
        };
      case 'tertiary':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
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
    boxShadow: getButtonShadow(disabled ? 'disabled' : (forcedActive ? 'active' : (effectiveHover ? 'hover' : 'idle'))),
    // GESTURE LOCKUP FIX: Keep pointerEvents as 'auto' during success to allow the browser and Framer Motion to receive pointerup/mouseup events, preventing UI freeze.
    pointerEvents: 'auto',
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
    justifyContent: 'center',
    gap: theme.space['Space.S'],
    pointerEvents: 'none',
    userSelect: 'none',
    width: '100%',
    whiteSpace: 'nowrap',
  };

  // 3D Debug Colors
  const colors = {
      surface: theme.Color.Error.Content['1'],
      state: theme.Color.Active.Content['1'],
      ripple: theme.Color.Focus.Content['1'],
      content: theme.Color.Success.Content['1'],
  };

  const getDebugBorder = (color: string) => view3D ? `1px solid ${color}` : 'none';

  // Calculate Animate Props for Premium Feel
  const getAnimateState = () => {
    if (isSuccess) {
      return {
        y: 0,
        scale: 1,
        boxShadow: `0 0 24px ${theme.Color.Success.Surface['1']}, 0 0 6px ${theme.Color.Success.Content['1']}`,
      };
    }
    if (disabled) return { y: 0, scale: 1, boxShadow: getButtonShadow('disabled') };
    
    // Active (Pressed)
    if (forcedActive) {
        return { 
            y: 2, 
            scale: 0.95, 
            boxShadow: getButtonShadow('active') 
        };
    }
    
    // Hover (Mouse)
    if (effectiveHover) {
         return {
            y: -4, 
            scale: 1.05, 
            boxShadow: getButtonShadow('hover')
         };
    }
    
    // Idle
    return { 
        y: 0, 
        scale: 1, 
        boxShadow: getButtonShadow('idle') 
    };
  };

  return (
    <motion.button
      ref={localRef}
      style={{
        ...styles,
        borderRadius: customRadius || theme.radius['Radius.Full'],
      }}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      animate={getAnimateState()}
      whileTap={forcedActive ? undefined : { scale: 0.95, y: 2, boxShadow: getButtonShadow('active') }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      data-success={isSuccess ? "true" : "false"}
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
             ...theme.border.getOutline2px(theme.Color.Focus.Content['1']),
             pointerEvents: 'none',
             boxShadow: forcedFocus ? `0 0 12px ${theme.Color.Focus.Surface['1']}` : 'none',
         }} />
      </motion.div>

      {/* 1. STATE LAYER (Bottom) */}
      <motion.div style={{ ...layerWrapperStyle, transform: zStateLayer }}>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit', border: getDebugBorder(colors.state) }}>
            <StateLayer 
                color={resolvedColor} 
                opacity={stateLayerOpacity}
                forced={forcedHover}
                parentRef={localRef}
            />
        </div>
      </motion.div>
      
      {/* 2. RIPPLE LAYER (Middle) */}
      <motion.div style={{ ...layerWrapperStyle, transform: zRippleLayer }}>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit', border: getDebugBorder(colors.ripple) }}>
            <RippleLayer
                color={resolvedColor}
                opacity={theme.opacity['Opacity.Pressed']}
                forced={forcedActive}
                parentRef={localRef}
            />
        </div>
      </motion.div>
      
      {/* 3. CONTENT LAYER (Top) */}
      <motion.div style={{ ...layerWrapperStyle, transform: zContent, border: getDebugBorder(colors.content) }} />

      <motion.div style={{ ...contentWrapperStyle, transform: zContent }}>
        {/* Default Content (Always in flow, determines button size) */}
        <motion.div
          animate={{
            opacity: isSuccess ? 0 : 1,
            y: isSuccess ? -8 : 0,
            scale: isSuccess ? 0.95 : 1,
            filter: isSuccess ? 'blur(4px)' : 'blur(0px)',
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.space['Space.S'],
            color: 'inherit',
            width: '100%',
            pointerEvents: isSuccess ? 'none' : 'auto',
          }}
        >
          {icon && <i className={`ph-bold ${icon}`} draggable={false} style={{ fontSize: '1.25em' }} />}
          <span draggable={false}>{label}</span>
        </motion.div>
      </motion.div>

      {/* 4. SUCCESS STATE MASK CIRCULAR LAYER - Moved to top of stack with 3D depth */}
      <motion.div style={{ ...layerWrapperStyle, transform: zSuccess, zIndex: 100 }}>
        <SuccessLayer
          isSuccess={isSuccess}
          position={successPos}
          label={successLabel}
          size={size}
          onComplete={() => setShowGlow(true)}
          zIndex={100}
          parentRef={localRef}
        />
      </motion.div>
    </motion.button>
  );
});

export default Button;
