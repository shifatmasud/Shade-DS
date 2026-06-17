# React 19 Meta Prototype & Design System Starter Kit

[![Remix on AI Studio](https://img.shields.io/badge/Remix-AI_Studio-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.studio/apps/4c5ad789-603f-46a9-bdad-8e14663811ed)
[![Vercel Demo](https://img.shields.io/badge/Vercel_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://shade-ds.vercel.app/)

![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.2-0055FF?style=flat-square&logo=framer&logoColor=white)
![Framer](https://img.shields.io/badge/Framer-black?style=flat-square&logo=framer&logoColor=white)
![GSAP](https://img.shields.io/badge/Animation-GSAP-88CE02?style=flat-square&logo=greensock&logoColor=white)
![Three.js](https://img.shields.io/badge/3D-Three.js-000000?style=flat-square&logo=three.js&logoColor=white)

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

### ShadeR DSL (GPGPU & GLSL Node-Based Companion Skill)

We have upgraded **ShadeR DSL** to use a strict **Node-Based Shader Graph Model** for GPU state and GLSL computation mapping.

-   **Parallel Architecture**: Establishes high-performance parallel pipelines utilizing directed node graphs.
-   **Stage Separation**: Separates shaders into explicit `@compute` (stateful runloops), `@vertex` (geometry), and `@fragment` (pixel shading) layers.
-   **Node Contracts**: Expresses all mathematical logic through semantic nodes (Generator, Transformer, Filter, Mixer) acting like a modular synthesizer.

Refer to `/skills/shader_dsl/SKILL.md` for the Node-Based GLSL/GPGPU translation specifications.

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

- **Architectural Restructure: Base vs Staged Separation**:
  - **Summary**: Separated tightly orchestrated interactive components from highly portable generic components.
  - **Architecture (IPO)**:
    - **Input**: Complex components (`Button.tsx`, `Card.tsx`) tied to 3D, physics, and workspace states.
    - **Process**: Created `/components/staged/` to house heavily orchestrated design components, and wrote lightweight, pristine "base" variants in `/components/Core/` and `/components/Package/`.
    - **Output**: Clean separation where `/components/` preserves generic portable blocks, and `/components/staged/` keeps workspace 3D interactions.
  - **Action List**:
    1. Created `/components/staged/Button.tsx` with full interactive rigged orchestration.
    2. Created `/components/staged/Card.tsx` with dynamic spacing math and 3D transforms.
    3. Overwrote `/components/Core/Button.tsx` and `/components/Package/Card.tsx` to be pure, production-ready portable elements.
    4. Modified `/components/Section/Stage.tsx` to import from `../staged/`.

- **Theme-Aware Dynamic Color Resolution**: Solved theme-unawareness issues where custom fill and text colors (including the card's 'Do Magic' title) would fall back to unstyled browser defaults if passed as empty `MotionValue` threads. Added `useResolvedMotionValue` inside both `Card.tsx` and `Button.tsx` to dynamically resolve blank motion states to standard semantic design tokens (`theme.Color`).

- **Card Corner Radius Standardized**: Increased the default fallback card corner radius from 12px (`Radius.L`) to 40px and modernized `outerRadiusMV` default values so nested outer-to-inner aspect ratios correctly scale. Also aligned the control panel presets to load Cards with a soft 40px contour on type switch.
- **ColorPicker Stability**: Fixed depth-shifting issue where spatial blobs would change `z-index` on hover. The palette rings and blobs now maintain stable layering.
- **Accordion Refinement**: Optimized `Accordion.tsx` for a "soft fill" aesthetic. Removed body background colors for a seamless, transparent expansion that integrates better with the glassmorphic environment.
- **Transition Stabilization**: Relocated Lean Mode windows into an `AnimatePresence` block inside `Home.tsx`, ensuring smooth exit animations when switching between UI modes.
- **Physics & 3D Sync**: Integrated kinematic hero cubes with GSAP timelines for deterministic rotation while maintaining dynamic Rapier physics collisions.
- **Dynamic Slider Tooltips**: Enhanced `RangeSlider.tsx` with visceral physical feedback. The tooltip now uses `useSpring` on normalized velocity-based rotation (up to 60° lag) with a heavy inertia feel (`mass: 2.5`, `stiffness: 15`) and precise pivot anchoring on the handle.
- **System Documentation**: Synchronized all Tier-3 documentation files to match the current 50+ component architecture and the React 19 environment.
- **Typography Standardization**: Mandated the use of object spread (`...theme.Type`) for all typography tokens to ensure architectural consistency and simplify maintenance across the 50+ component library. Refactored all Core and Package components to adhere to this pattern.
- **Glassmorphic Border Upgrade**: Replaced flat 1px solid borders on the inputs, selectors, card outline variants, NameTag containers, and the primary glass docking bar with custom dual-shadow configurations (outer and inset box-shadows using x=0, y=0, a 1px ultra-crisp blur, and a 0px spread).
- **Outlined Focus Alignment**: Shifted all standard 2px focus borders (e.g. Buttons, focus rings, window highlights) to the native CSS `outline` property using `outlineOffset: -2px` to prevent layout reflows and guarantee crisp inline overlap layers.
- **Draggable Window Layout Correction**: Replaced the CSS `transform` attribute with the standalone modern CSS `translate: '-50% -50%'` property for layout centering of draggable components. This completely isolates centering parameters from Framer Motion's dynamic drag translate overrides, ensuring absolute top/left centering works perfectly on initial display and throughout interaction cycles.
- **ColorPicker Window Migration**: Migrated the `ColorPicker` from `Core` to the `Package` layer to adhere to architectural hierarchy. Transformed the picker from a simple overlay into a modular `FloatingWindow` component, maintaining the familiar portal-based trigger while adding draggable capabilities and a dedicated window header.
- **Infinite Render Loop Fixing**: Resolved the React "Maximum update depth exceeded" error by moving color picker value-mapping and update handlers directly to the parent layout rendering cycle in `Home.tsx`. This avoids cyclic feedback with re-generated function references inside `ColorPicker`'s intermediate `useEffect` layers, ensuring extremely fast performance and complete stability.
- **High-Performance Zero-Rerender Slider and Counters**: Integrated direct Framer Motion `MotionValue` observer-thread bindings for `RangeSlider.tsx` and `AnimatedCounter.tsx`. Coupled drag listeners, fill tracking progress bars, handle coordinates, and digit column transformations directly to offscreen motion transformations. This bypasses the React virtual DOM tree and eliminates standard component re-renders during interactions, providing pristine 120fps fluid responsiveness.
- **True Zero-Rerender HSL Color Sliders**: Completely decoupled the HSL slider dragging timeline from React re-render cycles inside `FloatingColorPickerWindow`. By subscribing directly to the `hueMV`, `satMV`, and `lightMV` motion structures and mutating HSL track colors dynamically via sub-pixel CSS Variables, the component updates the Saturation and Lightness gradients live on the native GPU layer. This eliminates the need for React State updates entirely during dragging-moves and ensures perfect pixel release consistency with absolute zero micro-stutters.
- **Dedicated Shade DSL Agent Skill**: Created first-class AI capabilities under `/skills/shade_dsl/SKILL.md`. This skill encapsulates the architectural rules of the Shade framework, instructing any connected coding models on how to utilize `MotionValue` thread bindings, direct-to-DOM CSS variable injections, and asynchronous release validation mechanisms to perpetuate pristine 120fps styling workflows during subsequent sessions.
- **Interactive Layers & Motion Value Routing**: Re-routed the color attributes of state and ripple layers to bind directly to the pre-evaluated `resolvedColor` MotionValue within `Button.tsx`, resolving the invisible standard hover layer bug caused by empty motion values. Stripped the heavy `blur(12px)` CSS filter from the ripple layer for pixel-perfect clarity, and synchronized motion settings using `easeInOut` for standard state hover layers and `spring` physics for ripple layers.
- **WebGL GPGPU subskill (ShadeR DSL) Integrated (2026-05-30)**:
  - **What changed**: Engineered a brand new subskill at `/skills/shader_dsl/SKILL.md` detailing GPGPU parallel simulation pipelines, uniform uploads, buffer bindings, and stage separations.

## How to Get Started

1.  Open the `index.html` file in a modern web browser.
2.  That's it! The app will run.
3.  Start changing the code in the `.tsx` files to build your own features.

---
