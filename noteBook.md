# Developer Notebook

A log of all tasks, ideas, and progress for this project.

## Done

- **[2026-05-14 07:57]**: System Spec Removal from README.
    - Removed "System Spec" section from `README.md` to follow new documentation restrictions.
    - Cleaned up duplicate entries in `noteBook.md`.

- **[2026-05-15 05:08]**: RangeSlider Physical Overhaul (Heavy Mechanical).
    - Implemented high-inertia lag using `useSpring` (mass: 2.5, stiffness: 15, damping: 8).
    - Intensified tilt mapping (60° max at 250 normalized velocity units) for visceral response.
    - Adjusted `transformOrigin` to `50% 29px` to pivot rotation exactly at the handle tangent.
    - Resolved transform conflict between CSS and Motion for precise center alignment.
    - Verified consistent spatial lag across diverse slider ranges (HSL vs Corner Radius).

- **[2026-05-15 05:01]**: RangeSlider Normalization & Mechanical Feel.
    - Normalized velocity rotation by mapping `motionValue` to `[0, 100]` before processing, ensuring consistent lag across diverse ranges (HSL vs. Corner Radius).
    - Reduced spring stiffness (20) and increased mass (1.5) for a slower, more deliberate "heavy mechanical" lag.
    - Adjusted vertical offset (`bottom: calc(100% + 5px)`) to anchor the arrow tip exactly on the handle's tangent.
    - Standardized tooltip aesthetics across all UI instances.

- **[2026-05-14 07:46]**: Documentation Refinement & "No Task in README" Enforcement.
    - Removed Task, Architecture (IPO), and Action List sections from `README.md` as per new user rules.
    - Updated `metadata.json` to "Shade DSL Starter Kit" with refined description.
    - Verified architectural alignment between `AGENTS.md`, `LLM.md`, and `README.md`.

- **[2026-05-14 07:39]**: Documentation & Repository Synchronization.
    - Synchronized `README.md` and `LLM.md` with the current 50+ component file tree.
    - Updated project descriptors to "Shade DSL Starter Kit" to match metadata.
    - Audited `/Framer` and `/components` directories for architectural alignment.
    - Cleaned up active task logs to prepare for next milestone.

- **[2026-05-14 06:14]**: Accordion refinement (Body Transparency).
    - Removed `backgroundColor` and `borderRadius` from the Accordion body wrapper to make the content seamless and fully transparent, matching the minimal aesthetic requested.

- **[2026-05-14 05:40]**: Optimized Lean Mode Transitions & Refined Accordion.
    - Moved the Lean Mode `FloatingWindow` instantiation inside the main `AnimatePresence` block in `Home.tsx` to enable proper exit animations during UI mode switching.
    - Redesigned `Accordion.tsx` using a minimal, "softer fill" aesthetic with subtle background highlights and rounded container transitions instead of simple border splits.
    - Adjusted animation easing in Accordion for a more "elastic" feel using custom Cubic Bezier curves.

- **[2026-05-13]**: Implemented Hero Cube X-axis auto-rotation via `useGSAP`.
    - Successfully migrated X-axis rotation from `useFrame` to a dedicated GSAP timeline.
    - Optimized performance by using a Reactive sync pattern between the GSAP-animated mesh and the Rapier kinematic rigid body.
    - Maintained dynamic Y/Z variability in the physics loop while ensuring deterministic X rotation.

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