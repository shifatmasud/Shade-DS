/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

const StyleGuidePanel: React.FC = () => {
  const { theme } = useTheme();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: theme.spacing['Space.XL'] }}>
      <h3 style={{ 
        ...theme.Type.Readable.Title.S, 
        color: theme.Color.Base.Content[3],
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: theme.spacing['Space.M'],
        borderBottom: `1px solid ${theme.Color.Base.Surface[3]}`,
        paddingBottom: theme.spacing['Space.XS']
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
        {children}
      </div>
    </div>
  );

  const TokenRow = ({ label, value, preview }: { label: string; value: string; preview?: React.ReactNode; key?: string }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: theme.spacing['Space.S'],
      backgroundColor: theme.Color.Base.Surface[2],
      borderRadius: theme.radius['Radius.M'],
      border: `1px solid ${theme.Color.Base.Surface[3]}`
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...theme.Type.Readable.Label.M, color: theme.Color.Base.Content[1] }}>{label}</span>
        <span style={{ ...theme.Type.Readable.Data, color: theme.Color.Base.Content[3], fontSize: '10px' }}>{value}</span>
      </div>
      {preview && <div>{preview}</div>}
    </div>
  );

  const TimePreview = ({ duration }: { duration: string }) => {
    const ms = parseInt(duration) || 0;
    return (
      <div style={{ 
        width: 150, 
        height: 4, 
        backgroundColor: theme.Color.Base.Surface[3], 
        borderRadius: theme.radius['Radius.Full'], 
        overflow: 'hidden',
        position: 'relative',
      }}>
        <motion.div
          initial={{ left: "-8px" }}
          animate={{ left: "100%" }}
          transition={{ 
            duration: ms / 1000, 
            ease: "linear", 
            repeat: Infinity 
          }}
          style={{
            position: 'absolute',
            top: 0,
            width: '8px',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${theme.Color.Accent.Surface[1]}, transparent)`,
            boxShadow: `0 0 12px ${theme.Color.Accent.Surface[1]}`,
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: theme.spacing['Space.L'], height: '100%', overflowY: 'auto' }}>
      <Section title="Colors">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing['Space.S'] }}>
          {Object.entries(theme.Color).map(([category, types]) => (
            Object.entries(types).map(([type, levels]) => (
              Object.entries(levels as any).map(([level, value]) => (
                <TokenRow 
                  key={`${category}.${type}.${level}`}
                  label={`${category}.${type}.${level}`}
                  value={value as string}
                  preview={<div style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: value as string, border: `1px solid ${theme.Color.Base.Surface[3]}` }} />}
                />
              ))
            ))
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.L'] }}>
          {/* Expressive */}
          <div>
            <h4 style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3], marginBottom: theme.spacing['Space.S'] }}>Expressive</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
               {Object.entries(theme.Type.Expressive).map(([name, style]: [string, any]) => {
                 if (name === 'Display' || name === 'Headline') {
                    return Object.entries(style).map(([size, s]: [string, any]) => (
                        <div key={`expressive-${name}-${size}`} style={{ padding: theme.spacing['Space.M'], backgroundColor: theme.Color.Base.Surface[2], borderRadius: theme.radius['Radius.M'] }}>
                            <div style={{ ...s, color: theme.Color.Base.Content[1], marginBottom: theme.spacing['Space.XS'] }}>{name} {size}</div>
                            <div style={{ ...theme.Type.Readable.Data, fontSize: '10px', color: theme.Color.Base.Content[3] }}>
                                {s.fontFamily} | {typeof s.fontSize === 'object' ? s.fontSize.desktop : s.fontSize} | {s.fontWeight}
                            </div>
                        </div>
                    ));
                 }
                 return (
                    <div key={`expressive-${name}`} style={{ padding: theme.spacing['Space.M'], backgroundColor: theme.Color.Base.Surface[2], borderRadius: theme.radius['Radius.M'] }}>
                        <div style={{ ...style, color: theme.Color.Base.Content[1], marginBottom: theme.spacing['Space.XS'] }}>{name} Sample</div>
                        <div style={{ ...theme.Type.Readable.Data, fontSize: '10px', color: theme.Color.Base.Content[3] }}>
                            {style.fontFamily} | {style.fontSize} | {style.fontWeight}
                        </div>
                    </div>
                 );
               })}
            </div>
          </div>

          {/* Readable */}
          <div>
            <h4 style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3], marginBottom: theme.spacing['Space.S'] }}>Readable</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
               {Object.entries(theme.Type.Readable).map(([name, style]: [string, any]) => (
                  Object.entries(style).map(([size, s]: [string, any]) => (
                    <div key={`readable-${name}-${size}`} style={{ padding: theme.spacing['Space.M'], backgroundColor: theme.Color.Base.Surface[2], borderRadius: theme.radius['Radius.M'] }}>
                        <div style={{ ...s, color: theme.Color.Base.Content[1], marginBottom: theme.spacing['Space.XS'] }}>{name} {size}</div>
                        <div style={{ ...theme.Type.Readable.Data, fontSize: '10px', color: theme.Color.Base.Content[3] }}>
                            {s.fontFamily} | {typeof s.fontSize === 'object' ? s.fontSize.desktop : s.fontSize} | {s.fontWeight}
                        </div>
                    </div>
                  ))
               ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Space">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing['Space.S'] }}>
          {Object.entries(theme.spacing).map(([name, value]) => (
            <TokenRow 
              key={name}
              label={name}
              value={value as string}
              preview={<div style={{ width: value as string, height: 8, backgroundColor: theme.Color.Accent.Surface[1], borderRadius: 2 }} />}
            />
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing['Space.S'] }}>
          {Object.entries(theme.radius).map(([name, value]) => (
            <TokenRow 
              key={name}
              label={name}
              value={value as string}
              preview={<div style={{ width: 24, height: 24, borderRadius: value as string, border: `2px solid ${theme.Color.Accent.Surface[1]}` }} />}
            />
          ))}
        </div>
      </Section>

      <Section title="Time">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: theme.spacing['Space.S'] }}>
          {Object.entries(theme.time).map(([name, value]) => (
            <TokenRow 
              key={name}
              label={name}
              value={value as string}
              preview={<TimePreview duration={value as string} />}
            />
          ))}
        </div>
      </Section>

      <Section title="Effects">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.S'] }}>
          {Object.entries(theme.effects).map(([name, value]) => (
            <TokenRow 
              key={name}
              label={name}
              value={value as string}
              preview={<div style={{ width: 40, height: 24, borderRadius: 4, backgroundColor: theme.Color.Base.Surface[1], boxShadow: value as string }} />}
            />
          ))}
        </div>
      </Section>
    </div>
  );
};

export default StyleGuidePanel;
