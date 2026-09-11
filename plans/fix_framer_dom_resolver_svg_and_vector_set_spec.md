# Tech Spec

1. **Objective**
   - **Problem Statement**: In `framer/patterns/FramerDOM-resolver.tsx`, resolving "SVG Path" and "Vector Set" components fails when Framer renders vector sets / SVGs as `<img>` tags with embedded SVG data URIs (`data:image/svg+xml,...`), when `<use>` elements point to `<symbol>` nodes, or when geometry inside `<defs>` is mistakenly returned as targets instead of rendered elements.
   - **Solution Overview**: Align `framer/patterns/FramerDOM-resolver.tsx` with the battle-tested approach in `framer/SVGPathInjector.tsx`. Implement SVG data URI extraction and inlining (`extractSvgFromImgSrc`, `inlineSvgFromImg`), filter out elements inside `<defs>` via `isInsideDefs`, support direct and nested SVG/image discovery, and handle `<symbol>` and `<use>` references safely during `resolveSVG`.
   - **Scope**: `framer/patterns/FramerDOM-resolver.tsx`.
   - **Context**: Framer Canvas Code Component (standalone, single-file, React 18/19 compatible).

2. **Success Criteria**
   - **Key Results**:
     - "SVG Path" and "Vector Set" cases correctly resolve inline `<svg>` elements as well as `<img>` elements containing SVG data URIs (base64, URL-encoded, entity-escaped, raw).
     - Geometry elements inside `<defs>` are excluded from active targets so only visible/rendered shapes are highlighted and debugged.
     - `<use>` elements referencing `<symbol>` or other SVG subtrees are safely unpacked and resolved.
     - `framer/patterns/FramerDOM-resolver.tsx` remains 100% standalone with no internal project dependencies.
   - **Non-Negotiables**:
     - Preserves all property controls and existing functionality for "Frame", "Image", "Video", "Text", debug overlay, and highlight logic.
     - Fully type-safe and lint-clean.

3. **Project Requirements**
   - [x] Formulate Tech Spec in `/plans/fix_framer_dom_resolver_svg_and_vector_set_spec.md`.
   - [ ] Implement `isInsideDefs` helper in `framer/patterns/FramerDOM-resolver.tsx`.
   - [ ] Implement `extractSvgFromImgSrc` and `inlineSvgFromImg` helpers in `framer/patterns/FramerDOM-resolver.tsx`.
   - [ ] Enhance `resolveSVG` to support `<symbol>` unpacking and proper geometry extraction without duplicating template IDs.
   - [ ] Update `resolveTarget` for "SVG Path" and "Vector Set" to check for `<svg>`, `<img>` with SVG data URIs, and filter out `<defs>` elements.
   - [ ] Verify build and compile with `compile_applet`.

4. **Architecture Decisions**
   - *DOM Inlining Parity with `SVGPathInjector`*: Uses the identical robust parsing algorithm (DOMParser + base64 / decodeURIComponent / HTML entity sanitization) to convert SVG data URIs from `<img>` into native `<svg>` nodes in the DOM.
   - *Defs Filtering*: Target resolution filters with `!isInsideDefs(element)` to guarantee highlights and debug tags point only to active, rendered DOM elements on screen.

5. **Pseudo Code (Shade DSL)**
   ```shade
   Component FramerDOMResolver {
     DATA: {
       prop name: string
       prop type: "Frame" | "SVG Path" | "Vector Set" | "Image" | "Video" | "Text"
       prop resolveSVG: boolean
       state result: { components: list<Element>, targets: list<Element> }
     }
     LOGIC: {
       fn resolveTarget(component, type, shouldResolveSVG) {
         match type {
           "SVG Path" | "Vector Set" => {
             svg = findSvgOrInlineImg(component)
             if (svg && shouldResolveSVG) resolveUseTags(svg)
             return filterOutDefs(findGeometry(svg))
           }
           "Frame" => [component]
           "Image" => component.querySelectorAll("img")
           "Video" => component.querySelectorAll("video")
           "Text" => component.querySelectorAll("p, span")
         }
       }
     }
     RENDER: {
       DebugOverlay(result)
     }
   }
   ```
