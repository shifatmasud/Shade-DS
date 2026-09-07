# Tech Spec

1. **Objective**
   - **Problem Statement**: The terminal's custom regex-based ANSI renderer destroyed cursor positioning (`\x1b[6G`, `\x1b[H`, `\x1b[2J`), replaced control codes with unwanted spaces/newlines, and caused repeated waterfall artifacts, massive gaps, and mangled characters during interactive `agy` CLI sessions. Furthermore, the Quick Keys bar disappeared whenever a process stopped executing, and clicking buttons in various states was non-functional or caused command errors.
   - **Solution Overview**: 
     1. Adopt the industry-standard `@xterm/xterm` and `@xterm/addon-fit` terminal rendering engine, styled strictly with `Theme.tsx` semantic design tokens. This provides 100% authentic VT100/xterm/TrueColor emulation, zero gap artifacts, flawless box drawing, in-place screen clearing, and true PTY fidelity for `agy` and other CLI tools.
     2. Make the Quick Keys toolbar permanently persistent across all terminal states (idle and executing).
     3. Ensure all Quick Keys work context-sensitively: forwarding raw keystroke bytes (`\r`, `\x1b[A`, `\x1b`, `1\r`, `\x03`) to the active PTY session when a process is running, or inserting commands/navigating history/submitting inputs when idle.
     4. Add dynamic PTY resizing so `pty_runner.py` and backend PTY processes always match the exact viewport dimensions.
   - **Scope**: Terminal backend (`server.ts`, `pty_runner.py`), frontend terminal screen & controls (`/components/Page/Terminal.tsx`), and package styles (`xterm.css`).
   - **Context**: Running in AI Studio sandboxed container with Node/Express fullstack and React 19.

2. **Success Criteria**
   - **Key Results**:
     - `agy` CLI renders its authentic interactive TUI (OAuth / Google Cloud Project login screen, banners, spinners, menus) with pristine alignment, crisp block characters, and zero broken escape code artifacts or extraneous gaps.
     - Quick Keys bar is permanently visible on both mobile and desktop.
     - Quick Keys buttons (Up, Down, Left, Right, Enter, Esc, 1, 2, 3, y, n, Space, Ctrl+C, agy, Clear) respond immediately in both active and idle states.
     - Terminal stream maintains continuity, supports copy/clear, auto-fit on window resize, and integrates seamlessly with `Theme.tsx`.
   - **Non-Negotiables**:
     - All styles adhere strictly to `Theme.tsx` design tokens.
     - No external icon dependencies added.
     - PTY process handling remains stable without orphaned child processes.

3. **Project Requirements**
   - [x] Install `@xterm/xterm` and `@xterm/addon-fit`.
   - [ ] Import `xterm/css/xterm.css` or bundle appropriate styles for xterm viewport in `index.html` / `styles.css`.
   - [ ] Upgrade `pty_runner.py` and `server.ts` with resize support (`/api/terminal/resize`) and robust bi-directional PTY I/O.
   - [ ] Refactor `/components/Page/Terminal.tsx` to mount `xterm.js` with `FitAddon`, applying `Theme.tsx` color mapping and fonts.
   - [ ] Implement persistent Quick Keys toolbar with universal event dispatcher (routing to running PTY or local command prompt).
   - [ ] Verify build compilation with `compile_applet` and test with `agy`, `ls`, `git`, and interactive commands.

4. **Architecture Decisions**
   - *xterm.js vs Custom DOM Parsing*: Replacing naive regex string replacements with `xterm.js` resolves all ANSI escape sequence regressions, in-place line clearing, alt-screen buffers, and 24-bit TrueColor rendering without maintaining fragile parser edge-cases.
   - *Persistent Quick Keys*: Moving the Quick Keys component out of the `{isExecuting && ...}` conditional branch ensures users can trigger quick navigation (history, `agy` launch, key inputs) at any moment.

5. **Pseudo Code (Shade DSL)**
```shade
Component TerminalPage {
  DATA: {
    state termInstance: TerminalRef
    state activeProcess: string | null
    state isExecuting: bool
    state inputCommand: string
    state history: list<string>
  }
  LOGIC: {
    fn onMount() {
      initXterm(theme)
      connectSSE('/api/terminal/stream')
      bindResizeObserver()
    }
    fn onQuickKey(key) {
      if isExecuting {
        post('/api/terminal/input', { input: key.rawCode })
      } else {
        handleIdleKeyAction(key)
      }
    }
  }
  RENDER: {
    Box(Theme.Surface[1]) {
      CompactHeader()
      XtermContainer()
      PersistentQuickKeysBar(onKey: onQuickKey)
      PromptBar()
    }
  }
}
```
