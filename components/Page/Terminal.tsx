/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../Theme.tsx';
import { useBreakpoint } from '../../hooks/useBreakpoint.tsx';
import { 
  Button, 
  Select, 
  AnimatedCopyIcon, 
  CustomScrollbar 
} from '../Core/index.tsx';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Trash, 
  ArrowDown, 
  CircleNotch,
  CaretLeft,
  Stop,
  PaperPlaneRight
} from 'phosphor-react';

const QUICK_COMMANDS = [
  { value: 'agy', label: 'agy (Antigravity CLI)' },
  { value: 'agy -h', label: 'agy --help' },
  { value: 'agy models', label: 'agy models' },
  { value: 'git status', label: 'git status' },
  { value: 'git log -n 5 --oneline', label: 'git log (recent)' },
  { value: 'git diff', label: 'git diff' },
  { value: 'ls -la', label: 'ls -la' },
  { value: 'node -v && npm -v', label: 'node & npm -v' },
  { value: 'pwd && whoami', label: 'pwd & whoami' },
  { value: 'ps aux | head -n 10', label: 'ps aux' },
  { value: 'df -h', label: 'df -h' },
  { value: 'cat package.json', label: 'cat package.json' },
  { value: 'npm run lint', label: 'npm run lint' }
];

export const TerminalPage: React.FC = () => {
  const { theme } = useTheme();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  // Terminal state
  const [logs, setLogs] = useState<string[]>([]);
  const [inputCommand, setInputCommand] = useState('');
  const [cwd, setCwd] = useState<string>('/app/applet');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeProcess, setActiveProcess] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState('');

  // Command history for ArrowUp / ArrowDown navigation
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial terminal info on mount with resilient retry
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchInfo = async (retries = 3, delay = 800) => {
      try {
        const res = await fetch('/api/terminal/info', { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();
        if (isMounted && data?.cwd) {
          setCwd(data.cwd);
        }
        if (isMounted && data?.activeProcess !== undefined) {
          setActiveProcess(data.activeProcess);
          if (data.activeProcess) {
            setIsExecuting(true);
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (retries > 0 && isMounted) {
          setTimeout(() => {
            if (isMounted) fetchInfo(retries - 1, delay * 1.5);
          }, delay);
        }
      }
    };

    fetchInfo();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Connect SSE stream for live real-time output
  useEffect(() => {
    const es = new EventSource('/api/terminal/stream');

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'clear') {
          setLogs([]);
        } else if (payload.type === 'init') {
          if (payload.cwd) {
            setCwd(payload.cwd);
          }
        } else if (payload.type === 'status') {
          setActiveProcess(payload.activeProcess);
          if (payload.activeProcess) {
            setIsExecuting(true);
          } else {
            setIsExecuting(false);
          }
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

  // Forward interactive input (keystrokes, responses) to active process
  const sendInputToProcess = async (text: string) => {
    try {
      await fetch('/api/terminal/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text })
      });
      setInputCommand('');
    } catch (err: any) {
      setLogs(prev => [...prev, `\r\n[Input network error: ${err.message}]\r\n`]);
    }
  };

  // Send SIGINT / interrupt to active process
  const handleInterrupt = async () => {
    try {
      await fetch('/api/terminal/interrupt', { method: 'POST' });
    } catch (err: any) {
      setLogs(prev => [...prev, `\r\n[Interrupt error: ${err.message}]\r\n`]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExecuting) {
      sendInputToProcess(inputCommand ? `${inputCommand}\n` : '\n');
    } else {
      runCommand(inputCommand);
    }
  };

  // Keyboard navigation for command history and interactive process navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Intercept Ctrl+C to send interrupt to active command
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleInterrupt();
      return;
    }

    if (isExecuting) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        sendInputToProcess('\x1b[A');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        sendInputToProcess('\x1b[B');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        sendInputToProcess('\x1b[C');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        sendInputToProcess('\x1b[D');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        sendInputToProcess('\x1b');
      }
      return;
    }

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

  // --- STYLING USING PURE THEME.TSX DESIGN TOKENS ---
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    width: '100vw',
    maxWidth: '100vw',
    backgroundColor: theme.Color.Base.Surface[1],
    color: theme.Color.Base.Content[1],
    ...theme.Type.Expressive.Data,
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
    boxSizing: 'border-box',
  };

  // Compact Single Header Bar (~32-40px)
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? `0 ${theme.space['Space.S']}` : `0 ${theme.space['Space.M']}`,
    height: isMobile ? theme.height['Height.M'] : theme.height['Height.S'],
    backgroundColor: theme.Color.Base.Surface[2],
    ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
    flexShrink: 0,
    boxSizing: 'border-box',
    gap: theme.space['Space.S'],
    zIndex: 10,
  };

  const logViewerStyle: React.CSSProperties = {
    height: '100%',
    width: '100%',
    padding: isMobile ? `${theme.space['Space.S']} ${theme.space['Space.S']}` : `${theme.space['Space.M']} ${theme.space['Space.L']}`,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    ...theme.Type.Expressive.Data,
    lineHeight: '1.6',
    color: theme.Color.Base.Content[1],
    backgroundColor: theme.Color.Base.Surface[1],
    boxSizing: 'border-box',
  };

  const promptBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: theme.Color.Base.Surface[2],
    padding: isMobile ? `0 ${theme.space['Space.S']}` : `0 ${theme.space['Space.M']}`,
    height: isMobile ? theme.height['Height.M'] : theme.height['Height.S'],
    ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
    flexShrink: 0,
    gap: theme.space['Space.S'],
    boxSizing: 'border-box',
  };

  const promptInputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    color: theme.Color.Base.Content[1],
    ...theme.Type.Expressive.Data,
    fontSize: isMobile ? '16px' : (theme.Type.Expressive.Data as any)?.fontSize || '12px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  // Parse ANSI escape sequences and map them to semantic Theme.tsx tokens
  const renderAnsiLogs = (logList: string[]) => {
    let text = logList.join('');
    if (!text) return null;

    // Clean non-color ANSI CSI sequences (cursor positioning, screen clears, private modes)
    text = text.replace(/(?:\u001b|\x1b)\[\??[0-9;]*[A-LN-Za-ln-z]/g, '');

    const ansiRegex = /(?:\u001b\[|\x1b\[|\[(?=[0-9;]+m))([0-9;]*)m/g;
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let currentColor: string = theme.Color.Base.Content[1];
    let isBold = false;
    let match: RegExpExecArray | null;

    while ((match = ansiRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(
          <span
            key={nodes.length}
            style={{
              color: currentColor,
              fontWeight: isBold ? 600 : 400,
            }}
          >
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }

      const rawCodes = match[1] ? match[1].split(';').map(Number) : [0];
      if (rawCodes[0] === 38 && rawCodes[1] === 2 && rawCodes.length >= 5) {
        currentColor = `rgb(${rawCodes[2]}, ${rawCodes[3]}, ${rawCodes[4]})`;
      } else if (rawCodes[0] === 48 && rawCodes[1] === 2 && rawCodes.length >= 5) {
        // Background color support if needed, otherwise ignore background escape
      } else {
        for (const code of rawCodes) {
          if (code === 0) {
            currentColor = theme.Color.Base.Content[1];
            isBold = false;
          } else if (code === 1) {
            isBold = true;
          } else if (code === 22) {
            isBold = false;
          } else if (code === 31 || code === 91) {
            currentColor = theme.Color.Error.Content[1];
          } else if (code === 32 || code === 92) {
            currentColor = theme.Color.Success.Content[1];
          } else if (code === 33 || code === 93) {
            currentColor = theme.Color.Warning.Content[1];
          } else if (code === 34 || code === 94 || code === 36 || code === 96) {
            currentColor = theme.Color.Focus.Content[1];
          } else if (code === 35 || code === 95) {
            currentColor = theme.Color.Active.Content[1];
          } else if (code === 30 || code === 90) {
            currentColor = theme.Color.Base.Content[3];
          } else if (code === 37 || code === 97 || code === 39) {
            currentColor = theme.Color.Base.Content[1];
          }
        }
      }

      lastIndex = ansiRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(
        <span
          key={nodes.length}
          style={{
            color: currentColor,
            fontWeight: isBold ? 600 : 400,
          }}
        >
          {text.substring(lastIndex)}
        </span>
      );
    }

    return nodes;
  };

  return (
    <div style={containerStyle} id="terminal-page-root">
      {/* Compact Single Header Bar */}
      <header style={headerStyle} id="terminal-compact-header">
        {/* Left: Back Link & Active Workspace Path */}
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.S'], minWidth: 0, flexShrink: 1 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex' }} id="terminal-back-btn" title="Back to Application">
            <Button
              variant="secondary"
              size="S"
              icon={<CaretLeft size={16} weight="bold" />}
              style={{ 
                width: theme.height['Height.XS'], 
                height: theme.height['Height.XS'], 
                minWidth: theme.height['Height.XS'], 
                padding: 0 
              }}
            />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.XS'], minWidth: 0 }}>
            <TerminalIcon size={16} color={theme.Color.Success.Content[1]} style={{ flexShrink: 0 }} />
            <span style={{ 
              ...theme.Type.Readable.Label.M,
              color: theme.Color.Base.Content[1],
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: isMobile ? '100px' : '220px'
            }} title={cwd}>
              {displayCwd}
            </span>
            <div 
              style={{ 
                width: theme.space['Space.S'], 
                height: theme.space['Space.S'], 
                borderRadius: theme.radius['Radius.Full'], 
                backgroundColor: isExecuting ? theme.Color.Warning.Content[1] : theme.Color.Success.Content[1], 
                flexShrink: 0,
                aspectRatio: '1 / 1'
              }} 
              title={activeProcess ? `Process running: ${activeProcess}` : "Workspace bash daemon connected"}
            />
            {activeProcess && (
              <span style={{
                ...theme.Type.Readable.Label.S,
                backgroundColor: theme.Color.Warning.Surface[1],
                color: theme.Color.Warning.Content[1],
                padding: `2px ${theme.space['Space.XS']}`,
                borderRadius: theme.radius['Radius.S'],
                ...theme.border.getBorder1px(theme.Color.Warning.Content[1]),
                whiteSpace: 'nowrap',
                lineHeight: 1
              }} id="terminal-active-process-badge">
                {activeProcess}
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Snippets Dropdown & Core Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.XS'], flexShrink: 0 }}>
          {/* Quick Snippets Dropdown using Core Select */}
          <div style={{ width: isMobile ? '130px' : '160px' }} id="terminal-quick-snippets-select">
            <Select
              size="S"
              value={selectedSnippet}
              onChange={(e) => {
                const cmd = e.target.value;
                if (cmd) {
                  setSelectedSnippet(cmd);
                  runCommand(cmd);
                  // Reset selection back after run
                  setTimeout(() => setSelectedSnippet(''), 300);
                }
              }}
              options={QUICK_COMMANDS}
              style={{ width: '100%' }}
              triggerStyle={{
                height: theme.height['Height.XS'],
                padding: `0 ${theme.space['Space.S']}`,
                ...theme.Type.Readable.Label.S,
                backgroundColor: theme.Color.Base.Surface[1],
              }}
            />
          </div>

          {/* Auto-scroll Toggle - Pure Variant-driven styling */}
          <Button
            type="button"
            variant={autoScroll ? "primary" : "secondary"}
            size="S"
            icon={<ArrowDown size={14} weight={autoScroll ? 'bold' : 'regular'} />}
            onClick={() => setAutoScroll(!autoScroll)}
            style={{ 
              width: theme.height['Height.XS'], 
              height: theme.height['Height.XS'], 
              minWidth: theme.height['Height.XS'], 
              padding: 0
            }}
            title={autoScroll ? 'Auto-scroll: Enabled' : 'Auto-scroll: Disabled'}
            id="btn-auto-scroll"
          />

          {/* Copy Logs with Core AnimatedCopyIcon */}
          <Button
            type="button"
            variant="secondary"
            size="S"
            icon={<AnimatedCopyIcon isCopied={copied} />}
            onClick={handleCopyLogs}
            style={{ 
              width: theme.height['Height.XS'], 
              height: theme.height['Height.XS'], 
              minWidth: theme.height['Height.XS'], 
              padding: 0 
            }}
            title={copied ? 'Copied Output!' : 'Copy Terminal Output'}
            id="btn-copy-output"
          />

          {/* Clear Logs */}
          <Button
            type="button"
            variant="secondary"
            size="S"
            icon={<Trash size={14} />}
            onClick={handleClearLogs}
            style={{ 
              width: theme.height['Height.XS'], 
              height: theme.height['Height.XS'], 
              minWidth: theme.height['Height.XS'], 
              padding: 0 
            }}
            title="Clear Terminal Output"
            id="btn-clear-output"
          />
        </div>
      </header>

      {/* Terminal Screen Stream Viewer with Core CustomScrollbar */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <CustomScrollbar>
          <main 
            ref={logContainerRef} 
            style={logViewerStyle} 
            id="terminal-screen-log"
          >
            {logs.length === 0 ? (
              <span style={{ color: theme.Color.Base.Content[3] }}>
                $ Ready. Type any bash command below or pick a quick snippet from the header...
              </span>
            ) : (
              renderAnsiLogs(logs)
            )}
          </main>
        </CustomScrollbar>
      </div>

      {/* Interactive Command Prompt Bar & Quick Touch Response Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.S'], width: '100%' }}>
        {isExecuting && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              flexWrap: 'wrap',
              gap: theme.space['Space.XS'], 
              padding: `0 ${theme.space['Space.XS']}`,
              userSelect: 'none'
            }}
            id="terminal-quick-response-chips"
          >
            <span style={{ 
              ...theme.Type.Readable.Label.S, 
              color: theme.Color.Base.Content[3],
              whiteSpace: 'nowrap',
              marginRight: theme.space['Space.XS'],
              fontSize: '11px'
            }}>
              Quick Keys:
            </span>
            {[
              { label: '↑', val: '\x1b[A' },
              { label: '↓', val: '\x1b[B' },
              { label: '←', val: '\x1b[D' },
              { label: '→', val: '\x1b[C' },
              { label: 'Esc', val: '\x1b' },
              { label: 'Enter ↵', val: '\r' },
            ].map(item => (
              <Button
                key={item.label}
                type="button"
                variant="secondary"
                size="S"
                label={item.label}
                onClick={() => sendInputToProcess(item.val)}
                style={{
                  width: 'auto',
                  minWidth: '28px',
                  height: '24px',
                  padding: `0 ${theme.space['Space.S']}`,
                  ...theme.Type.Readable.Label.S,
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  letterSpacing: '-0.01em',
                  borderRadius: theme.radius['Radius.S'],
                  flexShrink: 0,
                  ...theme.border.getBorder1px(theme.Color.Base.Surface[3])
                }}
              />
            ))}
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={promptBarStyle} id="terminal-prompt-form">
          <span style={{ 
            color: isExecuting ? theme.Color.Warning.Content[1] : theme.Color.Success.Content[1], 
            fontWeight: 700, 
            ...theme.Type.Expressive.Data,
            fontSize: isMobile ? '15px' : '14px', 
            flexShrink: 0,
            lineHeight: 1,
            userSelect: 'none'
          }}>
            {isExecuting ? '●' : '❯'}
          </span>

          <input
            ref={inputRef}
            type="text"
            style={promptInputStyle}
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isExecuting 
              ? (activeProcess 
                  ? `[${activeProcess}] interactive mode... type response or click quick keys`
                  : "Process active... type response (e.g. 1, 2) or press Ctrl+C to interrupt")
              : "enter bash command (e.g. agy, ls, git status)..."
            }
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            id="terminal-command-input"
          />

          {isExecuting && (
            <Button
              type="button"
              variant="destructive"
              size="S"
              icon={<Stop size={13} weight="fill" />}
              onClick={handleInterrupt}
              style={{ 
                width: theme.height['Height.XS'], 
                height: theme.height['Height.XS'], 
                minWidth: theme.height['Height.XS'], 
                padding: 0 
              }}
              title="Interrupt Running Process (Ctrl+C)"
              id="terminal-interrupt-button"
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="S"
            disabled={!isExecuting && !inputCommand.trim()}
            icon={isExecuting ? <PaperPlaneRight size={13} weight="bold" /> : <Play size={13} weight="fill" />}
            style={{ 
              width: theme.height['Height.XS'], 
              height: theme.height['Height.XS'], 
              minWidth: theme.height['Height.XS'], 
              padding: 0 
            }}
            title={isExecuting ? "Send Input to Process (Enter)" : "Run Command (Enter)"}
            id="terminal-run-button"
          />
        </form>
      </div>
    </div>
  );
};

export default TerminalPage;
