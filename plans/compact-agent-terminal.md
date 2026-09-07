# Tech Spec 

1. **Objective**
- **Problem Statement**:
  1. The user explicitly stated: "We dont need agent streams, cli tools in terminal page. We can compact it more. Now terminal isn't working. Ensure it uses same terminal as you".
  2. The previous Terminal page included complex multi-tab views (Agent Audit streams, CLI credentials manager, separate CLI tools runner) which added unnecessary clutter and visual noise.
  3. The interactive `/bin/bash` terminal on the server was broken because spawning a long-lived `/bin/bash` child process with piped stdio without a TTY caused glibc to block-buffer standard output (4KB buffer). Commands like `ls` or `echo hello` never flushed their stdout to the SSE stream until process termination, leaving the terminal completely unresponsive.
  4. The user wants the terminal to run in the exact same workspace environment as the AI coding assistant (same cwd `/app/applet`, same path, same tools, same permissions).

- **Solution Overview**:
  - **Compact, Ultra-Clean Terminal View**:
    - Remove the Agent Stream tab and CLI Tools panels entirely.
    - Remove the redundant multi-tier navigation tabs.
    - Consolidate the entire page into an ultra-sleek, compact, focused Terminal interface.
    - Single compact top header (~40px) displaying:
      - Left: Back link button (`‹`) + current path breadcrumb (`~/applet` or `pwd`) + live status dot (`● Online`).
      - Center/Right: Quick Command Snippets dropdown selector (`ls -la`, `git status`, `git log`, `npm run build`, `node -v`, etc.) + Utility action buttons (`Auto-scroll`, `Copy`, `Clear Output`).
    - Expansive terminal body showing command history, real-time streaming output, exit codes, and an interactive prompt bar with command history navigation (Up/Down arrow keys).
  - **Reliable Server Terminal Engine ("Same Terminal As You")**:
    - In `server.ts`, replace the broken piped bash stdin with an unbuffered execution engine using `spawn('bash', ['-c', command], { cwd: currentDirectory, env: process.env })`.
    - Real-time streaming over SSE `/api/terminal/stream` or direct execution stream endpoint `/api/terminal/exec`.
    - Maintain persistent working directory tracking (`cd <path>`).
    - Keep a rolling in-memory terminal buffer (last 1,000 lines) so when a user refreshes or switches pages, the terminal output remains intact.
    - Expose endpoints:
      - `GET /api/terminal/stream`: SSE connection streaming live terminal output chunks.
      - `POST /api/terminal/run`: Execute command in the agent's bash shell with cwd tracking and streaming output.
      - `GET /api/terminal/info`: Returns current cwd, username, node/git versions, and environment facts.
      - `POST /api/terminal/clear`: Clears the session buffer.

- **Scope**:
  - `/server.ts`: Update terminal execution engine to use real-time bash execution in `process.cwd()`.
  - `/components/Page/Terminal.tsx`: Redesign into a single, compact, distraction-free terminal screen.
  - Protected: `/components/Section/Dock.tsx` remains strictly untouched.

---

2. **Success Criteria**
- **Key Results**:
  - Terminal executes commands in real-time in the exact same environment as the AI coding agent (`/app/applet`, Node 22, npm, git, etc.).
  - Output displays immediately without buffer hangs or missing stdout.
  - Page is 100% compact: no Agent Stream tab, no CLI Tools panels, zero wasted space.
  - Quick Command Snippet dropdown selector lets mobile users execute common commands with one tap.
  - 100% pass on TypeScript linting (`lint_applet`) and compilation (`compile_applet`).

---

3. **Project Requirements**
- [ ] Update `server.ts`:
  - Implement robust command runner using `spawn('bash', ['-c', command])` with live SSE output broadcast and persistent `cwd` tracking.
  - Provide session history buffer so output persists across reconnections.
- [ ] Update `/components/Page/Terminal.tsx`:
  - Eliminate multi-tabs (Agent stream, CLI tools).
  - Clean compact single-row header with path, live indicator, snippets dropdown, and action buttons.
  - Responsive terminal window with prompt bar, keyboard history (Up/Down arrows), and zero distortion.
- [ ] Verify build and linting.

---

4. **Architecture Decisions**
- **Direct Bash Execution with Streaming vs. Piped Long-Lived Bash**:
  - *Decision*: Execute commands via `spawn('/bin/bash', ['-c', command])` with streaming stdout/stderr events and current working directory tracking.
  - *Rationale*: Solves the glibc stdio pipe block-buffering bug that caused the terminal to appear dead/unresponsive, while guaranteeing identical execution semantics to the agent's `run_command` tool.
- **Compact Single-View UI**:
  - *Decision*: Remove secondary tabs and side panels entirely.
  - *Rationale*: Maximize terminal visibility on mobile portrait phones and desktop while removing unused complexity.

---

5. **Pseudo Code**

```shade
COMPONENT CompactTerminalPage:
  DATA:
    state:
      logs: Array<{ type: "cmd" | "stdout" | "stderr" | "system", text: string, cwd?: string }>
      inputCommand: string = ""
      cwd: string = "/app/applet"
      isExecuting: boolean = false
      history: Array<string> = []
      historyIdx: number = -1
      autoScroll: boolean = true

  LOGIC:
    action submitCommand(cmd: string):
      if isExecuting or !cmd.trim(): return
      appendLocalLog({ type: "cmd", text: cmd, cwd })
      sendToApi("/api/terminal/run", { command: cmd, cwd })
      trackHistory(cmd)

    action handleKeyDown(e):
      if e.key == "ArrowUp": cycleHistory(-1)
      if e.key == "ArrowDown": cycleHistory(1)

  RENDER:
    div.compactRoot:
      header.compactHeader(height=40px):
        div.left:
          a.backBtn(href="/"): CaretLeft(16)
          span.cwdBadge(text="~/applet ❯")
          span.livePulse
        div.right:
          select.quickSnippets:
            option("Snippets...")
            option("git status")
            option("ls -la")
          button(onClick=toggleAutoScroll): ArrowDown(14)
          button(onClick=copyOutput): Copy(14)
          button(onClick=clearOutput): Trash(14)

      main.terminalScreen:
        div.scrollArea:
          renderLogs()
        form.promptBar:
          span("❯")
          input(value=inputCommand, onChange=..., onKeyDown=...)
          button(type="submit", disabled=isExecuting): Play(13)
```
