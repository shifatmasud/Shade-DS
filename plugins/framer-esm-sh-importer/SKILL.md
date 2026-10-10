---
name: framer-esm-sh-importer
description: Converts npm package dependencies to pinned, deterministic esm.sh CDN URLs exclusively within Framer code components, while strictly enforcing bare specifier immunity for react, framer, and framer-motion.
---

# Overview & Architectural Context

In the Framer ecosystem, Code Components and Component Overrides execute in a hybridized browser and canvas sandbox. When authoring code components intended to be portable, standalone, or imported directly into the Framer canvas:

1. **Standalone Portability Requirement**: Framer components should not depend on a local `package.json` or local `node_modules` folder. When shared, copied into Framer's web interface, or published to Framer's module registry, dependencies must resolve deterministically without user intervention or missing package errors.
2. **The Cache Dilemma**: Framer's internal npm dependency resolver frequently locks onto stale package versions or fails to resolve newer versions and peer dependencies. Direct CDN URLs from `esm.sh` bypass this cache completely.
3. **The Trio Immunity Rule**: While external 3rd-party packages must use `esm.sh`, Framer injects and orchestrates its own host runtime singletons for:
   - `react` (and `react-dom`)
   - `framer`
   - `framer-motion`
   
Rewriting any of these three core host libraries to `esm.sh` breaks the Framer canvas, corrupts React's internal dispatcher (`Invalid hook call`), disconnects property controls (`addPropertyControls`), and de-syncs layout animations (`motion`, `AnimatePresence`, `animateView`).

This skill defines the standard protocol and automated transformation rules to convert bare npm package imports to `esm.sh` URLs **exclusively in Framer components**, while strictly preserving bare imports for `react`, `framer`, and `framer-motion`.

---

# Deep Dive: esm.sh CDN Architecture & Capabilities

`esm.sh` is an edge-distributed, high-performance CDN powered by Deno and esbuild that builds and serves any npm package as standard ECMAScript Modules (ESM).

### 1. Canonical URL Structure
```
https://esm.sh/[@scope/]pkg[@version][/subpath][?query]
```

- **Scoped Packages**: `https://esm.sh/@gsap/react`
- **Pinned Versions**: `https://esm.sh/three@0.183.2`
- **Subpaths / Addons**: `https://esm.sh/three@0.186.0/addons/geometries/RoundedBoxGeometry.js` or `https://esm.sh/gsap/SplitText`
- **CSS Assets**: `https://esm.sh/katex@0.16.8/dist/katex.min.css`

### 2. Crucial Query Parameters

| Query Parameter | Format | Purpose & Behavior in Framer |
| :--- | :--- | :--- |
| `?external` | `?external=react,react-dom` | **Mandatory for React packages**. Marks `react` and `react-dom` as external imports rather than bundling them. This ensures the package links directly to Framer's host React instance. |
| `?target` | `?target=es2022` | Specifies ECMAScript compilation target (default `es2022`). Matches modern browser sandboxes. |
| `?bundle` | `?bundle` | Bundles all secondary transitive dependencies into a single file to eliminate HTTP request waterfalls. |
| `?deps` | `?deps=three@0.183.2` | Pins sub-dependencies when a library specifies loose version ranges. |
| `?alias` | `?alias=foo:bar` | Remaps internal imports to alternative packages. |
| `?dev` | `?dev` | Serves unminified development build with React DevTools hooks and detailed runtime warnings. |
| `?no-dts` | `?no-dts` | Omits the `X-TypeScript-Types` header when raw payload size is prioritized. |

---

# The Trio Immunity Rule (react, framer, framer-motion)

Under no circumstances may any of the following specifiers be transformed to an `esm.sh` URL in Framer components:

| Specifier | Classification | Reason for Strict Immunity |
| :--- | :--- | :--- |
| `react` | Host Singleton | Framer hosts React 18 / 19. Two instances trigger `Invalid hook call: hooks can only be called inside the body of a function component`. |
| `react-dom` | Host Singleton | Contains the DOM renderer singleton and portal roots. |
| `react/jsx-runtime` | Host Compiler | Injected by JSX compilers; must resolve to the host engine. |
| `framer` | Host Platform | Provides `addPropertyControls`, `ControlType`, `RenderTarget`, `Frame`, and property reflection directly bound to Framer Canvas. |
| `framer-motion` | Host Animation | Framer shares its internal motion values, gesture recognizers, `MotionConfig`, and `animateView` with this package. |

### Rule Summary
```tsx
// ✅ IMMUNE: MUST ALWAYS REMAIN BARE SPECIFIERS
import React, { useState, useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, useScroll, useSpring, animateView } from "framer-motion"

// ❌ FORBIDDEN: NEVER DO THIS IN FRAMER COMPONENTS
import React from "https://esm.sh/react@18.2.0"
import { motion } from "https://esm.sh/framer-motion@11.0.0"
import { ControlType } from "https://esm.sh/framer"
```

---

# Transformation Pipeline & Specifier Rewrite Standards

When reviewing or authoring code components inside `/framer/` or `/framer/test/`:

### 1. Classification Matrix

