/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import RangeSlider from '../Core/RangeSlider.tsx';
import FloatingWindow from './FloatingWindow.tsx';
import { playSound } from '../../services/soundService.ts';

// --- COLOR UTILS ---

function hexToHSL(hex: string) {
  let r = 0, g = 0, b = 0;
  let cleanHex = hex.replace('#', '');
  
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  
  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
}

function HSLToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2,
      r = 0,
      g = 0,
      b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const toHex = (n: number) => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (e: any) => void;
  onCommit?: (value: string) => void;
  style?: React.CSSProperties;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, onCommit, style }) => {
  /**
   * RECENT CHANGES:
   * - Density: 2 rings (outer: 12 blobs@R62, inner: 6 blobs@R36) + central white blob.
   * - Palette: Inner ring (High Sat/High Light 90%), Outer ring (Vibrant).
   * - Optimization: Increased blob size (52px) to minimize gaps and added glow to white center blob.
   * 
   * TO UNDO: Revert blob size to 42px and ring counts/radii.
   */
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  const [hsl, setHsl] = useState({ h: 0, s: 0, l: 0 });
  const lastEmittedHex = useRef(value);

  // Memoize helper to avoid recreation
  const coords = useMemo(() => {
    const getCoords = (index: number, total: number, radius: number) => {
        const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };
    };
    return getCoords;
  }, []);

  // Vibrant/Soft color rings
  const ringInner = useMemo(() => {
    const colors = [];
    const count = 6; 
    for(let i = 0; i < count; i++) {
        // Distinct vibrant cool palette: High Saturation, High Lightness
        const hue = (i * (360/count)) % 360;
        colors.push(HSLToHex(hue, 60, 90));
    }
    return colors;
  }, []);

  const ringOuter = useMemo(() => {
    const colors = [];
    const count = 12; 
    for(let i = 0; i < count; i++) {
        const hue = (i * (360/count)) % 360;
        // Vibrant palette
        colors.push(HSLToHex(hue, 95, 55));
    }
    return colors;
  }, []);

  const ringsData = useMemo(() => [
    { colors: ringOuter, radius: 62, delay: 0.1 }, 
    { colors: ringInner, radius: 36, delay: 0 },
    { colors: ['#FFFFFF'], radius: 0, delay: 0 }  // Central white blob at origin
  ], [ringInner, ringOuter]);

  const selectColor = React.useCallback((color: string) => {
    playSound('click');
    setHsl(hexToHSL(color));
    lastEmittedHex.current = color;
    onChange({ target: { value: color } });
    if (onCommit) onCommit(color);
  }, [onChange, onCommit]);

  // Styles using JS objects as per Shade DSL
  const STYLES = useMemo(() => ({
    container: {
        position: 'relative' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: theme.space['Space.S'],
        ...style
    },
    label: {
        ...theme.Type.Readable.Label.S,
        color: theme.Color.Base.Content[2],
        userSelect: 'none' as const
    },
    swatchContainer: {
        position: 'relative' as const,
        width: theme.space['Space.3XL'],
        height: theme.space['Space.3XL'],
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        background: theme.Color.Base.Surface[2],
        border: `1px solid ${theme.Color.Base.Surface[3]}`,
        boxShadow: theme.effects['Effect.Shadow.Drop.2'],
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0
    },
    innerSwatch: {
        width: theme.space['Space.2XL'], // Approximated from 28px
        height: theme.space['Space.2XL'],
        borderRadius: '50%',
    },
    menuContainer: {
        position: 'relative' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space['Space.XL'], 
        pointerEvents: 'auto' as const,
        zIndex: 10
    },
    spatialRoot: {
        position: 'relative' as const,
        width: theme.space['Space.12XL'],
        height: theme.space['Space.12XL'],
        display: 'grid',
        placeItems: 'center'
    },
    ring: {
        position: 'absolute' as const,
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.Color.Base.Surface[1]}55 0%, transparent 70%)`,
        boxShadow: `0 0 60px ${theme.Color.Base.Surface[1]}22`,
        pointerEvents: 'none' as const
    },
    blob: (color: string) => ({
        position: 'absolute' as const,
        width: theme.space['Space.6XL'], // Approximated from 52px
        height: theme.space['Space.6XL'],
        borderRadius: '50%',
        backgroundColor: color,
        border: 'none',
        cursor: 'pointer',
        boxShadow: `0 4px 15px ${color}66, 0 0 20px ${color}33`,
    }),
    slidersPanel: {
        width: '100%',
        padding: theme.space['Space.S'],
        display: 'flex',
        flexDirection: 'column' as const,
        gap: theme.space['Space.M'],
        pointerEvents: 'auto' as const,
        zIndex: 10
    }
}), [theme, style]);

  // Update logic with memoization and effect hooks
  useEffect(() => {
    if (value.toLowerCase() === lastEmittedHex.current.toLowerCase()) return;
    if (value.startsWith('#') && (value.length === 4 || value.length === 7)) {
        setHsl(hexToHSL(value));
    }
    lastEmittedHex.current = value;
  }, [value]);

  const hueMV = useMotionValue(hsl.h);
  const satMV = useMotionValue(hsl.s);
  const lightMV = useMotionValue(hsl.l);

  useEffect(() => {
    hueMV.set(hsl.h);
    satMV.set(hsl.s);
    lightMV.set(hsl.l);
  }, [hsl, hueMV, satMV, lightMV]);

  const updateColor = useMemo(() => {
    return (newHsl: { h: number, s: number, l: number }, isFinal: boolean = false) => {
        setHsl(newHsl);
        const hex = HSLToHex(newHsl.h, newHsl.s, newHsl.l);
        lastEmittedHex.current = hex;
        onChange({ target: { value: hex } });
        if (isFinal && onCommit) onCommit(hex);
    };
  }, [onChange, onCommit]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(e);
    if (newVal.startsWith('#') && (newVal.length === 4 || newVal.length === 7)) {
        setHsl(hexToHSL(newVal));
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
        playSound('click');
    }
    setIsOpen(!isOpen);
  };

  const hueGradient = useMemo(() => `linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)`, []);
  const satGradient = useMemo(() => `linear-gradient(to right, ${HSLToHex(hsl.h, 0, hsl.l)}, ${HSLToHex(hsl.h, 100, hsl.l)})`, [hsl.h, hsl.l]);
  const lightGradient = useMemo(() => `linear-gradient(to right, #000, ${HSLToHex(hsl.h, hsl.s, 50)}, #fff)`, [hsl.h, hsl.s]);

  // Spatial Rings UI - Memoized at top level to avoid hook violation and fix slider lag
  const spatialRingsUI = useMemo(() => (
    <div style={STYLES.spatialRoot}>
        <motion.div 
            style={STYLES.ring}
            animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {ringsData.map((ring, rIndex) => (
            <React.Fragment key={`ring-${rIndex}`}>
                {ring.colors.map((color, i) => {
                    const { x, y } = coords(i, ring.colors.length, ring.radius);
                    /** 
                     * STABILITY FIX [2026-05-15]: 
                     * Removed zIndex: 10 from whileHover to ensure zero depth-shifting on blobs.
                     * TO UNDO: Add 'zIndex: 10' back to whileHover object below.
                     */
                    return (
                        <motion.div
                            key={`${color}-${rIndex}-${i}`}
                            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                            animate={{ x, y, opacity: 1, scale: 1 }}
                            exit={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                            transition={{ 
                                type: 'spring', 
                                damping: 18, 
                                stiffness: 180,
                                delay: ring.delay + (i * 0.02)
                            }}
                            style={STYLES.blob(color)}
                            onClick={() => selectColor(color)}
                            whileHover={{ 
                                scale: 1.2, 
                                boxShadow: `0 8px 30px ${color}aa, 0 0 40px ${color}55`
                            }}
                            whileTap={{ scale: 0.85 }}
                        />
                    );
                })}
            </React.Fragment>
        ))}
    </div>
  ), [ringsData, coords, selectColor, STYLES.spatialRoot, STYLES.ring, STYLES.blob]);

  return (
    <div style={STYLES.container}>
      {label && <label style={STYLES.label}>{label}</label>}
      
      <div ref={triggerRef} style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.S'] }}>
          <motion.div 
            style={STYLES.swatchContainer}
            onClick={handleToggle}
            whileHover={{ scale: 1.1, boxShadow: theme.effects['Effect.Shadow.Drop.3'] }}
            whileTap={{ scale: 0.9 }}
          >
            <div style={{...STYLES.innerSwatch, backgroundColor: value, boxShadow: `0 0 10px ${value}44` }} />
          </motion.div>
          
          <input 
            type="text" 
            value={value} 
            onChange={handleHexChange}
            style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: theme.Color.Base.Content[1],
                ...theme.Type.Expressive.Data,
                width: theme.space['Space.7XL'], // Approximated from 60px
                opacity: 0.6,
                textTransform: 'uppercase'
            }}
          />
      </div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <FloatingWindow
                title={label || "Color Picker"}
                zIndex={10000}
                x={0}
                y={0}
                onClose={() => setIsOpen(false)}
                onFocus={() => {}}
            >
                <div style={{ ...STYLES.menuContainer, gap: theme.space['Space.M'] }}>
                    {/* Spatial Rings Section */}
                    {spatialRingsUI}

                    {/* HSL Sliders Panel */}
                    <div style={STYLES.slidersPanel}>
                        <RangeSlider 
                            label="Hue" 
                            motionValue={hueMV} 
                            min={0} max={360} 
                            trackBackground={hueGradient}
                            onChange={(v) => updateColor({ ...hsl, h: v }, false)}
                            onCommit={(v) => updateColor({ ...hsl, h: v }, true)}
                        />
                        <RangeSlider 
                            label="Saturation" 
                            motionValue={satMV} 
                            min={0} max={100} 
                            trackBackground={satGradient}
                            onChange={(v) => updateColor({ ...hsl, s: v }, false)}
                            onCommit={(v) => updateColor({ ...hsl, s: v }, true)}
                        />
                        <RangeSlider 
                            label="Lightness" 
                            motionValue={lightMV} 
                            min={0} max={100} 
                            trackBackground={lightGradient}
                            onChange={(v) => updateColor({ ...hsl, l: v }, false)}
                            onCommit={(v) => updateColor({ ...hsl, l: v }, true)}
                        />
                    </div>
                </div>
            </FloatingWindow>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default ColorPicker;
