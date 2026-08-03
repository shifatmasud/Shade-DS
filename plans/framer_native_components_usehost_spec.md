# Tech Spec - Framer Native Component Types Integration in useHost.ts

1. **Objective**
   - Enhance `hooks/useHost.ts` to natively support target discovery, binding, and DOM extraction for Framer's four core native component types:
     - **Path**: `div[data-framer-component-type="SVG"]` -> `div` -> `svg` -> `use`
     - **Vector Set**: direct `svg[data-framer-name]` -> `use`
     - **Image**: `div[data-framer-name]` -> `div[data-framer-background-image-wrapper]` -> `img`
     - **Text**: `div[data-framer-component-type="RichTextContainer"]` -> `p` -> `#text`/`span`
   - Provide robust sibling lookup by type (`findSiblingByType`, `findSiblingsByType`), name (`findSiblingByName`, `findSiblingsByName`), and inner target extraction (`getFramerInnerTarget`), as well as a dynamic mutation-observer discovery hook (`useFramerDiscovery`).

2. **Success Criteria**
   - Full backward compatibility with existing `useHost`, `findSiblingByType`, `useHostRect`, `useHostEvents`, and `useHostStyles`.
   - Precise identification and extraction of Path, Vector Set, Image, and Text DOM structures.
   - Comprehensive helper functions for Framer DOM tree traversal.
   - Zero typescript or build errors on `compile_applet` and `lint_applet`.

3. **Project Requirements**
   - Update `hooks/useHost.ts` with type-safe interfaces, updated Framer wrapper discovery logic, name-based lookup, type-based lookup, inner target extraction, SVG `<use>` tag resolution, and dynamic `useFramerDiscovery` hook.
   - Verify build with `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
   - Keep all helpers in `hooks/useHost.ts` for unified parasitic DOM binding usage across Framer code components and React controls.
   - Use normalized component type matching (`SVG`/`Path`, `VectorSet`, `Image`, `RichTextContainer`/`Text`).
   - Gracefully handle deferred hydration in Framer Canvas using `MutationObserver` + polling timer.

5. **Pseudo Code (Shade DSL)**
   ```ts
   // Helper type definition
   type FramerComponentType = 'SVG' | 'Path' | 'VectorSet' | 'Image' | 'RichTextContainer' | 'Text';

   // Type detector
   getFramerComponentType(element: HTMLElement): FramerComponentType | 'Container' | 'Unknown';

   // Inner Target Extractor
   getFramerInnerTarget(element: HTMLElement): HTMLElement | SVGSVGElement | HTMLImageElement | null;

   // Sibling Lookup by Name & Type
   findSiblingByName(parent: HTMLElement, name: string, selector?: string): HTMLElement | null;
   findSiblingByType(parent: HTMLElement, type: FramerComponentType | string, selector?: string): HTMLElement | null;
   ```
