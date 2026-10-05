# Tech Spec

1. **Objective**
   - **Problem Statement**: `HTMLTexture3D.tsx` displayed a completely black screen in Framer. Even when imports were pointing to `esm.sh`, Three.js's internal WebGL texture upload logic (`WebGLTextures.js`) contains a parent-node equality check (`K.parentNode !== $`) where it immediately returns without uploading when the element's parent is not the canvas. In the `three-html-render` polyfill, `canvas.appendChild` reparents elements into an offscreen host div, meaning `K.parentNode !== canvas` was permanently true, trapping Three.js in an infinite abort loop and leaving the texture uninitialized (pitch black). Additionally, dynamic `new Function("u", "return import(u)")` imports were failing under Framer's CSP sandbox, and calling `texElementImage2D` before the polyfill's asynchronous SVG foreignObject rasterization produced uncaught `DOMException: no snapshot recorded yet` errors.
   - **Solution Overview**: 
     1. Adopt native static top-level ESM imports directly from `https://esm.sh/` (`three@0.186.0`, `RoundedBoxGeometry`, and `three-html-render@0.1.2`), which Framer's compiler natively packages and runs.
     2. Decouple from Three.js's broken internal `isHTMLTexture` parent-node trap by implementing a direct texture pipeline using `THREE.CanvasTexture` updated via `canvas.captureElementImage(element)` inside the `paint` event listener.
     3. Provide an instant gradient placeholder canvas so the 3D card never renders black while the first asynchronous foreignObject snapshot compiles.
     4. Introduce visual error reporting so any DOM query timeout or runtime exceptions are immediately surfaced in the UI rather than failing silently into a black screen.
   - **Scope**: Update `/framer/test/HTMLTexture3D.tsx`, push verified code to Framer session 1, verify 0 typecheck diagnostics, capture rendered node screenshot, and document full root causes in `/RCA/rca_html_texture_3d_black_screen.md`.
   - **Context**: The user requested: "Rca in framer HTMLTexture3D.tsx shows black screen. Find catch fix errors. Go clean direct. Research official docs first".

2. **Success Criteria**
   - **Zero Black Screen**: Canvas screenshot confirms rich 3D shading, specular highlights, and lighting (from 5.7KB black image to >180KB rendered 3D geometry).
   - **Zero Build/Typecheck Errors**: Both Framer remote typecheck and local applet compile pass with 0 errors.
   - **Official WICG / three-html-render Architecture**: Uses `layoutsubtree`, `captureElementImage`, and `onpaint` / `paint` event cycle as documented in official `three-html-render` specifications.
   - **Live Clone Synchronization**: Live changes, mouse enter/leave, and inputs on the Framer canvas target are observed and dispatched to the 3D texture.
   - **Graceful Diagnostics**: Visible diagnostic banner if the target element cannot be found after polling.

3. **Project Requirements**
   - [x] Research official `three-html-render` documentation and live WebGL examples (`repalash.com`).
   - [x] Investigate Three.js `WebGLTextures.js` `isHTMLTexture` upload path and polyfill interaction.
   - [x] Create plan in `/plans/html_texture_3d_black_screen_fix_tech_spec.md`.
   - [x] Update `/framer/test/HTMLTexture3D.tsx` with top-level `esm.sh` imports, fallback placeholder texture, and `captureElementImage` paint handler.
   - [x] Deploy to Framer session 1 code file `HTMLTexture3D.tsx` and verify 0 typecheck errors.
   - [x] Capture visual screenshot of node `ijXeYS5XR` and confirm full 3D rendering.
   - [x] Create comprehensive RCA in `/RCA/rca_html_texture_3d_black_screen.md`.

4. **Architecture Decisions**
   - **Top-Level Static ESM Imports over Dynamic Loader**: Framer's compiler natively bundles static HTTPS URLs (`import * as THREE from "https://esm.sh/three@0.186.0"`). Dynamic `import()` or `new Function("u", "return import(u)")` fails inside Framer's preview sandbox due to CSP `unsafe-eval` restrictions.
   - **Bypassing Three.js `isHTMLTexture` Trap**: Three.js's `uploadTexture` checks `if (K.parentNode !== canvas) { canvas.appendChild(K); return; }`. Because `three-html-render` moves canvas children to an offscreen host `div`, `K.parentNode` is never `canvas`. By feeding `canvas.captureElementImage(element)` into a `THREE.CanvasTexture` on `paint`, we completely bypass the bug and achieve instant, reliable texture streaming.
   - **Two-Stage Fallback Texture**: To eliminate the initial black frame while the SVG foreignObject rasterizes asynchronously, the material is initialized with a high-resolution canvas gradient. When the `paint` event fires, `texture.image = canvas.captureElementImage(...)` seamlessly replaces it.

5. **Pseudo Code**
   ```dsl
   COMPONENT HTMLTexture3D:
     DATA:
       target: String = "Card"
       dimensions: { width: 340, height: 380, depth: 45, radius: 20, segments: 6 }
       transform: { rotationX: 12, rotationY: 28, rotationZ: -4, scale: 1 }
       material: { metalness: 0.3, roughness: 0.2, background: "transparent" }
       motion: SpringTransition
       errorMsg: String?
     LOGIC:
       HOOK useEffect:
         EXECUTE installHtmlInCanvasPolyfill({ force: true })
         POLL findTarget(target)
         ON TARGET FOUND (targetEl):
           CREATE canvas WITH attribute "layoutsubtree"
           CREATE cloneNode = targetEl.cloneNode(true)
           APPEND cloneNode TO canvas
           CREATE placeholder = generateGradientCanvas()
           CREATE texture = new THREE.CanvasTexture(placeholder)
           LISTEN canvas "paint" ->
             snapshot = canvas.captureElementImage(cloneNode)
             IF snapshot -> texture.image = snapshot; texture.needsUpdate = true
           OBSERVE targetEl WITH MutationObserver ->
             SYNC cloneNode WITH targetEl
             canvas.requestPaint()
           INIT WebGLRenderer(canvas), PerspectiveCamera, Scene, Lights
           CREATE mesh = new THREE.Mesh(RoundedBoxGeometry, MeshStandardMaterial(map: texture))
           ANIMATE spring oscillation WITH animate()
           LOOP requestAnimationFrame -> renderer.render(scene, camera)
     RENDER:
       IF errorMsg -> DIV errorBanner
       ELSE -> DIV containerRef
   ```
