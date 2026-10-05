# Tech Spec 

1. **Objective** (Problem Statement, Solution Overview, Scope, Context)
   - **Problem Statement**: Menu selectors (`Select` dropdown options, `SegmentedControl`, `SegmentedTab`) currently trigger selection on click release (`onClick`). Users expect immediate tactile feedback on click start (pointer down).
   - **Solution Overview**: Transition selection interactions in menu selector components from `onClick` (click release) to `onPointerDown` (click start).
   - **Scope**: Core menu selector components (`Select.tsx`, `SegmentedControl.tsx`, `SegmentedTab.tsx`). Excludes protected components (e.g., `Dock.tsx`).

2. **Success Criteria** (Key Results, Non-Negotiables & Criteria)
   - Menu options and segment buttons trigger selection immediately on `pointerdown` / `mousedown`.
   - Smooth animation and sound triggers remain intact and responsive.
   - Zero regression in touch/mouse interaction handling.

3. **Project Requirements** (Todo List)
   - [ ] Create tech spec document in `/plans/menu_selectors_click_start_tech_spec.md`.
   - [ ] Update `Select.tsx` (list options and grid options) to use `onPointerDown` instead of `onClick`.
   - [ ] Update `SegmentedControl.tsx` items to use `onPointerDown` instead of `onClick`.
   - [ ] Update `SegmentedTab.tsx` tab buttons to use `onPointerDown` instead of `onClick`.
   - [ ] Verify build via `compile_applet`.

4. **Architecture Decisions** (Trade-offs, Benefits & Alternatives)
   - *Trade-off*: `onPointerDown` triggers immediately upon pressing down. To avoid accidental selection if the user drags away, pointer capture or touch move cancel logic can be considered, but standard menu behavior benefits from instant down response.
   - *Alternative*: `onClick` (current) vs `onMouseDown`/`onPointerDown`. `onPointerDown` handles both mouse and touch unified events cleanly.

5. **Pseudo Code** (Written in Shade DSL or ShadeR DSL)
   ```shade
   DATA {
     options: List<Option>
     activeValue: String
     onSelect: (String) -> Unit
   }
   LOGIC {
     action.handlePointerDown = (val) => {
       playSound("tick")
       onSelect(val)
     }
   }
   RENDER {
     ListView {
       options.map(opt => 
         Item(onPointerDown: () => handlePointerDown(opt.value))
       )
     }
   }
   ```
