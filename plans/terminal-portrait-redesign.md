# Tech Spec 

1. **Objective**
- **Problem Statement**:
  The current Terminal page component (`/components/Page/Terminal.tsx`) exhibits poor usability and visual distortion in mobile phone portrait mode (viewports under 480px width, e.g. 375px–414px):
  1. *Excessive Vertical Overhead*: A 3-tier stacked header system (Page Header [64px] + Mode Toolbar [56px] + Terminal Box Header [40px]) consumes over 200px of vertical space, leaving less than 50% of the mobile screen for terminal text.
  2. *Visual Stretching & Distortion*: Icons and status dots lack `flexShrink: 0`, causing them to compress into oblong ellipses or stretch when flex items shrink. Input containers without `minWidth: 0` cause horizontal overflow.
  3. *CLI Grid Overflow*: The CLI management view uses a fixed `gridTemplateColumns: '320px 1fr'` which immediately clips or overflows on mobile portrait displays.
  4. *Mobile Zoom Distortion*: The command input uses a `13px` font size, which triggers automatic browser zoom on iOS Safari, breaking the layout when focused.
  5. *Visual Clutter*: Redundant labels ("Shade TUI & Dual-Session Terminal", "Interactive Shell (/bin/bash)", "Agent Stream (/tmp/agent_terminal.log)", "Session Mode:") overwhelm small screens.

- **Solution Overview**:
  - Unify the interface into an ultra-minimal, single-tier navigation bar (~44px) combining session switching (`[ Shell | Agent | CLI ]`), return-to-app, and quick utilities (Auto-scroll, Copy, Clear).
  - Adopt dynamic viewport sizing (`100dvh` with `100%` fallback) and responsive typography/spacing driven by `useBreakpoint()`.
  - Fix all visual distortion: lock all icons and indicators with `flexShrink: 0` and square aspect ratios; set mobile inputs to `16px` to prevent iOS zoom distortion.
  - Redesign the CLI tab with a responsive single-column layout on mobile, giving full width to tool configuration and output streams.
  - Maximize terminal canvas area (>85% screen coverage on mobile portrait) with clean monospace typography and edge-to-edge padding.

- **Scope**:
  - `/components/Page/Terminal.tsx`: Complete ultra-minimal redesign with full portrait mobile parity.
  - `/plans/terminal-portrait-redesign.md`: Architecture and planning document.
  - Invariants: All existing backend SSE streaming (`/api/terminal/stream`, `/api/terminal/log`, `/api/terminal/input`, `/api/cli/*`) remain intact and functional.
  - Protected: `/components/Section/Dock.tsx` remains strictly unmodified (Dock Immunity).

- **Context**:
  Runs at `/terminal` and `/tui` in a full-stack Node.js/Express + Vite container environment on Cloud Run.

---

2. **Success Criteria**
- **Key Results**:
  - Navigating to `/terminal` or `/tui` on a portrait mobile phone displays an ultra-clean, minimal terminal interface with zero horizontal overflow or clipping.
  - Vertical header overhead is reduced from ~220px to ~44px, maximizing the visible log stream.
  - Zero visual stretching: all icons, dots, and pills preserve exact 1:1 aspect ratios under any screen width.
  - Focusing the terminal command input on mobile devices does not trigger unwanted iOS Safari viewport zooming.
  - Mode switching between `Interactive Shell`, `Agent Stream`, and `CLI Auth` is instantaneous via a sleek segmented pill control.
  - The CLI tab automatically switches to a responsive single-column stacked layout on mobile viewports.
  - Full adherence to `AGENTS.md` and `Theme.tsx` tokens (JS style objects, `Surface`/`Content` tokens, procedural border helpers, zero Tailwind, zero new icon libraries).

---

3. **Project Requirements**
- [ ] Create Tech Spec planning document in `/plans/terminal-portrait-redesign.md`.
- [ ] Extract Shade DSL architecture (Data, Logic, Render) for the minimal Terminal component.
- [ ] Redesign `/components/Page/Terminal.tsx`:
  - [ ] Single consolidated top bar (~44px): Left (back arrow + minimalist `term`), Center (segmented pills: `Shell` / `Agent` / `CLI`), Right (Auto-scroll toggle, Copy, Clear).
  - [ ] Terminal Canvas: Full-height monospace display with native smooth scroll, edge-to-edge responsive padding, and subtle hairline border.
  - [ ] Input Bar: Sleek prompt glyph (`❯`), auto-scaling responsive input (`fontSize: 16px` on mobile, `13px` on desktop), touch-friendly execute button (`minHeight: 44px` touch target).
  - [ ] Prevent stretching: Apply `flexShrink: 0` to all icons (`Phosphor` icons), status dots, and button wrappers. Add `minWidth: 0` to all flex text containers.
  - [ ] Responsive CLI tab: Convert grid from static `320px 1fr` to responsive `mobile ? '1fr' : '300px 1fr'` with compact credential accordions and full-width output view.
- [ ] Verify build and compilation with `compile_applet`.
- [ ] Review all changes before responding to the user.

---

