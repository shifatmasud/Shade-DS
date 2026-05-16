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
    // UPDATED: Height 44px, full rounded (Pill style), premium surface color
    // To undo: Change height to auto/32px, borderRadius to Radius.S, bg to Surface[1]
    width: '100%',
    height: '44px',
    padding: `0 ${theme.spacing['Space.M']}`,
    borderRadius: theme.radius['Radius.Full'],
    border: `1px solid ${theme.Color.Base.Surface[3]}`,
    backgroundColor: theme.Color.Base.Surface[2],
    color: theme.Color.Base.Content[1],
    fontFamily: theme.Type.Readable.Body.M.fontFamily,
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
  };

  return (
    <div onPointerDown={(e) => e.stopPropagation()}>
      <label style={{ ...theme.Type.Readable.Label.S, display: 'block', marginBottom: theme.spacing['Space.S'], color: theme.Color.Base.Content[2] }}>
        {label}
      </label>
      <input type={type} value={value} onChange={onChange} style={{ ...baseInputStyle, ...style }} />
    </div>
  );
};

export default Input;
