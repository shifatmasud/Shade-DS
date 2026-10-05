# Tech Spec - HTMLTexture3D Ancestor Scoping & Texture Rasterization Fix

1. **Objective**
   - **Problem Statement**: On `https://happier-anything-775440.framer.app`, the 3D card texture does not load its styled background, paddings, flex layout, or typography properly. Only unstyled text fragments appear over an otherwise transparent surface.
   - **Solution Overview**: Propagate all ancestor class names (notably Framer's scoped page/layout classes such as `.framer-rKmX8`, `.framer-72rtr7`, and `.framer-wgjo8b`) to `<canvas>` and the polyfill's host element. When the `three-html-render` polyfill encapsulates the clone inside an SVG `<foreignObject>` for rasterization, it wraps the element in `<div class="${canvas.className}">`. Injecting the ancestor classes ensures that all scoped Framer CSS rules (`.framer-rKmX8 .framer-1up1sfh`, etc.) evaluate and match inside the SVG context. In addition, bind computed CSS fallback properties to `cloneNode.style` and synchronize the active snapshot into the Three.js material.
   - **Scope**: Target `/framer/test/HTMLTexture3D.tsx`, test in real headless Chrome, update the Framer code component via Framer session CLI, publish live to `https://happier-anything-775440.framer.app`, and record a comprehensive RCA report in `/RCA/`.
   - **Context**: Framer wraps code components and DOM nodes in scoped class hierarchies to avoid style leakage across frames. The WICG HTML-in-Canvas polyfill (`three-html-render`) relies on the canvas element's `class` attribute to supply the parent context for foreignObject SVGs.

2. **Success Criteria**
   - **Key Results**:
     - 100% of the 3D card face (129,200 / 129,200 pixels) is rendered opaquely with authentic colors: dark card surface `rgb(19, 19, 31)`, card border/highlights, badges, and crisp white typography.
     - Headless Chrome pixel verification confirms `snapOpaque === snapTotal` and the 3D mesh face exhibits full texture details.
     - Live deployment at `https://happier-anything-775440.framer.app` verified and functioning.
   - **Non-Negotiables**:
     - Zero disruption to protected files (`/components/Section/Dock.tsx`).
     - Strict adherence to file-write boundaries: only touch `/framer/test/`, `/RCA/`, and `/plans/`.
     - 0 build and lint errors.

3. **Project Requirements**
   - [x] Inspect why texture wasn't rendering and discover that Framer scoped CSS selectors (`.framer-rKmX8 .framer-1up1sfh`) failed to match inside `three-html-render`'s SVG wrapper.
   - [ ] Implement ancestor class collection from `targetEl` and assign to `canvas.className` in `/framer/test/HTMLTexture3D.tsx`.
   - [ ] Synchronize computed styles (border-radius, padding, background-color) to `cloneNode` as an immutable styling baseline.
   - [ ] Ensure the polyfill host container (`[data-html-in-canvas-host]`) also receives ancestor classes for accurate in-DOM measurement.
   - [ ] Verify build and lint pass (`npm run build` / `npm run lint`).
   - [ ] Push updated code to Framer session `R60Z8o2lCHIu3neoIwsu` and publish deployment live.
   - [ ] Verify live site with headless Chrome screenshot & pixel sampler.
   - [ ] Document in `/RCA/rca_html_texture_3d_ancestor_scoping_fix.md`.

4. **Architecture Decisions**
   - **Trade-off: Ancestor Classes on Canvas vs Manual CSS Extraction**:
     - *Manual CSS Extraction*: Walking all style sheets and inlining computed styles onto every single descendant DOM element is computationally expensive, strips CSS pseudo-elements (`:before`, `:after`), and breaks reactive Framer variables.
     - *Ancestor Classes on Canvas*: `three-html-render` is explicitly designed around `he(e, t)`: `n = o?.getAttribute("class") || ""`. By assigning the ancestor classes to `canvas`, the polyfill automatically includes them in the SVG root wrapper `<div class="${n}">`, allowing all stylesheet rules and CSS variables (`--border-color`, `--border-width`) to cascade down natively with zero overhead.
   - **Complementary Computed Style Fallback**: Assign critical top-level card styles (`backgroundColor`, `borderRadius`) directly to `cloneNode.style` as an added safety guarantee.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   DATA:
     targetEl: HTMLElement (target element selected by framer name or query)
     ancestorClasses: Array<string> (chain of classNames from targetEl up to body)
     cloneNode: HTMLElement (exact clone of target element)
     texture: THREE.CanvasTexture (texture bound to WebGL face material)

   LOGIC:
     function collectAncestorClasses(el):
       classes = []
       curr = el.parentElement
       while curr and curr != document.body:
         if curr.className:
           classes.push(curr.className)
         curr = curr.parentElement
       return classes.join(" ")

     canvas.className = collectAncestorClasses(targetEl)
     
     // Sync host element if present
     host = document.querySelector("[data-html-in-canvas-host]")
     if host:
       host.className = canvas.className

     // Apply safe base styling
     computed = window.getComputedStyle(targetEl)
     cloneNode.style.backgroundColor = computed.backgroundColor
     cloneNode.style.borderRadius = computed.borderRadius

   RENDER:
     canvas.requestPaint()
     loop():
       snap = canvas.captureElementImage(cloneNode)
       if snap and texture.image != snap:
         texture.image = snap
         texture.needsUpdate = true
   ```
