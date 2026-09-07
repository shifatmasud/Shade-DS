# Tech Spec

1. **Objective**
   - **Problem Statement**:
     1. When running interactive CLI TUIs (such as `agy` or Bubbletea/ncurses programs), key events (arrow keys, Enter, Esc, number selections) are not reliably registered or dispatched due to input focus loss, newline `\n` vs carriage return `\r` mismatches in raw PTY mode, and missing keyboard listeners on the terminal canvas.
     2. The terminal output display renders unneeded raw ANSI control sequences (e.g. `[?2026$p`, `[>4m`, `[=0;1u`, `[>4;2m`, `[?1049h`, `[?25l`, `[6G`, `[8;2H`, `[K`, `[3A`, and OSC 8 hyperlinks `]8;id=...`) because the regex parser in `Terminal.tsx` does not strip private CSI modes, device control strings, cursor manipulation sequences, and OSC escape codes before SGR color parsing.
   - **Solution Overview**:
     1. Refactor `renderAnsiLogs` with a comprehensive, robust ANSI sequence sanitizer and parser that removes all OSC (Operating System Commands), private CSI sequences (`?`, `>`, `=`, `$`), cursor positioning (`[H`, `[2J`, `[K`, `[#A`, `[#G`, `[#;#H`), and two-byte ESC codes, while flawlessly preserving SGR truecolor (`\x1b[38;2;r;g;bm`), 16-color, 256-color, bold, and reset codes mapped to Theme.tsx semantic design tokens.
     2. Enhance keyboard capture and interactive responsiveness in `Terminal.tsx`:
        - Global keydown and terminal container focus handlers when an interactive process is active.
        - Proper mapping and forwarding of key events: `ArrowUp` (`\x1b[A`), `ArrowDown` (`\x1b[B`), `ArrowRight` (`\x1b[C`), `ArrowLeft` (`\x1b[D`), `Enter` (`\r`), `Escape` (`\x1b`), `Tab` (`\t`), `Backspace` (`\x7f`), and Ctrl+C (`\x03` / interrupt).
        - Expanded Quick Keys toolbar including `↑`, `↓`, `←`, `→`, `Enter ↵`, `Esc`, `1`, `2`, `y`, `n`, `Space`, `Ctrl+C`.
        - Clicking anywhere on the terminal screen auto-focuses the interactive prompt input.
     3. Ensure `server.ts` handles raw PTY input by properly translating trailing `\n` to `\r` and maintaining active process stream consistency.
   - **Scope**:
     - `/components/Page/Terminal.tsx`
     - `/server.ts`
   - **Context**:
     - Built using Theme.tsx design tokens and React 18 / Vite.

2. **Success Criteria**
   - **Key Results**:
     - Zero unneeded ANSI escape sequences (e.g., `[3A`, `[?2026$p`, `[>4m`, `[=0;1u`, `]8;id=...`) appear as literal text in the terminal stream viewer.
     - Interactive CLI tools like `agy`, bash scripts, and menu selections respond immediately to keyboard strokes (arrows, enter, numbers) and Quick Key buttons.
     - Clicking on the terminal screen immediately focuses input for seamless typing.
     - Color formatting (Antigravity CLI banner, status highlights, error codes) remains vibrant and correctly styled using Theme.tsx tokens.
   - **Non-Negotiables**:
     - Pure Theme.tsx design tokens (no Tailwind / manual CSS transitions).
     - Protected files untouched (`Dock.tsx`, `README.md`).

3. **Project Requirements**
   - [ ] Implement `cleanAnsiForDisplay` in `Terminal.tsx` to scrub all OSC, DCS, private CSI, cursor movements, and protocol negotiation sequences.
   - [ ] Update `renderAnsiLogs` in `Terminal.tsx` to handle truecolor, 256-color, standard SGR colors, and bold weights mapped to Theme tokens.
   - [ ] Implement focus management so clicking anywhere in the terminal screen focuses the input.
   - [ ] Add comprehensive keyboard event listener for interactive process mode in `Terminal.tsx`.
   - [ ] Expand Quick Key buttons in `Terminal.tsx` to include `1`, `2`, `y`, `n`, `Space`, `Enter ↵`, `Esc`, `↑`, `↓`, `Ctrl+C`.
   - [ ] Verify `server.ts` `/api/terminal/input` and `/api/terminal/run` endpoints.
   - [ ] Validate compilation with `compile_applet`.

4. **Architecture Decisions**
   - **Multi-stage ANSI sanitizer**: By stripping non-SGR sequences (OSC hyperlinks, cursor moves, private terminal modes) before running the SGR color tokenizer, we avoid broken escape character fragments like `[3A` or `[>4m` leaking into the visual DOM.
   - **Carriage Return `\r` for PTY raw input**: In Linux PTY raw mode, processes listen for `\r` rather than `\n`. Normalizing Enter keypresses to `\r` ensures instant selection response in Bubbletea, ncurses, and `agy`.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   COMPONENT TerminalPage:
     DATA:
       logs: Array<String>
       inputCommand: String
       isExecuting: Boolean
       activeProcess: String?
     LOGIC:
       FUNCTION cleanAnsi(text: String) -> String:
         REMOVE OSC: text.replace(/\x1b\][^\x1b\x07]*(?:\x1b\\|\x07)/g, "")
         REMOVE Private CSI: text.replace(/\x1b\[[\?>=<][^\x1bA-Za-z~]*[A-Za-z~]/g, "")
         REMOVE Cursor/Non-SGR CSI: text.replace(/\x1b\[[0-9;:]*([A-LN-Za-ln-z~]|\$[A-Za-z])/g, "")
         REMOVE Escapes: text.replace(/\x1b[()#%*+-\/][A-Za-z0-9]|\x1b[<=>M78DEHNOPVXZ]/g, "")
         RETURN text
       FUNCTION handleKeyDown(event: KeyEvent):
         IF isExecuting:
           IF event.key == "Enter" -> sendInput(inputCommand ? inputCommand + "\r" : "\r")
           IF event.key == "ArrowUp" -> sendInput("\x1b[A")
           IF event.key == "ArrowDown" -> sendInput("\x1b[B")
     RENDER:
       View(style=containerStyle):
         Header(style=headerStyle)
         Screen(style=logViewerStyle, onClick=focusInput):
           renderAnsiLogs(logs)
         PromptBar:
           QuickKeysToolbar()
           InputField(onKeyDown=handleKeyDown)
   ```
