# Tech Spec 

1. **Objective** (Problem Statement, Solution Overview, Scope, Context)
   - **Problem Statement**: Using `onPointerDown` for menu items in `SelectOverlay` causes touch drag / scroll gestures to immediately trigger selection on click start, breaking touch scrolling and drag-scrubbing.
   - **Solution Overview**: Decouple touch drag from click start events. For pointer types (especially touch), track pointer down position/movement or use `onTouchStart`/`onTouchMove`/`onTouchEnd` drag-safe selection for touch devices, ensuring touch drag / scroll does not trigger click start selection.
   - **Scope**: `Select.tsx` (`SelectOverlay` list and grid items).

2. **Success Criteria** (Key Results, Non-Negotiables & Criteria)
   - Mouse clicks trigger immediately on click start (`onPointerDown`).
   - Touch drag / scroll gestures do not prematurely trigger selection on click start; touch interactions allow smooth scrolling/scrubbing and select on release (`onTouchEnd`) or explicit tap without significant drag.

3. **Project Requirements** (Todo List)
   - [ ] Create tech spec document in `/plans/decouple_touch_drag_click_start_tech_spec.md`.
   - [ ] Update `SelectOverlay` in `Select.tsx` to distinguish mouse vs touch or use drag-safe touch handling (`onTouchStart`, `onTouchMove`, `onTouchEnd` with movement threshold) while retaining instant `onPointerDown` for mouse clicks.
   - [ ] Verify build via `compile_applet`.

4. **Architecture Decisions** (Trade-offs, Benefits & Alternatives)
   - *Approach*: Check `e.pointerType === 'touch'` (or track touch start coordinates and movement delta). For mouse (`pointerType === 'mouse'` or non-touch), keep instant `onPointerDown` selection. For touch, use touch start position tracking and allow touch drag/scroll, selecting on `onTouchEnd` of the hovered item if drag delta is small (tap) or if using touch scrub.

5. **Pseudo Code** (Written in Shade DSL or ShadeR DSL)
   ```shade
   DATA {
     touchStartCoord: Point
     isDragging: Boolean
   }
   LOGIC {
     onPointerDown = (e) => {
       if (e.pointerType === 'mouse') {
         onSelect(value)
       } else {
         storeTouchStart(e.clientX, e.clientY)
       }
     }
     onTouchMove = (e) => {
       if (exceededThreshold) isDragging = true
     }
     onTouchEnd = (e) => {
       if (!isDragging && hoveredIdx !== -1) {
         onSelect(options[hoveredIdx].value)
       }
     }
   }
   RENDER {
     Item(onPointerDown, onTouchMove, onTouchEnd)
   }
   ```
