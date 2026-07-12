# Plan: SystemSpec Button Standardization & 3D Copy Instructions Visibility Fix

## PRD (Overview & Objectives)
- **Objective 1**: Replace the copy button inside `SystemSpecWindow.tsx` with our standard, fully styled `Button` component, matching the label "Copy as Markdown" exactly.
- **Objective 2**: Resolve the visibility and stacking context (z-index) issue with standard Buttons where their background layers (`zIndex: -1` and `-2` for success masks and active/hover states) render behind parent container backgrounds under certain stacking contexts.
- **Objective 3**: Fix the 3D scene copy instructions dialog and trigger button's color/visibility and z-index depth conflicts when 3D perspective transforms are active in the viewport.

## OKR (Success Criteria)
- **Key Result 1**: The "Copy as Markdown" button in `SystemSpecWindow.tsx` is successfully integrated as a standard `Button` imported from `../Core`.
- **Key Result 2**: The copy instructions trigger button (Info icon) in the 3D scene is fully visible in both light and dark themes, using responsive design tokens instead of hardcoded white transparency.
- **Key Result 3**: The copy instructions dialog is fully visible, centered, and completely immune to 3D stacking clipping bugs, achieved by portaling the dialog to `document.body` with high z-index stacking.
- **Key Result 4**: The standard `Button`'s backgrounds are perfectly visible across all contexts in the app without rendering behind background layers, fixed cleanly via local stacking context isolation (`isolation: 'isolate'`).

## ADR (Architectural Design)
- **Button Stacking Context (`isolation: 'isolate'`)**: In modern CSS, elements with negative `zIndex` (like the background layers used for the mask slide in our core `Button.tsx`) can render behind their parent's background if the parent does not establish its own stacking context. By adding `isolation: 'isolate'` to the core button's base styles, we establish a local stacking context on the button itself. This guarantees that its background layers are always stacked on top of any container/parent backgrounds.
- **Trigger Button Color Adaptability**: The info icon trigger in `scene.tsx` was hardcoded to `rgba(255, 255, 255, 0.05)`, which is invisible in light themes. We will use `theme.Color.Base.Surface[2]` and `theme.Color.Base.Content[1]` with `theme.border.getBorder1px(theme.Color.Base.Surface[3])` to make it perfectly adaptive.
- **React Portal for 3D Overlays**: When `view3D` is active, the parent stage container applies a 3D rotate and `transform-style: preserve-3d`. This clips or skews absolute overlay dialogs in the 3D depth field. We will use React's `createPortal` to render the copy instructions overlay directly at the document root level (`document.body`) with `position: fixed` and `zIndex: 9999` so it is always rendered flat, centered, and cleanly above all 3D content.

## TODO List
1. Modify `/components/Core/Button.tsx` to add `isolation: 'isolate'` to standard button base styles.
2. Modify `/components/Package/SystemSpecWindow.tsx` to clean up imports (use unified `import { Button } from '../Core'`) and change button label to "Copy as Markdown".
3. Modify `/components/3D/scene.tsx` to:
   - Import `createPortal` from `'react-dom'`.
   - Update the "Info Trigger" button to use semantic theme tokens instead of hardcoded translucent white.
   - Wrap the `AnimatePresence` dialog inside a `createPortal` targeting `document.body` with `position: 'fixed'` and `zIndex: 9999`.
4. Run `lint_applet` and `compile_applet` to verify zero build errors.
