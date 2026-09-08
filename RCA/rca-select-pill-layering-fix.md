# Root Cause Analysis: Select Component Hover Background Pill Flying Over Text During Fast Movement

## 1. Problem Description
When moving the cursor rapidly between options in the `<Select />` dropdown (such as the Quick Snippets command selector on `/terminal`), the hover background pill was visibly rendering on TOP of intermediate options' text before settling behind the destination item.

## 2. Root Cause Analysis

### CSS Stacking Context Mechanics
The hover indicator was previously rendered inside each option item's JSX:

```tsx
<motion.div style={styles.option}>
  {hoveredIdx === idx && (
    <motion.div layoutId="select-hover" style={{ position: 'absolute', zIndex: 0 }} />
  )}
  <span style={{ position: 'relative', zIndex: 1 }}>{option.label}</span>
</motion.div>
```

1. **DOM Tree Hierarchy**:
   Every option item has `position: 'relative'`, `zIndex: 1`. In CSS specification:
   - When siblings share the same explicit `z-index` (e.g. `z-index: 1`), their stacking order is determined strictly by their order in the DOM tree.
   - Elements that occur later in the HTML source are painted on top of earlier siblings.

2. **The In-Flight Projection Leak**:
   When the cursor moved from Option 0 to Option 3:
   - Option 3 was the target element holding the active `<motion.div layoutId="select-hover" />`.
   - Option 3 occurs *after* Option 0, Option 1, and Option 2 in the DOM.
   - Therefore, the entire stacking context of Option 3 (including all its children, even those with `z-index: 0`) is painted **above** Option 0, Option 1, and Option 2!
   - As Framer Motion projected the pill moving from Option 0's coordinates to Option 3's coordinates, Option 3's child element flew physically over the top of Option 1's and Option 2's text labels.
   - When moving from a later item to an earlier item, the inverse occurred, resulting in noticeable z-fighting, flickering, and text covering.

## 3. Corrective Action
1. **Decouple the Pill to Container Level**:
   Move the hover pill element out of the option items entirely and render it as a single element inside the scrolling container (`scrollRef` for list view, `gridContainer` for grid view).
2. **Strict Layer Separation**:
   - The single hover pill has `position: 'absolute'`, `zIndex: 0`.
   - All option items have `position: 'relative'`, `zIndex: 1`, and `backgroundColor: 'transparent'`.
   - Under CSS stacking context rules, children in layer `z-index: 0` are guaranteed to paint underneath children in layer `z-index: 1`. It is physically impossible for the pill to paint over any option's text.
3. **OffsetParent Coordinate Synchronization**:
   - Because `scrollRef` (and `gridContainer`) has `position: 'relative'`, `targetItem.offsetTop` and `targetItem.offsetLeft` represent the exact pixel position inside the scrollable content canvas.
   - Fast hover movements simply animate `top` and `left` with spring dynamics, smoothly gliding underneath all items.
   - Scrolling the list causes both items and the absolute pill to scroll together natively via hardware compositing without any drift or calculation lag.
