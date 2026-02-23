/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../Theme.tsx';
import { LogEntry as LogEntryType } from '../../types/index.tsx';
import LogEntry from '../Core/LogEntry.tsx';

interface ConsolePanelProps {
  logs: LogEntryType[];
}

const ConsolePanel: React.FC<ConsolePanelProps> = ({ logs }) => {
  const { theme } = useTheme();
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Clean the token to remove non-style props
  const { tag, ...emptyTextStyle } = theme.Type.Expressive.Data;

  return (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '4px', 
        minHeight: '100px',
        width: '100%'
    }}>
      {logs.length === 0 && (
          <div style={{ 
              ...emptyTextStyle, 
              color: theme.Color.Base.Content[3],
              opacity: 0.5,
              padding: theme.spacing['Space.S'],
              textAlign: 'center',
              marginTop: theme.spacing['Space.M']
          }}>
            Waiting for system events...
          </div>
      )}
      
      {logs.map(log => <LogEntry key={log.id} log={log} />)}
      
      <div ref={endRef} />
    </div>
  );
};

export default ConsolePanel;