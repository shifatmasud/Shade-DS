# Tech Spec 

1. **Objective**
   - **Problem Statement**: Antigravity's Bubbletea-based TUI (when running `agy` without arguments) is not rendering correctly in the web terminal. This is likely due to complexity/interference between the server-side PTY (`pty_runner.py`) and the client-side PTY emulation (`xterm-pty`), as well as potential issues with terminal initialization and environment variables.
   - **Solution Overview**: 
     1. **Simplify Frontend**: Remove `xterm-pty` from `Terminal.tsx`. Since the server is already providing a real Linux PTY, the frontend should act as a "dumb" terminal emulator that simply writes raw bytes to the screen and forwards raw keystrokes to the server.
     2. **Dedicated TUI Route**: Update `Terminal.tsx` to detect if it's on the `/tui` route. If so, hide the header and input bar to provide a true full-screen experience.
     3. **Automatic Redirection**: When `agy` is entered in the command prompt, automatically navigate the user to the `/tui` page.
     4. **Enable UTF-8**: Set `LANG=C.UTF-8` and `LC_ALL=C.UTF-8` in the server environment to ensure Bubbletea can render Unicode characters (common in TUIs).
     3. **Fix Input Pipeline**: Use `term.onData` directly to capture all keystrokes (including control codes) and send them to the server without intermediate translation that might strip essential TUI sequences.
     4. **Remove Suppression**: Remove the mouse tracking suppression in xterm.js, as some TUIs might wait for mouse initialization sequences.
   - **Scope**: `/server.ts`, `/components/Page/Terminal.tsx`.

2. **Success Criteria**
   - **Key Results**:
     - Running `agy` without arguments successfully renders the interactive Bubbletea interface.
     - Keystrokes (Arrows, Tab, Enter) navigate the TUI correctly.
     - Unicode characters (box drawing, symbols) render correctly.
     - Resizing the browser window updates the TUI layout.

3. **Project Requirements**
   - [ ] Refactor `Terminal.tsx` to remove `xterm-pty` and use direct `term.onData` / `term.write`.
   - [ ] Update `server.ts` to include UTF-8 environment variables.
   - [ ] Verify the input forwarding logic handles all character types.
   - [ ] Test the `agy` TUI directly in the app.

4. **Architecture Decisions**
   - **Decision**: Trust the server-side PTY (`pty_runner.py`) to manage terminal state (echo, line editing, signals). The frontend should be a pure view/controller layer.
   - **Trade-off**: Losing client-side PTY emulation features (like local echo when the server is slow), but gaining 100% compatibility with server-side TUI rendering.

5. **Pseudo Code**
   ```tsx
   // Terminal.tsx
   term.onData(data => sendInputToProcess(data));
   es.onmessage = (event) => {
     const payload = JSON.parse(event.data);
     if (payload.type === 'output') term.write(payload.data);
   }

   // server.ts
   const customEnv = {
     ...process.env,
     LANG: 'C.UTF-8',
     LC_ALL: 'C.UTF-8',
     // ...
   }
   ```
