/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import RangeSlider from './RangeSlider.tsx';

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
  label: string;
  value: string;
  onChange: (e: any) => void;
  onCommit?: (value: string) => void;
  style?: React.CSSProperties;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, onCommit, style }) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const [hsl, setHsl] = useState({ h: 0, s: 0, l: 0 });
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const lastEmittedHex = useRef(value);

  // Sync internal HSL with external hex updates
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

  const updateColor = (newHsl: { h: number, s: number, l: number }, isFinal: boolean = false) => {
    setHsl(newHsl);
    const hex = HSLToHex(newHsl.h, newHsl.s, newHsl.l);
    lastEmittedHex.current = hex;
    onChange({ target: { value: hex } });
    if (isFinal && onCommit) onCommit(hex);
  };

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Position logic: above the swatch, aligned to left
      setPopoverPos({
        top: rect.top - 8, // Added gap
        left: rect.left,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(e);
    if (newVal.startsWith('#') && (newVal.length === 4 || newVal.length === 7)) {
        setHsl(hexToHSL(newVal));
    }
  };

  const handlePresetClick = (color: string) => {
    onChange({ target: { value: color } });
    setHsl(hexToHSL(color));
    lastEmittedHex.current = color;
    if (onCommit) onCommit(color);
  };

  const presets = [
    '#FFFFFF', '#F5F5F5', '#888888', '#333333', '#000000',
    theme.Color.Focus.Content[1], 
    theme.Color.Success.Content[1],
    theme.Color.Warning.Content[1],
    theme.Color.Error.Content[1],
    theme.Color.Signal.Content[1],
    '#FF0055', '#00CC88', '#3366FF', '#FF9900', '#CC00FF',
  ];

  const swatchStyle: React.CSSProperties = {
    width: '42px',
    height: '42px',
    borderRadius: theme.radius['Radius.S'],
    backgroundColor: value,
    border: `1px solid ${theme.Color.Base.Surface[3]}`,
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: theme.effects['Effect.Shadow.Inset.1'],
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: theme.spacing['Space.S'],
    height: '42px',
    borderRadius: theme.radius['Radius.S'],
    border: `1px solid ${theme.Color.Base.Surface[3]}`,
    backgroundColor: theme.Color.Base.Surface[2],
    color: theme.Color.Base.Content[1],
    fontFamily: theme.Type.Expressive.Data.fontFamily,
    fontSize: '13px',
    outline: 'none',
    textTransform: 'uppercase',
  };

  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    top: popoverPos.top,
    left: popoverPos.left,
    width: '300px',
    transform: 'translateY(-100%)', // Anchor bottom-left to top-left of trigger
    backgroundColor: theme.Color.Base.Surface[1],
    border: `1px solid ${theme.Color.Base.Surface[3]}`,
    borderRadius: theme.radius['Radius.M'],
    boxShadow: theme.effects['Effect.Shadow.Drop.3'],
    zIndex: 9999,
    padding: theme.spacing['Space.L'],
    pointerEvents: 'auto',
  };

  const hueGradient = `linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)`;
  const satGradient = `linear-gradient(to right, ${HSLToHex(hsl.h, 0, hsl.l)}, ${HSLToHex(hsl.h, 100, hsl.l)})`;
  const lightGradient = `linear-gradient(to right, #000, ${HSLToHex(hsl.h, hsl.s, 50)}, #fff)`;

  return (
    <div ref={triggerRef} style={{ position: 'relative', ...style }} onPointerDown={(e) => e.stopPropagation()}>
      <label style={{ ...theme.Type.Readable.Label.S, display: 'block', marginBottom: theme.spacing['Space.S'], color: theme.Color.Base.Content[2] }}>
        {label}
      </label>
      
      <div style={{ display: 'flex', gap: theme.spacing['Space.S'] }}>
        <motion.div 
            style={swatchStyle} 
            onClick={handleToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        />
        <input 
            type="text" 
            value={value} 
            onChange={handleHexChange} 
            style={inputStyle} 
            placeholder="#000000"
            maxLength={7}
        />
      </div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay Backdrop to close */}
              <div 
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9998 }} 
                onClick={() => setIsOpen(false)} 
              />
              
              <motion.div
                ref={popoverRef}
                style={popoverStyle}
                initial={{ opacity: 0, y: '-95%', scale: 0.95 }}
                animate={{ opacity: 1, y: '-100%', scale: 1 }}
                exit={{ opacity: 0, y: '-95%', scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Presets Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    {presets.map((color) => (
                        <motion.button
                            key={color}
                            onClick={() => handlePresetClick(color)}
                            style={{
                                width: '100%',
                                aspectRatio: '1/1',
                                borderRadius: '50%',
                                backgroundColor: color,
                                border: `2px solid ${value.toLowerCase() === color.toLowerCase() ? theme.Color.Base.Content[1] : 'transparent'}`,
                                cursor: 'pointer',
                                outline: 'none',
                                boxShadow: theme.effects['Effect.Shadow.Drop.1'],
                            }}
                            whileHover={{ scale: 1.2, zIndex: 2 }}
                            whileTap={{ scale: 0.9 }}
                        />
                    ))}
                </div>

                <div style={{ height: '1px', backgroundColor: theme.Color.Base.Surface[3], marginBottom: '16px' }} />

                {/* HSL Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default ColorPicker;