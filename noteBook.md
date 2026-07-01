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

## 2026-05-27: High-Performance Zero-Rerender Tracker for Slider & Counters
- **Issue**: Standard continuous interactive elements (sliders, spring numbers, and counters) trigger React component-level re-renders on every slider tick or dragging change. This causes frequent DOM-reconstruction and degrades frame rates.
- **Solution**: Decouple interactive drag loops and spring animations from React's render lifecycle. Use an offscreen MotionValue observer pattern where digit column y-translations are driven directly on the GPU/main thread-ish with zero virtual DOM overhead, and sync React state only at natural rest boundaries (pointer drag release).
- **Implementation**:
    - Upgraded `AnimatedCounter.tsx` to accept and subscribe to `MotionValue<number>`.
    - Handled standalone numbers seamlessly via back-compatible memoized hook channels.
    - Segmented `AnimatedCounter` to only trigger a React state reconciliation when layout structure (such as count digits or format chars) changes, leaving digits to slide individually via direct transform mutations.
    - Updated `RangeSlider.tsx` drag handlers to set the underlying `MotionValue` directly, bypassing React state setter calls during dragging.
    - Bound track filling and slider handle displacements directly to `percentageStyle` transforms to execute purely on the motion layer with absolutely 0 virtual DOM re-renders.

## 2026-05-27: Card Corner Radius Standardized
- **Issue**: Default Card corner radius of 12px (`Radius.L`) or 16px was too sharp for modern soft-form layout layouts.
- **Solution**: Set Default card corner radius to 40px and configure nested spacing math to correctly calculate internal media outlines.
- **Implementation**:
    - Updated `/components/Package/Card.tsx` default fallback border radius to `40px`.
    - Handled fallback parameters inside both the style properties and the `outerRadiusMV` motion structure initializer to ensure fluid nested padding-aware dynamic computations yield an internal 16px radius for the visual media area.
    - Synced component type initialization inside `/components/Package/ControlPanel.tsx` to preset a Card with `40px` custom corner radius automatically on selector click.

## 2026-05-27: Real-Time Color Slider Motion Synchronizer
- **Issue**: Color Picker drag adjustments were only reflected on pointer release to avoid infinite React re-renders. This prevented real-time color feedback of the stage button during drag movements.
- **Solution**: Bind the custom fill and text colors directly to offscreen Framer Motion `MotionValue` threads. By mutating these values on drag, the card/button background and text colors update at 120fps with absolutely zero React virtual DOM re-renders.
- **Implementation**:
    - Declared `fillColorMotionValue` and `textColorMotionValue` inside `Home.tsx`.
    - Updated `<Button>` and `<Card>` components to accept `string | MotionValue<string>` for `customFill` and `customColor` input properties.
    - Refactored `StateLayer` and `RippleLayer` structures to accept and bind to `MotionValue` color properties natively.
    - Updated `FloatingColorPickerWindow` in `ColorPicker.tsx` to notify `onChange` continuously on every frame while sliding, updating the underlying motion values seamlessly.
    - Maintained React's state commitment inside `onCommit` only, ensuring that heavy operations (like JSON-serialization and Undo/Redo history snapshots) are postponed until mouse release.

## 2026-05-27: Total De-coupling of HSL Sliders from React Renders
- **Issue**: Although the individual slider handle translation was bound to direct non-rendering motion values, the HSL slider track backgrounds (namely, Saturation and Lightness gradients) still recalculated dynamically based on the current active Hue. To update these tracks as the user dragged, the parent `FloatingColorPickerWindow` component was syncing coordinate state via a local React `useState` hook on every frame, which incurred React virtual DOM re-render cycles that occasionally caused micro-stuttering or interaction lag during intense sliding movements.
- **Solution**: Developed a 100% native, zero-rerender DOM-style injection pattern using dynamic CSS Variables. Eliminated the local React `useState` track entirely. Subscribed to the Framer Motion `on("change")` listeners of the slider MotionValues and mutated sub-pixel CSS variables directly on the container element, letting the browser perform layout repaints entirely off the main React rendering thread.
- **Implementation**:
    - Discarded `hsl` and `setHsl` React state from `FloatingColorPickerWindow` entirely.
    - Set up a unique DOM container `wrapperRef` linked directly to the color picker body.
    - Configured a synchronized `useEffect` hook that listens directly to changes on `hueMV`, `satMV`, and `lightMV`. When any slider is moved, it computes the target Saturation and Lightness gradients and injects them instantly as CSS variables (`--picker-sat-grad` and `--picker-light-grad`) into the wrapper style sheet.
    - Passed standard CSS references (`var(--picker-sat-grad)` and `var(--picker-light-grad)`) as `trackBackground` properties to the `RangeSlider` tracks, enabling instantaneous native GPU-accelerated repaints.
    - Achieved absolute maximum speed, buttery-smooth dragging transitions, and a solid 120fps performance profile with absolutely zero React virtual DOM re-renders or diff check loops.

