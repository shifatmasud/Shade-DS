# React 19 Meta Prototype & Design System Starter Kit

[**Remix on AI Studio**](https://ai.studio/apps/4c5ad789-603f-46a9-bdad-8e14663811ed) | [**Vercel Demo**](https://shade-ds.vercel.app/)

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

- **ColorPicker Stability**: Fixed depth-shifting issue where spatial blobs would change `z-index` on hover. The palette rings and blobs now maintain stable layering.
- **Accordion Refinement**: Optimized `Accordion.tsx` for a "soft fill" aesthetic. Removed body background colors for a seamless, transparent expansion that integrates better with the glassmorphic environment.
- **Transition Stabilization**: Relocated Lean Mode windows into an `AnimatePresence` block inside `Home.tsx`, ensuring smooth exit animations when switching between UI modes.
- **Physics & 3D Sync**: Integrated kinematic hero cubes with GSAP timelines for deterministic rotation while maintaining dynamic Rapier physics collisions.
- **Dynamic Slider Tooltips**: Enhanced `RangeSlider.tsx` with visceral physical feedback. The tooltip now uses `useSpring` on normalized velocity-based rotation (up to 60° lag) with a heavy inertia feel (`mass: 2.5`, `stiffness: 15`) and precise pivot anchoring on the handle.
- **System Documentation**: Synchronized all Tier-3 documentation files to match the current 50+ component architecture and the React 19 environment.

## How to Get Started

1.  Open the `index.html` file in a modern web browser.
2.  That's it! The app will run.
3.  Start changing the code in the `.tsx` files to build your own features.

---
