# React 19 Meta Prototype & Design System Starter Kit

[**Remix on AI Studio**](https://ai.studio/apps/4c5ad789-603f-46a9-bdad-8e14663811ed) | [**Vercel Demo**](https://shade-ds.vercel.app/)

This is a starter project for building modern, theme-aware React applications. It's set up with a modular structure, a powerful design system, and is ready for you to integrate the Gemini API.

## Project Scan Sheet

| Category | Details |
| :--- | :--- |
| **Framework** | React 19.0.0 (ESM via `importmap`) |
| **Styling** | CSS-in-JS (JS Objects), Semantic Design Tokens, No CSS Modules/Tailwind |
| **Animation** | Framer Motion 12.x (Spring Physics, Layout Animations) |
| **Typography** | Bebas Neue (Display), Cause (Quotes), Inter (UI), JetBrains Mono (Code) |
| **Icons** | Phosphor Icons (Web Component) |
| **State Management** | React Context (`Theme`, `Breakpoint`), Local State, History Stack (Undo/Redo) |
| **Architecture** | Atomic-based (Strict): `Core` → `Package` → `Section` → `Page` → `App` |
| **Key Components** | Floating Windows, Draggable Dock, State Layer (Ripple), Element Anatomy Inspector |
| **Theme System** | Light/Dark Modes, Responsive Tokens, Feedback States (Success, Warning, Error, Active) |
| **Inputs** | Range Sliders, Color Pickers, Toggles, Selects, TextAreas |
| **Visuals** | Confetti System, Blueprint Overlays, Token Badges, Glassmorphism |
| **Intelligence** | Shade DSL (Bidirectional Translator & Architecture Extractor) |

## Shade DSL (Agent Skill)

This project is equipped with **Shade DSL**, a bidirectional translation layer between React ecosystems and a minimalist, architectural domain-specific language.

-   **Code → DSL**: Extracts the "soul" of a component, simplifying it into DATA, LOGIC, and RENDER segments with an ASCII tree.
-   **DSL → Code**: Generates idiomatic, modular React code from architectural blueprints.

Refer to `/skills/shade_dsl/SKILL.md` for full specifications.

## What's Inside? (ELI10 Version)

Imagine you're building with LEGOs. This project gives you a super organized box of special LEGO pieces to build an amazing app.

-   **`index.html`**: The front door to our app.
-   **`index.tsx`**: The main brain of the app.
-   **`importmap.js`**: A map that tells our app where to find its tools (like React).
-   **`Theme.tsx`**: The "master closet" for our app's style (colors, fonts, etc.).
-   **`hooks/`**: Special tools (custom hooks).
    -   `useBreakpoint.tsx`: Checks if you're on a phone, tablet, or desktop.
    -   `useElementAnatomy.tsx`: A special ruler that precisely measures a component and its inner parts.
-   **`types/`**: A dictionary for our app's data shapes.
    -   `index.tsx`: Defines what a "Window" or a "Log Entry" looks like.
-   **`components/`**: The LEGO pieces themselves, organized by strict complexity and import hierarchy:
    -   **`Core/`**: Tiny bricks. These are the simplest pieces (like a single Button or a Toggle). They are small and don't know about anything big.
    -   **`Package/`**: Small builds. We use the tiny bricks to build something useful (like a Control Panel). They know about Cores, but not rooms.
    -   **`Section/`**: Rooms. Putting several small builds together to make a whole space (like the Dock or the Stage). They know about Packages and Cores.
    -   **`Page/`**: Full views. A whole screen you can see (like the Home page). They use Sections and everything under them to fill the view.
    -   **`App/`**: The Masterpiece. The final, complete app that connects all the views and pieces together.
-   **`README.md`**: This file! Your friendly guide.
-   **`LLM.md`**: Special instructions for AI helpers.
-   **`noteBook.md`**: A diary of tasks and progress.
-   **`bugReport.md`**: A list of bugs to fix.

## Directory Tree

```
.
├── components/
│   ├── App/
│   │   └── MetaPrototype.tsx
│   ├── Core/
│   │   ├── AnimatedCounter.tsx
│   │   ├── Button.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── Confetti.tsx
│   │   ├── DockIcon.tsx
│   │   ├── Input.tsx
│   │   ├── LogEntry.tsx
│   │   ├── RangeSlider.tsx
│   │   ├── Select.tsx
│   │   ├── StateLayer.tsx
│   │   ├── TextArea.tsx
│   │   ├── ThemeToggleButton.tsx
│   │   └── Toggle.tsx
│   ├── Package/
│   │   ├── CodePanel.tsx
│   │   ├── ConsolePanel.tsx
│   │   ├── ControlPanel.tsx
│   │   ├── FloatingWindow.tsx
│   │   └── UndoRedo.tsx
│   ├── Page/
│   │   └── Welcome.tsx
│   └── Section/
│       ├── Dock.tsx
│       └── Stage.tsx
├── hooks/
│   ├── useBreakpoint.tsx
│   └── useElementAnatomy.tsx
├── types/
│   └── index.tsx
├── README.md
├── LLM.md
├── noteBook.md
├── bugReport.md
├── Theme.tsx
├── importmap.js
├── index.html
├── index.tsx
├── metadata.json
```

## Recent Updates

- **Physics Integration**: Integrated High-performance 3D physics using `@react-three/rapier`. The 3D scene now features a GSAP-animated kinematic hero cube interacting with dynamic colorful physics actors, all managed via a centralized `zustand` store.
- **React 19 Migration**: Synchronized `importmap.js` with `package.json` to move the entire ecosystem to React 19.0.0. Updated documentation to reflect the new framework version.
- **Reactive Architecture Integration**: Registered a high-performance runtime specification in Shade DSL. The system now strictly separates React's declarative rendering from imperative mutation loops (GSAP/Three.js/Framer) to achieve zero-rerender motion.
- **Deep Linking & Routing**: Every main action and panel (Control, Code, Console, Tokens, Measurements, 3D) is now mapped to a unique URL extension. The app supports multi-state URLs (e.g., `/3d/tokens`) which are deterministically sorted for state stability.
- **Vercel & Container Support**: Implemented `vercel.json` for native Vercel SPA routing and an Express `server.ts` for AI Studio container preview. This ensures direct navigation to sub-paths works flawlessly across all environments without 404 errors.
- **AI Agent Enhancements**: Implemented a dedicated input field for the Gemini API key in the Control Panel's Agent section, with local storage persistence for convenience. The AI window now consistently opens centered on the screen and always appears on top of other windows for improved visibility.
- **System Spec Window**: Added a dedicated floating window that outlines the project's core rules, engineering standards, and design system. Accessible via the "System Spec" toggle in the Inspector group.
- **Interactive Visuals**: The System Spec window features custom SVG animations and a "Copy as Markdown" utility.

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