# Tech Spec

1. **Objective**
   - **Problem Statement**: Framer sometimes renders Vector Sets or vector graphics as `<img>` elements containing inline SVG data URIs (e.g. `<img class="..." src="data:image/svg+xml,&lt;svg ...&gt;&lt;path ...&gt;&lt;/svg&gt;">` or base64/URL-encoded data URIs) instead of direct inline `<svg>` elements. `SVGPathInjector` previously only looked for direct `<svg>` elements or `<use>` tags, failing to discover and animate vector paths inside these `<img>` elements.
   - **Solution Overview**: Extend the sibling discovery logic in `framer/SVGPathInjector.tsx` to detect `<img>` elements whose `src` contains an SVG data URI (raw XML, URL-encoded `%3Csvg`, HTML-escaped `&lt;svg`, or base64 encoded). Extract and parse the SVG XML into a DOM `SVGSVGElement`, mirror the original `<img>` dimensions, classes, styles, and attributes onto the SVG node, insert the SVG seamlessly in place of the `<img>` (while hiding the original `<img>`), and feed the extracted paths into the `svgEffect` drawing and styling pipeline.
   - **Scope**: `framer/SVGPathInjector.tsx`.
   - **Context**: Framer Canvas Code Component (standalone, single-file, React 18/19 compatible).

2. **Success Criteria**
   - **Key Results**:
     - `SVGPathInjector` discovers sibling `<img>` tags containing SVG data URIs (`data:image/svg+xml,...`).
     - Supports raw, URL-encoded, entity-escaped, and base64-encoded SVG data URIs.
     - Inlines the parsed SVG into the DOM with matched layout styles and classes, hiding the `<img>` cleanly without layout shifts.
     - Preserves all existing `SVGPathInjector` capabilities (`<use>` resolution, anchor point detection vs. drawable paths, `svgEffect` pathLength animations, stroke color, stroke width, triggers: mount, prop, scroll).
     - Component remains 100% standalone with no internal project imports, complying with Framer code component requirements.
   - **Non-Negotiables**:
     - Zero disruption to existing inline `<svg>` detection.
     - Clean cleanup on unmount or re-discovery without duplicate injected SVG elements.
     - Standalone file compliance for Framer editor.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/support_vector_sets_data_uri_svg_path_injector_spec.md`.
   - [ ] Implement SVG data URI parser helper function `extractSvgFromImgSrc(src: string): string | null` in `framer/SVGPathInjector.tsx`.
   - [ ] Implement `inlineSvgFromImg(img: HTMLImageElement): SVGSVGElement | null` with style mirroring and duplicate injection prevention.
   - [ ] Enhance discovery loop to scan for `<img>` elements with SVG data URIs across sibling containers.
   - [ ] Verify compilation with `compile_applet` and test edge cases.

4. **Architecture Decisions**
   - *DOM Inlining vs. Canvas Manipulation*: Inlining the SVG directly into the DOM hierarchy at the exact location of the `<img>` allows standard SVG animation APIs (`svgEffect`, `stroke-dasharray`, `stroke-dashoffset`) to control the vector paths natively with zero performance overhead and full CSS/styling parity.
   - *Duplicate Prevention*: Tag injected SVGs with `data-injected-from-img="true"` and mark source `<img>` with `data-svg-injected="true"` to prevent redundant replacements during re-render and discovery polling intervals.

5. **Pseudo Code (Shade DSL)**
   ```shade
   Component SVGPathInjector {
     DATA: {
       prop trigger: "mount" | "scroll" | "prop"
       prop drawProgress: number
       prop color: string
       prop strokeWidth: number
       state targets: list<SVGElement>
     }
     LOGIC: {
       fn discoverSiblings(sharedParent) {
         find inline <svg>
         if not found:
           find <img> with src.startsWith("data:image/svg+xml")
           if img found:
             svgString = parseDataUri(img.src)
             newSvg = createSvgNode(svgString, img.styles, img.classes)
             replaceOrInsert(img, newSvg)
             foundSvg = newSvg
         resolveUseTags(foundSvg)
         targets = findDrawables(foundSvg)
       }
       fn animateTargets(targets, progress) {
         applySvgEffect(targets.drawables, { pathLength: progress })
         applyOpacity(targets.anchors, { opacity: progress })
       }
     }
     RENDER: {
       VisualInjectorBadge(status: targets.length > 0)
     }
   }
   ```
