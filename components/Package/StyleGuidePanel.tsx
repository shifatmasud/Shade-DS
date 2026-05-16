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
    <div style={{ marginBottom: theme.space['Space.XL'] }}>
      <h3 style={{ 
        ...theme.Type.Readable.Title.S, 
        color: theme.Color.Base.Content[3],
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: theme.space['Space.M'],
        borderBottom: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[3]}`,
        paddingBottom: theme.space['Space.XS']
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
        {children}
      </div>
    </div>
  );

  const TokenRow = ({ label, value, preview }: { label: string; value: string; preview?: React.ReactNode; key?: string }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: theme.space['Space.S'],
      backgroundColor: theme.Color.Base.Surface[2],
      borderRadius: theme.radius['Radius.M'],
      border: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[3]}`
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...theme.Type.Readable.Label.M, color: theme.Color.Base.Content[1] }}>{label}</span>
        <span style={{ ...theme.Type.Expressive.Data, color: theme.Color.Base.Content[3], fontSize: theme.Type.Readable.Label.S.fontSize }}>{value}</span>
      </div>
      {preview && <div>{preview}</div>}
    </div>
  );

  const TimePreview = ({ duration }: { duration: string }) => {
    const ms = parseInt(duration) || 0;
    return (
      <div style={{ 
        width: theme.space['Space.11XL'] || 150, 
        height: theme.space['Space.XS'], 
        backgroundColor: theme.Color.Base.Surface[3], 
        borderRadius: theme.radius['Radius.Full'], 
        overflow: 'hidden',
        position: 'relative',
      }}>
        <motion.div
          initial={{ left: `calc(-1 * ${theme.space['Space.S']})` }}
          animate={{ left: "100%" }}
          transition={{ 
            duration: ms / 1000, 
            ease: "linear", 
            repeat: Infinity 
          }}
          style={{
            position: 'absolute',
            top: 0,
            width: theme.space['Space.S'],
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${theme.Color.Accent.Surface[1]}, transparent)`,
            boxShadow: `0 0 12px ${theme.Color.Accent.Surface[1]}`,
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: theme.space['Space.L'], height: '100%', overflowY: 'auto' }}>
      <Section title="Colors">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.space['Space.S'] }}>
          {Object.entries(theme.Color).map(([category, types]) => (
            Object.entries(types).map(([type, levels]) => (
              Object.entries(levels as any).map(([level, value]) => (
                <TokenRow 
                  key={`${category}.${type}.${level}`}
                  label={`${category}.${type}.${level}`}
                  value={value as string}
                  preview={<div style={{ width: theme.space['Space.XL'], height: theme.space['Space.XL'], borderRadius: theme.radius['Radius.S'], backgroundColor: value as string, border: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[3]}` }} />}
                />
              ))
            ))
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.L'] }}>
          {/* Expressive */}
          <div>
            <h4 style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3], marginBottom: theme.space['Space.S'] }}>Expressive</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
               {Object.entries(theme.Type.Expressive).map(([name, style]: [string, any]) => {
                 if (name === 'Display' || name === 'Headline') {
                    return Object.entries(style).map(([size, s]: [string, any]) => (
                        <div key={`expressive-${name}-${size}`} style={{ padding: theme.space['Space.M'], backgroundColor: theme.Color.Base.Surface[2], borderRadius: theme.radius['Radius.M'] }}>
                            <div style={{ ...s, color: theme.Color.Base.Content[1], marginBottom: theme.space['Space.XS'] }}>{name} {size}</div>
                            <div style={{ ...theme.Type.Expressive.Data, fontSize: theme.Type.Readable.Label.S.fontSize, color: theme.Color.Base.Content[3] }}>
                                {s.fontFamily} | {typeof s.fontSize === 'object' ? s.fontSize.desktop : s.fontSize} | {s.fontWeight}
                            </div>
                        </div>
                    ));
                 }
                 return (
                    <div key={`expressive-${name}`} style={{ padding: theme.space['Space.M'], backgroundColor: theme.Color.Base.Surface[2], borderRadius: theme.radius['Radius.M'] }}>
                        <div style={{ ...style, color: theme.Color.Base.Content[1], marginBottom: theme.space['Space.XS'] }}>{name} Sample</div>
                        <div style={{ ...theme.Type.Expressive.Data, fontSize: theme.Type.Readable.Label.S.fontSize, color: theme.Color.Base.Content[3] }}>
                            {style.fontFamily} | {style.fontSize} | {style.fontWeight}
                        </div>
                    </div>
                 );
               })}
            </div>
          </div>

          {/* Readable */}
          <div>
            <h4 style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3], marginBottom: theme.space['Space.S'] }}>Readable</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
               {Object.entries(theme.Type.Readable).map(([name, style]: [string, any]) => (
                  Object.entries(style).map(([size, s]: [string, any]) => (
                    <div key={`readable-${name}-${size}`} style={{ padding: theme.space['Space.M'], backgroundColor: theme.Color.Base.Surface[2], borderRadius: theme.radius['Radius.M'] }}>
                        <div style={{ ...s, color: theme.Color.Base.Content[1], marginBottom: theme.space['Space.XS'] }}>{name} {size}</div>
                        <div style={{ ...theme.Type.Expressive.Data, fontSize: theme.Type.Readable.Label.S.fontSize, color: theme.Color.Base.Content[3] }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.space['Space.S'] }}>
          {Object.entries(theme.space).map(([name, value]) => (
            <TokenRow 
              key={name}
              label={name}
              value={value as string}
              preview={<div style={{ width: value as string, height: theme.space['Space.S'], backgroundColor: theme.Color.Accent.Surface[1], borderRadius: theme.radius['Radius.S'] }} />}
            />
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.space['Space.S'] }}>
          {Object.entries(theme.radius).map(([name, value]) => (
            <TokenRow 
              key={name}
              label={name}
              value={value as string}
              preview={<div style={{ width: theme.space['Space.XL'], height: theme.space['Space.XL'], borderRadius: value as string, border: `${theme.border['Border.Width.Thick']} solid ${theme.Color.Accent.Surface[1]}` }} />}
            />
          ))}
        </div>
      </Section>

      <Section title="Time">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: theme.space['Space.S'] }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.S'] }}>
          {Object.entries(theme.effects).map(([name, value]) => (
            <TokenRow 
              key={name}
              label={name}
              value={value as string}
              preview={<div style={{ width: theme.space['Space.3XL'], height: theme.space['Space.XL'], borderRadius: theme.radius['Radius.S'], backgroundColor: theme.Color.Base.Surface[1], boxShadow: value as string }} />}
            />
          ))}
        </div>
      </Section>
    </div>
  );
};

export default StyleGuidePanel;
