# Shade DSL · Meta Prototype Design System

> **TL;DR**: A high-performance, bidirectional design system architecture for React 19. Built for absolute visual precision, 120fps interaction density, and seamless AI agent collaboration.

<div align="left">
  <a href="https://ai.studio/apps/4c5ad789-603f-46a9-bdad-8e14663811ed">
    <img src="https://img.shields.io/badge/Remix_on_AI_Studio-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Remix on AI Studio" />
  </a>
  <a href="https://shade-ds.vercel.app/">
    <img src="https://img.shields.io/badge/Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
</div>

---

## 💎 Top Benefits

-   **120fps Interaction Density**: Utilizes direct `MotionValue` thread bindings to bypass the React virtual DOM during high-frequency updates (drags, sliders, physics).
-   **Bidirectional Shade DSL**: A unique translation layer that extracts the "soul" of your UI into architectural blueprints (DATA, LOGIC, RENDER) for perfect AI handoffs.
-   **GPU-Bound Styling**: Zero-rerender HSL color engines and glassmorphic dual-shadow configurations running directly on the GPU layer.
-   **Agent-Optimized Architecture**: A strict hierarchical structure (Core → Package → Section) designed to prevent logic leakage and ensure maintainability.

---

## 🏛️ Why This Codebase Matters

This is not just another component library. It is a **structural methodology** for the next era of development. By enforcing a strict bidirectional link between design tokens and architectural blueprints, it allows humans and AI agents to speak the same language. It prioritizes **Architecture over Syntax**, ensuring that your design system remains a living, breathing asset rather than a graveyard of stale CSS.

---

## 🛠️ Tech Stack & Dependencies

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **React 19.0** | Modern concurrent rendering and ESM support. |
| **Animation** | **Framer Motion 12.2** | Primitive UI transitions and MotionValue threads. |
| **Timeline** | **GSAP** | Precise orchestration for 3D and timing-critical sequences. |
| **3D/Physics** | **Three.js + Rapier** | High-performance spatial visualization and kinematics. |
| **State** | **Zustand** | Lightweight, high-speed global state synchronization. |
| **Intelligence** | **Gemini API** | Integrated AI panels and automated architectural extraction. |

---

## 📜 Recent Changelogs

