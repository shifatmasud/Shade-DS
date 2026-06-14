
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { createContext, useContext, useState, useMemo } from 'react';
import { useBreakpoint, Breakpoint } from './hooks/useBreakpoint.tsx';

// --- DESIGN TOKENS (Tier 2, System Prompt) ---

const Base = { Unit: { Space: 4, Radius: 4, Time: 100 } };
const px = (value: number) => `${value}px`;

const lightThemeColors = {
  Color: {
    Base: {
      Surface: { '1': '#FFFFFF', '2': '#F5F5F5', '3': '#EEEEEE' },
      Content: { '1': '#111111', '2': '#555555', '3': '#888888' }
    },
    Accent: {
      Surface: { '1': '#0f0f0f' }, // Grayscale Accent (Black)
      Content: { '1': '#f0f0f0' }  // White text on black
    },
    Success: { Surface: { '1': '#E6F4EA' }, Content: { '1': '#1E8E3E' } },
    Warning: { Surface: { '1': '#FFF8E1' }, Content: { '1': '#E67C00' } },
    Error: { Surface: { '1': '#FBEAEB' }, Content: { '1': '#C5221F' } },
    Focus: { Surface: { '1': '#E3F2FD' }, Content: { '1': '#1565C0' } }, // Blue Focus
    Active: { Surface: { '1': '#F3E5F5' }, Content: { '1': '#6A1B9A' } } // Restored Pastel Purple
  }
};

const darkThemeColors = {
  Color: {
    Base: {
      Surface: { '1': '#121212', '2': '#1E1E1E', '3': '#333333' }, // Brightened from #282828 for better track visibility
      Content: { '1': '#E0E0E0', '2': '#AAAAAA', '3': '#777777' }
    },
    Accent: {
      Surface: { '1': '#f0f0f0' }, // Grayscale Accent (White)
      Content: { '1': '#0f0f0f' }  // Black text on white
    },
    Success: { Surface: { '1': '#032a1d' }, Content: { '1': '#6DD78C' } },
    Warning: { Surface: { '1': '#2c1f04' }, Content: { '1': '#FF9800' } },
    Error: { Surface: { '1': '#281718' }, Content: { '1': '#FF453A' } }, // Rich Saturated Red
    Focus: { Surface: { '1': '#0D1B2A' }, Content: { '1': '#64B5F6' } }, // Blue Focus
    Active: { Surface: { '1': '#1C062E' }, Content: { '1': '#D9A7F7' } } // Deep Purple Surface, Light Purple Content
  }
};

