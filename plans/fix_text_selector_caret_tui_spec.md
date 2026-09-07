# Tech Spec 

1. **Objective**
   - **Problem Statement**: In the Terminal / TUI (`Terminal.tsx` using xterm.js), the text selection highlight and cursor caret are not clearly visible. Specifically, `theme.Color.Focus.Surface[2]` was passed to xterm's `selectionBackground` in both initialization and theme change hooks, but `theme.Color.Focus.Surface[2]` is `undefined` in `Theme.tsx` (which only declares `Surface['1']`). Consequently, xterm's selection render layer failed to draw visible highlight regions, and inactive cursor states were not explicitly configured with full fallback visibility.
   - **Solution Overview**: 
     1. Correct `selectionBackground`, `selectionInactiveBackground`, and `selectionForeground` in `Terminal.tsx` using guaranteed accessible theme color tokens and alpha-composited focus surface highlights.
     2. Ensure `cursorInactiveStyle: 'block'` (or `'outline'` with guaranteed contrast) and `cursorBlink: true` with valid `cursor` and `cursorAccent` values so the caret is always visible in active and inactive TUI states.
     3. Provide global and xterm-specific CSS caret and selection styling in `styles.css`.
   - **Scope**: `components/Page/Terminal.tsx`, `styles.css`, and recent changelog update in `README.md`.
   - **Context**: Grounded in xterm.js theme options and `Theme.tsx` design tokens.

2. **Success Criteria**
   - **Key Results**:
     - Text selection in xterm canvas highlights selected cells with a visible contrast background (`selectionBackground`).
     - Terminal cursor/caret is clearly visible and blinking across both dark and light modes.
     - Terminal passes TypeScript compilation and lint verification with 0 errors.
   - **Non-Negotiables & Criteria**:
     - Strict adherence to `Theme.tsx` design tokens.
     - Preserving Dock immunity and README formatting rules.

3. **Project Requirements**
   - [ ] Fix `selectionBackground` in `Terminal.tsx` initialization options (line 154) and dynamic theme observer (line 260) to use robust theme colors (`theme.Color.Focus.Surface[1]` / `rgba` focus token).
   - [ ] Add `selectionInactiveBackground` and explicit `cursorInactiveStyle: 'block'` to ensure the cursor caret never disappears when focus shifts.
   - [ ] Add universal CSS text selection and cursor caret enhancement in `styles.css`.
   - [ ] Document the enhancement in the Recent Changelogs section of `README.md`.

4. **Architecture Decisions**
   - **Selection Background Fallback**: Instead of indexing a non-existent `theme.Color.Focus.Surface[2]`, use `theme.Color.Focus.Surface[1]` or an accessible alpha tint (`rgba(33, 150, 243, 0.35)` / dark mode equivalent) to guarantee high visibility of highlighted characters.
   - **Cursor Inactive Visibility**: By setting `cursorInactiveStyle: 'block'` alongside `cursorStyle: 'block'`, the terminal caret remains prominent and positioned even when user clicks the Quick Keys bar or prompt bar.

5. **Pseudo Code**
   ```dsl
   MODULE TerminalCaretAndSelection {
     DATA {
       selectionBg: Color = theme.Color.Focus.Surface[1] || "rgba(33, 150, 243, 0.35)"
       cursorColor: Color = theme.Color.Focus.Content[1]
     }
     LOGIC {
       CONFIGURE_XTERM_THEME({
         cursor: cursorColor,
         cursorAccent: theme.Color.Base.Surface[1],
         selectionBackground: selectionBg,
         selectionForeground: theme.Color.Base.Content[1],
         selectionInactiveBackground: selectionBg
       })
       SET_XTERM_OPTIONS({
         cursorBlink: true,
         cursorStyle: "block",
         cursorInactiveStyle: "block"
       })
     }
     RENDER {
       XTERM_CANVAS(viewport)
     }
   }
   ```
