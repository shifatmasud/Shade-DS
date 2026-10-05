# Tech Spec - Texture Capture Deep Root Cause Analysis & Auto-Framing Robustness

1. **Objective**
   - **Problem Statement**: The user observed "Texture Capture fails" and requested a base64 screenshot to verify what is actually captured. Deep inspection of React fiber props on `https://happier-anything-775440.framer.app` revealed that `props.target` was set to `"Hero"` instead of `"Card"`. `"Hero"` is the parent container (1440x1404px) that encloses both the text, the card, and the 3D canvas itself.
   - **Solution Overview**: Provide the exact base64 data URLs comparing the texture capture of `Hero` (86.1% transparent, circular canvas inclusion) versus `Card` (100.0% opaque). Enhance `HTMLTexture3D.tsx` with circular-reference stripping (removing nested canvases/self from clone), dynamic camera frustum auto-framing (`camera.position.z` scaled to object bounds), and `preserveDrawingBuffer: true` for WebGL frame persistence.
   - **Scope**: Update `/framer/test/HTMLTexture3D.tsx`, provide base64 screenshots in the RCA report (`/RCA/rca_texture_capture_failure_hero_vs_card.md`), verify live Framer session, and provide clean base64 data to the user.
   - **Context**: Framer users frequently experiment with property controls (`target="Hero"`, `target="Card"`). When an ancestor is targeted, the component must protect against infinite recursion, oversized bounding boxes, and transparent parent backgrounds.

2. **Success Criteria**
   - **Key Results**:
     - Provide the exact base64 data URL showing the actual captured rasterization.
     - Document the root cause difference between targeting a container (`Hero`, 86.1% transparent) vs an atomic component (`Card`, 100% opaque).
     - Implement circular reference prevention in `HTMLTexture3D.tsx` by pruning nested canvases from the clone.
     - Add `preserveDrawingBuffer: true` so WebGL canvas retains its render buffer.
     - Add dynamic camera auto-framing so any dimension element is properly centered in the 3D viewport.
   - **Non-Negotiables**:
     - Do not touch `/components/Section/Dock.tsx`.
     - 0 build and lint errors.

3. **Project Requirements**
   - [x] Extract React Fiber props from production site and isolate `props.target = "Hero"`.
   - [x] Sample capture rasterization in base64 for both `Hero` and `Card`.
   - [ ] Add `preserveDrawingBuffer: true` to `WebGLRenderer`.
   - [ ] Strip nested canvases and self-references from `cloneNode` to avoid circular capture.
   - [ ] Auto-calculate `camera.position.z` based on bounding geometry dimensions.
   - [ ] Synchronize updated component to Framer session `R60Z8o2lCHIu3neoIwsu` and publish live.
   - [ ] Save full base64 data URLs in `/RCA/rca_texture_capture_failure_hero_vs_card.md`.

4. **Architecture Decisions**
   - **Circular Reference Pruning**: When cloning an element that contains the 3D canvas, `cloneNode.querySelectorAll("canvas").forEach(el => el.remove())` prevents nested SVG/canvas rendering artifacts.
   - **Auto-Framing Camera Frustum**: `const fovRad = THREE.MathUtils.degToRad(35); camera.position.z = Math.max(600, (Math.max(geomW, geomH) / 2) / Math.tan(fovRad / 2) * 1.25);` ensures any target element fits comfortably within view.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   DATA:
     targetEl: HTMLElement
     cloneNode: HTMLElement
     camera: THREE.PerspectiveCamera
     renderer: THREE.WebGLRenderer

   LOGIC:
     // Prune circular canvas references
     cloneNode.querySelectorAll("canvas").forEach(c => c.remove())

     // Dynamic auto-framing
     maxDim = Math.max(geomW, geomH)
     fov = 35 * Math.PI / 180
     camera.position.z = Math.max(600, (maxDim / 2) / Math.tan(fov / 2) * 1.2)

     // Framebuffer preservation
     renderer = new THREE.WebGLRenderer({
       canvas,
       antialias: true,
       alpha: true,
       preserveDrawingBuffer: true
     })
   ```
