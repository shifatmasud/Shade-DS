# Tech Spec

1. **Objective**
   - **Problem Statement**:
     When moving the cursor quickly across options in the `<Select />` dropdown, the hover background pill visually renders on top of intervening items' text and content before settling behind the target item.
   - **Solution Overview**:
     The root cause is that the hover pill was rendered as a child element inside each individual option (`<motion.div style={styles.option}>`). In CSS stacking context rules, sibling options have `position: relative; z-index: 1`. When moving from option $A$ to option $B$ (where $B$ is later in the DOM than $A$), option $B$ and all of its descendant elements (including the pill) are painted on top of preceding sibling options $A$, $A+1$, etc. During fast cursor movements, the pill interpolates across intermediate options while residing in option $B$'s elevated stacking context, causing it to render directly over their text labels.
     The solution is to decouple the hover pill from the individual option elements and elevate it to a single dedicated element at the container level (`scrollRef` for list, `gridContainer` for grid). The container has `position: relative`. The single pill has `position: absolute; z-index: 0`, while all option items have `position: relative; z-index: 1`. Under CSS stacking context specifications, layer `z-index: 0` is strictly rendered beneath layer `z-index: 1`. The pill smoothly animates `top`, `left`, `width`, and `height` based on the hovered item's `offsetTop`/`offsetLeft` with spring physics, guaranteeing it can never render on top of any option text.
   - **Scope**: `components/Core/Select.tsx`.
   - **Context**: Design system primitive `<Select />` utilized across the application, including the Terminal/TUI Quick Snippets menu.

2. **Success Criteria**
   - **Key Results**:
     - Fast cursor movements across dropdown options (both list and grid variants) never render the hover pill on top of any option's text or icons.
     - The hover pill is mathematically constrained to `z-index: 0`, strictly beneath all option elements (`z-index: 1`).
     - Scrolling the dropdown list maintains exact alignment between the hover pill and items without lag or drift.
     - Smooth entrance and exit fades when cursor enters/leaves the dropdown container.
   - **Non-Negotiables**:
     - Strict adherence to `Theme.tsx` design tokens and helpers.
     - Zero modifications outside permitted paths.
     - TypeScript compilation and linter passing with 0 errors.

3. **Project Requirements**
   - [ ] Elevate the hover pill out of individual option items into a single container-level element in `SelectOverlay` in `components/Core/Select.tsx`.
   - [ ] Implement `handleItemHover(idx, element)` to record exact `offsetTop`, `offsetLeft`, `offsetWidth`, and `offsetHeight`.
   - [ ] Position the pill with `position: 'absolute'`, `zIndex: 0`, and animate `top`, `left`, `width`, `height` with spring dynamics.
   - [ ] Ensure all option items maintain `position: 'relative'`, `zIndex: 1`, and `backgroundColor: 'transparent'`.
   - [ ] Document Root Cause Analysis in `/RCA/rca-select-pill-layering-fix.md`.
   - [ ] Update changelog in `README.md`.
   - [ ] Verify via `lint_applet` and `compile_applet`.

4. **Architecture Decisions**
   - *Container-Level Single Pill vs Item-Level Child Element*: Rendering the hover pill inside individual option items forces the pill into the destination option's local stacking context. Because DOM order dictates paint order among siblings with identical `z-index`, moving to any later sibling causes the pill to paint over earlier siblings during the flight transform. A container-level pill with `z-index: 0` establishes an immutable global stacking hierarchy: Layer 0 (Pill) -> Layer 1 (Option Text/Icons).
   - *OffsetParent Alignment*: Because `scrollRef` (and `gridContainer`) has `position: relative`, `targetItem.offsetTop` and `targetItem.offsetLeft` reflect exact coordinates within the scrollable content canvas. As the container scrolls, absolute children within the scrolling canvas scroll natively in hardware, preventing drift.

5. **Pseudo Code (Shade DSL)**
   ```shade
   Component SelectDropdown {
     DATA: {
       prop options: list<Option>
       prop isGrid: bool
       state hoveredIdx: int = -1
       state pillRect: Rect | null = null
     }
     LOGIC: {
       fn onHover(idx, el) {
         hoveredIdx = idx
         pillRect = { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight }
       }
       fn onLeave() {
         hoveredIdx = -1
         pillRect = null
       }
     }
     RENDER: {
       view.scrollContainer(position: relative, onLeave: onLeave) {
         // Dedicated layer 0 background pill
         if pillRect != null {
           motion.pill(
             zIndex: 0,
             position: absolute,
             spring: { stiffness: 500, damping: 38 },
             animate: {
               top: pillRect.top,
               left: pillRect.left,
               width: pillRect.width,
               height: pillRect.height,
               opacity: 1
             }
           )
         }
         // Layer 1 interactive options
         each option, idx in options {
           view.option(
             position: relative,
             zIndex: 1,
             bg: transparent,
             onHover: (el) => onHover(idx, el)
           ) {
             view.label(zIndex: 1, text: option.label)
           }
         }
       }
     }
   }
   ```
