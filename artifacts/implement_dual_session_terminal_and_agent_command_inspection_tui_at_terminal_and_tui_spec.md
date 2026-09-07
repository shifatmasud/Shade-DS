# Tech Spec: Implement Dual-Session Terminal and Agent Command Inspection TUI at /terminal and /tui

## Objective
Provide a dual-session TUI allowing developers to switch between an interactive user shell session (/bin/bash) and a real-time agent command execution stream (/tmp/agent_terminal.log) at routes /terminal and /tui. Strictly designed using Theme.tsx tokens with zero Tailwind CSS, while ensuring absolute route isolation and dock immunity.

## Architectural Decisions
1. Separate SSE streams and endpoints for user shell stdin/stdout and agent audit log streaming to eliminate session collisions. 2. Lightweight rolling log file at /tmp/agent_terminal.log for agent command recording. 3. Ultra-minimalist Shade DSL UI built strictly on Theme.tsx JS style objects and procedural border tokens with zero external UI framework overhead.

## Implementation Plan
1. Implement server endpoints in server.ts for SSE streaming (/api/terminal/stream), stdin input (/api/terminal/input), and agent audit logging (/api/terminal/log). 2. Create the Terminal page component at /components/Page/Terminal.tsx incorporating session toggle, monospace auto-scrolling log viewer, and interactive prompt. 3. Register /terminal and /tui route dispatchers in /components/App/App.tsx while leaving / and /components/Section/Dock.tsx 100% untouched. 4. Verify compilation and clean build using compile_applet.

## Acceptance Criteria
### Functional Criteria
- Navigating to /terminal or /tui successfully renders the dual-session Terminal TUI.
- The user can seamlessly toggle between [ user ] and [ agent ] sessions.
- In the user session, typed commands execute interactively against the container /bin/bash shell.
- In the agent session, real-time command logs and outputs from AI agent operations are streamed read-only.
- Home route (/) and Dock (/components/Section/Dock.tsx) remain strictly unmodified.

### Non-Negotiables
- Successful build via compile_applet with zero TypeScript or lint errors.
- Strict Theme.tsx token compliance using JS style objects with base/variant/size, Surface, Content tokens, and procedural theme.border.getBorder1px.
- Zero Tailwind CSS usage.
- Absolute route isolation for /terminal and /tui.

## Task Dependency Graph
- **[task_1] BackendServerWorker**: Update server.ts to add endpoints for SSE streaming (/api/terminal/stream), stdin input (/api/terminal/input), and agent audit logging (/api/terminal/log) reading from /tmp/agent_terminal.log. (Deps: None)
- **[task_2] TerminalUIWorker**: Create components/Page/Terminal.tsx implementing the dual-session Terminal TUI using Theme.tsx tokens exclusively with zero Tailwind CSS. (Deps: task_1)
- **[task_3] RouterWorker**: Update components/App/App.tsx to wire up /terminal and /tui routes to the Terminal component without modifying Dock.tsx or the home route. (Deps: task_2)
- **[task_4] VerificationWorker**: Run compile_applet to verify the build and confirm zero compilation or TypeScript errors. (Deps: task_3)
