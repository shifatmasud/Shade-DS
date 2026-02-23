/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useTheme } from '../../Theme.tsx';

interface TextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: React.CSSProperties;
}

const TextArea: React.FC<TextAreaProps> = ({ value, onChange, onFocus, onBlur, style }) => {
  const { theme } = useTheme();

  const baseStyle: React.CSSProperties = {
    ...theme.Type.Expressive.Data,
    width: '100%',
    minHeight: '200px',
    backgroundColor: theme.Color.Base.Surface[3],
    padding: theme.spacing['Space.M'],
    borderRadius: theme.radius['Radius.M'],
    border: 'none',
    color: theme.Color.Base.Content[1],
    resize: 'none',
    outline: 'none',
  };

  return (
    <textarea
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      spellCheck={false}
      style={{ ...baseStyle, ...style }}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
};

export default TextArea;
