# Tech Spec: Resolution of HTMLTexture3D Placeholder Persistence & Live Texture Synchronization

1. **Objective**
- Eliminate the fallback text `"Rendering 3D Card..."` appearing on the 3D card mesh on the live published Framer site (`https://happier-anything-775440.framer.app`).
- Ground the solution in the official `three-html-render` WICG HTML-in-Canvas polyfill architecture (`repalash/three-html-render`).
- Ensure continuous, robust texture synchronization between live DOM elements and Three.js materials across all network speeds, viewport sizes, and mobile browsers.

2. **Success Criteria**
- No placeholder or diagnostic text (`"Rendering 3D Card..."`) ever renders onto the 3D card surface.
- The 3D card face renders the authentic live DOM content (rich text, card badge, headings, gradients) streamed via `captureElementImage`.
- Texture updates automatically in the Three.js render loop without relying solely on one-off initial event timing.
- Zero console errors, zero regression on geometry bounding-sphere calculations, and full visual parity in Browserless Puppeteer.

3. **Project Requirements**
- [ ] Inspect official `three-html-render` docs and polyfill lifecycle: `installHtmlInCanvasPolyfill`, `requestPaint`, `captureElementImage`, `ThreeHTMLRenderer`.
- [ ] Replace `"Rendering 3D Card..."` canvas text with a sleek, polished dark neutral card surface matching the card's native CSS background (`rgb(19, 19, 31)` / `#13131f`).
- [ ] Implement active frame synchronization in the Three.js render loop (`requestAnimationFrame`), checking `canvas.captureElementImage(cloneNode)` and scheduling `requestPaint()` until the snapshot is actively bound.
- [ ] Set `faceMaterial` base color to `#13131f` to guarantee rich contrast and background depth even when the snapshot canvas has an alpha channel.
- [ ] Re-deploy the updated code component to the live Framer project via `framer.agent.set_file_content` and confirm production publish with `framer.agent.publish`.
- [ ] Validate on the published site via Browserless Puppeteer: capture screenshots, verify that the card text ("Shade 3D Studio") is rendered on the 3D card, and confirm zero errors.
- [ ] Create detailed Root Cause Analysis in `/RCA/rca_three_html_render_placeholder_fix.md`.

4. **Architecture Decisions**
- **Decision 1: Dual-Phase Texture Lifecycle (Event-Driven + Render Loop Polling)**
  - *Trade-off*: Relying solely on `canvas.addEventListener("paint")` failed because the polyfill's internal stylesheet resolution (`fe()`) is asynchronous; if the initial paint fired before the clone was dirty or if the event was swallowed, no subsequent paints occurred.
  - *Solution*: Combine the `paint` event listener with a lightweight per-frame check in `loop()`. If `texture.image !== snap`, update `texture.image = snap` and `texture.needsUpdate = true`. If `snap` is not ready, invoke `requestPaint()`. This guarantees immediate display within 16ms of snapshot availability.
- **Decision 2: Seamless Placeholder Surface Styling**
  - *Trade-off*: Writing debug text into the placeholder canvas caused the text to be permanently visible to users if rasterization took longer than expected.
  - *Solution*: Style the placeholder canvas with the identical background color, rounded corner accents, and subtle borders of the card. Users see an immediate pristine card that seamlessly transforms as soon as HTML text is rasterized.
- **Decision 3: Face Material Color Harmony**
  - *Trade-off*: When SVG ForeignObject rasterizes an element without an explicit background on child nodes, the captured canvas contains transparent pixels for empty areas.
  - *Solution*: Set `faceMaterial.color = new THREE.Color("#13131f")` and configure proper material properties so text overlays crisply.

5. **Pseudo Code**

```typescript
// Shade DSL Model: HTMLTexture3D
DATA:
  targetEl: HTMLElement (querySelector target)
  cloneNode: HTMLElement (attached to canvas[layoutsubtree])
  texture: THREE.CanvasTexture (initialized with sleek placeholder)
  hasCapturedSnapshot: boolean

LOGIC:
  initPlaceholder():
    canvas = document.createElement("canvas")
    ctx = canvas.getContext("2d")
    drawCleanBackground(ctx, #13131f, subtleCardBorders)
    return new THREE.CanvasTexture(canvas)

  syncTexture():
    if (disposed || !cloneNode) return
    try
      snap = canvas.captureElementImage(cloneNode)
      if (snap && snap.width > 0 && snap.height > 0)
        if (texture.image !== snap)
          texture.image = snap
          texture.needsUpdate = true
          hasCapturedSnapshot = true
    catch
      if (!hasCapturedSnapshot && canvas.requestPaint)
        canvas.requestPaint()

  renderLoop():
    syncTexture()
    renderer.render(scene, camera)
    requestAnimationFrame(renderLoop)

RENDER:
  <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
```