const typography = {
  Type: {
    Expressive: {
      Display: {
        L: { fontSize: { desktop: '52px', tablet: '52px', mobile: '48px' }, lineHeight: '52px', fontWeight: 400, letterSpacing: '-0.02em', tag: 'h1', fontFamily: "'Bebas Neue', sans-serif" },
        M: { fontSize: { desktop: '40px', tablet: '40px', mobile: '40px' }, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em', tag: 'h2', fontFamily: "'Bebas Neue', sans-serif" },
        S: { fontSize: '36px', lineHeight: '36px', fontWeight: 400, letterSpacing: '-0.02em', tag: 'h3', fontFamily: "'Bebas Neue', sans-serif" },
      },
      Headline: {
        L: { fontSize: '32px', lineHeight: '32px', fontWeight: 400, letterSpacing: '0em', tag: 'h4', fontFamily: "'Bebas Neue', sans-serif" },
        M: { fontSize: '28px', lineHeight: '28px', fontWeight: 400, letterSpacing: '0em', tag: 'h5', fontFamily: "'Bebas Neue', sans-serif" },
        S: { fontSize: '24px', lineHeight: '24px', fontWeight: 400, letterSpacing: '0em', tag: 'h6', fontFamily: "'Bebas Neue', sans-serif" },
      },
      Quote: { fontSize: '24px', lineHeight: "24px", fontWeight: 400, letterSpacing: '0.01em', tag: 'blockquote', fontFamily: "'Cause', sans-serif" },
      Data: { fontSize: '12px', lineHeight: "12px", fontWeight: 400, letterSpacing: '0.03em', tag: 'code', fontFamily: "'JetBrains Mono', monospace" },
    },
    Readable: {
      Title: {
        L: { fontSize: '22px', lineHeight: '28px', fontWeight: 600, letterSpacing: '0em', tag: 'h3', fontFamily: "'Inter', sans-serif" },
        M: { fontSize: '16px', lineHeight: '24px', fontWeight: 600, letterSpacing: '0em', tag: 'h4', fontFamily: "'Inter', sans-serif" },
        S: { fontSize: '14px', lineHeight: '20px', fontWeight: 600, letterSpacing: '0em', tag: 'h5', fontFamily: "'Inter', sans-serif" },
      },
      Body: {
        L: { fontSize: '16px', lineHeight: '24px', fontWeight: 400, letterSpacing: '0.01em', tag: 'p', fontFamily: "'Inter', sans-serif" },
        M: { fontSize: '14px', lineHeight: '20px', fontWeight: 400, letterSpacing: '0.01em', tag: 'p', fontFamily: "'Inter', sans-serif" },
        S: { fontSize: '12px', lineHeight: '16px', fontWeight: 400, letterSpacing: '0.01em', tag: 'p', fontFamily: "'Inter', sans-serif" },
      },
      Label: {
        L: { fontSize: '14px', lineHeight: '20px', fontWeight: 500, letterSpacing: '0.02em', tag: 'span', fontFamily: "'Inter', sans-serif" }, // Medium weight
        M: { fontSize: '12px', lineHeight: '16px', fontWeight: 500, letterSpacing: '0.02em', tag: 'span', fontFamily: "'Inter', sans-serif" },
        S: { fontSize: '11px', lineHeight: '16px', fontWeight: 500, letterSpacing: '0.02em', tag: 'span', fontFamily: "'Inter', sans-serif" },
      },
    }
  }
};

const space = { 
  'Space.2XS': px(Base.Unit.Space * 0.5), // 2
  'Space.XS': px(Base.Unit.Space * 1),   // 4
  'Space.S': px(Base.Unit.Space * 2),    // 8
  'Space.M': px(Base.Unit.Space * 3),    // 12
  'Space.L': px(Base.Unit.Space * 4),    // 16
  'Space.XL': px(Base.Unit.Space * 6),   // 24
  'Space.2XL': px(Base.Unit.Space * 8),  // 32
  'Space.3XL': px(Base.Unit.Space * 10), // 40
  'Space.4XL': px(Base.Unit.Space * 11), // 44
  'Space.5XL': px(Base.Unit.Space * 12), // 48
  'Space.6XL': px(Base.Unit.Space * 14), // 56
  'Space.7XL': px(Base.Unit.Space * 16), // 64
  'Space.8XL': px(Base.Unit.Space * 20), // 80
  'Space.9XL': px(Base.Unit.Space * 25), // 100
  'Space.10XL': px(Base.Unit.Space * 30), // 120
  'Space.11XL': px(Base.Unit.Space * 37), // 148
  'Space.12XL': px(Base.Unit.Space * 50), // 200
  'Space.13XL': px(Base.Unit.Space * 70), // 280
  'Space.14XL': px(Base.Unit.Space * 100), // 400

  'Space.Panel.Width': px(Base.Unit.Space * 100), // 400
  'Space.Panel.Height': px(Base.Unit.Space * 150) // 600
};
const radius = { 'Radius.S': px(Base.Unit.Radius * 1), 'Radius.M': px(Base.Unit.Radius * 2), 'Radius.L': px(Base.Unit.Radius * 3), 'Radius.XL': px(Base.Unit.Radius * 4), 'Radius.Full': px(9999) };
const effects = { 'Effect.Shadow.Drop.1': '0 2px 4px rgba(0,0,0,0.1)', 'Effect.Shadow.Drop.2': '0 4px 8px rgba(0,0,0,0.12)', 'Effect.Shadow.Drop.3': '0 8px 16px rgba(0,0,0,0.15)', 'Effect.Shadow.Inset.1': 'inset 0 1px 2px rgba(0,0,0,0.1)' };
const time = { 'Time.1x': `${Base.Unit.Time * 1}ms`, 'Time.2x': `${Base.Unit.Time * 2}ms`, 'Time.3x': `${Base.Unit.Time * 3}ms`, 'Time.4x': `${Base.Unit.Time * 4}ms`, 'Time.Subtle.1': `${Base.Unit.Time * 1 + 50}ms`, 'Time.Subtle.2': `${Base.Unit.Time * 2 + 50}ms` };
const opacity = { 'Opacity.Subtle': 0.1, 'Opacity.Light': 0.2, 'Opacity.Medium': 0.5, 'Opacity.High': 0.8, 'Opacity.Disabled': 0.4, 'Opacity.Hover': 0.08, 'Opacity.Pressed': 0.12 };
const height = { 
  'Height.XS': space['Space.2XL'],  // 32px
  'Height.S': space['Space.3XL'],   // 40px
  'Height.M': space['Space.4XL'],   // 44px
  'Height.L': space['Space.6XL'],   // 56px
  'Height.XL': space['Space.7XL'],  // 64px
  'Height.Half': px(Base.Unit.Space * 45) 
};
const border = { 
  'Border.Width.Main': '1px', 
  'Border.Width.Thick': '2px', 
  'Border.Style.Main': 'solid',
  /* 
   * SHADE DSL STYLING REWRITE:
   * - Added getBorder1px & getOutline2px helpers to replace standard borders with 
   *   lush 3D box-shadow glows and crisp 2px inset-aligned outline properties.
   * - To undo: revert getBorder1px -> { border: `1px solid ${color}` }, getOutline2px -> { border: `2px solid ${color}` }.
   */
  getBorder1px: (color: string) => ({
    border: 'none',
    boxShadow: `0 0 1px 0px ${color}, inset 0 0 1px 0px ${color}`
  }),
  getOutline2px: (color: string) => ({
    border: 'none',
    outline: `2px solid ${color}`,
    outlineOffset: '-2px'
  })
};

const rawTheme = { Type: typography.Type, space, radius, effects, time, opacity, height, border };

const themes = { light: lightThemeColors, dark: darkThemeColors };

// --- LOGIC FOR CREATING A "SMART" THEME ---

const isResponsiveObject = (value: any): value is { [key in Breakpoint]?: any } => {
  return value && typeof value === 'object' && ('mobile' in value || 'tablet' in value || 'desktop' in value);
};

// Recursively traverses the theme tokens and resolves any responsive values.
const resolveTokens = (obj: any, breakpoint: Breakpoint): any => {
  const resolved: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (isResponsiveObject(value)) {
        resolved[key] = value[breakpoint] ?? value.desktop ?? value.tablet ?? value.mobile;
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = resolveTokens(value, breakpoint);
      } else {
        resolved[key] = value;
      }
    }
  }
  return resolved;
};

