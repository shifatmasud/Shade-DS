# Tech Spec

1. **Objective**
   - **Problem Statement**: The live published Framer site (`https://happier-anything-775440.framer.app`) does not render the `HTMLTexture3D` component (blank canvas, 1963 bytes, all-zero pixels). Headless browser testing revealed four underlying failures:
     1. Framer passes `height: "100%"` into the component props. `new RoundedBoxGeometry(width, height, depth, segments, radius)` receives `"100%"` as `height`, producing `NaN` for radius and all vertex coordinates. Three.js logs: `THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`, which causes frustum culling to discard the mesh completely.
     2. Lack of SSR two-phase hydration guard (`isClient`) triggers `Minified React error #419` on the published site during hydration.
     3. Geometry dimensions should dynamically derive from the real target element (`targetEl.offsetWidth`, `targetEl.offsetHeight`) if props are percentages or undefined.
     4. The updated code has not been published to production via `framer.agent.publish({ action: "confirm_publish" })`.
   - **Solution Overview**: 
     1. Add two-phase hydration safety (`isClient` state) with safe SSR placeholder.
     2. Sanitize and coerce all dimension props (`width`, `height`, `depth`, `radius`, `segments`, `rotation`, `scale`, `metalness`, `roughness`) to clean finite numbers. If `width` or `height` are non-numeric strings (like `"100%"`), derive them from `targetEl.offsetWidth` / `targetEl.offsetHeight`.
     3. Add defensive bounding sphere validation with automatic fallback to standard `BoxGeometry`.
     4. Sync the fixed code to `/framer/test/HTMLTexture3D.tsx` and Framer project code file `HTMLTexture3D.tsx`.
     5. Publish the Framer project to production using `framer.agent.publish({ action: "confirm_publish", confirmationHash })`.
     6. Use Browserless real browser (and/or Firecrawl) to test the live production site and verify non-zero pixels, no NaN errors, and clean rendering.
   - **Scope**: 
     - `/plans/html_texture_3d_published_site_fix_tech_spec.md`
     - `/framer/test/HTMLTexture3D.tsx`
     - Framer session 1 code file `HTMLTexture3D.tsx`
     - Published Framer site `https://happier-anything-775440.framer.app`
     - `/RCA/rca_html_texture_3d_published_site.md`
   - **Context**: The user requested: "Use real browser (or firecrawl) to test published framer site. Cause live site doesn't load the component".

2. **Success Criteria**
   - **Key Results**:
     - Real browser testing (via Browserless Puppeteer) connects to `https://happier-anything-775440.framer.app` and confirms:
       - No `THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN` errors.
       - No `Minified React error #419` hydration errors.
       - Canvas element renders non-zero pixel data (live 3D mesh rendered).
       - Canvas screenshot contains high-fidelity 3D graphic.
     - Framer session 1 typecheck returns 0 diagnostics.
     - Production deployment is confirmed and verified live.
   - **Non-Negotiables**:
     - Only write to `/framer/test/`, `/RCA/`, and `/plans/`.
     - Zero new icon dependencies.
     - Zero compile/lint errors.

3. **Project Requirements**
   - [ ] Formulate Tech Spec in `/plans/html_texture_3d_published_site_fix_tech_spec.md`.
   - [ ] Update `/framer/test/HTMLTexture3D.tsx` with hydration safety, robust prop sanitization, and NaN bounding-sphere guards.
   - [ ] Push updated code to Framer session 1 code file `HTMLTexture3D.tsx` and run typecheck.
   - [ ] Publish the Framer project to production via `framer.agent.publish`.
   - [ ] Run Puppeteer real browser test via Browserless on `https://happier-anything-775440.framer.app`.
   - [ ] Run Firecrawl test to verify live published markdown and snapshot.
   - [ ] Document full root causes, browser logs, and verification in `/RCA/rca_html_texture_3d_published_site.md`.

4. **Architecture Decisions**
   - **Decision: Dynamic Dimension Coercion**:
     - *Trade-off*: When Framer passes `"100%"`, simple `parseFloat` yields `100`, which would distort a 380px card into a small 100px square.
     - *Resolution*: Check `if (typeof height === "string" && height.includes("%"))` -> prioritize `targetEl.offsetHeight || 380`. Same for width.
   - **Decision: Two-Phase Hydration (`isClient`)**:
     - *Trade-off*: Adds a 1-frame blank or placeholder during SSR.
     - *Benefit*: Completely eliminates React Error #419 hydration mismatch on static/SSR Framer deployments.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   COMPONENT HTMLTexture3D:
     DATA:
       isClient: Boolean = false
       errorMsg: String | null = null
       containerRef: Ref<HTMLDivElement>
     LOGIC:
       HOOK useEffect[]:
         isClient = true
       HOOK useEffect[target, width, height, ...]:
         IF NOT isClient OR NOT containerRef.current RETURN
         safeW = parseNumericOrElement(width, targetEl.offsetWidth, 340)
         safeH = parseNumericOrElement(height, targetEl.offsetHeight, 380)
         safeD = parseFloat(depth) || 45
         safeR = Math.min(parseFloat(radius) || 20, safeW / 2, safeH / 2, safeD / 2)
         safeSeg = Math.max(1, Math.min(20, Math.round(parseFloat(segments) || 6)))
         initScene(safeW, safeH, safeD, safeR, safeSeg)
     RENDER:
       IF NOT isClient:
         DIV(style={width: "100%", height: "100%", background})
       IF errorMsg:
         DIV(warningBanner)
       DIV(ref=containerRef)
   ```
