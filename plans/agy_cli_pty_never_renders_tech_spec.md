# Tech Spec 

1. **Objective**
   - **Problem Statement**: The Antigravity CLI (`agy`) never renders or hangs indefinitely in the interactive web terminal because `server.ts` uses `/usr/bin/script` to emulate a terminal, which lacks genuine bidirectional PTY support, causing Bubbletea (Go TUI framework) to hang or fail to render, and because `bin/agy` lacked executable permissions.
   - **Solution Overview**: 
     1. Mark `bin/agy` as executable (`chmod 755`) so that it can execute cleanly under any shell or runner.
     2. Refactor `server.ts` to execute shell commands using the robust `scripts/pty_runner.py` pseudo-terminal runner whenever it is available.
     3. Ensure `server.ts` falls back gracefully to standard execution if Python/PTY-runner fails.
     4. Update client-side `Terminal.tsx` to route incoming SSE streaming payloads through `slave.write(...)` of `xterm-pty` instead of directly writing to xterm's `.write(...)`, which bypasses virtual terminal echo and alternate buffer state tracking.
     5. Enable in-band window resize packets (`__PTY_RESIZE__:COLS:ROWS\n`) to propagate cleanly to `pty_runner.py` on window resize.
   - **Scope**: `/server.ts`, `/components/Page/Terminal.tsx`, and `/plans/agy_cli_pty_never_renders_tech_spec.md`.

2. **Success Criteria**
   - **Key Results**:
     - `agy` interactive command starts and renders cleanly in the web terminal.
     - Keystrokes, arrows, enter, escape, and other terminal shortcuts are successfully captured and handled by the remote `agy` shell.
     - Resize signals are successfully captured, and Bubbletea layouts adapt perfectly.
     - Applet compiles and lints with zero errors.

3. **Project Requirements**
   - [x] Create detailed plan in `/plans/`.
   - [ ] Make `bin/agy` executable (done in investigation).
   - [ ] Update `server.ts` to utilize `scripts/pty_runner.py` for full kernel-level PTY allocation with SIGWINCH support and in-band resize forwarding.
   - [ ] Refactor `/components/Page/Terminal.tsx` to pipe incoming SSE stream data through `slave.write` of `xterm-pty` for accurate state alignment.
   - [ ] Verify applet builds and lints successfully.

4. **Architecture Decisions**
   - **Decision**: Reinstate `pty_runner.py` as the primary terminal emulator runner because `/usr/bin/script` fails to support interactive ncurses/Bubbletea applications correctly when piped under Node's `child_process.spawn`.
   - **Trade-off**: Requires `python3`, which is confirmed to be present in the container image (`Python 3.10.12`).
   - **Alternative**: Raw `bash -c`, which does not support TUI interactive programs at all because `isatty` returns false.

5. **Pseudo Code**
   ```dsl
   MODULE PtyTerminalEngine {
     LOGIC {
       FUNCTION runTerminalCommand(commandToRun, cwd, rows, cols) {
         ptyRunnerPath = "/app/applet/scripts/pty_runner.py"
         IF fileExists(ptyRunnerPath) THEN
           spawnCmd = "python3"
           spawnArgs = [ptyRunnerPath, "--cwd", cwd, "--rows", rows, "--cols", cols, commandToRun]
         ELSE
           spawnCmd = "/usr/bin/script"
           spawnArgs = ["-q", "-f", "-e", "-c", commandToRun, "/dev/null"]
         ENDIF
         
         proc = spawn(spawnCmd, spawnArgs)
         RETURN proc
       }
     }
   }
   
   MODULE TerminalClientBridge {
     RENDER {
       onMessage(event) {
         payload = JSON.parse(event.data)
         IF payload.data THEN
           IF ptySlave EXISTS THEN
             ptySlave.write(payload.data)
           ELSE
             term.write(payload.data)
           ENDIF
         ENDIF
       }
     }
   }
   ```