// --- GLOBAL STYLES & THEME PROVIDER ---

const GlobalStyles = ({ theme }: { theme: any }) => {
    const globalCss = `
      /* Tap highlight color removed globally. To undo: remove '-webkit-tap-highlight-color: transparent' */
      *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body, #root { height: 100%; margin: 0; padding: 0; font-family: ${typography.Type.Readable.Body.M.fontFamily}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
      body { transition: background-color ${time['Time.3x']} ease; }
      
      /* Custom Scrollbar Styles */
      * {
        scrollbar-width: thin;
        scrollbar-color: ${theme.Color.Base.Surface[3]} transparent;
      }

      ::-webkit-scrollbar { 
        width: ${theme.space['Space.XS']}; 
        height: ${theme.space['Space.XS']}; 
      }
      ::-webkit-scrollbar-track { 
        background: transparent; 
      }
      ::-webkit-scrollbar-thumb { 
        background: ${theme.Color.Base.Surface[3]}; 
        border-radius: 10px;
        border: 1px solid transparent;
        background-clip: content-box;
      }
      ::-webkit-scrollbar-thumb:hover { 
        background: ${theme.Color.Base.Content[3]}; 
        border-radius: 10px;
        border: 1px solid transparent;
        background-clip: content-box;
      }
    `;
    return <style>{globalCss}</style>;
};

type Resolved<T> = T extends Function
  ? T
  : T extends { mobile: any } | { tablet: any } | { desktop: any }
  ? T[keyof T]
  : T extends object
  ? { [P in keyof T]: Resolved<T[P]> }
  : T;

type ResolvedRawTheme = Resolved<typeof rawTheme>;


type ThemeName = 'light' | 'dark';
type ThemeContextType = {
  themeName: ThemeName;
  setThemeName: (themeName: ThemeName) => void;
  theme: typeof lightThemeColors & ResolvedRawTheme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: React.PropsWithChildren) => {
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const breakpoint = useBreakpoint();

  const smartTheme = useMemo(() => {
    const colorTheme = themes[themeName];
    const resolvedRawTheme = resolveTokens(rawTheme, breakpoint);
    return { ...colorTheme, ...resolvedRawTheme };
  }, [themeName, breakpoint]);

  const value = {
    themeName,
    setThemeName,
    theme: smartTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <GlobalStyles theme={smartTheme} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
