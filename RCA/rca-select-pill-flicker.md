# Root Cause Analysis: Select Component Hover Background Pill Flicker & Z-Fighting

## 1. Problem Description
When hovering across items in `<Select />` dropdowns (e.g. the Quick Snippets command selector on the Terminal page), moving the cursor from one item to another caused a visible flicker, visual stutter, or artifacting that felt like a z-index fight or an unwanted opacity cross-fade animation.

## 2. Root Cause Investigation
In `components/Core/Select.tsx`, the hover background pill was implemented as:

```tsx
<AnimatePresence>
  {hoveredIdx === idx && (
    <motion.div
      layoutId={`select-hover-${instanceId}`}
      style={{
        position: 'absolute',
        inset: '2px 4px',
        backgroundColor: theme.Color.Base.Surface[2],
        borderRadius: theme.radius['Radius.S'],
        zIndex: 0,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
    />
  )}
</AnimatePresence>
```

### Why this caused visual flicker and z-fighting:
1. **Per-Item `<AnimatePresence>` Duplication**:
   `<AnimatePresence>` was placed inside the `.map()` loop around each individual item.
   When `hoveredIdx` changes from item 0 to item 1:
   - Item 0's `<AnimatePresence>` detects that `{hoveredIdx === 0}` became `false`. Because it handles unmounting, it keeps item 0's `<motion.div>` in the DOM to animate `exit={{ opacity: 0 }}` over the spring duration (~300ms).
   - Simultaneously, Item 1's `<AnimatePresence>` detects that `{hoveredIdx === 1}` became `true`. It mounts item 1's `<motion.div>` with `initial={{ opacity: 0 }}` and starts animating to `opacity: 1`.

2. **Conflict with `layoutId` Projection**:
   Both DOM nodes shared the identical `layoutId`: `select-hover-${instanceId}`.
   Framer Motion's shared layout projection expects either:
   - Exactly one element representing the layout node at a time, or
   - Intentional morph cross-fading where two distinct structural shapes morph.
   Because both nodes were identical rectangles existing simultaneously in the DOM, Framer Motion projected their intermediate bounding boxes on top of each other while one was fading out and the other was fading in.
   
3. **Z-Index Stacking Context Battle**:
   Each list item has `position: 'relative', zIndex: 1`. The exiting node was in item 0's stacking context, while the entering node was in item 1's stacking context. As they animated across the boundary, their overlapping semi-transparent pixels composited unevenly, producing a visible "z-fight" and opacity flicker instead of a continuous, solid gliding indicator.

## 3. Corrective Action
1. **Remove `<AnimatePresence>` from individual items**:
   Remove `<AnimatePresence>` around each option item in both grid and list views.
2. **Remove Opacity Animations from `layoutId` pill**:
   Remove `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, and `exit={{ opacity: 0 }}` from the hover indicator element.
3. **Preserve Single-Node Layout Motion**:
   When `hoveredIdx` updates, item 0 unmounts immediately (no lingering exit node), and item 1 mounts. Framer Motion seamlessly projects the single element from item 0's rect to item 1's rect using spring dynamics with solid, consistent 100% opacity.
4. **Verified Pattern**:
   Matches the proven, flicker-free shared layout implementation in `components/Core/SegmentedControl.tsx` and `components/Core/SegmentedTab.tsx`.
