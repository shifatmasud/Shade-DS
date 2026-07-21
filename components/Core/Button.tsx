/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CORE RESTRUCTURE NOTE:
 * This is a pure, generic, production-ready "base" UI Button. It is 100% portable for other react projects.
 * It intentionally lacks the heavy orchestration of our custom design playground (3D space offsets, dynamic audio triggers).
 * To undo: replace its entire contents with /components/staged/Button.tsx.
 */
import React from 'react';
import { motion, type MotionValue, useMotionValue, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import StateLayer from './sub-components/StateLayer.tsx';
import RippleLayer from './sub-components/RippleLayer.tsx';
import SuccessLayer from './sub-components/SuccessLayer.tsx';
import { playSound } from '../../services/soundService';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'destructive';
export type ButtonSize = 'S' | 'M' | 'L';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
  successLabel?: string;
  icon?: React.ReactNode;
  customFill?: string | MotionValue<string>;
  customColor?: string | MotionValue<string>;
  customRadius?: string | MotionValue<string>;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  enableSuccess?: boolean;
  // Allow custom motion values
  animate?: any;
  whileHover?: any;
  whileTap?: any;
  transition?: any;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'M',
  label,
  successLabel,
  icon,
  customFill,
  customColor,
  customRadius,
  disabled = false,
  onClick,
  style,
  children,
  type = 'button',
  enableSuccess = false,
  // standard motion attributes can be default or customized
  animate,
  whileHover,
  whileTap,
  transition,
  ...rest
}, ref) => {
  const { theme } = useTheme();
  const localRef = React.useRef<HTMLButtonElement>(null);

  React.useImperativeHandle(ref, () => localRef.current!);

  const [isSuccess, setIsSuccess] = React.useState(false);
  const [showGlow, setShowGlow] = React.useState(false);
  const successTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    // If not in success mode, or if we want to allow multiple success ripples
    if (enableSuccess) {
      setIsSuccess(true);
      playSound('success');
      
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setIsSuccess(false), 2000);
    } else {
      if (isSuccess) return; 
      playSound('tick');
    }
    
    if (onClick) onClick(e);
  };

  React.useEffect(() => {
    if (!isSuccess) {
      setShowGlow(false);
    }
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, [isSuccess]);

  // Simple, elegant motion value handler for blank states
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

  const getButtonShadow = () => {
    if (isSuccess && showGlow) {
      return `0 0 24px ${theme.Color.Success.Surface['1']}, 0 0 6px ${theme.Color.Success.Content['1']}`;
    }
    switch (variant) {
      case 'primary':
        return theme.effects['Effect.Shadow.Drop.1'];
      case 'destructive':
        return `0 0 1px 0px ${theme.Color.Error.Content['1']}, inset 0 0 1px 0px ${theme.Color.Error.Content['1']}, ${theme.effects['Effect.Shadow.Drop.1']}`;
      case 'outline':
      case 'secondary':
      case 'tertiary':
      default:
        return 'none';
    }
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
          ...theme.border.getBorder1px(theme.Color.Base.Content['3']),
        };
      case 'destructive':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
        };
      case 'tertiary':
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

  const baseStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space['Space.S'],
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? theme.opacity['Opacity.Disabled'] : 1,
    overflow: 'hidden',
    userSelect: 'none',
    transition: 'background-color 200ms ease, color 200ms ease, box-shadow 200ms ease',
    boxShadow: getButtonShadow(),
    isolation: 'isolate',
    // GESTURE LOCKUP FIX: Keep pointerEvents as 'auto' during success to allow the browser and Framer Motion to receive pointerup/mouseup events, preventing UI freeze.
    pointerEvents: 'auto',
    ...getSizeStyles(),
    ...getVariantStyles(),
  };

  const renderIcon = (iconProp: React.ReactNode) => {
    if (!iconProp) return null;
    if (typeof iconProp === 'string') {
      let iconClass = iconProp;
      if (!iconClass.startsWith('ph-')) {
        iconClass = `ph-${iconClass.toLowerCase()}`;
      }
      if (!iconClass.includes('ph-bold')) {
        iconClass = `ph-bold ${iconClass}`;
      }
      return <i className={iconClass} style={{ fontSize: '1.20em' }} />;
    }
    return iconProp;
  };

  return (
    <motion.button
      ref={localRef}
      style={{
        ...baseStyles,
        borderRadius: customRadius || theme.radius['Radius.Full'],
        ...style,
        background: 'transparent', // We'll use a layered background for the mask slide
      }}
      disabled={disabled}
      type={type}
      whileHover={disabled ? undefined : (whileHover || { scale: 1.02, y: -1 })}
      whileTap={disabled ? undefined : (whileTap || { scale: 0.98, y: 0 })}
      animate={animate}
      transition={transition || { type: 'spring', stiffness: 400, damping: 30 }}
      onClick={handleClick}
      onPointerEnter={(e) => { if (!disabled && e.pointerType !== 'touch') playSound('whisper', 0.5); }}
      data-success={isSuccess ? "true" : "false"}
      {...(rest as any)}
    >
      {/* Background Layers for Mask Slide */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: fallbackBg,
          zIndex: -2,
        }}
      />
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: resolvedFill,
          zIndex: -1,
        }}
      />

      {/* Content Container - Rendered with zero-layout-shift preservation */}
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
        {/* Default Content (Always in flow, determines button size) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.space['Space.S'],
            width: '100%',
            zIndex: 1,
            pointerEvents: 'auto',
          }}
        >
          {icon && renderIcon(icon)}
          {children || (label && <span>{label}</span>)}
        </div>
      </div>

      {/* Smart Interaction Layers */}
      {!disabled && (
        <>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none', zIndex: 0 }}>
            <StateLayer 
              color={resolvedColor} 
              opacity={theme.opacity['Opacity.Hover']}
              parentRef={localRef}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none', zIndex: 0 }}>
            <RippleLayer 
              color={resolvedColor}
              opacity={theme.opacity['Opacity.Pressed']}
              parentRef={localRef}
            />
          </div>
        </>
      )}

      {/* Success Mask Slide layer inside Core/Button - Moved to top of stack */}
      <SuccessLayer
        isSuccess={isSuccess}
        label={successLabel}
        size={size}
        zIndex={10}
        onComplete={() => setShowGlow(true)}
        parentRef={localRef}
      />
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
