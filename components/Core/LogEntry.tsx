/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useTheme } from '../../Theme.tsx';
import { LogEntry as LogEntryType } from '../../types/index.tsx';

interface LogEntryProps {
  log: LogEntryType;
}

const LogEntry: React.FC<LogEntryProps> = ({ log }) => {
  const { theme } = useTheme();

  const getLogColor = (msg: string) => {
    const lower = msg ? msg.toLowerCase() : '';
    
    // Error
    if (lower.includes('error') || lower.includes('failed')) {
        return theme.Color.Error.Content[1];
    }
    
    // Warning
    if (lower.includes('warning') || lower.includes('warn')) {
        return theme.Color.Warning.Content[1];
    }
    
    // Success / Actions
    if (lower.includes('clicked') || lower.includes('triggered') || lower.includes('performed') || lower.includes('success')) {
        return theme.Color.Success.Content[1];
    }
    
    // Signal / Info / Updates
    if (lower.includes('updated') || lower.includes('toggled') || lower.includes('copied') || lower.includes('changed') || lower.includes('ready')) {
        return theme.Color.Signal.Content[1];
    }

    // Default
    return theme.Color.Base.Content[1];
  };

  // Extract 'tag' to avoid passing invalid CSS property to the div
  const { tag, ...typeStyles } = theme.Type.Expressive.Data;

  return (
    <div style={{ 
        display: 'flex', 
        gap: '12px', 
        alignItems: 'flex-start',
        padding: '4px 0',
        borderBottom: `1px solid ${theme.Color.Base.Surface[3]}33`, // Subtle separator
        ...typeStyles, 
        fontSize: '11px', 
        lineHeight: '1.6',
        width: '100%'
    }}>
      <span style={{ 
          color: theme.Color.Base.Content[3], 
          flexShrink: 0, 
          opacity: 0.6,
          fontVariantNumeric: 'tabular-nums' 
      }}>
          {log.timestamp}
      </span>
      <span style={{ 
          color: getLogColor(log.message), 
          wordBreak: 'break-word',
          flex: 1
      }}>
          {log.message}
      </span>
    </div>
  );
};

export default LogEntry;