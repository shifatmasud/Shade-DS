# Tech Spec

1. **Objective**
   - **Problem Statement**: `getGeometry(element: Element): SVGElement[]` in `framer/patterns/FramerDOM-resolver.tsx` pushes `Array.from(element.querySelectorAll(GEOMETRY_SELECTOR))` into an `SVGElement[]` array without casting or generic typing, leading to TypeScript typing errors in strict environments like Framer.
   - **Solution Overview**: Provide explicit generic typing `<SVGElement>` and safe casting on `element.querySelectorAll`, ensuring all resolved geometry elements are properly typed as `SVGElement` and filtered for active rendering.
   - **Scope**: `framer/patterns/FramerDOM-resolver.tsx`.
   - **Context**: Framer Code Component (standalone).

2. **Success Criteria**
   - **Key Results**:
     - `getGeometry` safely types queried geometry elements as `SVGElement[]`.
     - No type mismatch between `Element` and `SVGElement`.
     - Code remains 100% standalone and passes compilation and linting.
   - **Non-Negotiables**:
     - Zero disruption to SVG path extraction or highlight visualization.

3. **Project Requirements**
   - [x] Create RCA document in `/RCA/rca-dom-resolver-get-geometry-typing.md`.
   - [x] Formulate Tech Spec in `/plans/fix_dom_resolver_get_geometry_typing_spec.md`.
   - [ ] Update `getGeometry` in `framer/patterns/FramerDOM-resolver.tsx` with `element.querySelectorAll<SVGElement>(GEOMETRY_SELECTOR)`.
   - [ ] Verify compilation with `compile_applet`.

4. **Architecture Decisions**
   - *Generic QuerySelector*: Using `querySelectorAll<SVGElement>(...)` ensures native DOM TypeScript compatibility across both browser runtime and Framer's AST type checker.

5. **Pseudo Code (Shade DSL)**
   ```shade
   fn getGeometry(element: Element) -> list<SVGElement> {
     result = list<SVGElement>()
     if element is SVGGeometryElement:
       result.push(element)
     shapes = querySelectorAll<SVGElement>(element, GEOMETRY_SELECTOR)
     result.push(...filterOutDefs(shapes))
     return result
   }
   ```
