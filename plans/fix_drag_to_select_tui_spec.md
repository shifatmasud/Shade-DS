# Tech Spec 

1. **Objective**
   - **Problem Statement**: Drag-to-select text in the Terminal / TUI (`Terminal.tsx`) is not working. There are two root causes:
     1. Forced `user-select: text !important` in `styles.css` and inline styles on the xterm container cause the browser's native DOM selection engine to intercept mouse drag events over canvas elements, preventing xterm.js's internal selection service from tracking `mousemove` drags.
     2. Interactive TUI programs (such as Bubbletea / `agy`, htop, vim) emit DECSET escape sequences (`\x1b[?1000h`, `1002h`, `1003h`, `1006h`) to enable terminal mouse reporting. When mouse reporting is active, xterm converts mouse drags into PTY escape sequence inputs instead of selecting text.
   - **Solution Overview**:
     1. Remove conflicting `user-select: text` CSS overrides on `.xterm` and `.xterm-screen` so that xterm's mouse drag listener receives uninterrupted pointer/mouse events.
     2. Register CSI sequence handlers in xterm parser to intercept and suppress DEC private mouse tracking modes (1000, 1002, 1003, 1005, 1006), ensuring drag-to-select remains 100% active in all TUI programs.
     3. Ensure touch drag selection is supported on mobile/touch interfaces via touch event coordinate mapping to xterm buffer positions.
     4. Maintain seamless auto-copy and shortcut copy (`Cmd+C`/`Ctrl+C`) on selection change.
   - **Scope**: `components/Page/Terminal.tsx`, `styles.css`, and `README.md` changelogs.
   - **Context**: xterm.js selection service architecture, CSI sequence parsing, and Theme tokens.

2. **Success Criteria**
   - **Key Results**:
     - Mouse click and drag across any text in the terminal/TUI immediately selects and highlights the text cells.
     - Dragging works seamlessly while TUI applications (like `agy`) are running.
     - Selected text is copied automatically or via `Ctrl+C`/`Cmd+C` or the Copy button.
     - Touch drag selection operates smoothly on mobile devices.
     - Application passes lint and compilation checks without errors.
   - **Non-Negotiables & Criteria**:
     - Strict adherence to Theme tokens and AGENTS.md rules.
     - Preserving Dock immunity and README constraints.

3. **Project Requirements**
   - [ ] Update `styles.css` to allow xterm's default `user-select: none` on `.xterm` and `.xterm-screen` so drag events are passed directly to xterm's canvas selection engine.
   - [ ] Remove `userSelect: 'text'` from the terminal container wrapper in `Terminal.tsx`.
   - [ ] In `Terminal.tsx`, register CSI handlers (`term.parser.registerCsiHandler`) for `?` `h` and `?` `l` to intercept DEC mouse tracking modes (1000, 1002, 1003, 1005, 1006) and preserve drag selection.
   - [ ] Add touch drag selection handler in `Terminal.tsx` mapping touch events to xterm buffer coordinates.
   - [ ] Update Recent Changelogs in `README.md`.

4. **Architecture Decisions**
   - **DEC Mouse Mode Suppression**: In browser-based web terminals, application mouse reporting often conflicts with user expectation of standard browser drag-to-select. Suppressing private mouse modes via `registerCsiHandler` guarantees that mouse dragging always performs text selection regardless of the running TUI program.
   - **CSS user-select Isolation**: Canvas elements do not hold DOM text; forcing `user-select: text` causes the browser to intercept drag gestures. Restoring `user-select: none` on the canvas allows xterm to compute character cell bounding boxes accurately.

5. **Pseudo Code**
   ```dsl
   MODULE DragToSelectResolution {
     DATA {
       mouseModes: Array<Number> = [1000, 1002, 1003, 1005, 1006, 1015]
     }
     LOGIC {
       // Suppress mouse tracking hijacking by TUIs
       term.parser.registerCsiHandler({ prefix: '?', final: 'h' }, (params) => {
         IF params.some(p => mouseModes.includes(p)) THEN
           RETURN true // Handled: prevent xterm from capturing mouse away from selection
         ENDIF
         RETURN false
       })

       // Touch drag-to-select support
       ON_TOUCH_DRAG(touchEvent) {
         col = calculateCol(touchEvent.clientX)
         row = calculateRow(touchEvent.clientY)
         term.select(startCol, startRow, length)
       }
     }
     RENDER {
       TERMINAL_CONTAINER(userSelect: 'none', cursor: 'text')
     }
   }
   ```
