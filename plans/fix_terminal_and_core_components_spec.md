# Tech Spec 

1. **Objective**
   - **Problem Statement**: Running `git status` in the terminal output `/bin/bash: line 1: git: command not found` (or corrupted execution). Additionally, `Terminal.tsx` currently relies on raw HTML `<button>`, `<select>`, and bespoke copy/check SVGs rather than the design-token driven components available in our Core package (`/components/Core`).
   - **Solution Overview**: 
     1. Resolve Git environment execution by ensuring `PATH` in `server.ts` explicitly includes the project's `./bin` and system binary paths (`/usr/local/bin`, `/usr/bin`, `/bin`), ensuring `./bin/git` is a valid executable binary with `chmod 755`, configuring `safe.directory '*'`, and ensuring the workspace git repository is initialized.
     2. Refactor `Terminal.tsx` to use Core package components: `Button`, `Select`, `AnimatedCopyIcon`, `AnimatedCheckIcon`, and `CustomScrollbar`, following Theme.tsx token conventions (`Surface`, `Content`, `Radius`, `Space`, `getBorder1px`), without raw CSS transitions or hardcoded hex styling.
   - **Scope**: `Terminal.tsx`, `components/Core/Select.tsx` (compact trigger support), and `server.ts` terminal execution environment. Protect `Dock.tsx` and `README.md`.
   - **Context**: Shade DSL architecture, reactive state, physical motion predictability, and touch/click parity.

2. **Success Criteria**
   - **Key Results**:
     - `git status`, `git log`, `ls -la`, and other commands execute successfully in the terminal UI and via `/api/terminal/run`.
     - `Terminal.tsx` uses `Button`, `Select`, and `AnimatedCopyIcon` from `components/Core`.
     - All buttons utilize the fluid motion suite, tactile feedback, and theme tokens.
     - Quick snippet selection via `Select` works seamlessly with keyboard and touch scrubbing parity.
     - Application compiles and lints with 0 errors.
   - **Non-Negotiables**:
     - Zero hardcoded CSS transitions (use Framer Motion).
     - Strict adherence to `Theme.tsx` tokens.
     - `Dock.tsx` untouched (Dock immunity).

3. **Project Requirements**
   - [x] Debug root cause of `git: command not found` and execute format error in `./bin/git`.
   - [x] Ensure `./bin/git` is populated with a valid executable binary (`chmod 755`) and git safe.directory configured.
   - [x] Update `server.ts` execution environment to prepend `./bin` and system binary paths to `PATH`.
   - [ ] Enhance `components/Core/Select.tsx` to conditionally omit empty label tags and support compact trigger styling for toolbar integration.
   - [ ] Refactor `components/Page/Terminal.tsx` to replace custom buttons with `Button` from `/components/Core/Button.tsx`.
   - [ ] Integrate `AnimatedCopyIcon` from `/components/Core/AnimatedCopyIcon.tsx` into the terminal copy action.
   - [ ] Integrate `Select` from `/components/Core/Select.tsx` for the Quick Snippets dropdown.
   - [ ] Integrate `CustomScrollbar` from `/components/Core/CustomScrollbar.tsx` for the terminal stream viewport.
   - [ ] Verify compilation and runtime terminal execution.

4. **Architecture Decisions**
   - **Core Button Integration**: Using `Button` from `/components/Core` brings ripple effects, state layers, responsive spring press animations, and auditory feedback directly to the terminal toolbar and command runner.
   - **Select Component for Snippets**: Replacing native HTML `<select>` with Core `Select` provides custom portal overlay positioning, follower spring highlights, and full mouse/touch scrubbing parity.
   - **Direct Binary Path Resolution**: Updating `server.ts` to prepend `${binDir}` and system paths ensures commands like `git`, `gh`, `node`, `npm` always resolve identically to the agent shell.

5. **Pseudo Code**
   ```dsl
   COMPONENT TerminalPage
   DATA
     state logs: string[]
     state inputCommand: string
     state cwd: string
     state isExecuting: boolean
     state autoScroll: boolean
     state copied: boolean
     state commandHistory: string[]
     state historyIndex: number
     ref logContainerRef: HTMLDivElement
     ref inputRef: HTMLInputElement

   LOGIC
     action runCommand: (cmd: string) -> async POST /api/terminal/run
     action handleCopy: () -> clipboard.writeText(logs.join('')) && setCopied(true)
     action handleClear: () -> POST /api/terminal/clear && setLogs([])
     event onKeyDown: (e) -> ArrowUp / ArrowDown history navigation
     effect connectSSE: EventSource('/api/terminal/stream')

   RENDER
     div.container
       header.toolbar
         div.left
           Link(to="/") -> Core.Button(variant="secondary", icon=CaretLeft)
           div.cwdBadge -> TerminalIcon, cwd, statusDot
         div.right
           Core.Select(options=QUICK_COMMANDS, onChange=runCommand)
           Core.Button(variant=autoScroll, icon=ArrowDown, onClick=toggleAutoScroll)
           Core.Button(variant="secondary", icon=Core.AnimatedCopyIcon(isCopied=copied), onClick=handleCopy)
           Core.Button(variant="secondary", icon=Trash, onClick=handleClear)
       Core.CustomScrollbar
         main.logViewer(ref=logContainerRef) -> logs
       form.promptBar(onSubmit=handleSubmit)
         span.promptGlyph "❯"
         input.commandInput(value=inputCommand, onChange, onKeyDown)
         Core.Button(variant="primary", type="submit", icon=Play/CircleNotch, disabled)
   ```
