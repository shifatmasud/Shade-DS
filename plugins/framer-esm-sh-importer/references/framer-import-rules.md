# Framer Import Rules & Trio Immunity Reference

This document formalizes the runtime architecture of Framer Code Components and explains why the "Trio Immunity" (`react`, `framer`, `framer-motion`) is an invariant system rule.

---

## 1. Framer's Host Runtime Engine

Framer does not run user code in an isolated NodeJS container; rather, it runs inside a live browser-based canvas editor and preview pipeline. When Framer mounts a code component:

```
+-------------------------------------------------------------+
|                     Framer Host Canvas                      |
|                                                             |
|   +-----------------------+     +-----------------------+   |
|   | Host React Singleton  |     | Host Framer Engine    |   |
|   | (Hooks, Dispatcher,   |     | (addPropertyControls, |   |
|   |  Context, DomRoot)    |     |  RenderTarget, Frame) |   |
|   +-----------------------+     +-----------------------+   |
|               │                             │               |
|               └──────────────┬──────────────┘               |
|                              ▼                              |
|               +-----------------------------+               |
|               |  Host Framer-Motion Bridge  |               |
|               | (MotionConfig, AnimateView, |               |
|               |  Shared Motion Values)      |               |
|               +-----------------------------+               |
|                              │                              |
+------------------------------┼------------------------------+
                               ▼
            +────────────────────────────────────+
            │ User Code Component in Canvas      │
            │                                    │
            │ import * as React from "react"     │ <── Resolves to Host Singleton
            │ import { motion } from             │ <── Resolves to Host Engine
            │   "framer-motion"                  │
            │ import * as THREE from             │ <── Standalone via CDN
            │   "https://esm.sh/three@0.183.2"   │
            +────────────────────────────────────+
```

---

## 2. Why The Trio Must Never Use esm.sh

### A. React & React-DOM
1. **Dispatcher Collisions**: React maintains an internal module-scoped variable `ReactCurrentDispatcher`. When a component calls `useState()`, it queries this dispatcher.
2. If `react` is loaded from `https://esm.sh/react`, that module has its own `ReactCurrentDispatcher = null` because it was not initialized by Framer's canvas mount.
3. The component crashes instantly with:
   ```
   TypeError: Cannot read properties of null (reading 'useState')
   ```

### B. Framer (`from "framer"`)
1. **Property Controls Binding**: Framer inspects code components using `addPropertyControls(Component, { ... })`. The `ControlType` enum and control registration logic are compiled directly against Framer's internal engine.
2. Loading `framer` from an external URL will either 404 or provide an outdated mock package that cannot communicate with the active Framer canvas inspector panel.

### C. Framer-Motion (`from "framer-motion"`)
1. **Shared Motion Values & Layout Hierarchy**: Inside Framer, `framer-motion` is coupled with Framer's layout calculation engine and transitions (`animateView`, `MotionConfig`, `AnimatePresence`).
2. An external version from `esm.sh` creates separate MotionValue listeners that do not respond to canvas layout changes or variant transitions.

---

## 3. Transformation Decision Table

| Specifier Pattern | Action | Destination Specifier |
| :--- | :--- | :--- |
| `from "react"` | PRESERVE | `"react"` |
| `from "react-dom"` | PRESERVE | `"react-dom"` |
| `from "react/jsx-runtime"` | PRESERVE | `"react/jsx-runtime"` |
| `from "framer"` | PRESERVE | `"framer"` |
| `from "framer-motion"` | PRESERVE | `"framer-motion"` |
| `from "./..."` or `from "../..."` | PRESERVE | Local relative path |
| `from "https://..."` | PRESERVE | Existing URL |
| `from "three"` | TRANSFORM | `"https://esm.sh/three@<version>"` |
| `from "three/addons/..."` | TRANSFORM | `"https://esm.sh/three@<version>/addons/..."` |
| `from "gsap"` | TRANSFORM | `"https://esm.sh/gsap@<version>"` |
| `from "@gsap/react"` | TRANSFORM | `"https://esm.sh/@gsap/react?external=react"` |
| `from "lucide-react"` | TRANSFORM | `"https://esm.sh/lucide-react@<version>?external=react,react-dom"` |
| `from "canvas-confetti"` | TRANSFORM | `"https://esm.sh/canvas-confetti@<version>"` |
| `from "zustand"` | TRANSFORM | `"https://esm.sh/zustand@<version>?external=react"` |
