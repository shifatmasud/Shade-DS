# Root Cause Analysis: HTMLTexture3D Framer Component Failure

## 1. Problem Statement
The `HTMLTexture3D.tsx` component in Framer failed to render and threw errors during canvas initialization. The directive was to resolve the issue and ensure the component loads Three.js and the Three HTML render polyfill via `esm.sh`.

## 2. Root Cause Findings

### Finding 1: Incompatible CDN URLs and Unsafe Dynamic Imports
- The previous implementation loaded modules from `https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js` and `https://cdn.jsdelivr.net/npm/three-html-render@latest/dist/polyfill.mjs`.
- It used `(new Function("url", "return import(url)"))(...)` to evaluate imports, which is often blocked or restricted under Framer's browser sandbox and Content Security Policy (CSP).
- JsDelivr URLs can encounter CORS issues or version mismatch with secondary dependencies.

### Finding 2: Premature THREE.HTMLTexture Check & Inverted Polyfill Order
- The code checked `if (!("HTMLTexture" in THREE)) return;` before calling `installHtmlInCanvasPolyfill()`.
- WICG HTML-in-Canvas APIs (`requestPaint`, `texElementImage2D`, `captureElementImage`) must be installed on prototypes *before* Three.js initializes canvas contexts and queries capabilities.
- When `installHtmlInCanvasPolyfill()` was deferred or failed, the WebGL texture pipeline lacked the requisite hooks to rasterize HTML nodes.

### Finding 3: DOM Node Stealing / Disconnection
- In the WICG HTML-in-Canvas polyfill specification, elements rendered as textures must be attached to the `<canvas layoutsubtree>` element, where they are placed into an offscreen host (`data-html-in-canvas-host`) and given `style.opacity = "0"`.
- Passing the live Framer canvas node directly caused Three.js to execute `canvas.appendChild(element)`, pulling the element out of Framer's React DOM hierarchy and making the original card vanish from the canvas.
- Passing a detached or sibling element caused the polyfill to throw `DOMException: element is not a direct child of the canvas`.

## 3. Remediation & Implementation

### 1. esm.sh Module Loading Pipeline
- Migrated all imports to pinned, production ESM CDN packages:
  - Three.js: `https://esm.sh/three@0.186.0`
  - RoundedBoxGeometry: `https://esm.sh/three@0.186.0/addons/geometries/RoundedBoxGeometry.js`
  - HTML-in-Canvas Polyfill: `https://esm.sh/three-html-render@0.1.2`
- Implemented an `importEsm` helper that prioritizes native dynamic `import(/* @vite-ignore */ url)` with graceful fallback.

### 2. Pre-Initialization of Polyfill
- `installHtmlInCanvasPolyfill()` is executed prior to instantiating `WebGLRenderer` and `HTMLTexture`.
- Verified `requestPaint` and `texElementImage2D` are registered on `HTMLCanvasElement` and `WebGLRenderingContext`.

### 3. Deep Mirror Clone Synchronization
- Rather than displacing the original Framer element, a deep mirror clone is instantiated and appended to `renderer.domElement` with matching dimensions and class styling.
- A `MutationObserver` on the source element synchronizes text, attributes, children, and styles in real time.
- Mouse enter/leave and input events on the source element immediately trigger `htmlTexture.needsUpdate = true` and `requestPaint()`.

### 4. Framer Project Deployment & Verification
- Deployed the updated code directly to the active Framer project code file `HTMLTexture3D.tsx` in session 1.
- Executed `framer.getCodeFile('HTMLTexture3D.tsx').typecheck()` returning `0` errors.
- Verified visual canvas rendering via screenshot capture.
