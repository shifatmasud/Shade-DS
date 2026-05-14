# React 19 Meta Prototype & Design System Starter Kit

[**Remix on AI Studio**](https://ai.studio/apps/4c5ad789-603f-46a9-bdad-8e14663811ed) | [**Vercel Demo**](https://shade-ds.vercel.app/)

## Task: Maintenance & System Synchronization
Synchronizing the project documentation with the current file tree and logging recent architectural refinements.

### Architecture (IPO)
- **Input**: Current file system state, noteBook logs, metadata.
- **Process**: Mapping the modular hierarchy and describing the reactive runtime specification.
- **Output**: Aligned multi-tier documentation (README, LLM, Notebook).

### Action List
1. [x] Research: Audit the `/components` and `/Framer` directories.
2. [x] Execute: Update `README.md` and `LLM.md` with accurate file paths.
3. [x] Design: Clean up the Task section for next-milestone readiness.
4. [x] Document: Update `noteBook.md` and `bugReport.md` with latest status.

## Project Scan Sheet

| Category | Details |
| :--- | :--- |
| **Framework** | React 19.x (ESM via `importmap`), Express Backend |
| **Styling** | JS Object Styles (Architecture-first), No Tailwind/Native CSS |
| **Animation** | Framer Motion (UI Transitions), GSAP (Three.js/Timing) |
| **Typography** | Bebas Neue (Hero), Inter (Standard), JetBrains Mono (Data), Cause (Quotes) |
| **Icons** | Phosphor Icons (Modular Integration) |
| **State Management** | Zustand (Global/Physics), Reaction Bus, React Context (Theme) |
| **Architecture** | **Bidirectional Shade DSL**: Core → Package → Section → Page → App |
| **Key Systems** | High-performance Physics (Rapier), 3D Visualization (Fiber), Floating Windows |
| **Intelligence** | Gemini API Integration (AI Panel), Code Decompiler (Shade DSL) |
| **Visual Design** | State Layer + Ripple Layer Physics, Glassmorphic Panels, Dynamic Tokens |

## Shade DSL (Agent Skill)

This project is equipped with **Shade DSL**, a bidirectional translation layer between React ecosystems and a minimalist, architectural domain-specific language.

-   **Code → DSL**: Extracts the "soul" of a component, simplifying it into DATA, LOGIC, and RENDER segments with an ASCII tree.
-   **DSL → Code**: Generates idiomatic, modular React code from architectural blueprints.

Refer to `/skills/shade_dsl/SKILL.md` for full specifications.

## Directory Structure (ELI10 Version)

We build apps like LEGO. Each piece has a specific size and place!

-   **`Core/`**: Individual LEGO bricks (Buttons, Inputs, Toggles). Simple and pure.
-   **`Package/`**: Small LEGO sets built from bricks (Panels, Windows, Card components).
-   **`Section/`**: Rooms made of sets (The Dock, The Main Stage).
-   **`Page/`**: Full buildings (Home screen).
-   **`App/`**: The entire LEGO City (The full application).
-   **`Framer/`**: The secret workshop where we translate complex designs into code.

## Directory Tree

```
.
├── components/
│   ├── App/
│   │   └── App.tsx
│   ├── Core/
│   │   └── ... (20+ Atomic Components)
│   ├── Package/
│   │   └── ... (15+ Modular Panels)
│   ├── Page/
│   │   └── Home.tsx
│   └── Section/
│       ├── Dock.tsx
│       └── Stage.tsx
├── Framer/
│   ├── Decompiled_Architecture.tsx
│   └── ... (Design System Sync)
├── README.md
├── noteBook.md
├── bugReport.md
└── index.tsx
```

## Recent Updates

- **Accordion Refinement**: Optimized `Accordion.tsx` for a "soft fill" aesthetic. Removed body background colors for a seamless, transparent expansion that integrates better with the glassmorphic environment.
- **Transition Stabilization**: Relocated Lean Mode windows into an `AnimatePresence` block inside `Home.tsx`, ensuring smooth exit animations when switching between UI modes.
- **Physics & 3D Sync**: Integrated kinematic hero cubes with GSAP timelines for deterministic rotation while maintaining dynamic Rapier physics collisions.
- **System Documentation**: Synchronized all Tier-3 documentation files to match the current 50+ component architecture and the React 19 environment.

## How to Get Started

1.  Open the `index.html` file in a modern web browser.
2.  That's it! The app will run.
3.  Start changing the code in the `.tsx` files to build your own features.

---

## System Spec

---

## Core Rules

1. Hide complexity until desired.
2. Write Compact Helpful copy (max 3 lines, 40–80 chars per line, EL5 mode).
3. One primary focus at a time.
4. Design Mobile-first always (max width: 400px, max height: 600px).
5. Prioritize Stability > Performance > Usability > Aesthetic.

---

## Execution Rules

Before any task, generate:

1. Summary (≤5 lines in chat & README.MD)
2. Architecture (IPO)
3. Action List (Ordered)

---

## Engineering Rules

1. No Tailwind. Use JS style object.
2. No CSS keyframes. Use Framer Motion.
3. GSAP only for Three.js & external timelines.
4. Mobile gestures replace hover (touch drag = mouse move).
5. No native OS UI components. Use custom components.
6. Modular Components folder structure: Core → Package → Section → Page → App.
7. Reactive Architecture: [Realtime API] & Events → FSM → Event Bus → Store → Observer → Renderer

---

## Safety Rules

When change, write, update code:

Inside the target file:
1. Track errors.
2. Add tiny comments.
3. Explain what changed.
4. Explain how to undo change.
5. Keep code clean.
6. Touch only needed code.

---

## Design Rules

### Typography

Bebas Neue (hero)
Inter (body)
JetBrains Mono (data)
Cause (quotes)

### Iconography

Phosphor Icons

### Tokens

Use semantic format: `Category.Purpose.Context.Level`
Surface = background
Content = text/icon
Never use literal values.

### Motion

Base = 100ms
Default = 300ms
Scale multiplicatively.

### Grid

4pt base system.

### Interaction States

Use state-layer & ripple-layer overlay. Do not change parent fill.

---

## Documentation Rules

Must generate:

1. [README.md](http://readme.md/)
2. [noteBook.md](http://notebook.md/)
3. [bugReport.md](http://bugreport.md/) 

Never overwrite previous entries.