/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../Theme.tsx';
import { useBreakpoint } from '../../hooks/useBreakpoint.tsx';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Trash, 
  ArrowDown, 
  Copy, 
  Check, 
  CircleNotch,
  CaretLeft,
  CaretDown,
  Code
} from 'phosphor-react';

const QUICK_COMMANDS = [
  { label: 'Quick Snippets...', cmd: '' },
  { label: 'git status', cmd: 'git status' },
  { label: 'git log -n 5 --oneline', cmd: 'git log -n 5 --oneline' },
  { label: 'git diff', cmd: 'git diff' },
  { label: 'ls -la', cmd: 'ls -la' },
  { label: 'node -v && npm -v', cmd: 'node -v && npm -v' },
  { label: 'pwd && whoami', cmd: 'pwd && whoami' },
  { label: 'ps aux | head -n 10', cmd: 'ps aux | head -n 10' },
  { label: 'df -h', cmd: 'df -h' },
  { label: 'cat package.json', cmd: 'cat package.json' },
  { label: 'npm run lint', cmd: 'npm run lint' }
];

export const TerminalPage: React.FC = () => {
  const { theme, themeName } = useTheme();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  // Terminal state
  const [logs, setLogs] = useState<string[]>([]);
  const [inputCommand, setInputCommand] = useState('');
  const [cwd, setCwd] = useState<string>('/app/applet');
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  // Command history for ArrowUp / ArrowDown navigation
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial terminal info on mount
  useEffect(() => {
    fetch('/api/terminal/info')
      .then(res => res.json())
      .then(data => {
        if (data.cwd) setCwd(data.cwd);
      })
      .catch(err => console.error("Failed to load terminal info:", err));
  }, []);

  // Connect SSE stream for live real-time output
  useEffect(() => {
    const es = new EventSource('/api/terminal/stream');

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'clear') {
          setLogs([]);
        } else if (payload.data) {
          setLogs(prev => [...prev.slice(-600), payload.data]);
        }
        if (payload.cwd) {
          setCwd(payload.cwd);
        }
      } catch (e) {
        setLogs(prev => [...prev.slice(-600), event.data]);
      }
    };

    es.onerror = () => {
      // Reconnection handled automatically by browser EventSource
    };

    return () => {
      es.close();
    };
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Command execution via workspace bash runner
  const runCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed || isExecuting) return;

    // Track command in history
    setCommandHistory(prev => [...prev.filter(c => c !== trimmed), trimmed]);
    setHistoryIndex(-1);
    setInputCommand('');
    setIsExecuting(true);

    try {
      const res = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed })
      });
      const data = await res.json();
      if (data.cwd) {
        setCwd(data.cwd);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `\r\n[Execution network error: ${err.message}]\r\n`]);
    } finally {
      setIsExecuting(false);
      // Re-focus input after command execution
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCommand(inputCommand);
  };

  // Keyboard navigation for command history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInputCommand(commandHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setInputCommand('');
      } else {
        setHistoryIndex(nextIdx);
        setInputCommand(commandHistory[nextIdx]);
      }
    }
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join(''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = async () => {
    setLogs([]);
    try {
      await fetch('/api/terminal/clear', { method: 'POST' });
    } catch (e) {}
  };

  // Compute clean display path
  const displayCwd = cwd.startsWith('/app/applet')
    ? cwd.replace('/app/applet', '~') || '~'
    : cwd.split('/').slice(-2).join('/') || cwd;

  // --- STYLING USING THEME TOKENS ---
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    width: '100vw',
    maxWidth: '100vw',
    backgroundColor: '#09090b',
    color: '#e4e4e7',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
    boxSizing: 'border-box',
  };

  // Compact Single Header Bar (~40px)
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? '0 8px' : '0 14px',
    height: isMobile ? '42px' : '40px',
    backgroundColor: '#121215',
    borderBottom: '1px solid #222226',
    flexShrink: 0,
    boxSizing: 'border-box',
    gap: '8px',
  };

  const iconBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: theme.radius['Radius.S'],
    backgroundColor: '#1c1c21',
    color: '#a1a1aa',
    border: '1px solid #2a2a32',
    cursor: 'pointer',
    flexShrink: 0,
    aspectRatio: '1 / 1',
    textDecoration: 'none',
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundColor: '#18181c',
    color: '#a1a1aa',
    border: '1px solid #2a2a32',
    borderRadius: theme.radius['Radius.S'],
    padding: isMobile ? '6px 26px 6px 8px' : '5px 26px 5px 8px',
    fontSize: isMobile ? '16px' : '12px', // 16px strictly prevents iOS Safari zoom
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: isMobile ? '135px' : '170px',
  };

  const logViewerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: isMobile ? '10px 10px' : '14px 18px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: isMobile ? '12px' : '13px',
    lineHeight: '1.55',
    color: '#34d399',
    backgroundColor: '#09090b',
    boxSizing: 'border-box',
  };

  const promptBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#111114',
    padding: isMobile ? '0 8px 0 10px' : '0 14px',
    height: isMobile ? '44px' : '42px',
    borderTop: '1px solid #222226',
    flexShrink: 0,
    gap: '8px',
    boxSizing: 'border-box',
  };

  const promptInputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    color: '#f4f4f5',
    fontFamily: 'inherit',
    fontSize: isMobile ? '16px' : '13px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle} id="terminal-page-root">
      {/* Compact Single Header Bar */}
      <header style={headerStyle} id="terminal-compact-header">
        {/* Left: Back Link & Active Workspace Path */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
          <a href="/" style={iconBtnStyle} title="Back to Application" id="terminal-back-btn">
            <CaretLeft size={16} weight="bold" style={{ flexShrink: 0 }} />
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <TerminalIcon size={14} color="#10b981" style={{ flexShrink: 0 }} />
            <span style={{ 
              fontSize: isMobile ? '12px' : '13px', 
              fontWeight: 600,
              color: '#e4e4e7',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: isMobile ? '100px' : '220px'
            }} title={cwd}>
              {displayCwd}
            </span>
            <div 
              style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: '#10b981', 
                flexShrink: 0,
                aspectRatio: '1 / 1'
              }} 
              title="Workspace bash daemon connected"
            />
          </div>
        </div>

        {/* Right: Quick Snippets Dropdown & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Quick Snippets Dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              style={selectStyle}
              onChange={(e) => {
                if (e.target.value) {
                  runCommand(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              id="terminal-quick-snippets-select"
            >
              {QUICK_COMMANDS.map((qc, i) => (
                <option key={i} value={qc.cmd} disabled={!qc.cmd}>
                  {qc.label}
                </option>
              ))}
            </select>
            <CaretDown 
              size={12} 
              color="#71717a" 
              style={{ 
                position: 'absolute', 
                right: '8px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                pointerEvents: 'none', 
                flexShrink: 0 
              }} 
            />
          </div>

          {/* Auto-scroll Toggle */}
          <button
            type="button"
            style={{
              ...iconBtnStyle,
              backgroundColor: autoScroll ? '#064e3b' : '#1c1c21',
              color: autoScroll ? '#34d399' : '#71717a',
              borderColor: autoScroll ? '#059669' : '#2a2a32',
            }}
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll: Enabled' : 'Auto-scroll: Disabled'}
            id="btn-auto-scroll"
          >
            <ArrowDown size={14} weight={autoScroll ? 'bold' : 'regular'} style={{ flexShrink: 0 }} />
          </button>

          {/* Copy Logs */}
          <button
            type="button"
            style={iconBtnStyle}
            onClick={handleCopyLogs}
            title={copied ? 'Copied Output!' : 'Copy Terminal Output'}
            id="btn-copy-output"
          >
            {copied ? (
              <Check size={14} color="#10b981" weight="bold" style={{ flexShrink: 0 }} />
            ) : (
              <Copy size={14} style={{ flexShrink: 0 }} />
            )}
          </button>

          {/* Clear Logs */}
          <button
            type="button"
            style={iconBtnStyle}
            onClick={handleClearLogs}
            title="Clear Terminal Output"
            id="btn-clear-output"
          >
            <Trash size={14} style={{ flexShrink: 0 }} />
          </button>
        </div>
      </header>

      {/* Terminal Screen Stream Viewer */}
      <main 
        ref={logContainerRef} 
        style={logViewerStyle} 
        id="terminal-screen-log"
      >
        {logs.length === 0 ? (
          <span style={{ color: '#52525b' }}>
            $ Ready. Type any bash command below or pick a quick snippet from the header...
          </span>
        ) : (
          logs.join('')
        )}
      </main>

      {/* Interactive Command Prompt Bar */}
      <form onSubmit={handleFormSubmit} style={promptBarStyle} id="terminal-prompt-form">
        <span style={{ 
          color: '#10b981', 
          fontWeight: 700, 
          fontSize: isMobile ? '15px' : '14px', 
          flexShrink: 0,
          lineHeight: 1,
          userSelect: 'none'
        }}>
          ❯
        </span>

        <input
          ref={inputRef}
          type="text"
          style={promptInputStyle}
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="enter bash command (e.g. ls, git status, npm test)..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          disabled={isExecuting}
          id="terminal-command-input"
        />

        <button
          type="submit"
          disabled={isExecuting || !inputCommand.trim()}
          style={{
            ...iconBtnStyle,
            width: isMobile ? '32px' : '30px',
            height: isMobile ? '32px' : '30px',
            backgroundColor: isExecuting ? '#1f1f23' : '#10b981',
            color: isExecuting ? '#71717a' : '#09090b',
            borderColor: isExecuting ? '#2a2a32' : '#059669',
            opacity: isExecuting || !inputCommand.trim() ? 0.6 : 1,
            cursor: isExecuting || !inputCommand.trim() ? 'not-allowed' : 'pointer',
          }}
          title="Run Command (Enter)"
          id="terminal-run-button"
        >
          {isExecuting ? (
            <CircleNotch size={14} className="fa-spin" style={{ flexShrink: 0 }} />
          ) : (
            <Play size={13} weight="fill" style={{ flexShrink: 0 }} />
          )}
        </button>
      </form>
    </div>
  );
};

export default TerminalPage;
