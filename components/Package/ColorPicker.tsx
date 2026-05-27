/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useMotionValue } from 'framer-motion';
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

/**
 * 🧱 FloatingColorPickerWindow Props
 */
interface FloatingColorPickerWindowProps {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
  onCommit?: (hex: string) => void;
  onClose: () => void;
  startX: number;
  startY: number;
}

/**
 * 🧱 FloatingColorPickerWindow Component
 * Extracted, isolated floating window instance for active color pickers.
 * 
 * PERFORMANCE GAINS:
 * 1. Continuous HSL drags only update LOCAL state. Outer parent is not notified
 *    until drag commit/release happens, entirely breaking the rendering cascade lag!
 * 2. This window is hosted higher up in the portal, meaning it stays open even if
 *    other windows/panels (such as the main Control Panel) close.
 * 
 * TO UNDO: Inline this back as a local sub-comp inside ColorPicker under 'isOpen' state.
 */
export const FloatingColorPickerWindow: React.FC<FloatingColorPickerWindowProps> = ({
  id,
  label,
  value: initialValue,
  onChange,
  onCommit,
  onClose,
  startX,
  startY,
}) => {
  const { theme } = useTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const initialHsl = useMemo(() => hexToHSL(initialValue), []);
  const hslRef = useRef<typeof initialHsl>(initialHsl);
  const lastProcessedPropValue = useRef(initialValue);

  // Motion values to feed into standard RangeSlider components
  const hueMV = useMotionValue(initialHsl.h);
  const satMV = useMotionValue(initialHsl.s);
  const lightMV = useMotionValue(initialHsl.l);

  // Sync internal HSL with external prop state (e.g. on Undo/Redo) with race-condition prevention
  useEffect(() => {
    const lowerInitial = initialValue.toLowerCase();
    const lowerLastProcessed = lastProcessedPropValue.current.toLowerCase();
    const currentLocalHex = HSLToHex(hslRef.current.h, hslRef.current.s, hslRef.current.l).toLowerCase();

    if (lowerInitial !== lowerLastProcessed && lowerInitial !== currentLocalHex) {
      const parsed = hexToHSL(initialValue);
      hslRef.current = parsed;
      hueMV.set(parsed.h);
      satMV.set(parsed.s);
      lightMV.set(parsed.l);
      lastProcessedPropValue.current = initialValue;
    } else if (lowerInitial !== lowerLastProcessed) {
      // Catch up the processed prop indicator once parent updates propagate back to us
      lastProcessedPropValue.current = initialValue;
    }
  }, [initialValue, hueMV, satMV, lightMV]);

  // Register continuous style updater on motion values
  useEffect(() => {
    const updateGradients = () => {
      const h = hueMV.get();
      const s = satMV.get();
      const l = lightMV.get();
      const wrapper = wrapperRef.current;
      if (wrapper) {
        wrapper.style.setProperty('--picker-sat-grad', `linear-gradient(to right, ${HSLToHex(h, 0, l)}, ${HSLToHex(h, 100, l)})`);
        wrapper.style.setProperty('--picker-light-grad', `linear-gradient(to right, #000, ${HSLToHex(h, s, 50)}, #fff)`);
      }
    };

    const unsub1 = hueMV.on("change", updateGradients);
    const unsub2 = satMV.on("change", updateGradients);
    const unsub3 = lightMV.on("change", updateGradients);
    
    // Set initial custom values on mount
    updateGradients();

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [hueMV, satMV, lightMV]);

  // Color selection from spatial ring blobs (discrete click event)
  const selectColor = React.useCallback((color: string) => {
    playSound('click');
    const newHsl = hexToHSL(color);
    hslRef.current = newHsl;
    hueMV.set(newHsl.h);
    satMV.set(newHsl.s);
    lightMV.set(newHsl.l);
    lastProcessedPropValue.current = color;
    onChange(color);
    if (onCommit) onCommit(color);
  }, [onChange, onCommit, hueMV, satMV, lightMV]);

  // Color updating handler
  const updateColor = React.useCallback((newHsl: typeof hslRef.current, isFinal: boolean = false) => {
    // Update the synchronous ref immediately to bypass async React State batching lags
    hslRef.current = newHsl;
    const hex = HSLToHex(newHsl.h, newHsl.s, newHsl.l);
    
    // Notify custom color MotionValues continuously with zero drag lag
    onChange(hex);
    
    if (isFinal) {
      lastProcessedPropValue.current = hex;
      if (onCommit) onCommit(hex);
    }
  }, [onChange, onCommit]);

  // Spatial Blob configuration details
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

  const ringInner = useMemo(() => {
    const colors = [];
    const count = 6; 
    for(let i = 0; i < count; i++) {
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
        colors.push(HSLToHex(hue, 95, 55));
    }
    return colors;
  }, []);

  const ringsData = useMemo(() => [
    { colors: ringOuter, radius: 62, delay: 0.1 }, 
    { colors: ringInner, radius: 36, delay: 0 },
    { colors: ['#FFFFFF'], radius: 0, delay: 0 }
  ], [ringInner, ringOuter]);

  // Gradients for range slider tracks
  const hueGradient = useMemo(() => `linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)`, []);

  // Stylings compliant with Shade DSL rules
  const STYLES = useMemo(() => ({
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
        width: theme.space['Space.6XL'], // 52px
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
  }), [theme]);

  // Spatial Ring Blobs layout
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
  ), [ringsData, coords, selectColor, STYLES]);

  return (
    <FloatingWindow
        title={label || "Color Picker"}
        zIndex={10000}
        x={startX}
        y={startY}
        onClose={onClose}
        onFocus={() => {}}
    >
        <div ref={wrapperRef} style={{ ...STYLES.menuContainer, gap: theme.space['Space.M'] }}>
            {/* Spatial Rings Section */}
            {spatialRingsUI}

            {/* HSL Sliders Panel with local-only drag updates */}
            <div style={STYLES.slidersPanel}>
                <RangeSlider 
                    label="Hue" 
                    motionValue={hueMV} 
                    min={0} max={360} 
                    trackBackground={hueGradient}
                    onChange={(v) => updateColor({ ...hslRef.current, h: v }, false)}
                    onCommit={(v) => updateColor({ ...hslRef.current, h: v }, true)}
                />
                <RangeSlider 
                    label="Saturation" 
                    motionValue={satMV} 
                    min={0} max={100} 
                    trackBackground="var(--picker-sat-grad)"
                    onChange={(v) => updateColor({ ...hslRef.current, s: v }, false)}
                    onCommit={(v) => updateColor({ ...hslRef.current, s: v }, true)}
                />
                <RangeSlider 
                    label="Lightness" 
                    motionValue={lightMV} 
                    min={0} max={100} 
                    trackBackground="var(--picker-light-grad)"
                    onChange={(v) => updateColor({ ...hslRef.current, l: v }, false)}
                    onCommit={(v) => updateColor({ ...hslRef.current, l: v }, true)}
                />
            </div>
        </div>
    </FloatingWindow>
  );
};

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (e: any) => void;
  onCommit?: (value: string) => void;
  style?: React.CSSProperties;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, onCommit, style }) => {
  const { theme } = useTheme();
  
  // Create unique picker ID based on HSL label matching
  const pickerId = label === "Fill Color" ? "fillColor" : "textColor";

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
        width: theme.space['Space.2XL'], // 28px
        height: theme.space['Space.2XL'],
        borderRadius: '50%',
    },
  }), [theme, style]);

  // Triggers opening the globally-hosted Color Picker window
  const handleToggle = () => {
    playSound('click');
    if ((window as any).openColorPicker) {
      (window as any).openColorPicker(pickerId, {
        label: label || "Color Picker",
        startX: pickerId === "fillColor" ? -140 : 140, // Elegant side-by-side split layout
        startY: 0
      });
    }
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
  };

  return (
    <div style={STYLES.container}>
      {label && <label style={STYLES.label}>{label}</label>}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.S'] }}>
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
                width: theme.space['Space.7XL'], // 60px
                opacity: 0.6,
                textTransform: 'uppercase'
            }}
          />
      </div>
    </div>
  );
};

export default ColorPicker;
