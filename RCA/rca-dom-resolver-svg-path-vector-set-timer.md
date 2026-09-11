# Root Cause Analysis: FramerDOM-resolver SVG Path and Vector Set Canvas Resolution & Timing

## 1. Issue Summary
In `framer/patterns/FramerDOM-resolver.tsx`, when selecting `"SVG Path"` or `"Vector Set"`, the component often fails to resolve targets on the Framer canvas (showing `Targets: 0` / "No target resolved"), whereas `framer/SVGPathInjector.tsx` successfully detects and resolves SVG targets in canvas.

The user inquired:
> "this one shows result in canvas framer/SVGPathInjector.tsx but framer/patterns/FramerDOM-resolver.tsx doesnt for | "SVG Path" | "Vector Set" is it beacuse of effect timer? fix framer/patterns/FramerDOM-resolver.tsx"

## 2. Root Cause Analysis

### Cause A: Effect Timing & Single-Shot Timeout vs Multi-Stage Discovery
- `framer/SVGPathInjector.tsx` executes its discovery logic immediately on mount (0ms) and schedules a fallback retry at 1000ms.
- `framer/patterns/FramerDOM-resolver.tsx` previously relied on a single `window.setTimeout(..., 100)`.
- In the Framer Canvas editor:
  - Vector layers, SVG data URIs in `<img>` tags, and root `<defs>`/`<symbol>` templates frequently hydrate or mount after 100ms or upon canvas selection updates.
  - With only a single 100ms timeout and no `MutationObserver` or multi-stage retries, if the DOM nodes are not fully present at exactly 100ms, the resolver finishes with `targets = []` and never re-evaluates.

### Cause B: Defs Filtering Bug in `getGeometry` during `<use>` Materialization
- In `FramerDOM-resolver.tsx`, `getGeometry(element)` filtered all queried geometry using `matched.filter((el) => !isInsideDefs(el))`.
- When `resolveSVG` calls `getGeometry(source)` to materialize a `<use href="#id">` reference, `source` is located inside `<defs>`.
- As a consequence, `isInsideDefs(el)` evaluated to `true` for every shape inside `source`, causing `geometry.length` to be 0 for `<g>` containers inside `<defs>`.

### Cause C: Component Discovery & Fallback Scope
- `FramerDOM-resolver.tsx` strictly queried `[data-framer-name="${CSS.escape(name)}"]`.
- In Framer Canvas, if `name` has differing whitespace, casing, or if the user tests the resolver as a dropped sibling alongside a vector graphic without renaming `name`, querying solely by exact `data-framer-name` yields 0 components.
- By contrast, `SVGPathInjector.tsx` scans the shared layout parent (`parentElement` hierarchy) to discover sibling vector/SVG elements.

### Cause D: SVG Geometry Element Highlighting on Canvas
- In SVG rendering engines, CSS `outline` and `outlineOffset` properties are not universally rendered on SVG geometry elements (`<path>`, `<polygon>`, `<circle>`, etc.).
- Active SVG targets require SVG-compatible visual feedback (such as `stroke`, `vectorEffect: "non-scaling-stroke"`, and `drop-shadow` filter) with style restoration on unmount/cleanup.

## 3. Corrective Actions
1. **Multi-Stage Discovery & MutationObserver**:
   - Execute discovery immediately (0ms).
   - Run multi-stage timeout checkpoints (100ms, 300ms, 600ms, 1200ms).
   - Attach a `MutationObserver` on `document.body` and a `ResizeObserver` to re-resolve dynamically as Framer Canvas mounts, updates, or inlines SVG assets.
2. **Robust `<use>` & `<symbol>` Resolution**:
   - Align `<use>` unpacking with `SVGPathInjector.tsx`, cloning referenced `<symbol>` or `<g>` subtrees and appending them before `<use>` without filtering out defs prematurely during template unpacking.
3. **Shared Parent & Sibling Discovery Fallback**:
   - Query by `[data-framer-name]` (exact, trimmed, and case-insensitive).
   - If no components are found by name, scan the nearest shared parent container for sibling SVG/vector elements as a graceful fallback.
4. **SVG-Aware Highlight Engine**:
   - For SVG geometry elements, apply non-destructive stroke and drop-shadow highlighting, saving original styles for clean restoration.
5. **Standalone Parity**:
   - Keep `framer/patterns/FramerDOM-resolver.tsx` 100% self-contained with no external dependencies.
