/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTheme } from '../../Theme.tsx';
import { useBreakpoint } from '../../hooks/useBreakpoint.tsx';
import { 
  Button, 
  Select, 
  AnimatedCopyIcon 
} from '../Core/index.tsx';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Trash, 
  ArrowDown, 
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
  const { theme, themeName } = useTheme();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  // Terminal state
  const [inputCommand, setInputCommand] = useState('');
  const [cwd, setCwd] = useState<string>('/app/applet');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeProcess, setActiveProcess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState('');

  // Command history for ArrowUp / ArrowDown navigation
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const termRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Send raw input to server PTY runner or active process
  const sendInputToProcess = useCallback(async (text: string) => {
    try {
      await fetch('/api/terminal/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text })
      });
    } catch (err: any) {
      if (termRef.current) {
        termRef.current.write(`\r\n\x1b[31m[Input error: ${err.message}]\x1b[0m\r\n`);
      }
    }
  }, []);

  // Send SIGINT / interrupt to active process
  const handleInterrupt = useCallback(async () => {
    try {
      await fetch('/api/terminal/interrupt', { method: 'POST' });
    } catch (err: any) {
      if (termRef.current) {
        termRef.current.write(`\r\n\x1b[31m[Interrupt error: ${err.message}]\x1b[0m\r\n`);
      }
    }
  }, []);

  // Command execution via workspace bash runner
  const runCommand = useCallback(async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

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
      if (termRef.current) {
        termRef.current.write(`\r\n\x1b[31m[Execution error: ${err.message}]\x1b[0m\r\n`);
      }
    } finally {
      setIsExecuting(false);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, []);

  // Notify backend of terminal resize so child PTY processes receive SIGWINCH
  const notifyResize = useCallback(async (cols: number, rows: number) => {
    try {
      await fetch('/api/terminal/resize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cols, rows })
      });
    } catch (_) {}
  }, []);

  // Initialize authentic xterm.js instance with Theme.tsx tokens
  useEffect(() => {
    if (!terminalContainerRef.current) return;

    // Create xterm instance
    const term = new XTerminal({
      cursorBlink: true,
      cursorStyle: 'block',
      convertEol: true,
      rightClickSelectsWord: true,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace",
      fontSize: isMobile ? 12 : 13,
      lineHeight: 1.25,
      letterSpacing: 0,
      scrollback: 5000,
      theme: {
        background: theme.Color.Base.Surface[1],
        foreground: theme.Color.Base.Content[1],
        cursor: theme.Color.Focus.Content[1],
        cursorAccent: theme.Color.Base.Surface[1],
        selectionBackground: theme.Color.Focus.Surface[2],
        selectionForeground: theme.Color.Focus.Content[1],
        black: theme.Color.Base.Surface[3],
        red: theme.Color.Error.Content[1],
        green: theme.Color.Success.Content[1],
        yellow: theme.Color.Warning.Content[1],
        blue: theme.Color.Focus.Content[1],
        magenta: theme.Color.Active.Content[1],
        cyan: theme.Color.Focus.Content[2] || theme.Color.Focus.Content[1],
        white: theme.Color.Base.Content[1],
        brightBlack: theme.Color.Base.Content[3],
        brightRed: theme.Color.Error.Content[1],
        brightGreen: theme.Color.Success.Content[1],
        brightYellow: theme.Color.Warning.Content[1],
        brightBlue: theme.Color.Focus.Content[1],
        brightMagenta: theme.Color.Active.Content[1],
        brightCyan: theme.Color.Focus.Content[2] || theme.Color.Focus.Content[1],
        brightWhite: theme.Color.Base.Content[1]
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Key handler to ensure Ctrl+C/Cmd+C copies selected text instead of sending interrupt
    term.attachCustomKeyEventHandler((e) => {
      // Ctrl+C or Cmd+C with active text selection: copy selected text
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && e.type === 'keydown') {
        if (term.hasSelection()) {
          const sel = term.getSelection();
          if (sel) {
            navigator.clipboard.writeText(sel);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
          return false; // Prevent sending SIGINT when user intends to copy text
        }
      }

      // Ctrl+V or Cmd+V: paste clipboard text into terminal process
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V') && e.type === 'keydown') {
        navigator.clipboard?.readText().then((clipText) => {
          if (clipText) {
            sendInputToProcess(clipText);
          }
        }).catch(() => {});
        return false;
      }

      return true;
    });

    // Open terminal inside container element
    term.open(terminalContainerRef.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Auto-copy on text selection change when text is highlighted
    const selectionDisposable = term.onSelectionChange(() => {
      const sel = term.getSelection();
      if (sel && sel.trim().length > 0) {
        navigator.clipboard?.writeText(sel).catch(() => {});
      }
    });

    // Initial fit
    try {
      fitAddon.fit();
      notifyResize(term.cols, term.rows);
    } catch (_) {}

    // When user types inside xterm canvas directly, forward raw keystroke bytes to PTY
    const dataDisposable = term.onData((data) => {
      sendInputToProcess(data);
    });

    // Resize observer to keep xterm perfectly fitted to container
    const resizeObserver = new ResizeObserver(() => {
      try {
        if (fitAddonRef.current && termRef.current) {
          fitAddonRef.current.fit();
          notifyResize(termRef.current.cols, termRef.current.rows);
        }
      } catch (_) {}
    });

    resizeObserver.observe(terminalContainerRef.current);

    return () => {
      dataDisposable.dispose();
      selectionDisposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [theme, isMobile, notifyResize, sendInputToProcess]);

  // Update theme colors when mode toggles
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = {
        background: theme.Color.Base.Surface[1],
        foreground: theme.Color.Base.Content[1],
        cursor: theme.Color.Focus.Content[1],
        cursorAccent: theme.Color.Base.Surface[1],
        selectionBackground: theme.Color.Focus.Surface[2],
        selectionForeground: theme.Color.Focus.Content[1],
        black: theme.Color.Base.Surface[3],
        red: theme.Color.Error.Content[1],
        green: theme.Color.Success.Content[1],
        yellow: theme.Color.Warning.Content[1],
        blue: theme.Color.Focus.Content[1],
        magenta: theme.Color.Active.Content[1],
        cyan: theme.Color.Focus.Content[2] || theme.Color.Focus.Content[1],
        white: theme.Color.Base.Content[1],
        brightBlack: theme.Color.Base.Content[3],
        brightRed: theme.Color.Error.Content[1],
        brightGreen: theme.Color.Success.Content[1],
        brightYellow: theme.Color.Warning.Content[1],
        brightBlue: theme.Color.Focus.Content[1],
        brightMagenta: theme.Color.Active.Content[1],
        brightCyan: theme.Color.Focus.Content[2] || theme.Color.Focus.Content[1],
        brightWhite: theme.Color.Base.Content[1]
      };
    }
  }, [theme, themeName]);

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
          if (termRef.current) {
            termRef.current.reset();
          }
        } else if (payload.type === 'init') {
          if (payload.cwd) setCwd(payload.cwd);
        } else if (payload.type === 'status') {
          setActiveProcess(payload.activeProcess);
          setIsExecuting(!!payload.activeProcess);
        } else if (payload.data && termRef.current) {
          termRef.current.write(payload.data);
        }
        if (payload.cwd) {
          setCwd(payload.cwd);
        }
      } catch (e) {
        if (termRef.current && event.data) {
          termRef.current.write(event.data);
        }
      }
    };

    es.onerror = () => {
      // Reconnection handled automatically by browser EventSource
    };

    return () => {
      es.close();
    };
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExecuting) {
      sendInputToProcess(inputCommand ? `${inputCommand}\r` : '\r');
      setInputCommand('');
    } else {
      runCommand(inputCommand);
    }
  };

  // Keyboard navigation for command history and interactive process navigation in input box
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Intercept Ctrl+C to send interrupt to active command
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleInterrupt();
      return;
    }

    if (isExecuting) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendInputToProcess(inputCommand ? `${inputCommand}\r` : '\r');
        setInputCommand('');
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        sendInputToProcess('\x1b[A');
        return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        sendInputToProcess('\x1b[B');
        return;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        sendInputToProcess('\x1b[C');
        return;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        sendInputToProcess('\x1b[D');
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        sendInputToProcess('\x1b');
        return;
      } else if (e.key === 'Tab') {
        e.preventDefault();
        sendInputToProcess('\t');
        return;
      }
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

  // Persistent Quick Keys action handler
  const handleQuickKeyClick = (keyItem: { label: string; val: string; action?: string }) => {
    if (keyItem.action === 'interrupt' || keyItem.val === '__INTERRUPT__') {
      handleInterrupt();
      if (!isExecuting) {
        setInputCommand('');
      }
      return;
    }

    if (keyItem.action === 'clear') {
      handleClearLogs();
      return;
    }

    if (keyItem.action === 'run_agy') {
      if (isExecuting) {
        sendInputToProcess('agy\r');
      } else {
        runCommand('agy');
      }
      return;
    }

    if (isExecuting) {
      // Forward raw code to active interactive process PTY
      sendInputToProcess(keyItem.val);
    } else {
      // Idle mode: perform context-sensitive action
      if (keyItem.val === '\x1b[A') {
        // Up arrow: previous command in history
        if (commandHistory.length > 0) {
          const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(nextIdx);
          setInputCommand(commandHistory[nextIdx]);
        }
      } else if (keyItem.val === '\x1b[B') {
        // Down arrow: next command in history
        if (historyIndex !== -1) {
          const nextIdx = historyIndex + 1;
          if (nextIdx >= commandHistory.length) {
            setHistoryIndex(-1);
            setInputCommand('');
          } else {
            setHistoryIndex(nextIdx);
            setInputCommand(commandHistory[nextIdx]);
          }
        }
      } else if (keyItem.val === '\r') {
        // Enter: run input command
        if (inputCommand.trim()) {
          runCommand(inputCommand);
        }
      } else if (keyItem.val === '\x1b') {
        // Esc: clear input
        setInputCommand('');
      } else if (keyItem.val === '1\r') {
        setInputCommand(prev => prev + '1');
        inputRef.current?.focus();
      } else if (keyItem.val === '2\r') {
        setInputCommand(prev => prev + '2');
        inputRef.current?.focus();
      } else if (keyItem.val === '3\r') {
        setInputCommand(prev => prev + '3');
        inputRef.current?.focus();
      } else if (keyItem.val === 'y\r') {
        setInputCommand(prev => prev + 'y');
        inputRef.current?.focus();
      } else if (keyItem.val === 'n\r') {
        setInputCommand(prev => prev + 'n');
        inputRef.current?.focus();
      } else if (keyItem.val === ' ') {
        setInputCommand(prev => prev + ' ');
        inputRef.current?.focus();
      } else if (keyItem.val === '\t') {
        inputRef.current?.focus();
      } else {
        setInputCommand(prev => prev + keyItem.val);
        inputRef.current?.focus();
      }
    }
  };

  const handleCopyLogs = () => {
    if (termRef.current) {
      // Get full terminal buffer selection or serialized text
      let textToCopy = termRef.current.getSelection();
      if (!textToCopy) {
        const buffer = termRef.current.buffer.active;
        const lines: string[] = [];
        for (let i = 0; i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) lines.push(line.translateToString(true));
        }
        textToCopy = lines.join('\n').trim();
      }
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearLogs = async () => {
    if (termRef.current) {
      termRef.current.reset();
    }
    try {
      await fetch('/api/terminal/clear', { method: 'POST' });
    } catch (e) {}
  };

  const handleScrollToBottom = () => {
    if (termRef.current) {
      termRef.current.scrollToBottom();
    }
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

  const quickKeysBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    gap: theme.space['Space.XS'],
    padding: `6px ${theme.space['Space.S']}`,
    backgroundColor: theme.Color.Base.Surface[2],
    ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
    userSelect: 'none',
    flexShrink: 0,
    boxSizing: 'border-box'
  };

  // Persistent Quick Keys list
  const QUICK_KEYS_ITEMS = [
    { label: 'agy', val: 'agy', action: 'run_agy', title: 'Run Antigravity CLI (agy)' },
    { label: '↑', val: '\x1b[A', title: 'Up Arrow / History Previous' },
    { label: '↓', val: '\x1b[B', title: 'Down Arrow / History Next' },
    { label: '←', val: '\x1b[D', title: 'Left Arrow' },
    { label: '→', val: '\x1b[C', title: 'Right Arrow' },
    { label: 'Enter ↵', val: '\r', title: 'Confirm / Select (Enter)' },
    { label: 'Esc', val: '\x1b', title: 'Escape / Cancel' },
    { label: '1', val: '1\r', title: 'Option 1' },
    { label: '2', val: '2\r', title: 'Option 2' },
    { label: '3', val: '3\r', title: 'Option 3' },
    { label: 'y', val: 'y\r', title: 'Confirm Yes (y)' },
    { label: 'n', val: 'n\r', title: 'Decline No (n)' },
    { label: 'Space', val: ' ', title: 'Spacebar' },
    { label: 'Tab', val: '\t', title: 'Tab (Auto-complete)' },
    { label: 'Ctrl+C', val: '__INTERRUPT__', action: 'interrupt', title: 'Interrupt / Cancel (Ctrl+C)' },
  ];

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
              title={activeProcess ? `Process running: ${activeProcess}` : "Workspace PTY connected"}
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

          {/* Scroll to bottom */}
          <Button
            type="button"
            variant="secondary"
            size="S"
            icon={<ArrowDown size={14} weight="regular" />}
            onClick={handleScrollToBottom}
            style={{ 
              width: theme.height['Height.XS'], 
              height: theme.height['Height.XS'], 
              minWidth: theme.height['Height.XS'], 
              padding: 0
            }}
            title="Scroll to Bottom"
            id="btn-scroll-bottom"
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

      {/* Authentic VT100 / Xterm PTY Viewport */}
      <main 
        style={{ 
          flex: 1, 
          minHeight: 0, 
          width: '100%', 
          backgroundColor: theme.Color.Base.Surface[1],
          position: 'relative',
          padding: isMobile ? `4px ${theme.space['Space.S']}` : `8px ${theme.space['Space.M']}`,
          boxSizing: 'border-box',
          overflow: 'hidden',
          userSelect: 'text',
          WebkitUserSelect: 'text'
        }}
        id="terminal-viewport-wrapper"
        onClick={() => {
          if (termRef.current) termRef.current.focus();
        }}
      >
        <div 
          ref={terminalContainerRef} 
          style={{ 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden',
            userSelect: 'text',
            WebkitUserSelect: 'text'
          }} 
          id="terminal-xterm-canvas" 
        />
      </main>

      {/* ALWAYS PERSISTENT Quick Touch/Key Response Bar */}
      <section style={quickKeysBarStyle} id="terminal-persistent-quick-keys" aria-label="Quick Keys Toolbar">
        <span style={{ 
          ...theme.Type.Readable.Label.S, 
          color: theme.Color.Base.Content[3],
          whiteSpace: 'nowrap',
          marginRight: '2px',
          fontSize: '11px',
          flexShrink: 0
        }}>
          Quick Keys:
        </span>
        {QUICK_KEYS_ITEMS.map((item) => {
          const isHighlight = item.label === 'agy' || (isExecuting && item.label === 'Ctrl+C');
          return (
            <Button
              key={item.label}
              type="button"
              variant={isHighlight ? "primary" : "secondary"}
              size="S"
              label={item.label}
              onClick={() => handleQuickKeyClick(item)}
              title={item.title}
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
                ...theme.border.getBorder1px(isHighlight ? theme.Color.Focus.Content[1] : theme.Color.Base.Surface[3])
              }}
            />
          );
        })}
      </section>

      {/* Command Prompt Form Bar */}
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
                ? `[${activeProcess}] running... type response, click quick keys, or press Ctrl+C`
                : "Process active... type response, click quick keys, or press Ctrl+C")
            : "enter bash command (e.g. agy, ls -la, git status)..."
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
  );
};

export default TerminalPage;