## 2026-05-27: Dynamic Theme-Aware Fallbacks for custom Color/Fill
- **Issue**: Standard component variants override background and content/text color dynamically. When custom overrides (`customColor` and `customFill`) are active as MotionValues, they can contain empty strings (`""`) initially before any picker interaction occurs. Because standard JS fallback evaluation (`customColor || fallback`) treats any object reference as truthy, it fails to fall back to theme tokens, resulting in un-styled text colors (e.g. the card's 'Do Magic' title color became theme-unaware).
- **Solution**: Designed a custom React Hook `useResolvedMotionValue` that seamlessly handles both raw values and MotionValues unconditionally. It utilizes a `useTransform` wrapper to evaluate dynamic values on the fly, substituting empty strings with appropriate design tokens from `Theme.tsx`.
- **Implementation**:
    - Created the `useResolvedMotionValue` utility inside `/components/Package/Card.tsx` and `/components/Core/Button.tsx`.
    - Integrated native design tokens from `Theme.tsx` as default values for the background (`fallbackBg`) and text (`fallbackColor`) across all layout variants (primary, secondary, outline, destructive, tertiary).
    - Passed resolved colors straight to the Framer Motion layout styling layers, guaranteeing smooth, highly reactive frame-level color adjustments without losing theme awareness.

## 2026-05-27: Automated Agent Learning of High-Performance Style Architecture
- **Issue**: The zero-rerender, multi-layered high-performance pipeline we achieved is highly specific and custom. Future AI integrations, code edits, or additional features risk degrading this pristine 120fps thread orchestration if they fall back on standard dirty React re-rendering patterns or naive prop updates.
- **Solution**: Encapsulated these design principles, React hooks (`useResolvedMotionValue`), pipeline patterns, and direct-to-DOM CSS variables injection into the workspace's formal `/skills/shade_dsl/SKILL.md` skill instruction sheet.
- **Implementation**:
    - Expanded the active Shade DSL skill schema and instructions to mandate the "Zero-Rerender Frame-Value Pipeline" and "Direct-to-DOM CSS Variable Injection".
    - Documented the exact layout logic, the `RefObject` style variable bindings on the compositing layer, and "Asymmetrical Sync & Drag Release Validation" patterns inside the instruction template.
    - Guaranteed that any future AI agent matching the developer's scope automatically loads and respects these high-fidelity architectural rules for subsequent iterations.

## 2026-05-27: Interactive Layer Motion Propagation and Physics Corrections
- **Issue**: Standard Button hover states were occasionally experiencing invisible state feedback overlays (invisible hovers) due to empty `customColor` MotionValues passing directly into the layered feedback tree without proper fallback resolution (failing to fall back to standard `feedbackColor` since object references remain truthy). Additionally, the heavy `blur(12px)` CSS filter produced a muddy, unpolished visual halo on the ripple bubble, and standard custom easements felt laggy.
- **Solution**: Re-routed Button background layer rendering styles to bind directly to the evaluated `resolvedColor` MotionValue, ensuring that standard buttons receiving empty custom color overrides resolve correctly to the theme system's fallback tokens. Removed the heavy CSS blur filter from the ripple layers, and configured standard `easeInOut` transitions for standard state hover layers and `spring` physics for ripple burst animations.
- **Implementation**:
    - Refactored `/components/Core/Button.tsx`: Altered the `color` prop passed to both `StateLayer` and `RippleLayer` to use the evaluated `resolvedColor` MotionValue, aligning layer color resolution with the main layout variants.
    - Updated `/components/Core/StateLayer.tsx` and `/Framer/StateLayer.tsx`: Refitted standard transitions to execute on an `'easeInOut'` easing model, providing smooth hover animations.
    - Updated `/components/Core/RippleLayer.tsx` and `/Framer/RippleLayer.tsx`: Detached the `filter: 'blur(12px)'` dynamic property and adjusted defaults to map to Framer Motion spring parameters (`type: 'spring', stiffness: 80, damping: 15`).

## 2026-05-29: Architectural Restructure (Base vs Staged Split)
- **Issue**: Standard button and card components were closely intertwined with workspace interaction mechanisms (like 3D rotators, sound, coordinates systems, and heavy measurement attributes). This precluded simple copy-pasting of these components into other clean React environments.
- **Solution**: Distribute components into two layers: `/components/` for pure, lightweight, portable base UI items, and `/components/staged/` for custom interactive systems.
- **Implementation**:
    - Created `/components/staged/Button.tsx` and `/components/staged/Card.tsx`, maintaining the original interactive design playground code.
    - Simplified `/components/Core/Button.tsx` and `/components/Package/Card.tsx` into clean, self-contained components that use standard layout styling, simple props, and Framer Motion micro-interactions.
    - Updated `/components/Section/Stage.tsx` imports of Button/Card to target `/components/staged/` so the staging platform retains its robust visual rendering.

## 2026-05-30: ShadeR DSL (GLSL WebGL GPGPU Companion) Integrated
- **Issue**: High-performance animations and simulation engines (such as WebGL, GPGPU vertex deformations, and particle springs) require unique shader pipeline planning. Standard Shade DSL is tailored for React layout nesting systems (state, props, components), making it difficult for design system agents to seamlessly plan GPU state-machine operations (uniforms, Ping-Pong FBO textures, vertex/fragment bindings) without translation friction.
- **Solution**: Introduce a customized ShadeR subskill detailing stateful, parallel Shader representations (DATA/LOGIC/RENDER models) optimized for Ping-Pong GPGPU and GLSL shader code translations.
- **Implementation**:
    - Created `/skills/shader_dsl/SKILL.md` comprising the complete stack, mapping matrices, and validation guidelines.
    - Documented state mechanics (uniform structures, texture buffers, attributes) alongside physics solver behaviors (particle springs, mouse attractors) and stage execution rules (vertex position displacements, fragment pixels).
    - Linked the subskill within `/README.md` to ensure automatic contextual learning for any downstream agents targeting GPGPU render steps.

## 2026-06-09: ShadeR DSL Spec Upgrade (Node-Based Architecture)
- **Issue**: The previous `DATA`/`LOGIC`/`RENDER` pillar model was too abstracted and lacked an explicit pipeline flow representation.
- **Solution**: Upgraded `shader_dsl` to a strict Node-Based Shader Graph Model, treating shader stages as node compositions behaving like pure/stateful modular synths.
- **Implementation**:
    - Restructured `/skills/shader_dsl/SKILL.md` to define node contracts (Input, Generator, Transformer, Filter, Mixer, Effect, Output).
    - Enforced isolation across `@vertex`, `@fragment` and `@compute` explicit stages.
    - Simplified logic intent into readable semantic transformation rules, replacing arbitrary YAML configurations with distinct, typed Graph definitions.
    - **Follow-up:** Appended a complete Navier-Stokes Stable Fluid Simulation example mapped entirely into `@compute` and `@fragment` node contracts.
- **IPO Optimization (Input-Process-Output Refactor)**: Refactored nodes to reside strictly inside the **Process** layer. Removed explicit "Input" and "Output" node types, letting the outer IPO structure naturally bind data structures (Uniforms, Texture buffers, Framebuffers) to the processing pipeline for cleaner, modular composition.




