# Tech Spec 

1. **Objective**
   - **Problem Statement**: The user wants to use the Framer CLI (`@framer/agent`) and custom automated test infrastructure to test the reverse-engineered `LusionCursorTrail` component (`framer/test/LusionCursorTrail.tsx`), verifying Framer code component compliance, property controls, hydration safety, runtime WebGL2 execution, and rendering fidelity.
   - **Solution Overview**: 
     1. Upgrade `/framer/test/LusionCursorTrail.tsx` into a compliant Framer Code Component adhering to `/skills/framer-code-components-overrides/SKILL.md`:
        - Add Framer metadata JSDoc annotations (`@framerDisableUnlink`, `@framerIntrinsicWidth 600`, `@framerIntrinsicHeight 450`, `@framerSupportedLayoutWidth any`, `@framerSupportedLayoutHeight any`).
        - Implement `addPropertyControls` with `ControlType.Number`, `ControlType.Boolean`, `ControlType.Color`, `ControlType.Enum` matching Lusion's shader uniforms (`pushStrength`, `curlStrength`, `rgbShift`, `velocityDissipation`, `colorMultiplier`, `useNoise`).
        - Implement strict hydration safety guards (`RenderTarget`, `typeof window !== "undefined"`, client-side mount guards).
     2. Develop `scripts/test_framer_component.ts`:
        - Invokes the Framer Agent API (`@framer/agent` docs/typecheckCode or AST parsing) to validate property control schemas and component exports.
        - Mounts the component in a test environment, boots a headless browser session via Browserless/Puppeteer Core, simulates pointer interactions (swirls, drags, sweeps), listens for WebGL2 pipeline errors or shader compilation warnings, and captures a rendered screenshot.
        - Hosts the rendered test screenshot on free temporary CDN hosting for visual verification.
   - **Scope**: Framer component conversion, property control validation, headless Browserless runtime testing, and test result reporting.
   - **Context**: Verifying and testing the reverse-engineered Lusion WebGL2 shader cursor trail component within the Framer ecosystem.

2. **Success Criteria**
   - **Key Results**:
     - `framer/test/LusionCursorTrail.tsx` has complete Framer annotations, props, and `addPropertyControls`.
     - Script `scripts/test_framer_component.ts` successfully executes and audits the component.
     - Automated headless test validates clean WebGL2 canvas initialization, shader program compilation, and cursor trail excitation with 0 runtime errors.
     - Visual screenshot of the active cursor trail in the test runner is generated, saved, and hosted online.
     - `compile_applet` and `lint_applet` pass with 0 errors.
   - **Non-Negotiables & Criteria**:
     - Strict adherence to `AGENTS.md` (Dock Immunity preserved, no icon library installations, clean theme token usage).
     - Component must remain usable both standalone and inside Framer canvas environments.

3. **Project Requirements**
   - [x] Formulate Tech Spec in `/plans/framer_lusion_cursor_trail_test_tech_spec.md`.
   - [ ] Refactor `/framer/test/LusionCursorTrail.tsx` to include Framer annotations, default props, and `addPropertyControls`.
   - [ ] Create automated testing runner `scripts/test_framer_component.ts`.
   - [ ] Execute `scripts/test_framer_component.ts` and verify shader execution and visual output.
   - [ ] Update Recent Changelogs in `README.md`.
   - [ ] Validate final compilation and lint.

4. **Architecture Decisions**
   - **Dual-Mode Component Compatibility**:
     - Support both direct React props (when instantiated in React/Vite SPA) and Framer property controls (when dropped on Framer canvas). If props are omitted, fallback gracefully to `defaultProps`.
   - **Hydration & SSR Safety**:
     - Guard Three.js canvas creation behind `isClient` and check `typeof window !== "undefined"` to prevent SSR crashes or hydration mismatch errors.
   - **Browserless Headless Testing**:
     - Run a dedicated test page that loads the component, simulates cursor gestures, captures canvas frames, and asserts that WebGL2 context and framebuffers function without errors.

5. **Pseudo Code**
   ```shade
   DATA {
     componentPath: Path = "framer/test/LusionCursorTrail.tsx",
     controls: Map = {
       pushStrength: ControlType.Number(min: 0, max: 60),
       curlStrength: ControlType.Number(min: 0, max: 15),
       rgbShift: ControlType.Number(min: 0.1, max: 4.0),
       velocityDissipation: ControlType.Number(min: 0.9, max: 0.995),
       useNoise: ControlType.Boolean(default: true)
     }
   }
   LOGIC {
     // Validate AST and Framer Control schema
     Assert(Component.hasAnnotation("@framerDisableUnlink"))
     Assert(Component.hasPropertyControls(controls))
     
     // Headless WebGL2 runtime excitation
     session = Browserless.createSession()
     page = session.newPage()
     page.mountComponent(LusionCursorTrail, props: { pushStrength: 30, curlStrength: 6.0 })
     page.mouse.moveSequence(swirls: 15, sweeps: 4)
     errors = page.getConsoleErrors()
     Assert(errors.length == 0)
     screenshot = page.screenshot()
     hostedUrl = UploadToTempHost(screenshot)
   }
   RENDER {
     Return(Status: PASS, PreviewUrl: hostedUrl)
   }
   ```
