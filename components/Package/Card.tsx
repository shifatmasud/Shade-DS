/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PACKAGE RESTRUCTURE NOTE:
 * This is a pure, generic, production-ready "base" UI Card. It is 100% portable for other react projects.
 * It intentionally lacks the heavy orchestration of our custom design playground (3D space offsets, nested radius calculators).
 * To undo: replace its entire contents with /components/staged/Card.tsx.
 */
import React from 'react';
import { motion, type MotionValue, useMotionValue, useTransform } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

interface CardProps {
  label: string; // Used as title
  variant?: 'primary' | 'secondary' | 'outline' | 'tertiary' | 'destructive';
  customFill?: string | MotionValue<string>;
  customColor?: string | MotionValue<string>;
  customRadius?: string | MotionValue<string>;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>((({
  label,
  variant = 'secondary',
  customFill,
  customColor,
  customRadius,
  disabled = false,
  onClick,
  style,
}, ref) => {
  const { theme } = useTheme();

  // Simple, elegant motion value handler for blank states
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

  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';

  const fallbackBg = isPrimary ? theme.Color.Accent.Surface[1] : (isDestructive ? theme.Color.Error.Surface[1] : theme.Color.Base.Surface[1]);
  const fallbackColor = isPrimary ? theme.Color.Accent.Content[1] : (isDestructive ? theme.Color.Error.Content[1] : theme.Color.Base.Content[1]);

  const bgColor = useResolvedMotionValue(customFill, fallbackBg);
  const contentColor1 = useResolvedMotionValue(customColor, fallbackColor);
  const contentColor2 = theme.Color.Base.Content[2];

  const baseStyles: React.CSSProperties = {
    position: 'relative',
    width: theme.space['Space.Panel.Width'],
    padding: theme.space['Space.XL'],
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: bgColor as any,
    color: contentColor1 as any,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.XL'],
    opacity: disabled ? theme.opacity['Opacity.Medium'] : 1,
    boxShadow: variant === 'outline'
      ? `0 0 1px 0px ${theme.Color.Base.Content[3]}, inset 0 0 1px 0px ${theme.Color.Base.Content[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`
      : `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`,
    userSelect: 'none',
  };

  return (
    <motion.div
      ref={ref}
      style={{
        ...baseStyles,
        borderRadius: customRadius || '40px',
        ...style,
      }}
      whileHover={disabled ? undefined : { y: -8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      onClick={onClick}
    >
      {/* Media Placeholder Area */}
      <div
        className="card-media"
        style={{
          height: theme.height['Height.Half'],
          backgroundColor: theme.Color.Base.Surface[2],
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: theme.opacity['Opacity.Subtle'],
          background: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${theme.Color.Base.Content[3]} 10px, ${theme.Color.Base.Content[3]} 11px)`
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.space['Space.S'], opacity: 0.5 }}>
          <i className="ph-bold ph-image" style={{ fontSize: '2em', color: theme.Color.Base.Content[2] }} />
        </div>
      </div>

      {/* Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.XS'] }}>
        <span style={{ 
            ...theme.Type.Readable.Label.S, 
            color: contentColor2, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            fontWeight: 700 
        }}>
            Generic Component
        </span>
        <h3 className="card-title" style={{ 
            ...theme.Type.Expressive.Headline.S, 
            margin: 0, 
            color: contentColor1 as any,
            fontSize: theme.Type.Expressive.Headline.L.fontSize, 
            lineHeight: 1
        }}>
          {label}
        </h3>
        <p className="card-body" style={{ 
            ...theme.Type.Readable.Body.M, 
            margin: 0, 
            color: contentColor2,
            lineHeight: 1.5,
            textWrap: 'pretty' as any,
        }}>
          This is a direct, zero-orchestration portable Card. Excellent as a starting point for modular layout integrations!
        </p>
      </div>

      {/* Native Hover Overlay */}
      {!disabled && (
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: 'currentColor',
            opacity: 0,
            pointerEvents: 'none',
          }}
          whileHover={{ opacity: 0.04 }}
          whileTap={{ opacity: 0.08 }}
        />
      )}
    </motion.div>
  );
}));

Card.displayName = 'Card';

export default Card;
