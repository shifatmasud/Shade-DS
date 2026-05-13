# Developer Notebook

A log of all tasks, ideas, and progress for this project.

## To Do

-   [ ] Integrate Gemini API for a core feature.
-   [ ] Create a more complex page layout.
-   [ ] Add interactive 3D elements with Three.js.

## In Progress

-   ...

## Done

- **[2026-05-13 07:01]**: Polished 3D Scene and Hierarchy Documentation.
    - Enhanced `RotatingBox` (Hero Cube) with faster auto X-rotation and dynamic Z-rotation.
    - Rewrote `README.md` hierarchy section to use ELI5 LEGO-based terminology for better clarity.

- **[2026-05-13 06:50]**: Restored GSAP animated Hero Cube.
    - Added `RotatingBox` back as a `kinematicVelocity` rigid body.
    - Integrated GSAP hover and color effects with physics collision detection.
    - Updated `Scene3D` to include both hero and spawned physics cubes.

- **[2026-05-13 06:40]**: Migrated project to React 19.
    - Synced `importmap.js` with `package.json` (React 19.0.0, Three 0.183.2, GSAP 3.14.2).
    - Updated `README.md` framework scanning and title.
    - Updated developer notebook.

- **[2026-05-13 05:22]**: Registered "Reactive Architecture" in Shade DSL skill.
    - Defined Target -> Mutate pattern for zero-rerender performance.
    - Integrated Zustand intent storage with imperative runtime hooks (`useRef`, `useFrame`, `useGSAP`).
    - Updated `metadata.json` and `README.md` to reflect new architecture focus.

-   **[2026-05-12 23:39]**: Fixed 404 error for direct sub-path navigation. Implemented a full-stack Express server to handle SPA fallback and added `vercel.json` for Vercel support.
-   **[2026-05-12 23:30]**: Implemented bi-directional URL routing for all core features. Linked `/control`, `/code`, `/tokens`, `/3d`, etc. to active UI states using `react-router-dom`.
-   **[2026-05-11 04:43]**: Refined Safety Rules instructions to specify that tracking, comments, and change explanations must exist **inside the target code files** themselves. Updated `AGENTS.md`, `README.md`, `LLM.md`, and `SystemSpec.tsx`.
-   **[2026-05-08 11:31]**: Refined and installed the Shade DSL agent skill.
    -   Created `/skills/shade_dsl/SKILL.md` with the full DSL specification.
    -   Initialized `AGENTS.md` for persistent DSL-first instructions.
    -   Updated metadata to reflect role as a Bidirectional Shade DSL Translator.
-   **[2026-05-08 11:26]**: Clarified component directory architecture and strict hierarchy rules in README.md, COMPONENTS_GUIDE.md, and LLM.md.
    -   Core: Atomic.
    -   Package: Cores only.
    -   Section: Packages + Cores.
    -   Page: Sections + Packages + Cores.
    -   App: Entry point (Combines all).
-   **[2026-05-08 11:20]**: Added Vercel demo link (https://shade-ds.vercel.app/) to README.md for quick access to the live deployment.
-   **[2026-02-20 08:45]**: Implemented "System Spec" floating window and toggle in the Inspector group. Added interactive visuals, SVG animations, and "Copy as Markdown" button.
-   **[2024-05-21 13:30]**: Replaced the number input in Range Sliders with an interactive, animated counter for a more dynamic feel.
-   **[2024-05-21 13:15]**: Added a toggleable measurement overlay to the Stage, showing real-time dimensions for the button component.
-   **[2024-05-21 13:00]**: Completed extensive refactor into granular components (new Core inputs, Package panels for each window, Section for Stage).
-   **[2024-05-21 12:30]**: Refactored MetaPrototype into a modular component structure (App, Package, Section, Core) for better organization and scalability.
-   **[2024-05-21 12:00]**: Implemented Meta Prototype environment with draggable windows and State Layer physics.
-   **[2024-05-21 10:30]**: Implemented Tier 3 documentation files (`README.md`, `LLM.md`, `noteBook.md`, `bugReport.md`) as per system prompt.
-   **[2024-05-21 09:00]**: Initial project setup with React, Theme Provider, and responsive breakpoints.