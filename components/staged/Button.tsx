/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { useTheme } from '../../Theme.tsx';
import { motion, type MotionValue, useTransform, useMotionValue, AnimatePresence, useAnimate } from 'framer-motion';
import StateLayer from '../Core/sub-components/StateLayer.tsx';
import RippleLayer from '../Core/sub-components/RippleLayer.tsx';
import { SuccessLayer } from '../Core';
import { playSound } from '../../services/soundService';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'destructive';
export type ButtonSize = 'S' | 'M' | 'L';

interface StagedButtonProps {
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

const StagedButton = React.forwardRef<HTMLButtonElement, StagedButtonProps>(({
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
  const [scope, animate] = useAnimate<HTMLButtonElement>();

  React.useImperativeHandle(ref, () => scope.current!);
  
  // Interaction State
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchPress, setIsTouchPress] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const effectiveHover = forcedHover || isHovered || isTouchPress;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    if (e.pointerType === 'touch') {
      setIsTouchPress(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      setIsTouchPress(false);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      setIsTouchPress(false);
    }
  };
  
  // Success State
  const [isSuccess, setIsSuccess] = useState(false);
  const [showGlow, setShowGlow] = useState(false);

  const successTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // SAFE TIMEOUT CLEANUP: Automatically reset success state after 2 seconds
  React.useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

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
    if (disabled) return;

    setIsClicking(true);
    setIsTouchPress(false);
    setTimeout(() => setIsClicking(false), 200);

    if (enableSuccess) {
      setIsSuccess(true);
      playSound('success');
      
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setIsSuccess(false), 2000);
    } else {
      if (isSuccess) return;
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
    const empty = '0 0 0 rgba(0,0,0,0)';
    
    // Maintain glow as long as showGlow is true OR isSuccess is true
    if (isSuccess || showGlow) {
      return `0 0 24px ${theme.Color.Success.Surface['1']}, 0 0 6px ${theme.Color.Success.Content['1']}, ${empty}, ${empty}`;
    }

    const isTertiary = variant === 'tertiary';
    if (isTertiary) return `${empty}, ${empty}, ${empty}, ${empty}`;

    // Layers 1 & 2: Border Shadows
    let b1 = empty;
    let b2 = empty;
    if (variant === 'outline') {
      b1 = `0 0 1px 0px ${theme.Color.Base.Content['3']}`;
      b2 = `inset 0 0 1px 0px ${theme.Color.Base.Content['3']}`;
    } else if (variant === 'destructive') {
      b1 = `0 0 1px 0px ${theme.Color.Error.Content['1']}`;
      b2 = `inset 0 0 1px 0px ${theme.Color.Error.Content['1']}`;
    }

    // Layers 3 & 4: Drop Shadows (Theme shadows like Drop.2/3 are already 2 layers)
    let drop = `${empty}, ${empty}`;
    if (state === 'hover') {
      drop = theme.effects['Effect.Shadow.Drop.3'];
    } else if (state === 'idle') {
      if (variant === 'primary' || variant === 'destructive') {
        drop = theme.effects['Effect.Shadow.Drop.2'];
      }
    } else if (state === 'active') {
      drop = `${theme.effects['Effect.Shadow.Drop.1']}, ${empty}`;
    }

    return `${b1}, ${b2}, ${drop}, ${empty}`;
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

  // Imperative Props-Driven Animation Loop
  React.useEffect(() => {
    if (!scope.current) return;

    const shadowIdle = getButtonShadow('idle');
    const shadowHover = getButtonShadow('hover');
    const shadowActive = getButtonShadow('active');
    const shadowDisabled = getButtonShadow('disabled');

    let targetY = 0;
    let targetScale = 1;
    let targetShadow = shadowIdle;

    if (isSuccess || showGlow) {
      targetY = 0;
      targetScale = 1;
      targetShadow = shadowIdle;
    } else if (disabled) {
      targetY = 0;
      targetScale = 1;
      targetShadow = shadowDisabled;
    } else if (isClicking || forcedActive) {
      // Click always scales down!
      targetY = 2;
      targetScale = 0.95;
      targetShadow = shadowActive;
    } else if (effectiveHover) {
      // Hover and touch press scale up
      targetY = -4;
      targetScale = 1.05;
      targetShadow = shadowHover;
    }

    animate(scope.current, {
      y: targetY,
      scale: targetScale,
      boxShadow: targetShadow,
    }, { duration: 0.2, ease: 'easeOut' });
  }, [effectiveHover, isClicking, forcedActive, forcedFocus, isSuccess, showGlow, disabled, theme, variant]);

  const handleSuccessComplete = React.useCallback(() => setShowGlow(true), []);

  return (
    <motion.button
      ref={scope}
      style={{
        ...styles,
        borderRadius: customRadius || theme.radius['Radius.Full'],
      }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      whileTap={forcedActive ? undefined : { scale: 0.95, y: 2 }}
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
                parentRef={scope}
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
                parentRef={scope}
            />
        </div>
      </motion.div>
      
      {/* 3. CONTENT LAYER (Top) */}
      <motion.div style={{ ...layerWrapperStyle, transform: zContent, border: getDebugBorder(colors.content) }} />

      <motion.div style={{ ...contentWrapperStyle, transform: zContent }}>
        {/* Default Content (Always in flow, determines button size) */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.space['Space.S'],
            color: 'inherit',
            width: '100%',
            pointerEvents: 'auto',
          }}
        >
          {icon && <i className={`ph-bold ${icon}`} draggable={false} style={{ fontSize: '1.25em' }} />}
          <span draggable={false}>{label}</span>
        </div>
      </motion.div>

      {/* 4. SUCCESS STATE MASK CIRCULAR LAYER - Moved to top of stack with 3D depth */}
      <motion.div style={{ ...layerWrapperStyle, transform: zSuccess, zIndex: 100 }}>
        <SuccessLayer
          isSuccess={isSuccess}
          label={successLabel}
          size={size}
          onComplete={handleSuccessComplete}
          onExitComplete={() => setShowGlow(false)}
          zIndex={100}
          parentRef={scope}
        />
      </motion.div>
    </motion.button>
  );
});

export default StagedButton;
