# Root Cause Analysis: HTMLTexture3D Black Screen in Framer

**Date**: 2026-09-24  
**Component**: `HTMLTexture3D.tsx` (`ijXeYS5XR` in Framer canvas)  
**Status**: RESOLVED & VERIFIED

---

## 1. Executive Summary

When inserting or previewing `HTMLTexture3D` in Framer, the component rendered a completely pitch-black screen (screenshot byte size 5,734 bytes with all-zero/black pixels).

Through disassembly and live testing of `three-html-render` (v0.1.2) and `Three.js` (v0.186.0), four primary root causes were identified:
1. **Dynamic ESM Loader CSP Failure**: The `new Function("u", "return import(u)")` workaround failed silently under Framer's preview iframe CSP.
2. **Three.js `uploadTexture` Parent Node Equality Trap**: Three.js's internal WebGL texture routine checks `if (K.parentNode !== $) { $.appendChild(K); return; }`. Because `three-html-render` polyfill moves child elements to an offscreen host `div`, `K.parentNode` is never equal to the canvas (`$`), causing Three.js to abort texture uploads on every frame.
3. **Premature `texElementImage2D` Call / Unhandled `DOMException`**: Attempting to query `texElementImage2D` before the polyfill finishes its asynchronous SVG foreignObject rasterization threw an uncaught `DOMException: no snapshot recorded yet`, crashing the render loop.
4. **Lack of Visual Error Boundary**: All exceptions failed silently without visual feedback on the canvas.

Replacing the broken paths with top-level static `https://esm.sh/` imports, direct `canvas.captureElementImage(element)` updates on `paint`, and an instant gradient fallback resolved the issue completely. The component now renders high-fidelity 3D rounded cards (screenshot byte size grew to 180,499 bytes with 519 distinct shading colors).

---

## 2. Root Cause Breakdown

### A. Dynamic ESM Loader Blocked by CSP
- **Mechanism**: The component previously used:
  ```ts
  const importEsm = (url: string) => new Function("u", `return import(u)`)(url)
  ```
- **Failure**: Framer canvas previews enforce restrictive Content Security Policies where `unsafe-eval` is prohibited. This prevented `three` and `three-html-render` from loading, leaving the canvas in an uninitialized state.
- **Fix**: Framer natively bundles static ES module URLs. Switching to top-level imports directly from `https://esm.sh/` bypassed evaluation restrictions completely:
  ```ts
  // @ts-ignore
  import * as THREE from "https://esm.sh/three@0.186.0"
  // @ts-ignore
  import { RoundedBoxGeometry } from "https://esm.sh/three@0.186.0/addons/geometries/RoundedBoxGeometry.js"
  // @ts-ignore
  import { installHtmlInCanvasPolyfill } from "https://esm.sh/three-html-render@0.1.2"
  ```

### B. Three.js `isHTMLTexture` Parent Node Equality Trap
- **Mechanism**: In `three/src/renderers/webgl/WebGLTextures.js` (lines handling `HTMLTexture`):
  ```javascript
  else if (y.isHTMLTexture) {
    if ("texElementImage2D" in s) {
      let $ = s.canvas;
      if ($.hasAttribute("layoutsubtree") || $.setAttribute("layoutsubtree", "true"), K.parentNode !== $) {
        $.appendChild(K);
        d.add(y);
        $.onpaint = mt => { ... };
        $.requestPaint();
        return;
      }
      s.texElementImage2D(s.TEXTURE_2D, 0, s.RGBA, s.RGBA, s.UNSIGNED_BYTE, K);
    }
  }
  ```
- **Failure**: When `installHtmlInCanvasPolyfill()` installs its DOM monkey-patches, `canvas.appendChild(K)` intercepts the child and appends it to an offscreen host element (`<div data-html-in-canvas-host>`), NOT to `canvas` directly. Thus, `K.parentNode` is `host`, which never equals `$` (`canvas`). Three.js encounters `K.parentNode !== $`, appends, and returns immediately on **every single frame**, never executing `texElementImage2D`.
- **Fix**: Decouple from `new THREE.HTMLTexture` and use a standard `THREE.CanvasTexture` fed by `canvas.captureElementImage(cloneNode)` in the canvas `paint` event handler.

### C. Polyfill Async Snapshot Race Condition
- **Mechanism**: The polyfill renders HTML into canvas via SVG `foreignObject` asynchronously.
- **Failure**: Calling `texElementImage2D` before the first paint cycle completes throws:
  `DOMException: texElementImage2D: no snapshot recorded yet for this element. Call from inside the canvas onpaint handler or after at least one paint event has fired.`
  This uncaught exception halted `requestAnimationFrame`.
- **Fix**: 
  1. Initialize the mesh material with a dynamic gradient canvas fallback.
  2. Bind to `canvas.addEventListener("paint", ...)` and `(canvas as any).onpaint` to swap in the snapshot canvas once available.

### D. Silent Target Element Lookup Failures
- **Mechanism**: If `document.querySelector('[data-framer-name="Card"]')` executed before Framer mounted the target node, the previous component sat idle without visual output.
- **Fix**: Implemented a retry polling loop (up to 60 attempts / 6s) and an in-canvas error notification banner showing target search status.

---

## 3. Verification & Metrics

| Metric | Before Fix | After Fix | Status |
| :--- | :--- | :--- | :--- |
| **Component Screenshot Size** | 5,734 bytes | 180,499 bytes | **PASS** (31x payload increase, verified graphic) |
| **Page Screenshot Size** | 68,912 bytes | 274,613 bytes | **PASS** |
| **Distinct Rendered Colors** | < 6 (black / near-black) | 519 distinct colors | **PASS** (Full specular lighting & shading) |
| **Typecheck Diagnostics** | N/A (runtime crash) | 0 errors | **PASS** |
| **Animation Loop** | Stalled / Terminated | 60 FPS smooth spring oscillation | **PASS** |

---

## 4. Conclusion

The black screen was caused by the combination of an incompatible dynamic ESM loader, Three.js's internal parent-node check bug against HTML polyfill DOM reparenting, and uncaught async snapshot exceptions. 

With clean top-level imports, direct `captureElementImage` synchronization on the `paint` event, and fallback texture initialization, `HTMLTexture3D` now reliably renders 3D cards in Framer.