| Import Type | Example Source | Rewrite Target |
| :--- | :--- | :--- |
| Host Immunity | `import { motion } from "framer-motion"` | Keep as `"framer-motion"` |
| Host Immunity | `import * as React from "react"` | Keep as `"react"` |
| Host Immunity | `import { ControlType } from "framer"` | Keep as `"framer"` |
| Local Relative | `import { useHost } from "../hooks/useHost"` | Keep as relative path |
| Already CDN | `import * as THREE from "https://esm.sh/three@0.183.2"` | Keep as-is |
| External NPM (Generic) | `import * as THREE from "three"` | Rewrite to `"https://esm.sh/three@0.183.2"` |
| External NPM (Generic) | `import gsap from "gsap"` | Rewrite to `"https://esm.sh/gsap@3.12.5"` |
| External NPM (Subpath) | `import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"` | Rewrite to `"https://esm.sh/three@0.186.0/addons/geometries/RoundedBoxGeometry.js"` |
| External NPM (React Dep) | `import { useGSAP } from "@gsap/react"` | Rewrite to `"https://esm.sh/@gsap/react?external=react"` |
| External NPM (React Dep) | `import { Sparkles } from "lucide-react"` | Rewrite to `"https://esm.sh/lucide-react?external=react,react-dom"` |

### 2. Version Pinning Rules
- Always check `package.json` for the currently installed version if available.
- If a package is installed in `package.json` (e.g., `"three": "^0.183.2"`), pin the exact version in the URL: `https://esm.sh/three@0.183.2`.
- If no version is specified, pin a stable major/minor or fetch the latest stable semver release.

---

# Peer Dependency Externalization & React Singleton Guard

Any npm package that exports React components, hooks, or context providers MUST append `?external=react,react-dom`.

### Packages Requiring `?external=react,react-dom`
- `@gsap/react` &rarr; `https://esm.sh/@gsap/react?external=react`
- `lucide-react` &rarr; `https://esm.sh/lucide-react?external=react,react-dom`
- `@react-three/fiber` &rarr; `https://esm.sh/@react-three/fiber?external=react,react-dom,three`
- `@react-three/drei` &rarr; `https://esm.sh/@react-three/drei?external=react,react-dom,three,@react-three/fiber`
- `canvas-confetti` (when using React hooks wrapper) &rarr; `https://esm.sh/canvas-confetti`
- `zustand` (when used for component state) &rarr; `https://esm.sh/zustand?external=react`

### Why This Matters
When an npm package imports React from inside an un-externalized ESM bundle, `esm.sh` vendors its own copy of the React runtime. When Framer mounts the component:
1. Framer's React invokes the component.
2. The bundled component invokes a hook (e.g. `useState`) from the *vendored* React.
3. The vendored React's `ReactCurrentDispatcher` is `null`.
4. Runtime error throws: `Cannot read properties of null (reading 'useState')`.
5. Specifying `?external=react,react-dom` forces the bundle to emit `import * as React from "react"`, which resolves to Framer's host React instance!

---

# TypeScript Support & Type Declaration Patterns

Because TypeScript by default may warn or error on remote HTTP imports unless custom type root configurations or module declarations are configured, adhere to these standards:

### 1. The Direct Import with TS Suppression
When using remote CDN URLs in TypeScript code components, place `// @ts-ignore` or provide a global ambient declaration:

```tsx
// @ts-ignore
import * as THREE from "https://esm.sh/three@0.183.2"
// @ts-ignore
import { gsap } from "https://esm.sh/gsap@3.12.5"
// @ts-ignore
import { useGSAP } from "https://esm.sh/@gsap/react?external=react"
```

### 2. Preserving Types via Type-Only Local Imports (Optional Hybrid Pattern)
If full TypeScript intellisense is desired while authoring locally before copying into Framer:
```tsx
import type * as ThreeTypes from "three"

// @ts-ignore
import * as THREE_RAW from "https://esm.sh/three@0.183.2"
const THREE = THREE_RAW as typeof ThreeTypes
```

---

# Automation Tooling & Usage Guide

To inspect, audit, and convert Framer code components automatically, use the dedicated converter script located at `plugins/framer-esm-sh-importer/framer_esm_converter.ts`:

### 1. Scan Framer Directory for Bare Imports
Inspect which Framer components contain bare npm imports requiring conversion:
```bash
npx tsx plugins/framer-esm-sh-importer/framer_esm_converter.ts --scan
```

### 2. Dry-Run Conversion on a Specific File
Preview the transformed imports without modifying disk:
```bash
npx tsx plugins/framer-esm-sh-importer/framer_esm_converter.ts --file framer/test/LusionCursorTrail.tsx --dry-run
```

### 3. Automatically Convert a File
Rewrite bare npm imports to `esm.sh` URLs while strictly preserving `react`, `framer`, and `framer-motion`:
```bash
npx tsx plugins/framer-esm-sh-importer/framer_esm_converter.ts --file framer/test/LusionCursorTrail.tsx
```

### 4. Batch Convert All Framer Components
Scan and convert all components under `/framer/`:
```bash
npx tsx plugins/framer-esm-sh-importer/framer_esm_converter.ts --convert-all
```

---

# Edge Cases & Troubleshooting Guide

### 1. Dynamic Imports
Dynamic imports must also be converted to `esm.sh` URLs:
```tsx
// Before
const module = await import("three")

// After
const module = await import("https://esm.sh/three@0.183.2")
```

### 2. Morphine Transitions & Framer Motion
- **Immunity Preservation**: Ensure `animateView` or other motion exports from `framer-motion` are never touched. In `framer/test/Morphine V2.tsx` and `framer/Morphine_Latest.tsx`, all framer-motion transitions must remain unmodified.

### 3. Sub-dependency Version Collisions
If two packages depend on conflicting versions of a shared library (e.g. `three` addons and `three`), pin them explicitly using the same version tag:
```tsx
import * as THREE from "https://esm.sh/three@0.186.0"
import { RoundedBoxGeometry } from "https://esm.sh/three@0.186.0/addons/geometries/RoundedBoxGeometry.js"
```

### 4. Non-Framer Code Isolation
- **Rule**: NEVER apply this transformation to `/components/` or root applet files. The main Vite applet uses standard `node_modules` bundling. Transforming Vite application files to `esm.sh` is strictly forbidden.