-   **`SEP 07, 2026`** · **Antigravity CLI Full Permissions & Autonomous Execution**: Granted full autonomous tool execution permissions to `agy` across all invocations. Configured `settings.json` with `toolPermission: 'always-proceed'`, `autoExecPolicy: 'always-proceed'`, `enableTerminalSandbox: false`, and `allowNonWorkspaceAccess: true`. Updated `/bin/agy` wrapper to automatically supply `--dangerously-skip-permissions`, ensuring single-shot headless prompts (`agy -p "..."`) run, edit files, and execute commands end-to-end without blocking or prompting for confirmation.
-   **`SEP 07, 2026`** · **Model Update & Minimal Quick Keys Palette**: Configured the default model for Antigravity CLI to `gemini-3.8-flash-medium` in both the wrapper script and CLI settings. Streamlined the Quick Keys bar in `Terminal.tsx` to exclusively display Arrow navigation (`↑`, `↓`, `←`, `→`), `Esc`, and `Enter ↵` chips.
-   **`SEP 07, 2026`** · **Antigravity CLI Interactive TUI & Onboarding Resolution**: Resolved the initial `No authentication methods available` and `Do you trust the contents of this project?` interactive prompt blocking the Bubbletea TUI by marking onboarding complete in `/root/.gemini/antigravity-cli/cache/onboarding.json` and approving workspace trust in `/root/.gemini/antigravity-cli/settings.json`, allowing the interactive TUI prompt to immediately launch with Gemini API Key authentication and `Gemini 3.8 Flash (Low)` active.
-   **`SEP 07, 2026`** · **Quick Keys Auto-Width Styling & Antigravity CLI Auth Resolution**: Refactored Quick Keys chips in `Terminal.tsx` to use auto-width sizing (`width: 'auto'`), monospace typography, keycap border tokens (`theme.border.getBorder1px`), and responsive wrapping layout. Resolved headless `agy` OAuth invalid grant error (`token exchange failed: oauth2: "invalid_grant" "Malformed auth code."`) and 429 quota exhaustion by provisioning an `agy` binary wrapper utilizing `GEMINI_API_KEY` and defaulting to `gemini-3.8-flash-low`.
-   **`SEP 07, 2026`** · **Interactive TUI Input & PTY Session Control**: Resolved raw-mode interactive TUI issues for `agy` (Bubbletea) by translating newlines to carriage returns (`\r`), refactoring process interrupt to target the process group (`-pid`), updating Send button loading state to respect active process lifecycle, adding live process status badges, and introducing quick-action touch keys.
-   **`SEP 07, 2026`** · **Antigravity CLI (agy) Persistent Standalone Binary**: Deployed the official `linux_amd64` release of the Antigravity CLI directly into `./bin/agy` (persistent across container lifecycle) with automated self-healing symlinks in `/usr/local/bin` and `/root/.local/bin`, plus 24-bit truecolor ANSI escape sequence parsing in `Terminal.tsx`.
-   **`SEP 07, 2026`** · **Antigravity CLI (agy) PTY Runner & Interactive TUI**: Implemented a genuine pseudo-terminal (PTY) runner in Python 3 with non-blocking bidirectional I/O, terminal geometry (`TIOCSWINSZ`), process interrupts (`SIGINT`), and interactive input forwarding in `Terminal.tsx`, enabling the `agy` (Bubbletea) CLI to run seamlessly.
-   **`SEP 07, 2026`** · **Terminal & TUI Route Resolution**: Fixed client-side route dispatching in `App.tsx` by introducing isolated `<Routes>` matching `/terminal/*` and `/tui/*` directly to `TerminalPage`, preventing unwanted fallback to `Home.tsx` and eliminating the automated redirect back to `/`.
-   **`SEP 07, 2026`** · **Dual-Session Terminal & Agent Inspection TUI**: Added route-isolated `/terminal` and `/tui` interfaces featuring an interactive `/bin/bash` shell session and real-time agent audit log streaming (`/tmp/agent_terminal.log`), built strictly with `Theme.tsx` tokens, procedural 1px borders, and 100% preservation of Dock immunity.
-   **`AUG 20, 2026`** · **Transition Control Consolidation**: Streamlined `Morphine.tsx` property controls by removing the redundant `duration` number control in favor of Framer's native `ControlType.Transition` (`transition` prop) which encapsulates duration, easing curves, and physics parameters directly.
-   **`AUG 20, 2026`** · **Pure Framer Motion `animateView` Migration**: Refactored `Morphine.tsx` to strictly use Framer Motion's native `animateView` API (`.old()`, `.new()`, and `.add()`) for root page snapshot transitions and shared-element morphs without any CSS or stylesheet injections.
-   **`AUG 20, 2026`** · **Changelog Maintenance Permission**: Updated AGENTS.md and README immunity protocols to explicitly grant continuous maintenance and documentation permissions for the Recent Changelogs section.
-   **`JUL 28, 2026`** · **Fluid Shader & Global Controls**: Integrated liquid fluid distortion pipeline, organic trailing logic, and a global shader control system with real-time parameter tuning.
-   **`JUL 28, 2026`** · **3D & Mobile Optimization**: Optimized mobile 3D rendering performance and refined interactive button shader logic.
-   **`JUL 27, 2026`** · **Staged Component Config**: Expanded staged component configuration support and optimized environment floor rendering.
-   **`JUL 26, 2026`** · **Offscreen Fluid Simulation**: Implemented offscreen fluid simulation pipeline specifications and rendering pipeline skill integration.
-   **`JUL 01, 2026`** · **Dock & README Immunity**: Implemented critical restraints and immunity protocols to protect core navigation logic and project identity from unauthorized AI interference.

---

## 📖 Usage Guidelines

### 1. The Planning Gate
Never write code before performing a detailed planning step. All modifications must start with a structured ADR (Architectural Design Record) in the `/plans` folder.

### 2. The Component Hierarchy
-   **Core**: Atomic, pure primitives (Buttons, Inputs).
-   **Package**: Modular feature blocks (Panels, Floating Windows).
-   **Section**: Structural layout containers (Stage, Dock).
-   **Page**: Orchestration layer for full screens.

### 3. Typography & Theming
Always apply typography via object spread: `style={{ ...theme.Type.Body1 }}`. Never use manual CSS borders; use the procedural helpers in `Theme.tsx`.

---

## 📂 Directory Overview

```bash
.
├── components/
│   ├── App/        # Root orchestration
│   ├── Core/       # Atomic primitives (LEGO Bricks)
│   ├── Package/    # Modular panels (LEGO Sets)
│   ├── Page/       # Major views
│   └── Section/    # Structural blocks (Dock/Stage)
├── Framer/         # Design System Sync & DSL extraction
├── skills/         # AI Agent specialized capabilities
└── Theme.tsx       # The source of truth for Design Tokens
```

---
