/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../Theme.tsx';
import { LogEntry as LogEntryType } from '../../types/index.tsx';
import LogEntry from '../Core/LogEntry.tsx';

interface ConsolePanelProps {
  logs: LogEntryType[];
}

const ConsolePanel: React.FC<ConsolePanelProps> = ({ logs }) => {
  const { theme } = useTheme();
  const [completedLogs, setCompletedLogs] = useState<Record<string, boolean>>({});

  // Keep completedLogs state in sync with existing logs list
  useEffect(() => {
    if (logs.length === 0) {
      setCompletedLogs({});
    } else {
      const logIds = new Set(logs.map(l => l.id));
      setCompletedLogs(prev => {
        let hasOrphan = false;
        const cleaned: Record<string, boolean> = {};
        for (const id in prev) {
          if (logIds.has(id)) {
            cleaned[id] = true;
          } else {
            hasOrphan = true;
          }
        }
        return hasOrphan ? cleaned : prev;
      });
    }
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
              padding: theme.space['Space.S'],
              textAlign: 'center',
              marginTop: theme.space['Space.M']
          }}>
            Waiting for system events...
          </div>
      )}
      
      {logs.map((log, index) => {
        const isPreviousComplete = index === 0 || !!completedLogs[logs[index - 1].id];
        return (
          <LogEntry 
            key={log.id} 
            log={log} 
            active={isPreviousComplete}
            onComplete={() => {
              setCompletedLogs(prev => {
                if (prev[log.id]) return prev;
                return { ...prev, [log.id]: true };
              });
            }}
          />
        );
      })}
    </div>
  );
};

export default React.memo(ConsolePanel);