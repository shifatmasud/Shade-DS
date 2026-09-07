# Tech Spec 

1. **Objective**
   - **Problem Statement**: `Terminal.tsx` contains hardcoded hex colors (`#09090b`, `#34d399`, `#10b981`, `#064e3b`), arbitrary dimensional styles, and unparsed ANSI color sequences. When the theme is toggled or rendered in different contexts, these hardcoded colors mismatch the design tokens, breaking contrast, consistency, and visual hierarchy.
   - **Solution Overview**: 
     1. Replace all hardcoded colors, dimensions, and typography in `Terminal.tsx` with tokens and procedural helpers from `Theme.tsx` (`theme.Color.Base.Surface`, `theme.Color.Base.Content`, `theme.Color.Success.Content`, `theme.space`, `theme.height`, `theme.radius`, `theme.border.getBorder1px`, `theme.Type.Expressive.Data`).
     2. Remove custom button background and color overrides on the auto-scroll toggle, leveraging the Core `Button`'s variant system (`primary` vs `secondary`).
     3. Implement an ANSI-to-Theme parser to render bash terminal colored outputs using `Theme.tsx` tokens (`Success.Content`, `Error.Content`, `Warning.Content`, `Focus.Content`, `Base.Content`).
   - **Scope**: `/components/Page/Terminal.tsx`.
   - **Context**: Shade DSL architecture, strict design token compliance, zero Tailwind, JS style objects.

2. **Success Criteria**
   - **Key Results**:
     - Zero hardcoded arbitrary hex colors (`#09090b`, `#34d399`, `#10b981`, `#064e3b`, etc.) in `Terminal.tsx`.
     - 100% of surfaces use `theme.Color.Base.Surface[1|2|3]`.
     - 100% of text uses `theme.Color.Base.Content[1|2|3]` or semantic variant tokens.
     - 100% of borders use `theme.border.getBorder1px(...)`.
     - Monospace typography uses `...theme.Type.Expressive.Data`.
     - Terminal ANSI sequences render using design token semantic colors.
     - App compiles and lints with 0 errors.
   - **Non-Negotiables**:
     - Dock Immunity strictly respected (`Dock.tsx` untouched).
     - README Immunity strictly respected.
     - No external CSS or Tailwind.

3. **Project Requirements**
   - [x] Identify all hardcoded colors and custom styles in `Terminal.tsx`.
   - [ ] Implement an ANSI parser mapping ANSI codes to `theme.Color.*` tokens.
   - [ ] Refactor container, header, viewer, and prompt styles to pure `Theme.tsx` tokens.
   - [ ] Refactor buttons, inputs, icons, and status dots to pure `Theme.tsx` tokens.
   - [ ] Verify build and types with `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
   - **Design Token Variant System**: Define styles structured around `Theme.tsx` tokens with explicit Surface elevation (Surface 1 for background, Surface 2 for toolbar and prompt bar, Surface 3 for borders/dividers) and Content hierarchy (Content 1 for primary output, Content 2 for metadata, Content 3 for placeholders/subtle indicators).
   - **Light & Dark Theme Parity**: By sourcing every color from `theme.Color`, the terminal automatically adapts seamlessly when switching between light and dark modes without color bleeding or illegible contrast.
   - **ANSI Code Token Mapping**: Terminal stdout containing ANSI escape codes (such as `\x1b[32m`) is converted to React nodes with semantic token styling (`Success.Content` for green, `Error.Content` for red, `Warning.Content` for yellow, `Focus.Content` for blue/cyan).

5. **Pseudo Code**
   ```dsl
   COMPONENT TerminalPage
   DATA
     theme: Theme
     logs: List<String>
   RENDER
     div style={containerStyle(theme)}:
       header style={headerStyle(theme)}:
         Button variant="secondary" icon=CaretLeft
         span style=Expressive.Data color=theme.Color.Base.Content[1]
         div style=dot(theme.Color.Success.Content[1])
         Select options=QUICK_COMMANDS
         Button variant=autoScroll ? "primary" : "secondary"
         Button variant="secondary" icon=AnimatedCopyIcon
         Button variant="secondary" icon=Trash
       CustomScrollbar:
         main style=logViewerStyle(theme):
           renderAnsiLogs(logs, theme)
       form style=promptBarStyle(theme):
         span style=chevron(theme.Color.Success.Content[1]) "❯"
         input style=promptInput(theme)
         Button variant="primary" icon=Play
   ```
