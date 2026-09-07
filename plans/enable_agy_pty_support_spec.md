# Tech Spec 

1. **Objective**
   - **Problem Statement**: The Antigravity CLI (`agy`) is installed at `/root/.local/bin/agy`, but running `agy` fails to launch anything in the terminal UI or prints `bubbletea: could not open TTY: open /dev/tty: no such device or address`. This occurs because (1) `/root/.local/bin` is not in the default execution `PATH` in `server.ts`, (2) `executeTerminalCommand` executes commands via Node's `child_process.spawn` with piped stdio rather than allocating a pseudo-terminal (PTY) with terminal window geometry (`TIOCSWINSZ`), and (3) interactive Bubbletea TUIs require live bidirectional stdin stream forwarding and interrupt controls (`SIGINT` / Ctrl+C), which are currently locked while `isExecuting` is true in `Terminal.tsx`.
   - **Solution Overview**: 
     1. Prepend `/root/.local/bin` and create an executable symlink in `./bin/agy` to ensure `agy` is recognized anywhere in the environment without absolute path qualifiers.
     2. Implement a dedicated PTY-backed runner mechanism in Python/Node (using the container's built-in Python 3 `pty`, `termios`, and `fcntl` modules) that allocates a genuine `/dev/pts/*` pseudo-terminal, sets terminal window size (80x24 / 120x30), and connects bidirectional input and output streams.
     3. Wire up `/api/terminal/input` and `/api/terminal/interrupt` endpoints in `server.ts` to forward live keystrokes to the active PTY master fd and send `SIGINT` on cancel.
     4. Update `Terminal.tsx` to enable interactive keystroke dispatch while a command is active (or provide an interactive prompt input mode with an "Interrupt / Ctrl+C" button), allowing users to navigate `agy`'s login selector (Google OAuth vs Cloud project) and authenticate seamlessly.
   - **Scope**: `server.ts`, `scripts/pty_runner.py` (PTY allocation helper), and `components/Page/Terminal.tsx`. Strictly preserve `components/Section/Dock.tsx` (Dock immunity) and `README.md`.
   - **Context**: Shade DSL architecture, reactive state synchronization, low-latency SSE streaming, touch/mouse parity, and design tokens from `Theme.tsx`.

2. **Success Criteria**
   - **Key Results**:
     - `agy` launches successfully in the Terminal UI, rendering the Bubbletea TUI ("Welcome to the Antigravity CLI. Select login method: 1. Google OAuth 2. Use a Google Cloud project").
     - `agy -h`, `agy --help`, and non-interactive `agy -p "..."` commands execute cleanly with exit code 0.
     - Terminal UI supports sending interactive keystrokes (`1`, `2`, Enter, arrows) and an "Interrupt (Ctrl+C)" action to cancel running CLI sessions safely.
     - Zero build or lint regressions (`compile_applet` and `lint_applet` pass).
   - **Non-Negotiables**:
     - `Dock.tsx` remains strictly untouched (Dock immunity).
     - Strict adherence to `Theme.tsx` design tokens and Framer Motion spring physics (no raw CSS transitions).
     - No external icon dependencies.

3. **Project Requirements**
   - [x] Diagnose root cause of `agy` launch failure (`/dev/tty` missing from piped spawn and missing `/root/.local/bin` in PATH).
   - [x] Verify PTY allocation using Python's native `pty` and `termios` `TIOCSWINSZ` ioctl.
   - [ ] Symlink `/root/.local/bin/agy` into `./bin/agy` and update `PATH` in `server.ts` to include `/root/.local/bin` and `${process.env.HOME}/.local/bin`.
   - [ ] Implement `scripts/pty_runner.py` to spawn child processes inside an authentic PTY master/slave pair with configurable window dimensions and non-blocking I/O.
   - [ ] Update `server.ts` to route interactive commands through the PTY runner, expose active process stdin via `POST /api/terminal/input`, and support `POST /api/terminal/interrupt`.
   - [ ] Update `components/Page/Terminal.tsx` to allow typing/submitting interactive input while a command is executing, and add a responsive "Interrupt (Ctrl+C)" button with tactile spring feedback.
   - [ ] Verify execution of `agy -h`, `agy`, and standard workspace commands (`ls -la`, `git status`).

4. **Architecture Decisions**
   - **Native Python PTY Runner over `node-pty`**: The container environment does not contain `gcc` or `make` to compile native C++ Node addons, whereas Python 3 is pre-installed with full standard library PTY support (`pty`, `termios`, `fcntl`, `select`). A lightweight runner script ensures 100% native stability with zero compiler dependencies.
   - **Window Size Geometry (`TIOCSWINSZ`)**: Bubbletea checks terminal geometry upon startup; setting initial rows (24) and columns (80-120) prevents `agy` from suspending its render loop.
   - **Bidirectional In-flight Input Streaming**: Maintaining a handle to the active process's PTY master input descriptor allows `POST /api/terminal/input` to pass user selections directly into the running session without restarting the process.

5. **Pseudo Code**
   ```dsl
   MODULE PtyRunner
   DATA
     param command: string
     param cwd: string
     param env: map<string, string>
     param rows: int = 24
     param cols: int = 80
   LOGIC
     openpty(master, slave)
     setWindowSize(slave, rows, cols)
     proc = spawn(command, stdin=slave, stdout=slave, stderr=slave)
     loop:
       select([master, sys.stdin])
       if master has data:
         sys.stdout.write(read(master))
       if sys.stdin has data:
         write(master, read(sys.stdin))
       if proc.poll(): break

   COMPONENT TerminalPage
   DATA
     state logs: string[]
     state inputCommand: string
     state isExecuting: boolean
     state activeCommand: string
   LOGIC
     action runCommand: (cmd) ->
       POST /api/terminal/run { command: cmd }
     action sendInput: (text) ->
       POST /api/terminal/input { input: text }
     action sendInterrupt: () ->
       POST /api/terminal/interrupt
     RENDER
       CustomScrollbar -> OutputView(logs)
       Toolbar -> InterruptButton(onClick: sendInterrupt, visible: isExecuting)
       CommandInput(onKeyDown: if isExecuting sendInput else runCommand)
   ```
