# Development Notebook - Jelly GPGPU Transition

## 2026-05-16: Architecture Shift
- **Issue**: `WiggleBone` relies on CPU-side bone updates which scale poorly with complex geometry and high instance counts.
- **Solution**: GPGPU (General-Purpose GPU) simulation. 
- **Implementation**:
    - Use two FBOs (Frame Buffer Objects) to ping-pong vertex positions and velocities.
    - Each pixel in the FBO maps to a vertex index on the `BoxGeometry`.
    - Simulation shader (compute) applies Hooke's Law (springs) and Damping.
    - Vertex shader displaces vertices based on FBO data.

## Physics Parameters
- **Stiffness**: 0.8 (Snappy return)
- **Damping**: 0.95 (Stable settling)
- **Mass**: 1.0

## 2026-05-26: Typography Standardized
- **Issue**: Inconsistent typography application using individual properties (`fontSize`, `fontFamily`).
- **Solution**: Force object spread for all typography tokens (`...theme.Type.Category.Context.Level`).
- **Implementation**:
    - Updated `SystemSpec` UI with new rule.
    - Refactored Core and Package components to spread tokens.
    - Codified in `AGENTS.md` and system metadata.

## 2026-05-26: Border system upgraded to Lush Shadow Glows & Outlines
- **Issue**: Standard 1px solid borders look flat and generic; 2px borders lack native inset behavior in standard layouts.
- **Solution**: Replace 1px solid borders with 3D box-shadow and inset box-shadow together (x = 0, y = 0, 1px ultra-crisp blur, 0px spread); replace 2px borders with CSS `outline` and `outlineOffset: -2px` properties.
- **Implementation**:
    - Embedded `getBorder1px` and `getOutline2px` helpers in `Theme.tsx` as part of standard border tokens.
    - Upgraded standard input components, custom selectors, button outlines, card borders, tag containers, and floating panels to leverage this new system.
    - Verified dynamic animation bindings (like `whileHover` and focus events) to seamlessly animate box-shadow states instead of standard border colors.

## 2026-05-26: Centering of Draggable Floating Windows Restored
- **Issue**: Centering a draggable absolute-positioned element via `transform: translate(-50%, -50%)` gets broken by Framer Motion on start or drag, as Framer Motion's `x` and `y` properties override and replace the CSS `transform` target, causing the window's top-left corner to jump to the middle of the viewport (offsetting it down and right).
- **Solution**: Replace the inline style `transform: 'translate(-50%, -50%)'` with the standalone modern CSS `translate: '-50% -50%'` property.
- **Implementation**:
    - Updated `FloatingWindow.tsx` style to use `translate: '-50% -50%'`.
    - Supported seamless composition where the browser handles the core layout centering via the standalone `translate` property, while Framer Motion handles separate drag offsets via the standard `transform` translation.

## 2026-05-27: ColorPicker Window Transformation
- **Issue**: The ColorPicker was a basic overlay, lacking the draggable and structural consistency of other system windows.
- **Solution**: Migrate the component to the `Package` layer and wrap its content in a `FloatingWindow`.
- **Implementation**:
    - Relocated `ColorPicker.tsx` from `Core` to `Package`.
    - Integrated `FloatingWindow` into the component's portal structure.
    - Updated index exports and all internal imports to maintain architectural integrity.

## 2026-05-27: Fixed Maximum Update Depth / Infinite Render Loop
- **Issue**: Re-registering color picker metadata configurations with live functions (`onChange`, `onCommit`) in the parent component via `ColorPicker`'s `useEffect` resulted in cascading re-renders and an infinite state callback loop.
- **Solution**: De-oscillate the state machine. Let `Home.tsx` store purely metadata open configs during window registration, while rendering live values and handlers directly derived from `btnProps` on the parent thread.
- **Implementation**:
    - Removed `useEffect` listener syncing state from `ColorPicker.tsx` entirely.
    - Simplified `window.openColorPicker` registration to pass start configuration only.
    - Unified the rendering of `<FloatingColorPickerWindow>` in `Home.tsx` to bind handlers locally to `btnProps`, completely eliminating intermediate feedback loops.

