# Tech Spec 

1. **Objective**
   - **Problem Statement**: Running `agy` in the Terminal TUI page successfully starts the Bubbletea interface, but subsequent keyboard inputs fail to register in the PTY and the Send button remains perpetually stuck in a loading state (`CircleNotch` spinner).
   - **Root Causes Identified**:
     1. *Carriage Return vs Newline in Raw PTY*: `Terminal.tsx` submits interactive input with trailing `\n` instead of `\r`. Bubbletea TUIs (such as `agy`) configure the PTY slave in raw mode where `ICRNL` translation is disabled. While `\r` (0x0D) triggers option selection, `\n` (0x0A) is ignored.
     2. *Send Button Infinite Spinner*: `Terminal.tsx` sets the button icon to `<CircleNotch className="fa-spin" />` whenever `isExecuting && !inputCommand.trim()`. For persistent interactive commands like `agy`, `isExecuting` stays `true`, leaving the button in an endless loading state.
     3. *Direct Keyboard & Touch Parity Missing*: Keystrokes are only captured inside the `<input>` element rather than through a direct terminal keyboard listener. Quick interactive navigation keys (`1`, `2`, `q`, `Enter`, arrows, `Ctrl+C`) and touch buttons for interactive TUI choices are missing.
     4. *Process Lifecycle & Interruption*: When an interactive process is active, subsequent shell commands are swallowed. The terminal needs a clear active session banner, a prominent Stop/Interrupt action, and an option to force return to the standard bash prompt.
   - **Solution Overview**:
     1. Update `Terminal.tsx` and `server.ts` to ensure interactive input sends `\r` (carriage return) for Enter and raw escape codes for control keys.
     2. Refactor the Send button to show an active action icon (e.g., `CornerDownLeft` or `Play`) with a dedicated `isSubmitting` state instead of tying the spinner to the entire interactive process lifespan.
     3. Implement a global/terminal-focused keydown handler and quick interactive action chips (`[1]`, `[2]`, `[↑]`, `[↓]`, `[↵ Enter]`, `[q Quit]`, `[⏹ Interrupt]`) for seamless desktop keyboard and mobile touch parity.
     4. Add an active process status bar indicating the foreground TUI name and providing an instant "Stop / Reset Prompt" action that cleanly terminates the process.
   - **Scope**: `components/Page/Terminal.tsx`, `server.ts`, and `scripts/pty_runner.py`. Strictly preserve `components/Section/Dock.tsx` (Dock immunity) and `README.md`.
   - **Context**: Shade DSL architecture, Theme.tsx design tokens, responsive mobile/touch parity, non-blocking asynchronous streaming.

2. **Success Criteria**
   - **Key Results**:
     - Typing `1` or `2` and pressing Enter in `agy` instantly submits `\r`, advancing the `agy` TUI to the OAuth login flow.
     - The Send button no longer displays a perpetual loading spinner during interactive sessions.
     - Direct keyboard controls (numbers, arrows, Enter, Escape, Ctrl+C) work seamlessly inside the terminal.
     - Interactive quick chips provide complete touch and mouse parity for one-tap navigation.
     - Stopping an active command cleanly restores the standard bash prompt (`❯`) and allows running standard commands (`ls`, `git status`).
     - Zero build or lint regressions (`compile_applet` and `lint_applet` pass).
   - **Non-Negotiables**:
     - `components/Section/Dock.tsx` remains untouched (Dock immunity).
     - Strict adherence to `Theme.tsx` design tokens and Framer Motion spring animations.
     - No new icon libraries installed.

3. **Project Requirements**
   - [x] Conduct scientific debugging and empirical reproduction of `\n` vs `\r` behavior in `agy` PTY.
   - [ ] Update `components/Page/Terminal.tsx` to format interactive keystroke payloads with `\r` for Enter.
   - [ ] Decouple the Send button loading spinner from `isExecuting`, replacing it with a quick transit indicator and active send icon.
   - [ ] Implement direct keyboard listeners and interactive quick-action chips (`[1]`, `[2]`, `[↑]`, `[↓]`, `[↵ Enter]`, `[q Quit]`, `[⏹ Stop]`).
   - [ ] Enhance `server.ts` `/api/terminal/input` and `/api/terminal/interrupt` to translate line feeds to carriage returns and ensure robust process group termination.
   - [ ] Verify execution with `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
   - **Carriage Return Protocol for Raw PTYs**: Standard POSIX raw terminals expect `\r` for Enter. By sanitizing and translating input line endings in both `Terminal.tsx` and `server.ts`, all raw-mode CLI TUIs (Bubbletea, Ink, Blessed) function reliably.
   - **Interactive Quick Chips for Touch Parity**: Providing interactive touch chips directly above the prompt bar ensures full accessibility and mobile responsiveness without requiring a software keyboard for simple menu choices.

5. **Pseudo Code**
   ```dsl
   MODULE TerminalInteractive
   DATA
     state activeProcess: string | null
     state isSubmitting: boolean
     state isExecuting: boolean
   LOGIC
     action sendKey: (key: string) ->
       payload = key == 'Enter' ? '\r' : key
       POST /api/terminal/input { input: payload }
     action interruptProcess: () ->
       POST /api/terminal/interrupt
       setIsExecuting(false)
   RENDER
     if isExecuting:
       StatusBar(name: activeProcess, onStop: interruptProcess)
       QuickActionChips([
         Chip('1', onClick: () => sendKey('1\r')),
         Chip('2', onClick: () => sendKey('2\r')),
         Chip('↑', onClick: () => sendKey('\x1b[A')),
         Chip('↓', onClick: () => sendKey('\x1b[B')),
         Chip('↵', onClick: () => sendKey('\r')),
         Chip('Stop', onClick: interruptProcess)
       ])
     CommandBar(
       icon: isSubmitting ? Spinner : isExecuting ? SendIcon : PlayIcon
     )
   ```
