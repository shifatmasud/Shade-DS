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
4. Design Adaptive always (adapt to any device).
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
2. Always apply typography via object spread (...theme.Type).
3. No CSS keyframes. Use Framer Motion.
4. GSAP only for Three.js & external timelines.
5. Mobile gestures replace hover (touch drag = mouse move).
6. No native OS UI components. Use custom components.
7. Modular Components folder structure: Core → Package → Section → Page → App.
8. Always strictly follow and use design tokens from Theme.tsx.
9. Reactive Architecture: [Realtime API] & Events → FSM → Event Bus → Store → Observer → Renderer

---

## Design Rules

### Typography

Bebas Neue (hero)
Inter (body)
JetBrains Mono (data)
Cause (quotes)

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

Never overwrite previous entries.

---

## Safety Rules

When change, write, update code:

Inside the target file:
1. Track errors.
2. Add tiny comments.
3. Explain what changed.
4. Keep code clean.
5. Touch only needed code.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sectionStyle: React.CSSProperties = {
    padding: theme.space['Space.L'],
    borderBottom: `1px solid ${theme.Color.Base.Surface[3]}`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.M'],
  };

  const headerStyle: React.CSSProperties = {
    ...theme.Type.Expressive.Headline.S,
    letterSpacing: '0.05em',
    color: theme.Color.Base.Content[1],
    display: 'flex',
    alignItems: 'center',
    gap: theme.space['Space.S'],
  };

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.S'],
    listStyle: 'none',
  };

  const itemStyle: React.CSSProperties = {
    ...theme.Type.Readable.Body.M,
    lineHeight: '1.5',
    color: theme.Color.Base.Content[2],
    display: 'flex',
    gap: theme.space['Space.S'],
  };

  const dataStyle: React.CSSProperties = {
    ...theme.Type.Expressive.Data,
    color: theme.Color.Base.Content[3],
    backgroundColor: theme.Color.Base.Surface[2],
    padding: `${theme.space['Space.2XS']} ${theme.space['Space.XS']}`,
    borderRadius: theme.radius['Radius.S'],
  };

  const quoteStyle: React.CSSProperties = {
    ...theme.Type.Expressive.Quote,
    fontStyle: 'italic',
    color: theme.Color.Base.Content[2],
    borderLeft: `${theme.border['Border.Width.Thick']} solid ${theme.Color.Base.Surface[4]}`,
    paddingLeft: theme.space['Space.M'],
    margin: `${theme.space['Space.S']} 0`,
  };

  return (
    <div style={{ backgroundColor: theme.Color.Base.Surface[1], height: '100%', overflowY: 'auto' }}>
      {/* Hero Header */}
      <div style={{ 
        padding: theme.space['Space.XL'], 
        textAlign: 'center',
        background: `linear-gradient(180deg, ${theme.Color.Base.Surface[2]} 0%, ${theme.Color.Base.Surface[1]} 100%)`,
        borderBottom: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[3]}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 style={{ ...theme.Type.Expressive.Display.L, color: theme.Color.Base.Content[1], marginBottom: theme.space['Space.S'] }}>
            SYSTEM SPEC
          </h1>
          <p style={{ ...theme.Type.Readable.Body.M, color: theme.Color.Base.Content[3], maxWidth: theme.space['Space.Panel.Width'] || '400px', margin: '0 auto' }}>
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
              strokeWidth={theme.border['Border.Width.Main']}
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
              strokeWidth={theme.border['Border.Width.Hairline'] || '0.5px'}
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
            "Design Adaptive always (adapt to any device).",
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
        <p style={{ ...itemStyle, ...theme.Type.Readable.Body.S, opacity: 0.7 }}>Before any task, generate:</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: theme.space['Space.S'] }}>
          {[
            { label: 'Summary', icon: <FileText size={24} /> },
            { label: 'Architecture', icon: <Stack size={24} /> },
            { label: 'Action List', icon: <Target size={24} /> }
          ].map((item, i) => (
            <motion.div 
              key={i}
              style={{ 
                backgroundColor: theme.Color.Base.Surface[2], 
                padding: theme.space['Space.M'], 
                borderRadius: theme.radius['Radius.M'],
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: theme.space['Space.S'],
                textAlign: 'center'
              }}
              whileHover={{ scale: 1.05, backgroundColor: theme.Color.Base.Surface[3] }}
            >
              <div style={{ color: theme.Color.Base.Content[1] }}>{item.icon}</div>
              <div style={{ ...theme.Type.Readable.Label.M }}>{item.label}</div>
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
            { text: "Always apply typography via object spread (...theme.Type).", icon: <TextT size={16} /> },
            { text: "No CSS keyframes. Use Framer Motion.", icon: <Cube size={16} /> },
            { text: "GSAP only for Three.js & external timelines.", icon: <Play size={16} /> },
            { text: "Mobile gestures replace hover.", icon: <DeviceMobile size={16} /> },
            { text: "No native OS UI components.", icon: <Layout size={16} /> },
            { text: "Modular Components folder structure.", icon: <Stack size={16} /> },
            { text: "Always strictly follow and use design tokens from Theme.tsx.", icon: <Palette size={16} /> },
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
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.L'] }}>
          {/* Typography */}
          <div>
            <div style={{ ...itemStyle, fontWeight: 600, marginBottom: theme.space['Space.S'], ...theme.Type.Readable.Label.M, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <TextT size={16} /> Typography
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: theme.space['Space.S'],
              marginTop: theme.space['Space.2XS'] 
            }}>
              {[
                { role: 'Hero', font: 'Bebas Neue', style: { ...theme.Type.Readable.Title.L } },
                { role: 'Body', font: 'Inter', style: { ...theme.Type.Readable.Body.M } },
                { role: 'Data', font: 'JetBrains Mono', style: { ...theme.Type.Expressive.Data } },
                { role: 'Quotes', font: 'Cause', style: { ...theme.Type.Expressive.Quote, fontStyle: 'italic' } },
              ].map((item, i) => (
                <div key={i} style={{ 
                  backgroundColor: theme.Color.Base.Surface[2],
                  padding: theme.space['Space.M'],
                  borderRadius: theme.radius['Radius.M'],
                  border: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[3]}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.space['Space.2XS']
                }}>
                  <div style={{ ...itemStyle, ...theme.Type.Readable.Label.S, opacity: 0.5, textTransform: 'uppercase' }}>{item.role}</div>
                  <div style={{ ...itemStyle, ...item.style, color: theme.Color.Base.Content[1] }}>{item.font}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tokens */}
          <div>
            <div style={{ ...itemStyle, fontWeight: 600, marginBottom: theme.space['Space.S'], ...theme.Type.Readable.Label.M, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <Target size={16} /> Tokens
            </div>
            <code style={dataStyle}>Category.Purpose.Context.Level</code>
            <p style={{ ...itemStyle, ...theme.Type.Readable.Body.S, marginTop: theme.space['Space.2XS'] }}>Never use literal values.</p>
          </div>

          {/* Motion */}
          <div>
            <div style={{ ...itemStyle, fontWeight: 600, marginBottom: theme.space['Space.S'], ...theme.Type.Readable.Label.M, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <Lightning size={16} /> Motion
            </div>
            <div style={{ display: 'flex', gap: theme.space['Space.XL'] }}>
              <div>
                <div style={{ ...theme.Type.Readable.Label.S, opacity: 0.5 }}>BASE</div>
                <div style={{ ...theme.Type.Readable.Body.L }}>100ms</div>
              </div>
              <div>
                <div style={{ ...theme.Type.Readable.Label.S, opacity: 0.5 }}>DEFAULT</div>
                <div style={{ ...theme.Type.Readable.Body.L }}>300ms</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.S'] }}>
          {['README.md', 'noteBook.md', 'bugReport.md'].map((file, i) => (
            <div key={i} style={{ ...itemStyle, alignItems: 'center' }}>
              <div style={{ width: theme.space['Space.S'], height: theme.space['Space.S'], borderRadius: '50%', backgroundColor: theme.Color.Base.Content[1] }} />
              {file}
            </div>
          ))}
        </div>
        <div style={quoteStyle}>
          "Never overwrite previous entries."
        </div>
      </section>

      {/* Safety Rules */}
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <Check size={20} weight="bold" />
          SAFETY RULES
        </div>
        <p style={{ ...itemStyle, ...theme.Type.Readable.Body.S, opacity: 0.7 }}>When change, write, update code (inside target file):</p>
        <ul style={listStyle}>
          {[
            "Track errors.",
            "Add tiny comments.",
            "Explain what changed.",
            "Keep code clean.",
            "Touch only needed code."
          ].map((rule, i) => (
            <motion.li 
              key={i} 
              style={itemStyle}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div style={{ color: theme.Color.Base.Content[1], fontWeight: 600 }}>{i + 1}.</div>
              {rule}
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Footer Actions */}
      <div style={{ padding: theme.space['Space.XL'], display: 'flex', justifyContent: 'center' }}>
        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.space['Space.S'],
            padding: `${theme.space['Space.M']} ${theme.space['Space.XL']}`,
            borderRadius: theme.radius['Radius.M'],
            border: 'none',
            backgroundColor: theme.Color.Base.Content[1],
            color: theme.Color.Base.Surface[1],
            ...theme.Type.Readable.Title.L,
            cursor: 'pointer',
            boxShadow: theme.effects['Effect.Shadow.Drop.2'],
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
