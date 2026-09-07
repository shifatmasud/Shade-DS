# Tech Spec 

1. **Objective**
- **Problem Statement**:
  The Terminal page still feels cluttered and visually awkward on portrait mobile devices for several specific reasons:
  1. *Tabs crammed into the header*: Compacting the back button, breadcrumb, 3 mode tabs, and 3 action buttons into a single 44px top row leaves under 170px of horizontal space for the tabs, causing cramped tap targets and visual congestion.
  2. *Chaotic button walls in CLI view*: The CLI view presents a wrapping cluster of 4 provider buttons plus up to 8 individual action buttons (`Verify Auth`, `Repos`, `Issues`, `Projects`, `DB Projects`, `Pages`, `Workspaces`) spanning multiple lines, creating a messy, unpolished interface.
  3. *Lack of clean selector hierarchy*: Mode and tool selection should leverage dedicated rows and native/custom dropdown selectors when choices exceed comfortable button spacing.

- **Solution Overview**:
  - **Separate Rows for Header & Tabs**:
    - **Row 1 (Header Bar - 44px)**: Left: Return-to-app icon button + `term` indicator with live green pulse. Right: Utility actions (`Auto-scroll` toggle, `Copy`, `Clear`).
    - **Row 2 (Dedicated Navigation / Tab Bar - 42px)**: A dedicated, full-width segmented control bar displaying `Shell`, `Agent`, and `CLI` with generous touch targets (equal `flex: 1` width on mobile portrait).
  - **Drop-Down Selectors for Tools & Actions**:
    - Replace the scattered row of 4 provider buttons with a styled Dropdown Selector: `Service: [ GitHub ▾ ]` (GitHub, Vercel, Supabase, Notion).
    - Replace the 8 scattered action buttons with a contextual Action Dropdown Selector: `Action: [ List Repositories ▾ ]` + a single sleek `Execute` button.
    - When on mobile portrait in the CLI tab, provide a clean dropdown or clean segmented switch between `Credentials (.env)` and `Actions & Console`.
  - **Refined Aesthetics & Zero Distortion**:
    - Maintain strict 1:1 aspect ratios and `flexShrink: 0` on all icons and status dots.
    - Set all mobile inputs and select triggers to `16px` to prevent iOS Safari auto-zoom.
    - Adhere strictly to `Theme.tsx` tokens, procedural border helpers, and JS style objects.

- **Scope**:
  - `/components/Page/Terminal.tsx`: Complete layout restructuring with separate tab row and dropdown action selectors.
  - `/plans/terminal-multiline-dropdown-fix.md`: This comprehensive Tech Spec.
  - Invariants: All SSE stream endpoints (`/api/terminal/stream`, `/api/terminal/log`, `/api/terminal/input`, `/api/cli/*`) remain 100% active and connected.
  - Protected: `/components/Section/Dock.tsx` remains strictly untouched.

---

2. **Success Criteria**
- **Key Results**:
  - Top header and navigation are cleanly separated into two distinct, dedicated horizontal rows: Header row (44px) and Tab row (40px).
  - The CLI view replaces cluttered multi-button rows with high-craft Dropdown Selectors for provider selection and command selection.
  - On mobile portrait phones (360px–414px width), the interface feels spacious, uncrowded, and developer-grade, with zero horizontal overflow or clipping.
  - All icons and indicators maintain strictly locked 1:1 square aspect ratios (`flexShrink: 0`).
  - Inputs and dropdown triggers on mobile use `16px` font size to eliminate iOS Safari viewport zoom shifts.
  - 100% pass on TypeScript compilation and linting without warnings.

---

3. **Project Requirements**
- [ ] Create Tech Spec in `/plans/terminal-multiline-dropdown-fix.md`.
- [ ] Reorganize `/components/Page/Terminal.tsx` layout into clean visual tiers:
  - [ ] **Row 1**: Top Status Bar (Back button, `term` title with live indicator, Auto-scroll status, Copy button, Clear button).
  - [ ] **Row 2**: Dedicated Tab Row with full-width segmented track (`Shell`, `Agent Stream`, `CLI Manager`).
- [ ] Implement Dropdown Selectors in CLI view:
  - [ ] Provider dropdown (`GitHub`, `Vercel`, `Supabase`, `Notion`) with status indicator dot.
  - [ ] Contextual Action dropdown (dynamic options per selected provider) + single `Run Action` button.
  - [ ] Mobile view switch dropdown/segmented control between `API Credentials` and `Runner & Output`.
- [ ] Style all dropdowns and controls with `Theme.tsx` tokens (`Surface`, `Content`, `theme.border.getBorder1px`).
- [ ] Verify build and linting via `lint_applet` and `compile_applet`.

---

4. **Architecture Decisions**
- **Two-Row Header vs. Crammed Single Row**:
  - *Decision*: Split the navigation into Row 1 (Identity & Actions) and Row 2 (Mode Switcher).
  - *Trade-off*: Adds ~40px of vertical space.
  - *Benefit*: Dramatically improves usability, eliminates touch target crowding on portrait mobile screens, and gives each mode tab comfortable, balanced touch targets.
