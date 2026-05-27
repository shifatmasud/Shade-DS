/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../Theme.tsx';
import { motion, type MotionValue, useTransform, useMotionValue } from 'framer-motion';
import StateLayer from '../Core/StateLayer.tsx';
import RippleLayer, { Ripple } from '../Core/RippleLayer.tsx';
import { addPropertyControls, ControlType } from '../framer-shims.ts';

interface CardProps {
  label: string; // Used as title
  variant?: 'primary' | 'secondary' | 'outline' | 'tertiary' | 'destructive';
  customFill?: string | MotionValue<string>;
  customColor?: string | MotionValue<string>;
  customRadius?: string | MotionValue<string>;
  customStyle?: {
    customFill?: string;
    customColor?: string;
    customRadius?: string;
  };
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
  customStyle,
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
  const paddingValue = parseInt(theme.space['Space.XL']) || 24;
  
  const getNumericRadius = (r: string | MotionValue<string> | undefined): number => {
    if (!r) return 0;
    if (typeof r === 'string') return parseInt(r) || 0;
    const val = r.get();
    return typeof val === 'string' ? parseInt(val) || 0 : 0;
  };

  /* 
   * SHADE DSL CARDS CORNER RADIUS REWRITE:
   * - Set default outer radius fallback values to 40 so that nested padding-aware inner radius calculation scales to 16px.
   * - To undo: revert (customRadius || '40px') -> customRadius, and inside useEffect revert outerRadiusMV.set(40) to return.
   */
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
  const isDestructive = variant === 'destructive';
  
  /*
   * SHADE DSL THEME AWARENESS UPGRADE:
   * - Created a useResolvedMotionValue hook to dynamic resolve/transform MotionValues that might be empty (''),
   *   falling back to theme-level tokens (theme.Color.Accent.Surface/Content, theme.Color.Base.Surface/Content).
   * - To undo: Revert resolvedBg and resolvedColor to customFill || ... and customColor || ... and delete the hook.
   */
  const useResolvedMotionValue = (prop: any, fallback: string): any => {
    const isMV = prop && typeof prop === 'object' && 'get' in prop && 'on' in prop;
    const localMV = useMotionValue(isMV ? prop.get() : (prop || fallback));
    
    useEffect(() => {
      if (!isMV) {
        localMV.set(prop || fallback);
      }
    }, [prop, isMV, fallback]);

    return useTransform(isMV ? prop : localMV, (v: any) => v || fallback);
  };

  const fallbackBg = isPrimary ? theme.Color.Accent.Surface[1] : (isDestructive ? theme.Color.Error.Surface[1] : theme.Color.Base.Surface[1]);
  const fallbackColor = isPrimary ? theme.Color.Accent.Content[1] : (isDestructive ? theme.Color.Error.Content[1] : theme.Color.Base.Content[1]);

  const fillVal = customFill || (customStyle?.customFill) || '';
  const colorVal = customColor || (customStyle?.customColor) || '';
  const radiusVal = customRadius || (customStyle?.customRadius) || '40px';

  const bgColor = useResolvedMotionValue(fillVal, fallbackBg);
  const contentColor1 = useResolvedMotionValue(colorVal, fallbackColor);
  const contentColor2 = theme.Color.Base.Content[2];

