import React from 'react';
import { useTheme } from '../../Theme';

const StyleManagerPanel: React.FC = () => {
  const { theme } = useTheme();

  const renderColorSwatches = (colors: Record<string, string>, title: string) => (
    <div>
      <h4 style={{ ...theme.Type.Readable.Title.S, color: theme.Color.Base.Content[2], marginTop: 0 }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: theme.space['Space.M'] }}>
        {Object.entries(colors).map(([name, value]) => (
          <div key={name}>
            <div style={{ width: '100%', paddingTop: '100%', backgroundColor: value, borderRadius: theme.radius['Radius.M'], border: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[3]}` }} />
            <div style={{ textAlign: 'center', marginTop: theme.space['Space.S'] }}>
              <p style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[1], margin: 0 }}>{name}</p>
              <p style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2], margin: 0 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTypographySample = (style: any, name: string) => (
    <div style={{ borderBottom: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[2]}`, padding: `${theme.space['Space.M']} 0` }}>
      <p style={{ ...style, margin: 0 }}>{name}</p>
      <p style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2], margin: `${theme.space['Space.XS']} 0 0` }}>
        {style.fontSize} / {style.lineHeight} / {style.fontWeight} / {style.letterSpacing}
      </p>
    </div>
  );

  const renderSpacingSample = (name: string, value: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.M'], padding: `${theme.space['Space.S']} 0` }}>
      <div style={{ width: theme.space['Space.10XL'] || '120px' }}>
        <p style={{ ...theme.Type.Readable.Label.M, margin: 0 }}>{name}</p>
        <p style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2], margin: 0 }}>{value}</p>
      </div>
      <div style={{ flex: 1, height: theme.space['Space.XL'], display: 'flex', alignItems: 'center' }}>
        <div style={{ width: value, height: '100%', backgroundColor: theme.Color.Base.Surface[3] }} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: theme.space['Space.L'], color: theme.Color.Base.Content[1] }}>
      <h3 style={{ ...theme.Type.Readable.Title.L, marginTop: 0 }}>Style Manager</h3>
      
      <div style={{ marginBottom: theme.space['Space.XL'] }}>
        <h4 style={{ ...theme.Type.Readable.Title.M, color: theme.Color.Base.Content[1] }}>Colors</h4>
        {renderColorSwatches(theme.Color.Base.Surface, 'Base Surface')}
        {renderColorSwatches(theme.Color.Base.Content, 'Base Content')}
        {renderColorSwatches(theme.Color.Accent.Surface, 'Accent Surface')}
        {renderColorSwatches(theme.Color.Accent.Content, 'Accent Content')}
      </div>

      <div style={{ marginBottom: theme.space['Space.XL'] }}>
        <h4 style={{ ...theme.Type.Readable.Title.M, color: theme.Color.Base.Content[1] }}>Typography</h4>
        {renderTypographySample(theme.Type.Expressive.Display.L, 'Display L')}
        {renderTypographySample(theme.Type.Expressive.Display.M, 'Display M')}
        {renderTypographySample(theme.Type.Expressive.Headline.L, 'Headline L')}
        {renderTypographySample(theme.Type.Readable.Title.L, 'Title L')}
        {renderTypographySample(theme.Type.Readable.Body.L, 'Body L')}
        {renderTypographySample(theme.Type.Readable.Label.M, 'Label M')}
      </div>

      <div style={{ marginBottom: theme.space['Space.XL'] }}>
        <h4 style={{ ...theme.Type.Readable.Title.M, color: theme.Color.Base.Content[1] }}>Spacing</h4>
        {Object.entries(theme.space).map(([name, value]) => renderSpacingSample(name, value as string))}
      </div>

    </div>
  );
};

export default StyleManagerPanel;
