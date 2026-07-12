# Plan - Replace Copy Button in SystemSpec and Fix 3D Scene Button Visibility

## PRD (Overview & Objectives)
The objectives of this task are:
1. **Replace SystemSpec Copy Button**: Replace the raw `<motion.button>` (the "COPY AS MARKDOWN" button) inside `SystemSpec.tsx` with our standard, portable `Button` component from `/components/Core/Button.tsx`.
2. **Fix 3D Scene Button Visibility**: Resolve the issue in the 3D Scene viewport slot overlay dialog where the "Copy Instructions" button's background and hover states are invisible (falling behind the dialog container overlay background).
   - This is caused by the lack of a stacking context on the `Button` component when using negative `z-index` for background layers (e.g., `zIndex: -1` and `zIndex: -2` on the absolute background elements).
   - Fix this by applying `isolation: 'isolate'` inside `/components/Core/Button.tsx`'s `baseStyles`, forcing a new stacking context on the button element globally. This ensures the background layers are drawn on top of the parent container's background while remaining behind the button's text/icon.
3. **Verify compilation**: Ensure the application compiles flawlessly and has no TypeScript or React runtime errors.

---

## OKR (Success Criteria)
- **O1**: The "Copy as Markdown" button inside `SystemSpec.tsx` is successfully replaced with the standard `Button` component, utilizing standard `variant="primary"` or appropriate variant, and maintains beautiful micro-animations and copy state transitions.
- **O2**: The "Copy Instructions" button in `components/3D/scene.tsx` (inside the Viewport Slot modal dialog) is fully visible, with a crisp background and proper text/icon color contrast, both in light and dark mode.
- **O3**: Running `npm run lint` / `lint_applet` and `npm run build` / `compile_applet` completes with zero errors.

---

## ADR (Architectural Design)

### 1. `SystemSpec.tsx` Button Replacement
- Import the standard `Button` component: `import Button from '../Core/Button.tsx';`.
- Replace the raw `<motion.button>` with `<Button>` at the bottom of the file.
- Use `variant="primary"`, `size="M"`, `onClick={handleCopy}`, and `enableSuccess={true}` (to utilize the button's built-in success state animation).
- Pass standard children content or the label so the button matches our visual system perfectly.

### 2. `Core/Button.tsx` Stacking Context Fix
- In `components/Core/Button.tsx`, add `isolation: 'isolate'` to `baseStyles`.
- This ensures that child elements with negative `z-index` (like `-1` and `-2` background layers used for the hover effect and standard fill) do not escape the button's boundaries and fall behind the grandparent dialog box's background.

---

## TODO List
1. [ ] Create this plan in `/plans/replace_copy_button_and_fix_3d_scenes.md`.
2. [ ] Modify `/components/Core/Button.tsx` to include `isolation: 'isolate'` in `baseStyles`.
3. [ ] Modify `/components/Package/SystemSpec.tsx` to import and use the standard `<Button>` component for the Copy as Markdown feature.
4. [ ] Verify `/components/Package/SystemSpecWindow.tsx` has no leftover raw `<motion.button>` copies of that action. (It already uses the standard `<Button>` and is styled nicely, but double-check).
5. [ ] Run `lint_applet` and `compile_applet` to confirm a green build.
