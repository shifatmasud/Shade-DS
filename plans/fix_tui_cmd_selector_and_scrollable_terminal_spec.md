# Tech Spec

1. **Objective**
   - **Problem Statement**:
     1. In the TUI page command selector (`Select` component), when the dropdown list is scrolled, the hover state layer calculates an invalid offset and fails to animate behind items.
     2. The "Quick Keys" text label on the persistent toolbar is unnecessary and occupies valuable horizontal space.
     3. The terminal/TUI viewport cannot be scrolled reliably on touch or during interactive TUI sessions, and the "Scroll to Bottom" button lacks an active toggle state that locks auto-scroll when new output streams in.
   - **Solution Overview**:
     1. Upgrade `components/Core/Select.tsx` to use Framer Motion's shared `layoutId` pattern directly inside each option item. Because the hover indicator is a direct child of the hovered item (`zIndex: 0` behind `zIndex: 1` content), it naturally scrolls with the list content with zero offset drift, and smoothly transitions between options via physical spring layout interpolation.
     2. Remove the "Quick Keys" label element from `components/Page/Terminal.tsx`.
     3. Make the terminal and TUI scrollable across both touch and mouse wheel: in normal buffer mode, scroll lines via `term.scrollLines()`; in alternate buffer mode (TUI mode such as `agy` or Bubbletea), translate wheel/swipe increments to arrow key sequences (`\x1b[A` / `\x1b[B`) forwarded to the running PTY process.
     4. Implement a sticky `autoScroll` state for the "Scroll to Bottom" button: display `variant="primary"` when ON, auto-scroll to the bottom on every incoming SSE chunk, auto-pause when the user scrolls up, and resume on click or return to the bottom.
   - **Scope**: `components/Core/Select.tsx`, `components/Page/Terminal.tsx`, and `styles.css`.
   - **Context**: Fullstack React 19 app with xterm.js PTY, Framer Motion, and Theme.tsx design tokens.

2. **Success Criteria**
   - **Key Results**:
     - Quick Snippets dropdown in `Select.tsx` scrolls cleanly; hovering items while scrolled displays the background highlight perfectly positioned directly behind the hovered item with smooth layout animation.
     - The toolbar on `/terminal` no longer displays the text "Quick Keys:".
     - Terminal view is effortlessly scrollable using mouse wheel, trackpad, and touch swipe gestures.
     - When running a TUI like `agy`, wheel and swipe inputs scroll the active TUI content.
     - "Scroll to Bottom" button indicates active state (`variant="primary"`) when ON; when ON, streaming logs auto-scroll immediately to the bottom.
   - **Non-Negotiables**:
     - Strict adherence to `Theme.tsx` design tokens and helper functions.
     - No modifications to files outside `/framer/test/` within the `/framer/` directory.
     - No compilation or linter errors.

3. **Project Requirements**
   - [ ] Refactor `SelectOverlay` in `components/Core/Select.tsx` to render the hover state layer using `layoutId` within each option item with `AnimatePresence`.
   - [ ] Remove the "Quick Keys" text label from `components/Page/Terminal.tsx`.
   - [ ] Implement bi-modal scrolling in `Terminal.tsx`: normal buffer scrolling via `term.scrollLines` and alternate buffer navigation via PTY arrow keystrokes.
   - [ ] Remove the touch-drag text selection listener that hijacked touch swipes on mobile.
   - [ ] Implement `autoScroll` toggle state in `Terminal.tsx` linked to the "Scroll to Bottom" button and SSE stream listener.
   - [ ] Verify functionality via `compile_applet` and linting.

4. **Architecture Decisions**
   - *Child Layout Projection vs Parent Absolute Coordinates*: In scrolling containers with `overflow-y: auto`, calculating coordinate offsets from `getBoundingClientRect()` requires adding `scrollTop` and tracking high-frequency scroll events. Placing the `layoutId` motion element directly inside the hovered item delegates scroll tracking to native DOM hierarchy while Framer Motion handles cross-item spring interpolation.
   - *Bi-Modal Wheel & Touch Navigation*: Standard terminal emulators distinguish between normal buffer and alternate screen buffer. By inspecting `term.buffer.active.type`, we either scroll the buffer view or send arrow controls to the active TUI application, ensuring seamless parity with desktop terminal emulators.

5. **Pseudo Code (Shade DSL)**
```shade
Component SelectOverlay {
  DATA: {
    prop options: list<Option>
    state hoveredIdx: int
  }
  LOGIC: {
    fn onHover(idx) { hoveredIdx = idx }
    fn onLeave() { hoveredIdx = -1 }
  }
  RENDER: {
    view.dropdown(scrollable: true) {
      each option, idx in options {
        element.item(onHover: () => onHover(idx)) {
          if hoveredIdx == idx {
            motion.pill(layoutId: "select-hover", zIndex: 0, inset: "1px 4px")
          }
          view.label(zIndex: 1, text: option.label)
        }
      }
    }
  }
}

Component TerminalPage {
  DATA: {
    state autoScroll: bool = true
    ref term: XTerminal
  }
  LOGIC: {
    fn onScrollToBottomClick() {
      term.scrollToBottom()
      autoScroll = true
    }
    fn onTerminalWheel(event) {
      if term.buffer.active.type == 'alternate' {
        sendInput(event.deltaY < 0 ? '\x1b[A' : '\x1b[B')
      } else {
        term.scrollLines(event.deltaY)
      }
    }
    fn onSSEData() {
      if autoScroll {
        term.scrollToBottom()
      }
    }
  }
  RENDER: {
    view.container {
      element.header {
        element.scrollToBottomButton(
          variant: autoScroll ? "primary" : "secondary",
          onClick: onScrollToBottomClick
        )
      }
      view.viewport(onWheel: onTerminalWheel)
      view.quickKeysBar // without "Quick Keys:" text
    }
  }
}
```
