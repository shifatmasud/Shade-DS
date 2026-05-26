/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useTheme } from '../../Theme.tsx';

interface InputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  style?: React.CSSProperties;
}

const Input: React.FC<InputProps> = ({ label, value, onChange, type = 'text', style }) => {
  const { theme } = useTheme();

  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    height: theme.height['Height.M'],
    padding: `0 ${theme.space['Space.M']}`,
    borderRadius: theme.radius['Radius.S'],
    border: `${theme.border['Border.Width.Main']} ${theme.border['Border.Style.Main']} ${theme.Color.Base.Surface[3]}`,
    backgroundColor: theme.Color.Base.Surface[1],
    color: theme.Color.Base.Content[1],
    ...theme.Type.Readable.Body.M,
    outline: 'none',
    transition: `all ${theme.time['Time.2x']} ease`,
  };

  return (
    <div onPointerDown={(e) => e.stopPropagation()}>
      <label style={{ 
        ...theme.Type.Readable.Label.S, 
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'block', 
        marginBottom: theme.space['Space.XS'], 
        color: theme.Color.Base.Content[2],
        opacity: theme.opacity['Opacity.High']
      }}>
        {label}
      </label>
      <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        style={{ ...baseInputStyle, ...style }} 
        onFocus={(e) => e.currentTarget.style.borderColor = theme.Color.Base.Content[1]}
        onBlur={(e) => e.currentTarget.style.borderColor = theme.Color.Base.Surface[3]}
      />
    </div>
  );
};

export default Input;
