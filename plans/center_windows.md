# Center Windows Plan

Remove windows anchor to top and make it center center.

## PRD
- **Objectives**: Change the default anchoring and positioning of all floating windows from top-center to center-center.
- **Success Criteria**: 
  - Windows appear in the middle of the screen by default.
  - Dragging logic still works correctly relative to the new center.
  - All window types (Control, Code, Console, AI, Style Guide, System Spec, Color Picker) are centered.

## ADR
- **Layout Change**: Update `FloatingWindow.tsx` styles:
  - `top: 0` -> `top: '50%'`
  - `translate: '-50% 0'` -> `translate: '-50% -50%'`
  - `transformOrigin: 'top center'` -> `transformOrigin: 'center center'`
- **State Initialization**: Update `Home.tsx` initial window states:
  - Change `y: 120` to `y: 0` for all windows to align with the new center anchor.
- **Color Picker**: Check `ColorPicker.tsx` for `FloatingColorPickerWindow` and apply similar logic if applicable.

## TODO
1. [ ] Inspect `ColorPicker.tsx` for `FloatingColorPickerWindow`.
2. [ ] Modify `FloatingWindow.tsx` for center-center anchoring.
3. [ ] Modify `Home.tsx` for zeroed `y` offsets.
4. [ ] Modify `ColorPicker.tsx` if necessary.
5. [ ] Verify with `lint_applet` and `compile_applet`.
