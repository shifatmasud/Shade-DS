# Root Cause Analysis: TUI Page Cmd Selector Offset & TUI Scrollability

## 1. Problem Description
Users reported three interconnected issues on the TUI Terminal Page:
1. **Cmd Selector Hover State Layer Bug**: In the Quick Snippets command selector (`<Select />`), when the dropdown is scrolled, the hover state layer calculates an incorrect offset and does not animate behind the items.
2. **Unnecessary "Quick Keys" Label**: The text label "Quick Keys" on the persistent toolbar is redundant and wastes valuable horizontal real estate.
3. **TUI Not Scrollable & Scroll to Bottom Auto-Scroll**: The terminal / TUI view is not reliably scrollable (especially on touch devices or in TUI mode), and the "Scroll to Bottom" button does not have an active "ON" state that locks auto-scrolling to the bottom as new output streams in.

---

## 2. Root Cause Analysis

### Bug 1: Select Hover State Layer Offset Drift & Animation Detachment
* **Root Cause A (Relative Viewport vs Scrollable Canvas Coordinates)**:
  In `components/Core/Select.tsx`, the `SelectOverlay` calculated the highlight box coordinates via:
  ```ts
  const target = {
    top: iRect.top - sRect.top,
    left: iRect.left - sRect.left,
    width: iRect.width,
    height: iRect.height,
  };
  ```
  While `iRect.top - sRect.top` gives the client distance relative to the visible window of `scrollRef`, the highlight `<motion.div>` was placed as `position: absolute` inside `<div ref={scrollRef} style={{ overflowY: 'auto' }}>`. In CSS, absolute children of a scroll container are positioned relative to the *scrolled canvas* (its content layer starting at `top: 0`). When `scrollRef.scrollTop > 0`, placing an element at `top: iRect.top - sRect.top` places it `scrollTop` pixels *above* the actual target item.
* **Root Cause B (Missing Scroll Listener)**:
  No `scroll` listener was bound to `scrollRef`, causing the highlight layer to freeze or drift whenever the user scrolled using the mouse wheel or scrollbar.
* **Root Cause C (Detached Sibling vs Item Child)**:
  Positioning the highlight as a detached sibling before the list meant it had to constantly re-measure DOM coordinates instead of letting Framer Motion's shared `layoutId` animate directly within the target item behind its label text (`zIndex: 0` vs `zIndex: 1`).

### Bug 2: Touch Scrolling Hijacked by Selection Drag
* **Root Cause**:
  `Terminal.tsx` attached a global `touchmove` listener on `containerEl` that called `term.select(...)` on every touch move. This intercepted all vertical touch gestures and converted them into selection blocks instead of allowing the user to swipe and scroll the terminal output.

### Bug 3: Alternate Screen Buffer Wheel / Swipe Inactivity in TUIs
* **Root Cause**:
  In xterm.js, alternate screen buffers (used by full-screen TUIs like `agy`, `vim`, `htop`, and Bubbletea) have 0 scrollback lines. When mouse tracking is suppressed or not active, wheel and swipe events in the alternate buffer are discarded by xterm rather than translated into Up/Down cursor keys (`\x1b[A` / `\x1b[B`) for the active process.

### Bug 4: Stateless Scroll to Bottom Button
* **Root Cause**:
  The "Scroll to Bottom" button simply invoked `term.scrollToBottom()` once on click without maintaining an auto-scroll sticky state (`autoScroll`). When new SSE data arrived, there was no mechanism to keep the viewport locked to the bottom while active.

---

## 3. Resolution Strategy

1. **Select Component Architecture Refactor**:
   - In `components/Core/Select.tsx`, replace manual coordinate arithmetic and `useMotionValue` with Framer Motion's native `layoutId={`select-hover-${instanceId}`}` placed directly inside each item.
   - Set the hover layer to `position: absolute, inset: '1px 4px', zIndex: 0` with `pointerEvents: 'none'`, and keep item content at `zIndex: 1`.
   - When the user hovers across items, Framer Motion automatically interpolates the background pill across items.
   - Because the pill is a direct DOM child of the item, it naturally scrolls with the item without any offset bugs.
2. **Remove "Quick Keys" Label**:
   - In `components/Page/Terminal.tsx`, remove the `<span ...>Quick Keys:</span>` label from `terminal-persistent-quick-keys`.
3. **Enable Universal TUI Scrollability**:
   - Remove the touch-hijacking selection listener in `Terminal.tsx`. Support smooth touch swiping and mouse wheel scrolling.
   - For normal buffer, invoke `term.scrollLines(...)`.
   - For alternate buffer (active TUI mode like `agy`), translate scroll/swipe delta into Up/Down cursor control sequences (`\x1b[A` / `\x1b[B`) sent to the running process.
4. **Active Sticky Auto-Scroll to Bottom**:
   - Add `autoScroll` state and ref (`autoScroll: boolean`).
   - Style the button with `variant="primary"` when `autoScroll` is ON, and `variant="secondary"` when OFF.
   - In the SSE stream listener (`es.onmessage`), automatically call `term.scrollToBottom()` whenever `autoScroll` is ON.
   - In `term.onScroll`, if the user scrolls up away from the bottom (`buffer.viewportY < buffer.baseY`), gracefully turn `autoScroll` OFF. When scrolled back to bottom or when clicking the button, turn `autoScroll` back ON.

---

## 4. Implementation & Verification

1. **Select Component (`components/Core/Select.tsx`)**:
   - Refactored `SelectOverlay` to render `<motion.div layoutId={`select-hover-${instanceId}`} />` directly inside each option item.
   - Preserved `zIndex: 1` on labels and icons, while hover pill sits at `zIndex: 0`.
   - Verified that scrolling the dropdown keeps the hover pill locked to the hovered item, with spring physics interpolation on hover changes.

2. **Terminal Quick Keys Bar (`components/Page/Terminal.tsx`)**:
   - Removed the redundant `"Quick Keys:"` text label, restoring horizontal toolbar space.

3. **Bi-Modal Terminal / TUI Scrollability (`components/Page/Terminal.tsx`)**:
   - Replaced touch-hijacking selection listener with responsive touch swipe and wheel handlers.
   - Alternate buffer (TUI) input translates delta into cursor escape sequences (`\x1b[A` / `\x1b[B`).
   - Normal buffer scrolls lines smoothly.

4. **Sticky Auto-Scroll Button (`components/Page/Terminal.tsx`)**:
   - Added `autoScroll` state and linked it to `term.onScroll` and SSE incoming streams.
   - Clicking the button scrolls to the bottom and toggles/locks auto-scrolling ON.
   - Scrolling up automatically pauses auto-scroll to allow uninterrupted reading of earlier logs.
   - Passed `tsc --noEmit` linting and full production build verification.

