# Tech Spec

1. **Objective**
   - **Problem Statement**: The `HTMLTexture3D` component in Framer is not rendering. It previously attempted to load Three.js and `three-html-render` via `cdn.jsdelivr.net` with an unsafe `new Function` dynamic evaluation, checked for `THREE.HTMLTexture` before initializing the polyfill, lacked graceful error boundaries, and attempted to attach DOM elements directly, which could disconnect the original Framer element or cause InvalidStateError in the HTML-in-Canvas polyfill.
   - **Solution Overview**: Update `HTMLTexture3D` to load Three.js (`three@0.186.0`), `RoundedBoxGeometry`, and the HTML-in-Canvas polyfill from `esm.sh` directly using standard dynamic imports. Initialize `installHtmlInCanvasPolyfill()` before any texture creation, support cloned mirror elements so the on-canvas target remains visible while streaming live into the 3D texture, configure smooth spring-driven Framer Motion rotation, and update both `/framer/test/HTMLTexture3D.tsx` and the live Framer project code file via the active Framer session.
   - **Scope**: Fix `/framer/test/HTMLTexture3D.tsx`, push updated code to the Framer code component in session 1 (`projectId: R60Z8o2lCHIu3neoIwsu`), verify diagnostics and type checks, and document resolution in `/RCA/rca_html_texture_3d_esm_fix.md`.
   - **Context**: The user instructed: "Check last framer agent session & lets continue. Fix: our component in framer not working. Use esm.sh to load threejs & three html render".

2. **Success Criteria**
   - **Zero Build/Typecheck Errors**: Both local TypeScript compilation and Framer remote `typecheckCode` pass with 0 errors.
   - **esm.sh Integration**: Three.js (`https://esm.sh/three@0.186.0`), `RoundedBoxGeometry` (`https://esm.sh/three@0.186.0/addons/geometries/RoundedBoxGeometry.js`), and `three-html-render` polyfill (`https://esm.sh/three-html-render@0.1.2`) loaded reliably.
   - **Polyfill Initialization**: `installHtmlInCanvasPolyfill()` is installed before WebGLRenderer or HTMLTexture initialization.
   - **DOM Preservation**: Target element clone is used for the canvas texture, keeping the original card element intact and visible on the Framer canvas while streaming real-time mutations.
   - **Live Component Sync**: Code file in Framer session 1 updated via `framer.getCodeFile('HTMLTexture3D.tsx').setFileContent(...)`.

3. **Project Requirements**
   - [ ] Draft tech spec in `/plans/html_texture_3d_esm_fix_tech_spec.md`.
   - [ ] Refactor `/framer/test/HTMLTexture3D.tsx` to load Three.js, RoundedBoxGeometry, and three-html-render polyfill from `esm.sh`.
   - [ ] Implement DOM element clone and live MutationObserver sync to feed `THREE.HTMLTexture` without disrupting canvas layout.
   - [ ] Deploy new code to the active Framer project code file in session 1.
   - [ ] Run type check on Framer code file and take diagnostic screenshot to verify scene rendering.
   - [ ] Create Root Cause Analysis (RCA) report in `/RCA/rca_html_texture_3d_esm_fix.md`.
   - [ ] Validate system integrity and compile applet.

4. **Architecture Decisions**
   - **esm.sh over jsdelivr**: `esm.sh` provides pre-bundled, standard ESM exports with pinned Three.js 0.186.0 and native CORS headers, avoiding eval/new Function bypasses that fail under Framer's browser sandbox.
   - **Pre-Initialization of Polyfill**: `installHtmlInCanvasPolyfill()` must patch `HTMLCanvasElement.prototype` and `WebGLRenderingContext.prototype` before Three.js queries `texElementImage2D` or `requestPaint`.
   - **Element Cloning for Texture Pipeline**: In WICG HTML-in-Canvas, an element mapped to a texture is made an offscreen child of the canvas with `opacity: 0`. To prevent the designer's Framer card from disappearing, a deep clone is maintained inside the canvas while the visible card remains in place on the page, synced via `MutationObserver` and `ResizeObserver`.
   - **Fallback Geometry**: If `RoundedBoxGeometry` load ever delays or fails, seamlessly fall back to `BoxGeometry` to ensure zero blank-canvas crashes.

5. **Pseudo Code**
   ```dsl
   COMPONENT HTMLTexture3D:
     DATA:
       target: String = "Card"
       dimensions: { width: 340, height: 380, depth: 45, radius: 20, segments: 6 }
       transform: { rotationX: 12, rotationY: 28, rotationZ: -4, scale: 1 }
       material: { metalness: 0.3, roughness: 0.2, background: "transparent" }
       motion: SpringTransition
     LOGIC:
       HOOK useEffect:
         LOAD [threeModule, geometryModule, polyfillModule] FROM esm.sh
         EXECUTE installHtmlInCanvasPolyfill()
         FIND targetElement BY data-framer-name OR selector
         CREATE cloneElement FROM targetElement
         ATTACH canvas TO container WITH attribute "layoutsubtree"
         INIT WebGLRenderer, PerspectiveCamera, Scene, Lights
         CREATE texture = new THREE.HTMLTexture(cloneElement)
         CREATE mesh = new THREE.Mesh(RoundedBoxGeometry, MeshStandardMaterial(map: texture))
         OBSERVE targetElement FOR DOM changes -> SYNC cloneElement -> texture.needsUpdate = true
         ANIMATE spring oscillation WITH animate()
         LOOP requestAnimationFrame -> renderer.render(scene, camera)
     RENDER:
       DIV ref=containerRef style={ width: 100%, height: 100%, overflow: hidden }
   ```
