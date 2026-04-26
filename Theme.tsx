
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
        L: { fontSize: { desktop: '56px', tablet: '52px', mobile: '48px' }, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em', tag: 'h1', fontFamily: "'Bebas Neue', sans-serif" },
        M: { fontSize: { desktop: '44px', tablet: '40px', mobile: '40px' }, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em', tag: 'h2', fontFamily: "'Bebas Neue', sans-serif" },
        S: { fontSize: '36px', lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em', tag: 'h3', fontFamily: "'Bebas Neue', sans-serif" },
      },
      Headline: {
        L: { fontSize: '32px', lineHeight: 1.25, fontWeight: 700, letterSpacing: '0em', tag: 'h4', fontFamily: "'Bebas Neue', sans-serif" },
        M: { fontSize: '28px', lineHeight: 1.25, fontWeight: 700, letterSpacing: '0em', tag: 'h5', fontFamily: "'Bebas Neue', sans-serif" },
        S: { fontSize: '24px', lineHeight: 1.25, fontWeight: 700, letterSpacing: '0em', tag: 'h6', fontFamily: "'Bebas Neue', sans-serif" },
      },
      Quote: { fontSize: '24px', lineHeight: 1.5, fontWeight: 400, letterSpacing: '0.01em', tag: 'blockquote', fontFamily: "'Cause', sans-serif" },
      Data: { fontSize: '12px', lineHeight: 1.5, fontWeight: 400, letterSpacing: '0.03em', tag: 'code', fontFamily: "'JetBrains Mono', monospace" },
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

const spacing = { 'Space.XS': px(Base.Unit.Space * 1), 'Space.S': px(Base.Unit.Space * 2), 'Space.M': px(Base.Unit.Space * 3), 'Space.L': px(Base.Unit.Space * 4), 'Space.XL': px(Base.Unit.Space * 6), 'Space.XXL': px(Base.Unit.Space * 8), 'Space.XXXL': px(Base.Unit.Space * 12) };
const radius = { 'Radius.S': px(Base.Unit.Radius * 1), 'Radius.M': px(Base.Unit.Radius * 2), 'Radius.L': px(Base.Unit.Radius * 3), 'Radius.XL': px(Base.Unit.Radius * 4), 'Radius.Full': px(9999) };
const effects = { 'Effect.Shadow.Drop.1': '0 2px 4px rgba(0,0,0,0.1)', 'Effect.Shadow.Drop.2': '0 4px 8px rgba(0,0,0,0.12)', 'Effect.Shadow.Drop.3': '0 8px 16px rgba(0,0,0,0.15)', 'Effect.Shadow.Inset.1': 'inset 0 1px 2px rgba(0,0,0,0.1)' };
const time = { 'Time.1x': `${Base.Unit.Time * 1}ms`, 'Time.2x': `${Base.Unit.Time * 2}ms`, 'Time.3x': `${Base.Unit.Time * 3}ms`, 'Time.4x': `${Base.Unit.Time * 4}ms`, 'Time.Subtle.1': `${Base.Unit.Time * 1 + 50}ms`, 'Time.Subtle.2': `${Base.Unit.Time * 2 + 50}ms` };

const rawTheme = { Type: typography.Type, spacing, radius, effects, time };

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
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root { height: 100%; margin: 0; padding: 0; font-family: ${typography.Type.Readable.Body.M.fontFamily}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
      body { transition: background-color ${time['Time.3x']} ease; }
      
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: ${theme.Color.Base.Surface[1]}; }
      ::-webkit-scrollbar-thumb { background: ${theme.Color.Base.Surface[3]}; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: ${theme.Color.Base.Content[3]}; }
    `;
    return <style>{globalCss}</style>;
};

type Resolved<T> = T extends { mobile: any } | { tablet: any } | { desktop: any }
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
