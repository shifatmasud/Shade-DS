# PRD: Select Component Icon Grid Variant

## Overview & Objectives
Enhance the `Select` component with a specialized `icon-grid` variant designed for icon selection. This variant will replace the standard vertical list dropdown with a uniform grid of icons, featuring floating monospace labels on hover for clarity.

## OKR (Success Criteria)
- [ ] `Select` component accepts a `variant` prop.
- [ ] `icon-grid` variant renders options in a 4x4 (or similar) uniform grid.
- [ ] Hovering over a grid item reveals a "floating mono label" showing the option's label.
- [ ] Selection logic remains consistent with the default `Select`.
- [ ] Styling adheres strictly to `Theme.tsx` tokens.

## ADR (Architectural Design)
- **Component Modification**: Update `SelectProps` and `SelectOverlayProps` to include `variant`.
- **Layout Change**: Implement conditional rendering in `SelectOverlay` based on `variant`.
- **Floating Label**: Use a local state or MotionValue to track the currently hovered option's label and position for the floating label.
- **Styling**: 
    - Grid: `display: grid`, `grid-template-columns: repeat(4, 1fr)`.
    - Floating Label: Absolute positioned, monochromatic, monospace font (`theme.Type.Expressive.Data`).
- **Icons**: Assume the `label` or a new `icon` field in `options` provides the icon to render. Given `Select` is generic, we'll stick to the existing `options` structure and perhaps assume the `label` is the icon name if `variant="icon-grid"`. Wait, the user says "Only for icon selection", so I should probably expect icons to be passed or rendered.

## TODO
- [ ] Update `SelectProps` in `Select.tsx`.
- [ ] Update `SelectOverlayProps` in `Select.tsx`.
- [ ] Modify `SelectOverlay` to handle `variant="icon-grid"`.
- [ ] Implement the `IconGrid` sub-view within `SelectOverlay`.
- [ ] Implement the floating label logic using Framer Motion.
- [ ] Update `Select` to pass `variant` to `SelectOverlay`.
- [ ] Verify with `compile_applet`.
