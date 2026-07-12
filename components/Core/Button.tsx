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
import { motion, type MotionValue, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import StateLayer from './StateLayer.tsx';
import RippleLayer from './RippleLayer.tsx';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'destructive';
export type ButtonSize = 'S' | 'M' | 'L';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  icon?: string;
  customFill?: string | MotionValue<string>;
  customColor?: string | MotionValue<string>;
  customRadius?: string | MotionValue<string>;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'M',
  label,
  icon,
  customFill,
  customColor,
  customRadius,
  disabled = false,
  onClick,
  style,
}, ref) => {
  const { theme } = useTheme();
  const localRef = React.useRef<HTMLButtonElement>(null);

  React.useImperativeHandle(ref, () => localRef.current!);

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
    ? theme.Color.Accent.Surface[1] 
    : (variant === 'destructive' 
       ? theme.Color.Error.Surface[1] 
       : (variant === 'secondary' ? theme.Color.Base.Surface[2] : 'transparent'));

  const fallbackColor = variant === 'primary' 
    ? theme.Color.Accent.Content[1] 
    : (variant === 'destructive' 
       ? theme.Color.Error.Content[1] 
       : theme.Color.Base.Content[1]);

  const isOutlineOrTertiary = variant === 'outline' || variant === 'tertiary';
  const resolvedFill = useResolvedMotionValue(isOutlineOrTertiary ? 'transparent' : customFill, fallbackBg);
  const resolvedColor = useResolvedMotionValue(customColor, fallbackColor);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
          boxShadow: theme.effects['Effect.Shadow.Drop.1'],
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
          ...theme.border.getBorder1px(theme.Color.Base.Content[3]),
        };
      case 'destructive':
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
          boxShadow: `0 0 1px 0px ${theme.Color.Error.Content[1]}, inset 0 0 1px 0px ${theme.Color.Error.Content[1]}, ${theme.effects['Effect.Shadow.Drop.1']}`,
        };
      case 'tertiary':
      default:
        return {
          background: resolvedFill,
          color: resolvedColor,
          border: 'none',
          boxShadow: 'none',
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
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space['Space.S'],
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? theme.opacity['Opacity.Disabled'] : 1,
    overflow: 'hidden',
    userSelect: 'none',
    transition: 'background-color 200ms ease, color 200ms ease, box-shadow 200ms ease',
    ...getSizeStyles(),
    ...getVariantStyles(),
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
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={onClick}
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
      <AnimatePresence mode="popLayout">
        <motion.div
          key={variant}
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          exit={{ clipPath: 'inset(0 0 0 100%)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: resolvedFill,
            zIndex: -1,
          }}
        />
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${icon}-${label}`}
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.S'] }}
        >
          {icon && <i className={`ph-bold ${icon}`} style={{ fontSize: '1.20em' }} />}
          <span>{label}</span>
        </motion.div>
      </AnimatePresence>
      
      {/* Smart Interaction Layers */}
      {!disabled && (
        <>
          <StateLayer 
            color={resolvedColor} 
            opacity={theme.opacity['Opacity.Hover']}
            parentRef={localRef}
          />
          <RippleLayer 
            color={resolvedColor}
            opacity={theme.opacity['Opacity.Pressed']}
            parentRef={localRef}
          />
        </>
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