4. **Architecture Decisions**
- **Unified Single Header vs. Multi-Toolbar**:
  - *Decision*: Eliminate both the secondary session toolbar and the tertiary terminal window header, merging all controls into a single 44px top status bar.
  - *Trade-off*: Removes descriptive subtext strings like "Interactive Shell (/bin/bash)".
  - *Benefit*: Recovers over 160px of screen real estate on mobile portrait, providing an uncluttered, developer-grade terminal interface.
- **Dynamic Viewport Height (`100dvh`)**:
  - *Decision*: Use `100dvh` for mobile container sizing.
  - *Benefit*: Accommodates mobile Safari/Chrome address bar expansions and software keyboard appearance without page jitter or clipping.
- **Responsive Font Sizing on Inputs**:
  - *Decision*: Set input font size to `16px` on mobile breakpoints and `13px` on desktop.
  - *Benefit*: Prevents mobile browsers (specifically iOS WebKit) from triggering an automatic viewport zoom when the input receives focus, ensuring the terminal UI never stretches or breaks alignment.
- **Aspect Ratio & Flex-Shrink Locks**:
  - *Decision*: Explicitly set `flexShrink: 0`, `aspectRatio: '1/1'`, and fixed dimensions on all icons and status dots.
  - *Benefit*: Eliminates all forms of icon stretching or squishing in portrait mode.

---

5. **Pseudo Code**

```shade
COMPONENT TerminalPage:
  DATA:
    props: {}
    state:
      activeTab: "terminal" | "cli" = "terminal"
      activeSession: "user" | "agent" = "user"
      userLogs: Array<string> = []
      agentLogs: Array<string> = []
      inputCommand: string = ""
      autoScroll: boolean = true
      copied: boolean = false
      selectedCli: "github" | "vercel" | "supabase" | "notion" = "github"
      cliOutput: string = ""
      isCliLoading: boolean = false
      cliConfig: CliConfig | null = null
    derived:
      breakpoint: Breakpoint = useBreakpoint() // "mobile" | "tablet" | "desktop"
      isMobile: boolean = breakpoint === "mobile"
    ref:
      logContainerRef: HTMLDivElement

  LOGIC:
    effect connectSSEStreams():
      userStream = EventSource("/api/terminal/stream")
      agentStream = EventSource("/api/terminal/log")
      return () => { userStream.close(); agentStream.close(); }

    effect handleAutoScroll():
      if autoScroll and logContainerRef.current:
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight

    action submitCommand(cmd):
      fetch("/api/terminal/input", { method: "POST", body: { input: cmd + "\n" } })

    action copyLogs():
      text = activeSession == "user" ? userLogs.join("") : agentLogs.join("\n")
      navigator.clipboard.writeText(text)
      copied = true

  RENDER:
    div.container(style=containerStyle):
      // Single Unified Top Bar
      header.topBar(style=topBarStyle):
        div.leftGroup:
          a.backButton(href="/"):
            Icon.CaretLeft(flexShrink=0)
          span.brand(text="~/term")
        
        nav.segmentedNav:
          button(active=activeTab=="terminal" && activeSession=="user", text="Shell")
          button(active=activeTab=="terminal" && activeSession=="agent", text="Agent")
          button(active=activeTab=="cli", text="CLI")

        div.actionsGroup:
          button.action(onClick=toggleAutoScroll, title="Auto-scroll"):
            span.statusDot(active=autoScroll, flexShrink=0)
          button.action(onClick=copyLogs, title="Copy"):
            Icon.Copy(flexShrink=0)
          button.action(onClick=clearLogs, title="Clear"):
            Icon.Trash(flexShrink=0)

      // Main Content
      if activeTab == "terminal":
        main.terminalArea(style=terminalAreaStyle):
          div.logView(ref=logContainerRef, style=logViewStyle):
            renderActiveLogs(activeSession)
          if activeSession == "user":
            form.promptBar(onSubmit=submitCommand, style=promptBarStyle):
              span.promptGlyph(text="❯", flexShrink=0)
              input.commandInput(
                value=inputCommand,
                fontSize=isMobile ? "16px" : "13px",
                flex=1,
                minWidth=0
              )
              button.sendBtn(type="submit", flexShrink=0):
                Icon.Play(size=14, flexShrink=0)

      else:
        main.cliArea(style=cliAreaStyle, layout=isMobile ? "column" : "grid"):
          section.credentialsManager:
            renderCliCredentials()
          section.actionsRunner:
            renderCliToolSelector()
            div.cliOutputBox:
              text(cliOutput)

  STYLE:
    containerStyle: {
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      width: "100vw",
      maxWidth: "100vw",
      overflow: "hidden",
      backgroundColor: theme.Color.Base.Surface[1]
    }
    topBarStyle: {
      height: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: isMobile ? "0 8px" : "0 16px",
      backgroundColor: theme.Color.Base.Surface[2],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3])
    }
    terminalAreaStyle: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#070707",
      color: "#00ff66",
      overflow: "hidden",
      margin: isMobile ? "0px" : "8px",
      borderRadius: isMobile ? "0px" : theme.radius["Radius.M"],
      ...theme.border.getBorder1px(theme.Color.Base.Surface[3])
    }
```
