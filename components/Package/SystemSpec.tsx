/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { 
  CheckCircle, 
  Play, 
  Wrench, 
  Palette, 
  FileText, 
  Copy, 
  Check,
  DeviceMobile,
  Target,
  Lightning,
  Cube,
  TextT,
  Layout,
  Stack
} from 'phosphor-react';

const SystemSpec = () => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const markdownContent = `# System Spec

---

## Core Rules

1. Hide complexity until desired.
2. Write Compact Helpful copy (max 3 lines, 40–80 chars per line, EL5 mode).
3. One primary focus at a time.
4. Design Mobile-first always (max width: 400px, max height: 600px).
5. Prioritize Stability > Performance > Usability > Aesthetic.

---

## Execution Rules

Before any task, generate:

1. Summary (≤5 lines in chat & README.MD)
2. Architecture (IPO)
3. Action List (Ordered)

---

## Engineering Rules

1. No Tailwind. Use JS style object.
2. No CSS keyframes. Use Framer Motion.
3. GSAP only for Three.js & external timelines.
4. Mobile gestures replace hover (touch drag = mouse move).
5. No native OS UI components. Use custom components.
6. Modular Components folder structure: Core → Package → Section → Page → App.
7. Reactive Architecture: [Realtime API] & Events → FSM → Event Bus → Store → Observer → Renderer

---

## Design Rules

### Typography

Bebas Neue (hero)
Inter (body)
Victor Mono (data)
Comic Neue (quotes)

### Iconography

Phosphor Icons

### Tokens

Use semantic format: \`Category.Purpose.Context.Level\`
Surface = background
Content = text/icon
Never use literal values.

### Motion

Base = 100ms
Default = 300ms
Scale multiplicatively.

### Grid

4pt base system.

### Interaction States

Use state-layer & ripple-layer overlay. Do not change parent fill.

---

## Documentation Rules

Must generate:

1. [README.md](http://readme.md/)
2. [noteBook.md](http://notebook.md/)
3. [bugReport.md](http://bugreport.md/) 

Never overwrite previous entries.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sectionStyle: React.CSSProperties = {
    padding: theme.spacing['Space.L'],
    borderBottom: `1px solid ${theme.Color.Base.Surface[3]}`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing['Space.M'],
  };

  const headerStyle: React.CSSProperties = {
    fontFamily: 'Bebas Neue',
    fontSize: '24px',
    letterSpacing: '0.05em',
    color: theme.Color.Base.Content[1],
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing['Space.S'],
  };

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing['Space.S'],
    listStyle: 'none',
  };

  const itemStyle: React.CSSProperties = {
    fontFamily: 'Inter',
    fontSize: '14px',
    lineHeight: '1.5',
    color: theme.Color.Base.Content[2],
    display: 'flex',
    gap: theme.spacing['Space.S'],
  };

  const dataStyle: React.CSSProperties = {
    fontFamily: 'Victor Mono',
    fontSize: '12px',
    color: theme.Color.Base.Content[3],
    backgroundColor: theme.Color.Base.Surface[2],
    padding: '2px 6px',
    borderRadius: '4px',
  };

  const quoteStyle: React.CSSProperties = {
    fontFamily: 'Comic Neue',
    fontStyle: 'italic',
    fontSize: '14px',
    color: theme.Color.Base.Content[2],
    borderLeft: `3px solid ${theme.Color.Base.Surface[4]}`,
    paddingLeft: theme.spacing['Space.M'],
    margin: `${theme.spacing['Space.S']} 0`,
  };

  return (
    <div style={{ backgroundColor: theme.Color.Base.Surface[1], height: '100%', overflowY: 'auto' }}>
      {/* Hero Header */}
      <div style={{ 
        padding: theme.spacing['Space.XL'], 
        textAlign: 'center',
        background: `linear-gradient(180deg, ${theme.Color.Base.Surface[2]} 0%, ${theme.Color.Base.Surface[1]} 100%)`,
        borderBottom: `1px solid ${theme.Color.Base.Surface[3]}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '48px', color: theme.Color.Base.Content[1], marginBottom: '8px' }}>
            SYSTEM SPEC
          </h1>
          <p style={{ fontFamily: 'Inter', fontSize: '14px', color: theme.Color.Base.Content[3], maxWidth: '300px', margin: '0 auto' }}>
            The fundamental laws governing the creation of this digital artifact.
          </p>
        </motion.div>

        {/* Abstract SVG Animation */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.1 }}>
          <svg width="100%" height="100%" viewBox="0 0 400 200">
            <motion.circle
              cx="200"
              cy="100"
              r="80"
              fill="none"
              stroke={theme.Color.Base.Content[1]}
              strokeWidth="1"
              animate={{ 
                r: [80, 100, 80],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              d="M 100 100 Q 200 0 300 100"
              fill="none"
              stroke={theme.Color.Base.Content[1]}
              strokeWidth="0.5"
              animate={{ d: ["M 100 100 Q 200 0 300 100", "M 100 100 Q 200 200 300 100", "M 100 100 Q 200 0 300 100"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </div>
      </div>

      {/* Core Rules */}
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <CheckCircle size={20} weight="bold" />
          CORE RULES
        </div>
        <ul style={listStyle}>
          {[
            "Hide complexity until desired.",
            "Write Compact Helpful copy (max 3 lines, 40–80 chars per line, EL5 mode).",
            "One primary focus at a time.",
            "Design Mobile-first always (max width: 400px, max height: 600px).",
            "Prioritize Stability > Performance > Usability > Aesthetic."
          ].map((rule, i) => (
            <motion.li 
              key={i} 
              style={itemStyle}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <span style={{ color: theme.Color.Base.Content[1], fontWeight: 600 }}>{i + 1}.</span>
              {rule}
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Execution Rules */}
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <Play size={20} weight="bold" />
          EXECUTION RULES
        </div>
        <p style={{ ...itemStyle, fontSize: '12px', opacity: 0.7 }}>Before any task, generate:</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: theme.spacing['Space.S'] }}>
          {[
            { label: 'Summary', icon: <FileText size={24} /> },
            { label: 'Architecture', icon: <Stack size={24} /> },
            { label: 'Action List', icon: <Target size={24} /> }
          ].map((item, i) => (
            <motion.div 
              key={i}
              style={{ 
                backgroundColor: theme.Color.Base.Surface[2], 
                padding: theme.spacing['Space.M'], 
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'center'
              }}
              whileHover={{ scale: 1.05, backgroundColor: theme.Color.Base.Surface[3] }}
            >
              <div style={{ color: theme.Color.Base.Content[1] }}>{item.icon}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '12px' }}>{item.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Engineering Rules */}
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <Wrench size={20} weight="bold" />
          ENGINEERING RULES
        </div>
        <ul style={listStyle}>
          {[
            { text: "No Tailwind. Use JS style object.", icon: <Lightning size={16} /> },
            { text: "No CSS keyframes. Use Framer Motion.", icon: <Cube size={16} /> },
            { text: "GSAP only for Three.js & external timelines.", icon: <Play size={16} /> },
            { text: "Mobile gestures replace hover.", icon: <DeviceMobile size={16} /> },
            { text: "No native OS UI components.", icon: <Layout size={16} /> },
            { text: "Modular Components folder structure.", icon: <Stack size={16} /> },
            { text: "Reactive Architecture: [Realtime API] & Events → FSM → Event Bus → Store → Observer → Renderer", icon: <Lightning size={16} /> }
          ].map((rule, i) => (
            <motion.li 
              key={i} 
              style={itemStyle}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div style={{ color: theme.Color.Base.Content[3], marginTop: '2px' }}>{rule.icon}</div>
              {rule.text}
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Design Rules */}
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <Palette size={20} weight="bold" />
          DESIGN RULES
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.L'] }}>
          {/* Typography */}
          <div>
            <div style={{ ...itemStyle, fontWeight: 600, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <TextT size={16} /> Typography
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: theme.spacing['Space.S'],
              marginTop: '4px' 
            }}>
              {[
                { role: 'Hero', font: 'Bebas Neue', style: { fontFamily: 'Bebas Neue', fontSize: '20px' } },
                { role: 'Body', font: 'Inter', style: { fontFamily: 'Inter', fontSize: '14px' } },
                { role: 'Data', font: 'Victor Mono', style: { fontFamily: 'Victor Mono', fontSize: '12px' } },
                { role: 'Quotes', font: 'Comic Neue', style: { fontFamily: 'Comic Neue', fontSize: '14px', fontStyle: 'italic' } },
              ].map((item, i) => (
                <div key={i} style={{ 
                  backgroundColor: theme.Color.Base.Surface[2],
                  padding: theme.spacing['Space.M'],
                  borderRadius: '12px',
                  border: `1px solid ${theme.Color.Base.Surface[3]}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ ...itemStyle, fontSize: '10px', opacity: 0.5, textTransform: 'uppercase' }}>{item.role}</div>
                  <div style={{ ...itemStyle, ...item.style, color: theme.Color.Base.Content[1] }}>{item.font}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tokens */}
          <div>
            <div style={{ ...itemStyle, fontWeight: 600, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <Target size={16} /> Tokens
            </div>
            <code style={dataStyle}>Category.Purpose.Context.Level</code>
            <p style={{ ...itemStyle, fontSize: '12px', marginTop: '4px' }}>Never use literal values.</p>
          </div>

          {/* Motion */}
          <div>
            <div style={{ ...itemStyle, fontWeight: 600, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <Lightning size={16} /> Motion
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '10px', opacity: 0.5 }}>BASE</div>
                <div style={{ fontFamily: 'Victor Mono', fontSize: '16px' }}>100ms</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', opacity: 0.5 }}>DEFAULT</div>
                <div style={{ fontFamily: 'Victor Mono', fontSize: '16px' }}>300ms</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Documentation Rules */}
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <FileText size={20} weight="bold" />
          DOCUMENTATION RULES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['README.md', 'noteBook.md', 'bugReport.md'].map((file, i) => (
            <div key={i} style={{ ...itemStyle, alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: theme.Color.Base.Content[1] }} />
              {file}
            </div>
          ))}
        </div>
        <div style={quoteStyle}>
          "Never overwrite previous entries."
        </div>
      </section>

      {/* Footer Actions */}
      <div style={{ padding: theme.spacing['Space.XL'], display: 'flex', justifyContent: 'center' }}>
        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: theme.Color.Base.Content[1],
            color: theme.Color.Base.Surface[1],
            fontFamily: 'Bebas Neue',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'background-color 0.2s'
          }}
        >
          {copied ? <Check size={20} weight="bold" /> : <Copy size={20} weight="bold" />}
          {copied ? 'COPIED!' : 'COPY AS MARKDOWN'}
        </motion.button>
      </div>
    </div>
  );
};

export default SystemSpec;
