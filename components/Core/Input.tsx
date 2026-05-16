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
    height: '42px',
    padding: `0 ${theme.spacing['Space.M']}`,
    borderRadius: theme.radius['Radius.S'],
    border: `1px solid ${theme.Color.Base.Surface[3]}`,
    backgroundColor: theme.Color.Base.Surface[1],
    color: theme.Color.Base.Content[1],
    fontFamily: theme.Type.Readable.Body.M.fontFamily,
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  return (
    <div onPointerDown={(e) => e.stopPropagation()}>
      <label style={{ 
        ...theme.Type.Readable.Label.S, 
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'block', 
        marginBottom: '6px', 
        color: theme.Color.Base.Content[2],
        opacity: 0.8
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
