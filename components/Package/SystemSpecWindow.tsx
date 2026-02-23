/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { Copy, Check, Info, Play, Shield, Cpu, Palette, FileText } from 'phosphor-react';

const SYSTEM_SPEC_MARKDOWN = `# System Spec

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

const SystemSpecWindow = () => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SYSTEM_SPEC_MARKDOWN);
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

  const titleStyle: React.CSSProperties = {
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: '24px',
    letterSpacing: '0.05em',
    color: theme.Color.Base.Content[1],
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing['Space.S'],
  };

  const listStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing['Space.S'],
  };

  const itemStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    color: theme.Color.Base.Content[2],
    display: 'flex',
    gap: theme.spacing['Space.S'],
  };

  const badgeStyle: React.CSSProperties = {
    fontFamily: 'Victor Mono, monospace',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
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
        padding: theme.spacing['Space.M'], 
        borderBottom: `1px solid ${theme.Color.Base.Surface[3]}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        backgroundColor: theme.Color.Base.Surface[1],
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing['Space.S'] }}>
          <Shield size={20} weight="fill" color={theme.Color.Focus.Content[1]} />
          <span style={{ fontFamily: 'Bebas Neue', fontSize: '18px' }}>System Protocol v1.0</span>
        </div>
        <button 
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: `1px solid ${theme.Color.Base.Surface[3]}`,
            backgroundColor: theme.Color.Base.Surface[2],
            color: theme.Color.Base.Content[1],
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'Inter',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy Markdown'}
        </button>
      </div>

      {/* Core Rules */}
      <section style={sectionStyle}>
        <h2 style={titleStyle}><Info size={20} /> Core Rules</h2>
        <ul style={listStyle}>
          {[
            "Hide complexity until desired.",
            "Write Compact Helpful copy (EL5 mode).",
            "One primary focus at a time.",
            "Design Mobile-first always.",
            "Stability > Performance > Usability > Aesthetic."
          ].map((rule, i) => (
            <motion.li 
              key={i} 
              style={itemStyle}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <span style={{ color: theme.Color.Focus.Content[1], fontWeight: 'bold' }}>0{i+1}</span>
              {rule}
            </motion.li>
          ))}
        </ul>
        
        {/* Visual: Complexity Slider Animation */}
        <div style={{ 
          height: '60px', 
          backgroundColor: theme.Color.Base.Surface[2], 
          borderRadius: '8px',
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <motion.div 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              border: `2px solid ${theme.Color.Focus.Content[1]}`,
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
            <div style={{ width: '4px', height: '4px', backgroundColor: theme.Color.Focus.Content[1], borderRadius: '50%' }} />
          </motion.div>
          <div style={{ position: 'absolute', bottom: 4, fontSize: '8px', fontFamily: 'Victor Mono', opacity: 0.5 }}>
            AUTO_ABSTRACTION_ACTIVE
          </div>
        </div>
      </section>

      {/* Execution Rules */}
      <section style={sectionStyle}>
        <h2 style={titleStyle}><Play size={20} /> Execution Rules</h2>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          {['Summary', 'Architecture', 'Action List'].map((step, i) => (
            <div key={i} style={{ 
              flex: 1, 
              padding: '10px', 
              backgroundColor: theme.Color.Base.Surface[2], 
              borderRadius: '6px',
              border: `1px solid ${theme.Color.Base.Surface[3]}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', fontFamily: 'Victor Mono', opacity: 0.5, marginBottom: '4px' }}>STEP 0{i+1}</div>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>{step}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Engineering Rules */}
      <section style={sectionStyle}>
        <h2 style={titleStyle}><Cpu size={20} /> Engineering Rules</h2>
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
            <li key={i} style={itemStyle}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: theme.Color.Focus.Content[1], marginTop: '6px' }} />
              {rule}
            </li>
          ))}
        </ul>
        
        {/* Visual: Reactive Flow Animation */}
        <div style={{ 
          height: '80px', 
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px'
        }}>
          {[1, 2, 3, 4].map((node) => (
            <React.Fragment key={node}>
              <motion.div 
                style={{ width: '12px', height: '12px', backgroundColor: theme.Color.Focus.Content[1], borderRadius: '2px' }}
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
        <h2 style={titleStyle}><Palette size={20} /> Design Rules</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={badgeStyle}>Typography</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '20px' }}>BEBAS NEUE</div>
            <div style={{ fontFamily: 'Inter', fontSize: '12px' }}>Inter Body</div>
            <div style={{ fontFamily: 'Victor Mono', fontSize: '10px' }}>Victor Mono Data</div>
            <div style={{ fontFamily: 'Comic Neue', fontSize: '12px', fontStyle: 'italic' }}>"Comic Quotes"</div>
          </div>
          <div>
            <div style={badgeStyle}>Motion</div>
            <div style={{ fontSize: '12px' }}>Base: 100ms</div>
            <div style={{ fontSize: '12px' }}>Default: 300ms</div>
            <div style={{ fontSize: '12px' }}>Grid: 4pt system</div>
          </div>
        </div>

        <div style={{ marginTop: '12px' }}>
          <div style={badgeStyle}>Tokens</div>
          <code style={{ 
            display: 'block', 
            padding: '8px', 
            backgroundColor: theme.Color.Base.Surface[3], 
            borderRadius: '4px',
            fontSize: '11px',
            marginTop: '4px',
            fontFamily: 'Victor Mono'
          }}>
            Category.Purpose.Context.Level
          </code>
        </div>
      </section>

      {/* Documentation Rules */}
      <section style={{ ...sectionStyle, borderBottom: 'none', paddingBottom: '40px' }}>
        <h2 style={titleStyle}><FileText size={20} /> Documentation Rules</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['README.md', 'noteBook.md', 'bugReport.md'].map((file) => (
            <div key={file} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              padding: '10px',
              backgroundColor: theme.Color.Base.Surface[2],
              borderRadius: '6px',
              border: `1px solid ${theme.Color.Base.Surface[3]}`
            }}>
              <FileText size={16} />
              <span style={{ fontSize: '13px', fontFamily: 'Victor Mono' }}>{file}</span>
              <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#10b981' }}>PERSISTENT</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SystemSpecWindow;
