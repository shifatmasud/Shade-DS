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

-   **`SEP 12, 2026`** · **TransformInverter Position & Pins Agnostic 3D Transform Clip Path**: Upgraded `TransformInverter.tsx` to be 100% position and pins agnostic (`position: absolute` with pinned `top`/`left`/`right`/`bottom`, negative insets, center alignment, `position: relative`, flexbox, CSS grid, and nested Framer wrappers). Implemented a dual-pass global DOM reference offset resolver (`getOffsetToDocument(child) - getOffsetToDocument(ancestor)`) that projects both elements onto a shared root coordinate space before transforms. Uses pure 3D CSS transform matrix arithmetic ($M_{\text{orientation}} = R \cdot P(d)$, $M_{\text{counter}} = M_{\text{orientation}}^{-1}$, and invariant pivot conjugation $T(\delta) \cdot M_{\text{counter}} \cdot T(-\delta)$) to generate exact, perspective-foreshortened card boundary clip paths on flat Subscribers without layout drift.
-   **`SEP 12, 2026`** · **TransformInverter X-Rotation Clip Path Form Distortion Fix**: Resolved clip-path trapezoid distortion during Publisher X-axis rotations (`Rotate X: 40°`, `Perspective: 500px`) where the clip polygon lacked perspective foreshortening. Fixed 3D orientation matrix composition order in `build3DOrientationMatrix` to evaluate $R \cdot P(d)$ (`orientationMat.multiply(pMat)`) so that 3D rotation depth ($z = y \sin\theta$) is generated before perspective projection acts upon it ($m_{24} = -\sin\theta / d$), producing a mathematically exact, symmetric isosceles trapezoid matching the Publisher's 3D card outline. Added origin-aware base inverse mapping ($s_{cx}, s_{cy}$) in `computeProjectedCardClipPolygon` and clean 2D base matrix parsing.
-   **`SEP 12, 2026`** · **TransformInverter Absolute Positioned Subscriber Perspective Clipping Fix**: Resolved clip-path skew and asymmetric void slicing on Subscriber layers positioned `Absolute` with negative insets (`Top: -401px`, `Left: -198px`, `Right: -220px`, `Bottom: -197px`) inside 3D-rotated Publisher cards (`Rotate X: -40°`, `Perspective: 500px`). Eliminated coordinate mutation bug during `subBaseInv` mapping where `projX` was overwritten before `projY` was calculated, and ensured static layout offset translation accurately projects the Publisher's 3D trapezoidal silhouette into the expanded Subscriber local canvas.
-   **`SEP 12, 2026`** · **TransformInverter Perspective 500px & XY Rotation Clip-Path Projection Fix**: Resolved clip-path misalignment, boundary drift, and scaling differences during dual-axis XY 3D rotations under 500px perspective. Added local base transform inversion compensation (`subData.baseMatrix.inverse()`) so that elements with existing CSS transforms (e.g. `translate(-50%, -50%)`, `scale`) have their projected polygon vertices transformed into the Subscriber's pre-transform local reference box. Enforced explicit 16-element Float64 3D `DOMMatrix` construction for perspective matrices, implemented camera near-plane safety bounds ($W' \ge 0.001$), and increased corner arc sampling to 12 segments per corner for smooth, faceting-free elliptic contour tracking under steep 3D perspective foreshortening.
-   **`SEP 12, 2026`** · **TransformInverter Pivot Offset Conjugation & X-Rotation Clip Fix**: Resolved orbital translation drift where 3D rotations of Publisher caused child Subscribers to drift away from their static layout positions. Conjugated the Subscriber counter-matrix by the layout pivot translation offset vector $\delta = C_{\text{pub}} - C_{\text{sub}}$ ($M_{\text{counter}} = T(\delta) \cdot O^{-1} \cdot T(-\delta)$), ensuring counter-rotation pivots directly around the Publisher card center ($C_{\text{pub}}$) without mutating native `transform-origin` styles. Corrected perspective matrix composition in `build3DOrientationMatrix` via 4x4 matrix multiplication ($P(d) \cdot R$), populating row 4 perspective terms ($m_{24} = -\sin\theta/d$) so that `computeProjectedCardClipPolygon` projects exact perspective foreshortening (tapering at the top and widening at the bottom) during $X$-axis rotations.
-   **`SEP 12, 2026`** · **TransformInverter Full 4x4 Perspective & 3D Inversion**: Fixed perspective-induced rotation, keystoning, and trapezoid distortion on Subscriber elements when Framer publishers or containers have `perspective` properties configured. Built a unified 4x4 orientation matrix ($O$) combining 3D rotation with projective perspective distance ($m_{34} = -1/d$), and computed its exact mathematical inverse ($O^{-1}$) via native DOMMatrix inversion ($O \cdot O^{-1} \equiv I$). When applied to Subscribers, the counter-transform completely neutralizes both the 3D rotation and the perspective projection field, guaranteeing Subscribers remain 100% planar, camera-facing, and unskewed at all times. Unified projective polygon clipping with the same orientation matrix for seamless card boundary tracking.
-   **`SEP 12, 2026`** · **TransformInverter Perspective-Immune Projected Card Clipping**: Fixed false rotational skew, drift, and trapezoidal distortion in `TransformInverter.tsx` clip-path polygon calculations caused by non-zero CSS perspective origin offsets at 0° Publisher rotation. Decomposed transforms into pure orthonormal 3x3 rotation matrices ($R$) and optical $z/d$ depth scaling ($1 / (1 - z'/d)$), guaranteeing that at 0° tilt $z' = 0 \implies \text{scale} \equiv 1.0$ with zero angular skew. Implemented static `offsetParent` layout translation to accurately mask nested and offset Subscriber elements to the outer Publisher card boundary and corner radii during 3D tilts and variant transitions.
-   **`SEP 12, 2026`** · **TransformInverter Inset Clipping & Jitter-Free Clip Modes**: Resolved subtle rotation drift, offset wobbling, and bounding box distortion in `TransformInverter.tsx` clip-path calculations. Replaced flawed `getBoundingClientRect()` projection with native, GPU-accelerated `clip-path: inset(...)` (Zero drift, rock-solid rounded corners) and a stabilized 3D silhouette projection mode using immutable static layout offsets. Introduced the `clipMode` property (`"none"`, `"inset"`, `"projected"`) to give designers flexible control over pop-out parallax effects versus clean card masking.
-   **`SEP 12, 2026`** · **TransformInverter Native Framer 3D Controls & Zero-Config Reactivity**: Streamlined `TransformInverter.tsx` to read 3D rotations, perspectives, spring animations, and hover states directly from Framer's native visual editor panels (Framer 3D Transforms / Variants) on the Publisher frame. Removed redundant manual rotation/perspective props (`rotateX`, `rotateY`, `rotateZ`, `perspective`, `applyToPublisher`) in favor of dynamic `DOMMatrix` column normalization and matrix transposition ($R^T$), enabling designers to control 3D tilt visually in Framer canvas while Subscriber counter-rotation and 3D projected polygon clipping update reactively in real time.
-   **`SEP 12, 2026`** · **TransformInverter 3D Projected Subscriber Clipping**: Added dynamic 3D projected boundary clipping (`clipToPublisher`, `clipBorderRadius`, `clipPadding`) in `TransformInverter.tsx`. Computes real-time 3D perspective projection of Publisher's rectangular bounds and corner radii into the camera-aligned Subscriber coordinate space, applying a dynamic `clip-path: polygon(...)` directly to the Subscriber without enabling `overflow: hidden` on the Publisher, ensuring child content is perfectly masked to the card frame while maintaining full 3D context.
-   **`SEP 12, 2026`** · **TransformInverter 3D Context Flattening & Trapezoid Distortion Fix**: Resolved 3D perspective distortion where child Subscriber images were flattened into 2D textures inside Framer's intermediate containers (`overflow: hidden`, `transform-style: flat`) and rendered as trapezoids. Added automatic ancestor chain traversal (`preserveAncestor3DContext`) enforcing `preserve-3d` and non-clipping overflow across all wrapper containers up to the Publisher. Implemented exact inverse Euler transform order (`rotateZ(-rz) rotateY(-ry) rotateX(-rx)`) for zero-rounding-error camera plane alignment, and added wildcard and zero-config host discovery.
-   **`SEP 12, 2026`** · **TransformInverter XY Rotation Cancellation & Layout Translation Fix**: Corrected CSS 3D rotation matrix calculation ($R = R_x \times R_y \times R_z$) and column-major transpose inversion ($R_{\text{sub}} = R_{\text{pub}}^T$) in `TransformInverter.tsx`, perfectly neutralizing Subscriber X, Y, and Z rotations and keeping child elements planar to the camera. Added `extractBasePublisherTransform` to preserve Publisher's existing layout translations (e.g. `translate(-50%, -50%)`), completely eliminating unwanted position shifts when 3D transforms and perspective are applied.
-   **`SEP 12, 2026`** · **TransformInverter 3D Rotation & Flat Child Subscriber Rewrite**: Rebuilt `TransformInverter` from scratch to manipulate Publisher 3D XYZ rotation (`rotateX`, `rotateY`, `rotateZ`) and perspective, while counter-rotating child Subscribers via orthogonal matrix transposition ($R_{\text{pub}}^{-1} = R_{\text{pub}}^T$). Completely eliminates translation feedback jitter, enforcing crisp planar screen alignment (`transform-style: flat`) and preserving the Subscriber's local scale/transform without visual glitches.
-   **`SEP 11, 2026`** · **SVG Data URI & Vector Set Support in SVGPathInjector**: Added support for Framer Vector Sets rendered as `<img>` elements with embedded SVG data URIs (`data:image/svg+xml,...`, URL-encoded, entity-escaped, and base64). Extended discovery loop in `framer/SVGPathInjector.tsx` to automatically parse, inline, and bind vector paths directly to `svgEffect` pathLength and stroke animations.
-   **`SEP 07, 2026`** · **TUI Drag-to-Select & Touch Selection Support**: Resolved drag-to-select failure in the Terminal / TUI (`Terminal.tsx`). Removed conflicting DOM `user-select: text` style overrides that were causing the browser to swallow mouse drag events over canvas layers, registered a CSI sequence handler to intercept private DEC mouse tracking modes (1000, 1002, 1003, 1005, 1006) preventing interactive TUIs (such as Bubbletea / `agy`) from hijacking mouse drag selections, enabled `macOptionClickForcesSelection: true`, and added mobile touch drag-to-select listeners.
-   **`SEP 07, 2026`** · **TUI Text Selector & Caret Rendering Fix**: Resolved missing text selection highlight and cursor caret in the Terminal / TUI (`Terminal.tsx`). Replaced `undefined` `theme.Color.Focus.Surface[2]` color indices with high-contrast alpha focus surface tokens (`selectionBackground`, `selectionInactiveBackground`), configured `cursorInactiveStyle: 'block'` and `cursorWidth: 2` to ensure the caret remains continuously visible across active and inactive states, and added universal CSS text selection styling.
-   **`SEP 07, 2026`** · **GitHub Export Sanitization & Binary Relocation**: Removed all hardcoded API key fallbacks across `server.ts`, `bin/agy`, documentation, and specification files, preventing GitHub push protection rejections. Relocated all heavy CLI binaries (`agy-bin` 210MB, `gh` 50MB) to `/root/.local/bin/` outside the project repository tree to strictly adhere to GitHub Git Data API payload size limits.
-   **`SEP 07, 2026`** · **Direct Gemini API Key Provider & Copyable TUI Text**: Configured `"modelProvider": "gemini"` in Antigravity CLI settings (`~/.gemini/antigravity-cli/settings.json`) and `bin/agy` wrapper per official Antigravity CLI documentation, completely eliminating Google OAuth login prompts and directly authenticating requests with `GEMINI_API_KEY`. Added seamless terminal and TUI text copying support, selection change listeners, and clipboard shortcut binding (`Cmd+C`/`Ctrl+C`) in `Terminal.tsx`.
-   **`SEP 07, 2026`** · **Persistent Gemini API Key Export**: Persisted `GEMINI_API_KEY` across shell configuration files (`/root/.bashrc`, `/root/.profile`, `/root/.bash_profile`), project environment files (`.env`, `.env.example`), the server child process execution pipeline (`server.ts` `customEnv`), and the `bin/agy` wrapper executable per Antigravity CLI installation documentation.
-   **`SEP 07, 2026`** · **Antigravity CLI Permissions Schema Correction**: Corrected settings schema in `/root/.gemini/antigravity-cli/settings.json` by removing the invalid `permissions: "always-proceed"` string key. In the `agy` Go backend, tool execution permission is governed specifically by `toolPermission: "always-proceed"`, `autoExecPolicy: "always-proceed"`, and the `--dangerously-skip-permissions` CLI flag, eliminating the schema validation error while maintaining full autonomous tool access.
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
-   **`SEP 07, 2026`** · **Agy Persistence, Clean Git Export & Touch Selection**: Implemented self-healing auto-installation and persistence for Antigravity CLI (`agy`), configured comprehensive `.gitignore` rules for binary blobs and system archives to resolve GitHub push validation (`Request contains an invalid argument`), and enabled universal touch-device text selection for the xterm terminal UI.
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
Always apply typography via object spread: `style={{ ...theme.Type.Body.1 }}`. Never use manual CSS borders; use the procedural helpers in `Theme.tsx`.

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