  const styles: any = {
    position: 'relative',
    width: theme.space['Space.Panel.Width'], 
    padding: theme.space['Space.XL'], 
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: bgColor,
    color: contentColor1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.XL'], // 24px gap between Media and Content Area
    boxShadow: variant === 'outline'
      ? `0 0 1px 0px ${theme.Color.Base.Content[3]}, inset 0 0 1px 0px ${theme.Color.Base.Content[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`
      : `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`,
    transformStyle: 'preserve-3d',
    /* 
     * SHADE DSL REWRITE: Replaced 1px solid border with getBorder1px box shadow glow, merged above inside boxShadow.
     * To undo: restore separate border: ... and boxShadow: theme.effects['Effect.Shadow.Drop.2']
     */
    border: 'none',
    opacity: disabled ? theme.opacity['Opacity.Medium'] : 1,
    transition: `background-color ${theme.time['Time.2x']} ease, border-color ${theme.time['Time.2x']} ease`,
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
      ref={ref}
      style={{
        ...styles,
        borderRadius: radiusVal || '40px',
      }}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      animate={{
        y: effectiveHover ? -12 : 0,
        boxShadow: effectiveHover 
          ? (variant === 'outline'
              ? `0 0 1px 0px ${theme.Color.Base.Content[3]}, inset 0 0 1px 0px ${theme.Color.Base.Content[3]}, ${theme.effects['Effect.Shadow.Drop.3']}`
              : `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.3']}`)
          : (variant === 'outline'
              ? `0 0 1px 0px ${theme.Color.Base.Content[3]}, inset 0 0 1px 0px ${theme.Color.Base.Content[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`
              : `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.2']}`),
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
             top: `calc(-1 * ${theme.space['Space.XS']})`, 
             left: `calc(-1 * ${theme.space['Space.XS']})`, 
             right: `calc(-1 * ${theme.space['Space.XS']})`, 
             bottom: `calc(-1 * ${theme.space['Space.XS']})`, 
             borderRadius: 'inherit',
             /* 
              * SHADE DSL REWRITE: Replaced 2px focus ring border with CSS outline.
              * To undo: restore: border: `${theme.border['Border.Width.Thick']} ${theme.border['Border.Style.Main']} ${theme.Color.Focus.Content[1]}`
              */
             ...theme.border.getOutline2px(theme.Color.Focus.Content[1]),
             pointerEvents: 'none',
             boxShadow: forcedFocus ? `0 0 12px ${theme.Color.Focus.Surface[1]}` : 'none',
         }} />
      </motion.div>

      <motion.div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', transform: zStateLayer, overflow: 'hidden', pointerEvents: 'none', border: getDebugBorder(colors.state) }}>
        <StateLayer 
            color={contentColor1} 
            isActive={effectiveHover} 
            x={coords.x} 
            y={coords.y} 
            width={dimensions.width} 
            height={dimensions.height}
            forced={forcedHover}
            opacity={theme.opacity['Opacity.Hover']}
        />
      </motion.div>
      
      <motion.div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', transform: zRippleLayer, overflow: 'hidden', pointerEvents: 'none', border: getDebugBorder(colors.ripple) }}>
        <RippleLayer
            color={contentColor1}
            ripples={ripples}
            onRippleComplete={handleRippleComplete}
            width={dimensions.width} 
            height={dimensions.height}
            forced={forcedActive}
            opacity={theme.opacity['Opacity.Pressed']}
        />
      </motion.div>

      <motion.div 
        className="card-media"
        style={{ 
            height: theme.height['Height.Half'], 
            backgroundColor: theme.Color.Base.Surface[2], 
            borderRadius: innerRadiusMV, 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: zMedia,
            position: 'relative',
            overflow: 'hidden',
            /* 
             * SHADE DSL REWRITE: Replaced 1px solid border with getBorder1px box shadow glow.
             * To undo: replace the spread below with border: `${theme.border['Border.Width.Main']} ${theme.border['Border.Style.Main']} ${theme.Color.Base.Surface[3]}`
             */
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

      {/* Content Area */}
      <motion.div style={{ 
          transformStyle: 'preserve-3d', 
          transform: zContent, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: theme.space['Space.XS'], // Unified 4px rhythm within the text block
          border: getDebugBorder(colors.content)
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

Card.displayName = 'Card';

addPropertyControls(Card, {
  label: {
    type: ControlType.String,
    title: "Title",
    defaultValue: "Interactive Prototype",
  },
  variant: {
    type: ControlType.Enum,
    title: "Variant",
    options: ["primary", "secondary", "outline", "tertiary", "destructive"],
    optionTitles: ["Primary", "Secondary", "Tertiary", "Outline", "Destructive"],
    defaultValue: "secondary",
  },
  disabled: {
    type: ControlType.Boolean,
    title: "Disabled",
    defaultValue: false,
  },
  customStyle: {
    type: ControlType.Object,
    title: "Card Style",
    controls: {
      customFill: {
        type: ControlType.Color,
        title: "Fill Color",
        defaultValue: "",
      },
      customColor: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "",
      },
      customRadius: {
        type: ControlType.String,
        title: "Corner Radius",
        defaultValue: "40px",
      }
    }
  }
});

export default Card;