- **Dropdown Selectors vs. Button Clusters**:
  - *Decision*: Consolidate 8+ wrapping action buttons into a cohesive `<select>` / dropdown runner.
  - *Trade-off*: Action execution requires selecting from a dropdown and tapping "Run".
  - *Benefit*: Eliminates messy multi-line button wrapping on small screens, provides clean descriptions for each CLI command, and prevents layout shifts when switching providers.
- **Native Styled Select with Theme Tokens**:
  - *Decision*: Style `<select>` with `Theme.tsx` tokens (`Surface[1]`, `Content[1]`, `theme.border.getBorder1px`, `Radius.S`, `fontSize: isMobile ? 16px : 13px`).
  - *Benefit*: Delivers native mobile OS picker wheels on iOS/Android for superior mobile ergonomics while matching the dark terminal theme.

---

5. **Pseudo Code**

```shade
COMPONENT TerminalPage:
  DATA:
    state:
      activeMode: "shell" | "agent" | "cli" = "shell"
      selectedCli: "github" | "vercel" | "supabase" | "notion" = "github"
      selectedAction: string = "verify"
      cliSubTab: "actions" | "keys" = "actions"
      userLogs: Array<string> = []
      agentLogs: Array<string> = []
      inputCommand: string = ""
      autoScroll: boolean = true
      copied: boolean = false
      cliConfig: CliConfig | null = null
      cliOutput: string = ""
      isCliLoading: boolean = false
    derived:
      breakpoint: Breakpoint = useBreakpoint()
      isMobile: boolean = breakpoint === "mobile"

  LOGIC:
    action getAvailableActions(provider):
      switch provider:
        case "github": return [
          { id: "verify", label: "Verify Auth Status" },
          { id: "list-repos", label: "List Repositories (gh repo list)" },
          { id: "list-issues", label: "List Issues (gh issue list)" }
        ]
        case "vercel": return [
          { id: "verify", label: "Verify Auth Status" },
          { id: "list-projects", label: "List Projects (vercel project ls)" }
        ]
        case "supabase": return [
          { id: "verify", label: "Verify Auth Status" },
          { id: "list-orgs", label: "List Database Projects" }
        ]
        case "notion": return [
          { id: "verify", label: "Verify Auth Status" },
          { id: "list-pages", label: "List Pages (notion search)" },
          { id: "list-workspaces", label: "List Workspaces" }
        ]

    action executeSelectedCliAction():
      if selectedAction == "verify": handleVerifyCli(selectedCli)
      else: handleCliAction(selectedCli, selectedAction)

  RENDER:
    div.container(style=containerStyle):
      // Row 1: Header Bar
      header.topBar(style=topBarStyle):
        div.leftGroup:
          a.backBtn(href="/"): Icon.CaretLeft(size=18, flexShrink=0)
          span.brand(text="~/term")
          span.livePulse(flexShrink=0)
        div.rightActions:
          button(active=autoScroll, onClick=toggleAutoScroll): Icon.ArrowDown(flexShrink=0)
          button(onClick=copyLogs): Icon.Copy(flexShrink=0)
          button(onClick=clearLogs): Icon.Trash(flexShrink=0)

      // Row 2: Dedicated Tabs Row
      nav.tabsRow(style=tabsRowStyle):
        div.segmentedTrack:
          button(active=activeMode=="shell", onClick=setMode("shell")):
            Icon.Terminal(flexShrink=0)
            text("Shell")
          button(active=activeMode=="agent", onClick=setMode("agent")):
            Icon.Cpu(flexShrink=0)
            text("Agent")
          button(active=activeMode=="cli", onClick=setMode("cli")):
            Icon.Key(flexShrink=0)
            text("CLI")

      // Main View Area
      if activeMode in ["shell", "agent"]:
        div.terminalCanvas:
          div.statusSubStrip:
            dots([red, yellow, green])
            text(activeMode == "shell" ? "pts/0 • /bin/bash" : "tail • agent_terminal.log")
          div.logViewer:
            renderLogs()
          if activeMode == "shell":
            form.promptBar:
              span("❯", flexShrink=0)
              input(fontSize=isMobile ? 16px : 13px)
              button(type="submit"): Icon.Play(flexShrink=0)

      else:
        div.cliPanel:
          div.selectorControlsBar:
            div.fieldGroup:
              label("Provider")
              select(value=selectedCli, onChange=updateCli):
                options(["GitHub", "Vercel", "Supabase", "Notion"])
            div.fieldGroup:
              label("Command Action")
              select(value=selectedAction, onChange=updateAction):
                renderActionOptions(selectedCli)
            button.runBtn(onClick=executeSelectedCliAction):
              Icon.Play(flexShrink=0)
              text("Run")
          div.consoleOutput:
            text(cliOutput)
```
