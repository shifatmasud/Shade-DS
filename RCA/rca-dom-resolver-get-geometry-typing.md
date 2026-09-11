# Root Cause Analysis: FramerDOM-resolver getGeometry SVGElement Type Mismatch

## 1. Issue Summary
In `/framer/patterns/FramerDOM-resolver.tsx`, line 198 inside `getGeometry(element: Element): SVGElement[]`:
```ts
result.push(...Array.from(element.querySelectorAll(GEOMETRY_SELECTOR)))
```
throws a TypeScript error because `element.querySelectorAll(...)` returns `NodeListOf<Element>` (`Element[]`), which is not directly assignable to `SVGElement[]` without explicit generic type parameterization or casting.

## 2. Root Cause
1. `Element.prototype.querySelectorAll` returns `NodeListOf<Element>` by default.
2. In TypeScript strict DOM type check environments (such as Framer's editor or strict TS), `result` is typed as `SVGElement[]`.
3. Pushing generic `Element` into `SVGElement[]` fails type checking (`Type 'Element' is not assignable to type 'SVGElement'`).

## 3. Resolution
1. Use generic query selector typing `element.querySelectorAll<SVGElement>(GEOMETRY_SELECTOR)` or explicit cast `Array.from(element.querySelectorAll(GEOMETRY_SELECTOR)) as SVGElement[]`.
2. Filter geometries with `!isInsideDefs(el)` so `<defs>` template tags are not accidentally extracted.
3. Validate with `compile_applet` and `lint_applet`.
