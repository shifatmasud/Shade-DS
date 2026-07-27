/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../Theme.tsx';
import { motion, type MotionValue, useTransform, useMotionValue, useSpring, useAnimate } from 'framer-motion';
import StateLayer from '../Core/sub-components/StateLayer.tsx';
import RippleLayer from '../Core/sub-components/RippleLayer.tsx';

interface CardProps {
  label: string; // Used as title
  variant?: 'primary' | 'secondary' | 'outline' | 'tertiary' | 'destructive';
  customFill?: string | MotionValue<string>;
  customColor?: string | MotionValue<string>;
  customRadius?: string | MotionValue<string>;
  disabled?: boolean;
  layerSpacing?: MotionValue<number>;
  view3D?: boolean;
  forcedHover?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  forcedActive?: boolean;
  forcedFocus?: boolean;
  
  // Tailored Props
  cardSubtitle?: string;
  cardBodyText?: string;
  cardMediaHeight?: number;
  showCardMedia?: boolean;
  cardHoverTilt?: boolean;
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
  
  // Tailored Props
  cardSubtitle,
  cardBodyText,
  cardMediaHeight,
  showCardMedia = true,
  cardHoverTilt = true,
}, ref) => {
  const { theme } = useTheme();
  const [scope, animate] = useAnimate<HTMLDivElement>();

  React.useImperativeHandle(ref, () => scope.current!);

  const [isHovered, setIsHovered] = useState(false);
  const effectiveHover = forcedHover || isHovered;

  // Spring values for dynamic high-fidelity 3D tilt tracking on both mouse and touch devices
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const tiltXSpring = useSpring(tiltX, { damping: 25, stiffness: 220 });
  const tiltYSpring = useSpring(tiltY, { damping: 25, stiffness: 220 });

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const defaultLayerSpacing = useMotionValue(0);
  const effectiveLayerSpacing = layerSpacing || defaultLayerSpacing;

  // 3D Layer Transforms
  const zStateLayer = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v}px)`);
  const zRippleLayer = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 1.5}px)`);
  const zContent = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 2}px)`);
  const zMedia = useTransform(effectiveLayerSpacing, (v: any) => `translateZ(${v * 3}px)`);

  // --- Dynamic Inner Radius Logic ---
  const paddingValue = parseInt(theme.space['Space.XL']) || 24;
  
  const getNumericRadius = (r: string | MotionValue<string> | undefined): number => {
    if (!r) return 0;
    if (typeof r === 'string') return parseInt(r) || 0;
    const val = r.get();
    return typeof val === 'string' ? parseInt(val) || 0 : 0;
  };

  const outerRadiusMV = useMotionValue(getNumericRadius(customRadius || '40px'));
  
  useEffect(() => {
    if (!customRadius) {
        outerRadiusMV.set(40);
        return;
    }
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

  // Touch and Mouse Coordinate Tracking to translate screen space gestures to 3D Tilt rotations
  const handleMove = (clientX: number, clientY: number) => {
    if (disabled || cardHoverTilt === false) return;
    const rect = scope.current?.getBoundingClientRect();
    if (!rect) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const relativeX = (x - centerX) / centerX; // ranges from -1 to 1
    const relativeY = (y - centerY) / centerY; // ranges from -1 to 1

    const maxTiltX = 6;
    const maxTiltY = 6;
    
    tiltX.set(-relativeY * maxTiltX);
    tiltY.set(relativeX * maxTiltY);
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsHovered(true);
    handleMove(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (disabled) return;
    handleMove(e.clientX, e.clientY);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    tiltX.set(0);
    tiltY.set(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsHovered(true);
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsHovered(false);
    tiltX.set(0);
    tiltY.set(0);
  };

  // Synchronise static tilt for forced hover state
  useEffect(() => {
    if (forcedHover) {
      tiltX.set(-3);
      tiltY.set(3);
    } else if (!isHovered) {
      tiltX.set(0);
      tiltY.set(0);
    }
  }, [forcedHover, isHovered, tiltX, tiltY]);

  // Imperative Props-Driven Animation Effect
  useEffect(() => {
    if (!scope.current) return;
    animate(scope.current, {
      y: effectiveHover ? -12 : 0,
      scale: effectiveHover ? 1.02 : 1,
    }, { type: 'spring', damping: 20, stiffness: 200 });
  }, [effectiveHover, scope, animate]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    if (onClick) onClick(e);
  };

  const handleRippleComplete = (id: number) => {
    // No-op for smart ripple
  };

  // Determine Semantic Colors
  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';
  
  const useResolvedMotionValue = (prop: any, fallback: string): any => {
    const isMV = prop && typeof prop === 'object' && 'get' in prop && 'on' in prop;
    const resolvedMV = useMotionValue(isMV ? (prop.get() || fallback) : (prop || fallback));
    
    useEffect(() => {
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

  const fallbackBg = isPrimary 
    ? theme.Color.Accent.Surface[1] 
    : (isDestructive 
       ? theme.Color.Error.Surface[1] 
       : (variant === 'outline' || variant === 'tertiary' ? 'transparent' : theme.Color.Base.Surface[1]));
  const fallbackColor = isPrimary ? theme.Color.Accent.Content[1] : (isDestructive ? theme.Color.Error.Content[1] : theme.Color.Base.Content[1]);

  const isOutlineOrTertiary = variant === 'outline' || variant === 'tertiary';
  const bgColor = useResolvedMotionValue(isOutlineOrTertiary ? 'transparent' : customFill, fallbackBg);
  const contentColor1 = useResolvedMotionValue(customColor, fallbackColor);
  const contentColor2 = theme.Color.Base.Content[2];

  const styles: any = {
    position: 'relative',
    width: theme.space['Space.Panel.Width'], 
    padding: theme.space['Space.XL'], 
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: bgColor,
    color: contentColor1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.XL'], 
    boxShadow: effectiveHover 
      ? (variant === 'outline'
          ? `0 0 1px 0px ${theme.Color.Base.Content[3]}, inset 0 0 1px 0px ${theme.Color.Base.Content[3]}, ${theme.effects['Effect.Shadow.Drop.3']}`
          : `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.3']}`)
      : (variant === 'outline'
          ? `0 0 1px 0px ${theme.Color.Base.Content[3]}, inset 0 0 1px 0px ${theme.Color.Base.Content[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`
          : `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`),
    transformStyle: 'preserve-3d',
    border: 'none',
    opacity: disabled ? theme.opacity['Opacity.Medium'] : 1,
    transition: `background-color ${theme.time['Time.2x']} ease, border-color ${theme.time['Time.2x']} ease, box-shadow ${theme.time['Time.2x']} ease`,
    userSelect: 'none',
  };

  // 3D Debug Colors
  const colors = {
      state: theme.Color.Active.Content[1],
      ripple: theme.Color.Focus.Content[1],
      media: theme.Color.Active.Content[1],
      content: theme.Color.Success.Content[1],
  };

  const getDebugBorder = (color: string) => view3D ? `1px solid ${color}` : 'none';

  return (
    <motion.div
      ref={scope}
      style={{
        ...styles,
        borderRadius: customRadius || '40px',
        rotateX: cardHoverTilt !== false ? tiltXSpring : 0,
        rotateY: cardHoverTilt !== false ? tiltYSpring : 0,
      }}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClick={handleClick}
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

      <motion.div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', transform: zStateLayer, overflow: 'hidden', pointerEvents: 'none', border: getDebugBorder(colors.state) }}>
        <StateLayer 
            color={contentColor1} 
            forced={forcedHover}
            opacity={theme.opacity['Opacity.Hover']}
            parentRef={scope}
        />
      </motion.div>
      
      <motion.div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', transform: zRippleLayer, overflow: 'hidden', pointerEvents: 'none', border: getDebugBorder(colors.ripple) }}>
        <RippleLayer
            color={contentColor1}
            forced={forcedActive}
            opacity={theme.opacity['Opacity.Pressed']}
            parentRef={scope}
        />
      </motion.div>

      {showCardMedia !== false && (
        <motion.div 
          className="card-media"
          style={{ 
              height: cardMediaHeight !== undefined ? `${cardMediaHeight}px` : theme.height['Height.Half'], 
              backgroundColor: theme.Color.Base.Surface[2], 
              borderRadius: innerRadiusMV, 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: zMedia,
              position: 'relative',
              overflow: 'hidden',
              ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
              ... (view3D ? { border: getDebugBorder(colors.media) } : {})
          }}
        >
            <div style={{ 
                 position: 'absolute', 
                 inset: 0, 
                 opacity: theme.opacity['Opacity.Subtle'], 
                 background: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${theme.Color.Base.Content[3]} 10px, ${theme.Color.Base.Content[3]} 11px)` 
            }} />
            
            <motion.div
              animate={{ scale: effectiveHover ? 1.1 : 1, opacity: effectiveHover ? 0.6 : 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.space['Space.XL'] }}
            >
              <i className="ph-bold ph-image" draggable={false} style={{ fontSize: theme.Type.Expressive.Display.L.fontSize, color: theme.Color.Base.Content[2] }} />
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
      )}

      {/* Content Area */}
      <motion.div style={{ 
          transformStyle: 'preserve-3d', 
          transform: zContent, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: theme.space['Space.XS'], 
          border: getDebugBorder(colors.content)
      }}>
        <span draggable={false} style={{ 
            ...theme.Type.Readable.Label.S, 
            color: contentColor2, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            fontWeight: 700 
        }}>
            {cardSubtitle || "Interactive Prototype"}
        </span>
        
        <motion.h3 className="card-title" draggable={false} style={{ 
            ...theme.Type.Expressive.Headline.S, 
            margin: 0, 
            color: contentColor1,
            fontSize: theme.Type.Expressive.Headline.L.fontSize, 
            lineHeight: 1
        }}>
            {label}
        </motion.h3>
        
        <p className="card-body" draggable={false} style={{ 
            ...theme.Type.Readable.Body.M, 
            margin: 0, 
            color: contentColor2,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textWrap: 'pretty' as any,
        }}>
          {cardBodyText || "A dynamic component demonstrating nested radius math and expressive typography. Perfect for modern, data-driven interfaces with accessible color contrast and tight vertical rhythm."}
        </p>
      </motion.div>
    </motion.div>
  );
});

export default Card;
