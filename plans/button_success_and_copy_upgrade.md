# Plan - Core Button, Staged Button Success, Space Tokens, and Safe UI Copies

## PRD (Overview & Objectives)
The objectives of this upgrade are:
1. **Core Button Upgrades**: Enhance `/components/Core/Button.tsx` to support *any* child or React Node as an icon, support extensive props for custom styles and customization (spreading props), and ensure StateLayer and RippleLayer visual styles are customized to match staged buttons 1:1 (wrapped inside a border-radius-inheriting absolute container with overflow hidden).
2. **Staged Button Success State**: Enhance `/components/staged/Button.tsx` to include an `enableSuccess` flag. When toggled, clicking the button triggers a beautiful and clean success animation.
   - The surface color changes to the success color with a clean **mask slide** transition.
   - The text and icon morph gracefully into a success mark ("ph-check" and "Success!").
   - Add a toggle control to the "State" section of the control panel (`ControlPanel.tsx`).
3. **Copy-Paste Fixes (No UI Freezing)**: Replace the plain, freezing native copy buttons inside `/components/Package/SystemSpecWindow.tsx` and `/components/3D/scene.tsx` with our upgraded `/components/Core/Button.tsx`. Integrate a bulletproof fallback mechanism for restricted iframe clipboard APIs, ensuring zero UI freezing.
4. **Style Guide Space Tokens**: Simplify the space visualization section inside Style Guide Panel (`StyleGuidePanel.tsx`). Remove the overflowing pixel-metric visualization line. Optimize cards into a 1-column responsive layout with constrained maximum preview width to perfectly fit the Style Guide's panel width without any overflow scrollbars.

---

## OKR (Success Criteria)
- **O1**: Upgraded Core Button works flawlessly as a robust, generic button in place of any generic buttons.
- **O2**: Clicking the staged button with "Success State" toggled on triggers a smooth green clipPath "mask slide" transition and turns content to a checkmark + "Success!".
- **O3**: Copying text in SystemSpecWindow and Scene3D dialog no longer freezes the UI, falls back gracefully under iframe sandbox limits, and uses the customized core `Button` with micro-animations.
- **O4**: Space tokens in Style Guide are 1-column, fits perfectly without overflow, and looks highly professional.
- **O5**: Linter (`npm run lint` / `lint_applet`) and compilation (`npm run build` / `compile_applet`) both pass cleanly.

---

## ADR (Architectural Design)

### 1. `Core/Button.tsx` Upgrade
- Introduce support for `icon?: React.ReactNode` in types, checking if it's a string (render Phoshor `<i>` tag) or already a React node.
- Support React's native Button attributes via `React.ButtonHTMLAttributes<HTMLButtonElement>` extension on types, and spreading remaining props onto the `<motion.button>`.
- Use core `StateLayer` and `RippleLayer` wrapped inside zero-inset container divisions styled with `borderRadius: 'inherit'`, `overflow: 'hidden'`, and `pointerEvents: 'none'`.

### 2. `staged/Button.tsx` Success State
- Add `enableSuccess?: boolean` prop.
- Initialize internal state `isSuccess` to track trigger.
- When clicked and `enableSuccess` is true, trigger `isSuccess` to true for `2000ms`, then reset.
- Background Layer: Add a `<motion.div>` using a `clipPath: 'inset(...)'` mask slide inside the container, utilizing success background and text colors.
- Content: Animate transition using `AnimatePresence mode="wait"` between normal labels and success labels with check icons.

### 3. Copy/Clipboard Fallback
- Create a reusable robust `copyToClipboard` helper function that attempts `navigator.clipboard.writeText` and falls back to a temporary `<textarea>` with `document.execCommand('copy')` on any error (like iframe security blocks), avoiding any thread-blocking or uncaught promise rejection.

### 4. Style Guide Space Tokens
- Adjust grid styles on Space Section in `StyleGuidePanel.tsx` to `gridTemplateColumns: '1fr'`.
- Scale and clip the space preview bar width using `Math.min(parsedValue, 120)` to ensure it never exceeds a safe width and overflows.

---

## TODO List
1. [ ] Upgrade `types/index.tsx` to include `enableSuccess?: boolean` in `MetaComponentProps`.
2. [ ] Upgrade `components/Core/Button.tsx` with children support, React Node icon support, custom attributes spread, and exact 1:1 styled state/ripple layer absolute container wrapper.
3. [ ] Upgrade `components/staged/Button.tsx` with success state, internal `isSuccess` timer, success background layer with clipPath mask slide, and morphing content.
4. [ ] Add "Enable Success State" Toggle to `components/Package/ControlPanel.tsx` under the State accordion.
5. [ ] Initialize `enableSuccess: false` in `components/Page/Home.tsx` state `btnProps`.
6. [ ] Replace the copy button in `components/Package/SystemSpecWindow.tsx` with our upgraded Core `Button` component and robust clipboard fallback.
7. [ ] Replace the copy button in `components/3D/scene.tsx` with our upgraded Core `Button` component and robust clipboard fallback.
8. [ ] Adjust the space section layout in `components/Package/StyleGuidePanel.tsx` to use 1-column grid without visual line overflow.
9. [ ] Verify compilation and code quality using `lint_applet` and `compile_applet`.
