/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { useTheme } from '../../Theme.tsx';
import { Eye, EyeSlash, FloppyDisk, Check } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApiInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
  placeholder?: string;
}

const ApiInput: React.FC<ApiInputProps> = ({ 
  label, 
  value, 
  onChange, 
  onSave, 
  placeholder = "Enter API Key..." 
}) => {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onSave(value);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <label style={{ 
        ...theme.Type.Readable.Label.S, 
        color: theme.Color.Base.Content[3],
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 600
      }}>
        {label}
      </label>
      
      <div style={{ 
        display: 'flex', 
        gap: '4px',
        alignItems: 'center',
        backgroundColor: theme.Color.Base.Surface[2],
        borderRadius: theme.radius['Radius.M'],
        padding: '4px',
        border: `1px solid ${theme.Color.Base.Surface[3]}`,
      }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            type={isVisible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '8px 12px',
              color: theme.Color.Base.Content[1],
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          />
          <button
            onClick={() => setIsVisible(!isVisible)}
            style={{
              position: 'absolute',
              right: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme.Color.Base.Content[3],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
          >
            {isVisible ? <EyeSlash size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <button
          onClick={handleSave}
          style={{
            height: '32px',
            padding: '0 12px',
            borderRadius: theme.radius['Radius.S'],
            backgroundColor: isSaved ? theme.Color.Success.Surface[1] : theme.Color.Base.Content[1],
            color: isSaved ? theme.Color.Success.Content[1] : theme.Color.Base.Surface[1],
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <AnimatePresence mode="wait">
            {isSaved ? (
              <motion.div
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Check size={14} weight="bold" />
                <span style={{ fontSize: '10px', fontWeight: 700 }}>SAVED</span>
              </motion.div>
            ) : (
              <motion.div
                key="save"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FloppyDisk size={14} weight="bold" />
                <span style={{ fontSize: '10px', fontWeight: 700 }}>SAVE</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
};

export default ApiInput;
