# Tech Spec 

1. **Objective**
   - **Problem Statement**: In `framer/patterns/FramerDOM-resolver.tsx`, "SVG Path" and "Vector Set" components often do not show results on the Framer canvas (`Targets: 0` / "No target resolved"), whereas `framer/SVGPathInjector.tsx` works reliably. This occurs due to single-shot 100ms effect timing without mutation observers or retries, defs filtering stripping elements during `<use>` template resolution, and lack of shared-parent fallback discovery.
   - **Solution Overview**: Update `framer/patterns/FramerDOM-resolver.tsx` with multi-stage timing (immediate 0ms + retries at 100ms, 300ms, 600ms, 1200ms), a `MutationObserver` on the DOM to continuously catch dynamic hydration in Framer Canvas, robust `<use>`/`<symbol>` unpacking matching `SVGPathInjector.tsx`, fallback shared-parent sibling discovery, and SVG-safe visual highlighting.
   - **Scope**: `framer/patterns/FramerDOM-resolver.tsx`.
   - **Context**: Framer Canvas Code Component (standalone, single-file, React 18/19 compatible).

2. **Success Criteria**
   - **Key Results**:
     - "SVG Path" and "Vector Set" selections resolve targets immediately on the Framer canvas even under delayed hydration or dynamic DOM changes.
     - Multi-stage timing and `MutationObserver` continuously sync target resolution as canvas elements mount.
     - `<use>` elements pointing to `<symbol>`, `<g>`, or `<path>` nodes inside `<defs>` are correctly unpacked and resolved.
     - SVG data URIs (`data:image/svg+xml`, base64, url-encoded) in `<img>` tags are inlined and resolved into drawable paths.
     - Sibling fallback scanning detects SVGs when dropped in a shared container if name query misses.
     - Canvas highlighting works on both HTML elements (`outline`, `background`) and SVG elements (`stroke`, `drop-shadow`).
     - `framer/patterns/FramerDOM-resolver.tsx` remains 100% standalone.
   - **Non-Negotiables**:
     - No breaking changes to existing "Frame", "Image", "Video", "Text" types.
     - Strict TypeScript type safety and lint compliance.

3. **Project Requirements**
   - [x] Create RCA in `/RCA/rca-dom-resolver-svg-path-vector-set-timer.md`.
   - [x] Create Tech Spec in `/plans/fix_dom_resolver_svg_path_vector_set_timer_spec.md`.
   - [ ] Implement multi-stage timer + `MutationObserver` + `ResizeObserver` discovery loop in `framer/patterns/FramerDOM-resolver.tsx`.
   - [ ] Fix `<use>` reference resolution and defs handling in `framer/patterns/FramerDOM-resolver.tsx`.
   - [ ] Implement shared-parent sibling fallback discovery when direct name lookup yields 0 components.
   - [ ] Implement SVG-compatible highlight rendering with original style restoration.
   - [ ] Verify build with `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
   - *Continuous Mutation & Multi-Stage Timing*: Instead of a single 100ms timeout, run an immediate pass, staggered timer retries (100ms, 300ms, 600ms, 1200ms), and a `MutationObserver` debounced via `requestAnimationFrame` to ensure zero-lag synchronization in Framer Canvas.
   - *Robust Subtree Unpacking for `<use>`*: Mirror `SVGPathInjector` by cloning referenced `<symbol>` or `<g>` nodes into the SVG tree and hiding the original `<use>`, guaranteeing all generated geometry is accessible outside `<defs>`.
   - *Shared Parent Fallback*: When exact `[data-framer-name]` lookup returns no elements, climb the resolver's DOM hierarchy to find the nearest container and scan for SVG/Vector Set siblings.

5. **Pseudo Code (Shade DSL)**
   ```shade
   Component FramerDOMResolver {
     DATA: {
       prop name: string
       prop type: "Frame" | "SVG Path" | "Vector Set" | "Image" | "Video" | "Text"
       prop highlightColor: string
       prop highlightOpacity: number
       prop outlineWidth: number
       prop debug: boolean
       prop resolveSVG: boolean
       state result: { components: list<Element>, targets: list<Element> }
     }
     LOGIC: {
       fn runDiscovery() {
         clearHighlights()
         components = findComponents(name, containerRef)
         targets = components.flatMap(c => resolveTarget(c, type, resolveSVG))
         highlight(targets, highlightColor, highlightOpacity, outlineWidth)
         setResult({ components, targets })
       }
       effect onMountOrPropsChange {
         runDiscovery() // 0ms
         scheduleRetries([100, 300, 600, 1200])
         observer = new MutationObserver(debounce(runDiscovery))
         observer.observe(document.body, { childList: true, subtree: true })
         return cleanup(observer, clearHighlights)
       }
     }
     RENDER: {
       Container(ref=containerRef) {
         if debug: DebugOverlay(result)
       }
     }
   }
   ```
