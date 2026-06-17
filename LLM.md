# LLM Instructions

Hello! You are an AI assistant helping to build this React application. Here are some simple instructions to follow.

## File Paths

- `index.html`, `index.tsx`, `importmap.js`, `metadata.json`, `Theme.tsx`
- `hooks/useBreakpoint.tsx`, `hooks/useElementAnatomy.tsx`, `hooks/useOutsideClick.ts`
- `components/App/App.tsx`
- `components/Page/Home.tsx`
- `components/Section/Dock.tsx`, `components/Section/Stage.tsx`
- `components/Package/`: `AIPanel`, `CodePanel`, `ConsolePanel`, `ControlPanel`, `FloatingWindow`, `SystemSpecWindow`, `UndoRedo`, `TokenBadge`, `TokenConnector`, `MeasurementTool`
- `components/Core/`: `Accordion`, `Button`, `ColorPicker`, `DockIcon`, `Input`, `LogEntry`, `RangeSlider`, `Select`, `StateLayer`, `TextArea`, `Toggle`, `Confetti`, `AnimatedCounter`, `ApiInput`
- `Framer/`: `Decompiled_Architecture.tsx`, `Styler.tsx`, `createStore.ts`
- `README.md`, `LLM.md`, `noteBook.md`, `bugReport.md`

## Simple Rules (ELI10 Version)

1.  **Be a Tidy LEGO Builder**: Keep the code clean and organized. Follow the folder structure (`Core` -> `Package` -> `Section` -> `Page` -> `App`). 
    -   **Core**: Atomic. No imports from higher levels.
    -   **Package**: Groups Cores. No imports from Sections, Pages, or Apps.
    -   **Section**: Groups Packages & Cores. No imports from Pages or Apps.
    -   **Page**: Groups Sections, Packages & Cores. No imports from Apps.
    -   **App**: Entry point. Combines everything below. Never exports to other components.
2.  **Use the Magic Style Closet (`Theme.tsx`)**: When you need a color, font size, or spacing, *always* get it from the `theme` object provided by the `useTheme()` hook. Don't use your own made-up styles like `color: 'blue'`. You MUST strictly follow the design tokens and helpers defined in Theme.tsx.
3.  **Animate Smoothly**: Use `framer-motion` for all animations. We like things to move gently and look premium.
4.  **Think Adaptive**: Ensure components adapt seamlessly to any device (phone, tablet, desktop).
5.  **Speak Human**: When you add comments, explain things simply, like you're talking to a 10-year-old.
6.  **Document Your Work**: Before you finish, update `README.md` if you change the structure, `noteBook.md` with the task you completed, and `bugReport.md` if you found or fixed a bug.
7.  **Safety First**: When you change, write, or update code, do these inside the target file:
    -   Track errors.
    -   Add tiny comments.
    -   Explain what changed.
    -   Keep code clean.
    -   Touch only needed code.