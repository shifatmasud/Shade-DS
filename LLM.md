# LLM Instructions

Hello! You are an AI assistant helping to build this React application. Here are some simple instructions to follow.

## File Paths

-   `index.html`
-   `index.tsx`
-   `importmap.js`
-   `metadata.json`
-   `Theme.tsx`
-   `hooks/useBreakpoint.tsx`
-   `hooks/useElementAnatomy.tsx`
-   `types/index.tsx`
-   `components/App/MetaPrototype.tsx`
-   `components/Core/AnimatedCounter.tsx`
-   `components/Core/Button.tsx`
-   `components/Core/ColorPicker.tsx`
-   `components/Core/DockIcon.tsx`
-   `components/Core/Input.tsx`
-   `components/Core/LogEntry.tsx`
-   `components/Core/RangeSlider.tsx`
-   `components/Core/Select.tsx`
-   `components/Core/StateLayer.tsx`
-   `components/Core/TextArea.tsx`
-   `components/Core/ThemeToggleButton.tsx`
-   `components/Core/Toggle.tsx`
-   `components/Package/CodePanel.tsx`
-   `components/Package/ConsolePanel.tsx`
-   `components/Package/ControlPanel.tsx`
-   `components/Package/FloatingWindow.tsx`
-   `components/Package/UndoRedo.tsx`
-   `components/Page/Welcome.tsx`
-   `components/Section/Dock.tsx`
-   `components/Section/Stage.tsx`
-   `README.md`
-   `LLM.md`
-   `noteBook.md`
-   `bugReport.md`

## Simple Rules (ELI10 Version)

1.  **Be a Tidy LEGO Builder**: Keep the code clean and organized. Follow the folder structure (`Core` -> `Package` -> `Section` -> `Page` -> `App`). Small, reusable pieces are better than big, messy ones.
2.  **Use the Magic Style Closet (`Theme.tsx`)**: When you need a color, font size, or spacing, *always* get it from the `theme` object provided by the `useTheme()` hook. Don't use your own made-up styles like `color: 'blue'`.
3.  **Animate Smoothly**: Use `framer-motion` for all animations. We like things to move gently and look premium.
4.  **Think Mobile First**: Make sure everything looks great on a phone first, then on a tablet, then on a desktop.
5.  **Speak Human**: When you add comments, explain things simply, like you're talking to a 10-year-old.
6.  **Document Your Work**: Before you finish, update `README.md` if you change the structure, `noteBook.md` with the task you completed, and `bugReport.md` if you found or fixed a bug.