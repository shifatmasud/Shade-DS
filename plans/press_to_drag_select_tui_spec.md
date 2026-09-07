# Tech Spec 

1. **Objective**
   - **Problem Statement**: Touch drag-to-select was initiating immediately on any touchmove gesture, conflicting with normal vertical scrolling, flicking, and viewport panning.
   - **Solution Overview**: Implement an `onpress` (press-and-hold, ~250ms threshold) detection layer for touch interactions. Drag-to-select only activates after the user holds their finger down at a position. If the user moves or lifts before the timer expires, the timer cancels and normal scrolling occurs. Once press-and-hold is recognized, selection mode engages (with optional subtle haptic vibration), highlighting the initial cell and expanding as the user drags.
   - **Scope**: `components/Page/Terminal.tsx` touch/pointer event handlers and `README.md` Recent Changelogs.
   - **Context**: Mobile touch ergonomics, touch gestures, xterm selection buffer API.

2. **Success Criteria**
   - **Key Results**:
     - Quick swipes, taps, and vertical scrolling do not trigger accidental text selection.
     - Pressing and holding (~250ms) on a character cell activates selection mode.
     - Dragging after the press expands the selected range across lines and columns.
     - Text selection automatically copies or is available for clipboard copying.
     - Clean build and lint with zero TypeScript or runtime errors.
   - **Non-Negotiables & Criteria**:
     - Preserving existing mouse drag-to-select on desktop.
     - Adhering to Theme tokens and AGENTS.md rules.

3. **Project Requirements**
   - [ ] Implement press timer (`PRESS_DELAY_MS = 250`) and movement cancellation threshold (`MOVE_THRESHOLD_PX = 8`) in `Terminal.tsx`.
   - [ ] On `touchstart`, start the timer and record initial coordinates.
   - [ ] If touch moves > 8px before timer fires, cancel timer and allow native scroll.
   - [ ] If timer fires, trigger selection mode (`isSelectionActive = true`), select initial word/character, and trigger subtle haptic feedback (`navigator.vibrate?.(25)`).
   - [ ] On `touchmove` when `isSelectionActive` is true, continuously calculate buffer range and call `term.select(...)`.
   - [ ] On `touchend` / `touchcancel`, reset press timer and selection state.
   - [ ] Update Recent Changelogs in `README.md`.

4. **Architecture Decisions**
   - **250ms Press Duration**: Provides a snappy, natural delay that distinguishes deliberate text selection from normal swipe scrolling without feeling sluggish.
   - **8px Jitter Guard**: Allows natural finger micro-tremors during a stationary press without inadvertently cancelling the press-to-select timer.

5. **Pseudo Code**
   ```dsl
   MODULE PressToDragSelect {
     DATA {
       pressTimer: TimerRef = null
       isSelecting: Boolean = false
       startPoint: Point = { x: 0, y: 0 }
       startCell: Cell = null
     }
     LOGIC {
       ON_TOUCH_START(e) {
         isSelecting = false
         startPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY }
         startCell = getCell(startPoint)
         pressTimer = setTimeout(() => {
           isSelecting = true
           term.select(startCell.col, startCell.row, 1)
           VIBRATE(25)
         }, 250)
       }

       ON_TOUCH_MOVE(e) {
         IF NOT isSelecting THEN
           distance = dist(startPoint, currentPoint)
           IF distance > 8 THEN
             clearTimeout(pressTimer)
           ENDIF
         ELSE
           currentCell = getCell(currentPoint)
           term.select(range(startCell, currentCell))
         ENDIF
       }

       ON_TOUCH_END() {
         clearTimeout(pressTimer)
         isSelecting = false
       }
     }
   }
   ```
