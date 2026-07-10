/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { Info, Play, Shield, Cpu, Palette, FileText } from 'phosphor-react';
import { AnimatedCopyIcon } from '../Core/AnimatedCopyIcon.tsx';

const SYSTEM_SPEC_MARKDOWN = `# System Spec

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
2. No CSS keyframes. Use Framer Motion.
3. GSAP only for Three.js & external timelines.
4. Mobile gestures replace hover (touch drag = mouse move).
5. No native OS UI components. Use custom components.
6. Modular Components folder structure: Core → Package → Section → Page → App.
7. Always strictly follow and use design tokens from Theme.tsx.
8. Reactive Architecture: [Realtime API] & Events → FSM → Event Bus → Store → Observer → Renderer

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

Never overwrite previous entries.`;

const SystemSpecWindow = () => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SYSTEM_SPEC_MARKDOWN);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  };

  const sectionStyle: React.CSSProperties = {
    padding: theme.space['Space.L'],
    borderBottom: `1px solid ${theme.Color.Base.Surface[3]}`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.M'],
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: theme.Type.Expressive.Headline.S.fontSize,
    letterSpacing: '0.05em',
    color: theme.Color.Base.Content[1],
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: theme.space['Space.S'],
  };

  const listStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.S'],
  };

  const itemStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: theme.Type.Readable.Body.M.fontSize,
    lineHeight: '1.5',
    color: theme.Color.Base.Content[2],
    display: 'flex',
    gap: theme.space['Space.S'],
  };

  const badgeStyle: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: theme.Type.Readable.Label.S.fontSize,
    padding: `${theme.space['Space.2XS']} ${theme.space['Space.XS']}`,
    borderRadius: theme.radius['Radius.S'],
    backgroundColor: theme.Color.Base.Surface[3],
    color: theme.Color.Base.Content[3],
    textTransform: 'uppercase',
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: theme.Color.Base.Surface[1],
      color: theme.Color.Base.Content[1],
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {/* Header with Copy Button */}
      <div style={{ 
        padding: theme.space['Space.M'], 
        borderBottom: `1px solid ${theme.Color.Base.Surface[3]}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        backgroundColor: theme.Color.Base.Surface[1],
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.S'] }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ display: 'flex' }}
          >
            <Shield size={20} weight="fill" color={theme.Color.Focus.Content[1]} />
          </motion.div>
          <span style={{ fontFamily: 'Bebas Neue', fontSize: theme.Type.Readable.Title.L.fontSize }}>System Protocol v1.0</span>
        </div>
        <motion.button 
          onClick={handleCopy}
          whileHover={{ scale: 1.05, backgroundColor: theme.Color.Base.Surface[3] }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.space['Space.XS'],
            padding: `${theme.space['Space.XS']} ${theme.space['Space.M']}`,
            borderRadius: theme.radius['Radius.S'],
            ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
            backgroundColor: theme.Color.Base.Surface[2],
            color: theme.Color.Base.Content[1],
            cursor: 'pointer',
            fontSize: theme.Type.Readable.Label.M.fontSize,
            fontFamily: 'Inter',
            transition: 'background-color 0.2s ease, border-color 0.2s ease',
          }}
        >
          <AnimatedCopyIcon isCopied={copied} />
          {copied ? 'Copied!' : 'Copy Markdown'}
        </motion.button>
      </div>

      {/* Core Rules */}
      <section style={sectionStyle}>
        <h2 style={titleStyle}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ display: 'flex' }}
          >
            <Info size={20} />
          </motion.div>
          Core Rules
        </h2>
        <ul style={listStyle}>
          {[
            "Hide complexity until desired.",
            "Write Compact Helpful copy (EL5 mode).",
            "One primary focus at a time.",
            "Design Adaptive always.",
            "Stability > Performance > Usability > Aesthetic."
          ].map((rule, i) => (
            <motion.li 
              key={i} 
              style={itemStyle}
              initial={{ opacity: 0, x: -10, filter: 'blur(2px)' }}
              whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <span style={{ color: theme.Color.Focus.Content[1], fontWeight: 'bold' }}>0{i+1}</span>
              {rule}
            </motion.li>
          ))}
        </ul>
        
        {/* Visual: Complexity Slider Animation */}
        <div style={{ 
          height: theme.space['Space.7XL'], 
          backgroundColor: theme.Color.Base.Surface[2], 
          borderRadius: theme.radius['Radius.M'],
          marginTop: theme.space['Space.S'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <motion.div 
            style={{ 
              width: theme.space['Space.3XL'], 
              height: theme.space['Space.3XL'], 
              borderRadius: '50%', 
              /* 
               * SHADE DSL REWRITE: Replaced 1px solid border with getBorder1px box shadow glow.
               * To undo: replace the spread below with border: `${theme.border['Border.Width.Main']} solid ${theme.Color.Focus.Content[1]}`
               */
              ...theme.border.getBorder1px(theme.Color.Focus.Content[1]),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <div style={{ width: theme.space['Space.XS'], height: theme.space['Space.XS'], backgroundColor: theme.Color.Focus.Content[1], borderRadius: '50%' }} />
          </motion.div>
          <div style={{ position: 'absolute', bottom: theme.space['Space.XS'], fontSize: theme.Type.Readable.Label.S.fontSize, fontFamily: 'JetBrains Mono', opacity: 0.5 }}>
            AUTO_ABSTRACTION_ACTIVE
          </div>
        </div>
      </section>

      {/* Execution Rules */}
      <section style={sectionStyle}>
        <h2 style={titleStyle}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ display: 'flex' }}
          >
            <Play size={20} />
          </motion.div>
          Execution Rules
        </h2>
        <div style={{ display: 'flex', gap: theme.space['Space.S'], marginTop: theme.space['Space.XS'] }}>
          {['Summary', 'Architecture', 'Action List'].map((step, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(2px)' }}
              whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              style={{ 
                flex: 1, 
                padding: theme.space['Space.M'], 
                backgroundColor: theme.Color.Base.Surface[2], 
                borderRadius: theme.radius['Radius.S'],
                ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: theme.Type.Readable.Label.S.fontSize, fontFamily: 'JetBrains Mono', opacity: 0.5, marginBottom: theme.space['Space.XS'] }}>STEP 0{i+1}</div>
              <div style={{ fontSize: theme.Type.Readable.Label.M.fontSize, fontWeight: 600 }}>{step}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Engineering Rules */}
      <section style={sectionStyle}>
        <h2 style={titleStyle}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ display: 'flex' }}
          >
            <Cpu size={20} />
          </motion.div>
          Engineering Rules
        </h2>
        <ul style={listStyle}>
          {[
            "No Tailwind. Use JS style object.",
            "No CSS keyframes. Use Framer Motion.",
            "GSAP only for Three.js.",
            "Mobile gestures replace hover.",
            "No native OS UI components.",
            "Modular Components structure.",
            "Reactive Architecture (FSM/Event Bus)."
          ].map((rule, i) => (
            <motion.li 
              key={i} 
              style={itemStyle}
              initial={{ opacity: 0, x: -5, filter: 'blur(2px)' }}
              whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <div style={{ width: theme.space['Space.XS'], height: theme.space['Space.XS'], borderRadius: '50%', backgroundColor: theme.Color.Focus.Content[1], marginTop: theme.space['Space.XS'] }} />
              {rule}
            </motion.li>
          ))}
        </ul>
        
        {/* Visual: Reactive Flow Animation */}
        <div style={{ 
          height: theme.space['Space.8XL'], 
          marginTop: theme.space['Space.S'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${theme.space['Space.XL']}`
        }}>
          {[1, 2, 3, 4].map((node) => (
            <React.Fragment key={node}>
              <motion.div 
                style={{ width: theme.space['Space.M'], height: theme.space['Space.M'], backgroundColor: theme.Color.Focus.Content[1], borderRadius: theme.radius['Radius.S'] }}
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: node * 0.2 }}
              />
              {node < 4 && (
                <motion.div 
                  style={{ height: '1px', flex: 1, backgroundColor: theme.Color.Base.Surface[3] }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: node * 0.2 }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Design Rules */}
      <section style={sectionStyle}>
        <h2 style={titleStyle}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ display: 'flex' }}
          >
            <Palette size={20} />
          </motion.div>
          Design Rules
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.space['Space.M'] }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(2px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div style={badgeStyle}>Typography</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: theme.Type.Readable.Title.L.fontSize }}>BEBAS NEUE</div>
            <div style={{ fontFamily: 'Inter', fontSize: theme.Type.Readable.Label.M.fontSize }}>Inter Body</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: theme.Type.Readable.Label.S.fontSize }}>JetBrains Mono Data</div>
            <div style={{ fontFamily: 'Cause', fontSize: theme.Type.Readable.Label.M.fontSize, fontStyle: 'italic' }}>"Cause Quotes"</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(2px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div style={badgeStyle}>Motion</div>
            <div style={{ fontSize: theme.Type.Readable.Label.M.fontSize }}>Base: 100ms</div>
            <div style={{ fontSize: theme.Type.Readable.Label.M.fontSize }}>Default: 300ms</div>
            <div style={{ fontSize: theme.Type.Readable.Label.M.fontSize }}>Grid: 4pt system</div>
          </motion.div>
        </div>

        <motion.div 
          style={{ marginTop: theme.space['Space.M'] }}
          initial={{ opacity: 0, y: 5 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div style={badgeStyle}>Tokens</div>
          <code style={{ 
            display: 'block', 
            padding: theme.space['Space.S'], 
            backgroundColor: theme.Color.Base.Surface[3], 
            borderRadius: theme.radius['Radius.S'],
            fontSize: theme.Type.Readable.Label.S.fontSize,
            marginTop: theme.space['Space.XS'],
            fontFamily: 'JetBrains Mono'
          }}>
            Category.Purpose.Context.Level
          </code>
        </motion.div>
      </section>

      {/* Documentation Rules */}
      <section style={{ ...sectionStyle, borderBottom: 'none', paddingBottom: theme.space['Space.3XL'] }}>
        <h2 style={titleStyle}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ display: 'flex' }}
          >
            <FileText size={20} />
          </motion.div>
          Documentation Rules
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.S'] }}>
        {['README.md', 'noteBook.md', 'bugReport.md'].map((file, i) => (
          <motion.div 
            key={file} 
            initial={{ opacity: 0, x: -5, filter: 'blur(1px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: theme.space['Space.M'],
              padding: theme.space['Space.M'],
              backgroundColor: theme.Color.Base.Surface[2],
              borderRadius: theme.radius['Radius.S'],
              ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
            }}
          >
            <FileText size={16} />
            <span style={{ fontSize: theme.Type.Readable.Label.L.fontSize, fontFamily: 'JetBrains Mono' }}>{file}</span>
            <div style={{ marginLeft: 'auto', fontSize: theme.Type.Readable.Label.S.fontSize, color: theme.Color.Success.Content[1] }}>PERSISTENT</div>
          </motion.div>
        ))}
        </div>
      </section>
    </div>
  );
};

export default SystemSpecWindow;
