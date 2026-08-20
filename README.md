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
