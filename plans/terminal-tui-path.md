# Tech Spec 

1. **Objective**
- **Problem Statement**:
  The developer wants to inspect the AI agent's native command execution sessions directly from the browser, while also having access to an interactive user terminal in the same container. The solution must allow switching between the **User Terminal Session** and the **Agent Command Session** within an ultra-minimalist UI at `/terminal` (with alias `/tui`), without requiring custom command wrappers.
- **Solution Overview**:
  1. **Dual-Session Architecture (`server.ts`)**:
     - **User Session**: An interactive `/bin/bash` shell process with stdin/stdout streaming for the developer to type and execute commands directly in the container.
     - **Agent Session**: A persistent recorder/streamer that captures all container commands, tool executions, and task outputs (written to a standard container audit ring buffer at `/tmp/agent_terminal.log`) allowing the user to view the agent's real-time operations.
  2. **Ultra-Minimalist Session Selector UI (`/components/Page/Terminal.tsx`)**:
     - An ultra-minimal top status bar featuring a discreet session toggle: `[ user ]  [ agent ]`.
     - In **User Session**: Displays the interactive prompt (`$ `) with stdin input, command history, and direct shell interaction.
     - In **Agent Session**: Displays a read-only live log stream of commands executed by the AI agent, with automatic updates as new agent tasks run.
     - Strictly designed using `Theme.tsx` tokens (JS style objects with `base`/`variant`/`size`, `Surface` and `Content` tokens, procedural `theme.border.getBorder1px`, and zero Tailwind CSS).
  3. **Strict Route Isolation (`/terminal` and `/tui`)**:
     - Accessible exclusively by manual URL navigation to `/terminal` or `/tui`.
     - Home route `/` remains 100% untouched.
     - **Dock Immunity**: `/components/Section/Dock.tsx` is strictly untouched. No icons or links added.
- **Scope**:
  - `/components/Page/Terminal.tsx` (Page-level TUI component with session toggle)
  - `/server.ts` (Interactive user shell daemon + agent command log streamer)
  - `/components/App/App.tsx` (Manual route dispatch for `/terminal` and `/tui`)
- **Context**:
  Runs directly in the Cloud Run container environment behind port 3000.

---

2. **Success Criteria**
- **Key Results**:
  - Navigating to `/terminal` or `/tui` opens the ultra-minimalist Terminal TUI.
  - The user can toggle between `user` and `agent` sessions seamlessly.
  - In `user` session, commands run interactively inside the container `/bin/bash` shell.
  - In `agent` session, the user can observe live logs and command outputs from the AI agent's operations.
  - The AI agent continues using its native `run_command` tool without requiring bespoke shell wrappers.
  - Full adherence to `AGENTS.md` and `Theme.tsx` tokens (no Tailwind, JS style objects, typography spread).
  - Dock Immunity is strictly preserved (`/components/Section/Dock.tsx` unmodified).

---

3. **Project Requirements**
- [ ] Implement dual-session endpoints in `server.ts`:
  - `GET /api/terminal/stream?session=user|agent` (SSE for real-time output)
  - `POST /api/terminal/input` (stdin input for the user session)
  - `POST /api/terminal/log` (internal helper to record agent command runs to `/tmp/agent_terminal.log`)
- [ ] Create `/components/Page/Terminal.tsx` with Shade DSL architecture (Data, Logic, Render):
  - Minimal top header with `user` / `agent` session switch and connection indicator.
  - Monospace output viewer with auto-scroll and ANSI color stripping/formatting.
  - Interactive prompt line (active when in `user` session, hidden or status-only when in `agent` session).
- [ ] Register `/terminal` and `/tui` in `/components/App/App.tsx`.
- [ ] Verify build with `compile_applet`.

---

4. **Architecture Decisions**
- **Session Toggle vs. Shared Stdin**:
  - *Decision*: Separate the developer's interactive shell (`user`) from the agent's command inspection stream (`agent`), switchable via an ultra-minimal tab in the status rule.
  - *Trade-off*: Two distinct streams rather than multiplexing into a single interleaved input line.
  - *Benefit*: Dramatically simplifies execution, eliminates command collisions (e.g. typing while the agent is running a long build), and lets the agent use its native `run_command` tool without intrusive piping scripts.
- **Audit File Stream (`/tmp/agent_terminal.log`)**:
  - *Decision*: Maintain a lightweight rolling log file in `/tmp` for agent executions that the SSE server watches and broadcasts.
  - *Benefit*: Zero overhead, persistent across HTTP requests, and completely reliable.
- **Ultra-Minimalist Visual Design**:
  - *Decision*: A clean terminal window using `Theme.tsx` tokens with no cards, buttons, or SaaS clutter.
  - *Benefit*: Aligns with `AGENTS.md` anti-slop guidelines and provides maximum monospace screen area.

---

5. **Pseudo Code**

```shade
Module ServerTerminalService:
  Data:
    userShell: ChildProcess = spawn('/bin/bash', ['-i'], { env: process.env, cwd: process.cwd() })
    userBuffer: Array<string> = []
    agentLogPath: string = "/tmp/agent_terminal.log"
    listeners: Map<sessionType, Set<Response>> = new Map()

  Logic:
    on userShell.stdout.data(chunk):
      appendAndBroadcast("user", chunk.toString())

    on userShell.stderr.data(chunk):
      appendAndBroadcast("user", chunk.toString())

    watchAgentLog():
      fs.watchFile(agentLogPath, () => {
        content = fs.readFileSync(agentLogPath, 'utf8')
        broadcastTo("agent", content)
      })

    handleSSE(req, res):
      session = req.query.session || "user"
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
      initialData = session == "user" ? userBuffer.join('') : readAgentLog()
      res.write(`event: init\ndata: ${JSON.stringify(initialData)}\n\n`)
      registerListener(session, res)

    handleInput(cmd):
      userShell.stdin.write(cmd)

Component TerminalPage:
  Data:
    activeSession: 'user' | 'agent' = 'user'
    userLogs: string = ""
    agentLogs: string = ""
    input: string = ""
    history: Array<string> = []
    historyCursor: number = -1
    isConnected: boolean = false
    scrollRef: Ref<HTMLDivElement>

  Logic:
    onMount:
      connectSSE()

    switchSession(session):
      activeSession = session
      scrollToBottom()

    onKeyDown(e):
      if activeSession == "user":
        if e.key == "Enter":
          sendInput(input + "\n")
          history.push(input)
          historyCursor = -1
          input = ""
        else if e.key == "ArrowUp":
          navigateHistory(-1)
        else if e.key == "ArrowDown":
          navigateHistory(1)
        else if e.key == "c" && e.ctrlKey:
          sendInput("\x03")

  Render:
    Container (motion.div, style = style.container):
      TopBar (style = style.topBar):
        SessionToggle:
          ToggleItem ("user", active = (activeSession == "user"), onClick = () => switchSession("user"))
          Divider ("·")
          ToggleItem ("agent", active = (activeSession == "agent"), onClick = () => switchSession("agent"))
        StatusDot (connected = isConnected)

      OutputArea (ref = scrollRef, style = style.outputArea):
        Pre (text = (activeSession == "user" ? userLogs : agentLogs), style = style.logs)

      If activeSession == "user":
        PromptLine (style = style.promptLine):
          PromptGlyph ("$")
          Input (
            autoFocus = true,
            value = input,
            onChange = (e) => input = e.target.value,
            onKeyDown = onKeyDown,
            style = style.input
          )
      Else:
        AgentFooter (style = style.agentFooter):
          Text ("STREAMING AGENT EXECUTION SESSION (READ-ONLY)")
```
