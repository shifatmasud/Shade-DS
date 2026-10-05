# Root Cause Analysis: HTMLTexture3D Production Loading Failure on Published Framer Site

**Site URL**: `https://happier-anything-775440.framer.app`  
**Component**: `HTMLTexture3D.tsx` (`/framer/test/HTMLTexture3D.tsx` & Framer Session 1 code file `HTMLTexture3D.tsx`)  
**Date**: September 24, 2026  
**Status**: Resolved & Verified in Production  

---

## 1. Executive Summary

When visiting the live published Framer website (`https://happier-anything-775440.framer.app`), the `HTMLTexture3D` component failed to render on screen. Headless browser instrumentation using Browserless Puppeteer and Firecrawl identified that while the local preview was functioning, the published static build failed due to a combination of:
1. Non-numeric prop injection (`height: "100%"`) causing `RoundedBoxGeometry` to compute `NaN` coordinates and trigger Three.js frustum culling.
2. Missing two-phase client hydration guards causing `Minified React error #419`.
3. Outdated production publication state where recent component fixes were not committed to the live CDN release.

Following systematic remediation, code synchronization to the Framer project, and production deployment, automated pixel analysis confirmed that **100% of the canvas pixels (250,000 / 250,000) are actively rendered** with live 3D lighting, textures, and specular reflections.

---

## 2. Observed Symptoms & Evidence

| Environment | Observation | Diagnostics / Console Logs |
| :--- | :--- | :--- |
| **Initial Published Site** | Canvas present in DOM but rendered zero visible content (blank transparent canvas). | `THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`<br>`Minified React error #419` |
| **Center Pixel Inspection** | Sampled pixel block: all zeros (`RGBA 0, 0, 0, 0`). | 0 / 900 sampled pixels were active. |
| **After Fix & Publication** | Full dynamic 3D card rotating with spring physics and lighting. | **0 errors**. Pixel analysis: **250,000 / 250,000 non-zero pixels (100% rendered)**. |

---

## 3. Deep Technical Root Causes

### Root Cause 1: Non-Numeric Prop Passing & NaN Geometry Vertices
In Framer, layout containers often inject percentage strings or computed CSS dimensions into child component props (e.g. `height: "100%"`).
In the component signature:
```typescript
const { width = 340, height = 380, depth = 45, radius = 20, segments = 6 } = props
```
JavaScript default parameter values only apply when the value is strictly `undefined`. Because Framer explicitly passed `{ height: "100%" }`, the local variable `height` became `"100%"`.

When instantiating `RoundedBoxGeometry(width, height, depth, segments, radius)`:
- `RoundedBoxGeometry` calculates internal half-extents: `const halfH = height / 2;` -> `"100%" / 2` = `NaN`.
- It then calculates effective corner radius: `radius = Math.min(width / 2, height / 2, depth / 2, radius);` -> `Math.min(170, NaN, 22.5, 20)` = `NaN`.
- Because `radius` became `NaN`, all subsequent vertex positioning math produced `NaN` in the `position` Float32BufferAttribute.
- During rendering, Three.js called `computeBoundingSphere()`, resulting in `boundingSphere.radius = NaN`. Three.js camera frustum culling evaluates `if (sphere.radius < 0 || isNaN(sphere.radius)) return false;` and silently drops the entire mesh from the draw call pipeline.

### Root Cause 2: Hydration Mismatch (`Minified React error #419`)
Framer sites are statically pre-rendered on the server (SSG/SSR). During pre-rendering, window and canvas contexts do not exist. When the client loads, attempting to mount DOM canvases directly without an explicit client hydration guard (`isClient`) triggers a layout mismatch between server-generated HTML and the client React virtual DOM tree, resulting in React hydration error #419 and unstable component lifecycle execution.

### Root Cause 3: Dynamic Element Dimension Resolution
On responsive viewports, the target card (`[data-framer-name="Card"]`) might have fluid pixel dimensions based on the screen width. Simply attempting `parseFloat("100%")` yields `100`, which would unresponsively crush a 380px card into a 100px square.

### Root Cause 4: Pending Production Publish Pipeline
Previous changes were staged in the active canvas session but not committed to the production release endpoint. The production CDN was still serving the build compiled prior to the update.

---

## 4. Engineering Fixes Implemented

### 1. Robust Dimension Sanitization & Responsive Fallbacks
Updated `/framer/test/HTMLTexture3D.tsx` to strictly parse and sanitize every single prop before passing to Three.js:
```typescript
const parseDimension = (val: any, fallback: number): number => {
    if (typeof val === "number" && Number.isFinite(val) && val > 0) return val
    if (typeof val === "string") {
        if (val.includes("%")) return fallback // If Framer passed "100%", use measured element dimensions
        const parsed = parseFloat(val)
        if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
    return fallback
}

const geomW = parseDimension(width, measuredW)
const geomH = parseDimension(height, measuredH)
const geomD = parseDimension(depth, 45)
const rawRadius = parseDimension(radius, 20)
const geomRadius = Math.max(0, Math.min(rawRadius, geomW / 2, geomH / 2, geomD / 2))
const geomSegments = Math.max(1, Math.min(20, Math.round(parseDimension(segments, 6))))
```

### 2. Defensive Bounding-Sphere & Geometry Guard
Added automatic bounding-sphere validation:
```typescript
let geometry: any
try {
    geometry = new RoundedBoxGeometry(geomW, geomH, geomD, geomSegments, geomRadius)
    geometry.computeBoundingSphere()
    if (isNaN(geometry.boundingSphere?.radius)) {
        console.warn("[HTMLTexture3D] RoundedBox produced NaN, falling back to BoxGeometry")
        geometry = new THREE.BoxGeometry(geomW, geomH, geomD)
    }
} catch {
    geometry = new THREE.BoxGeometry(geomW, geomH, geomD)
}
```

### 3. Two-Phase SSR Hydration Guard
Added hydration protection complying with Framer code component standards:
```typescript
const [isClient, setIsClient] = React.useState(false)
React.useEffect(() => {
    setIsClient(true)
}, [])

if (!isClient) {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                background,
                ...style,
            }}
        />
    )
}
```

### 4. Code Synchronization & Production Deployment
- Synchronized code to Framer session 1 via `cf.setFileContent(localCode)`.
- Verified typecheck: `0 diagnostics`.
- Executed two-phase deployment:
  - `framer.agent.publish({ action: "preview" })` -> `confirmationHash: "17untb9"`.
  - `framer.agent.publish({ action: "confirm_publish", confirmationHash: "17untb9" })` -> Deployed to `https://happier-anything-775440.framer.app`.

---

## 5. Verification & Test Results

### 1. Browserless Puppeteer Live Pixel Audit
- **URL**: `https://happier-anything-775440.framer.app`
- **Canvas Dimensions**: `500 x 500` (250,000 pixels total)
- **Active Pixels**: **250,000 / 250,000 (100%)**
- **Dynamic Color Spectrum**:
  - Minimum RGB: `[7, 7, 11]` (dark shaded facets)
  - Maximum RGB: `[255, 255, 255]` (specular surface highlights)
  - Card face tones: `[82, 92, 104]`, `[115, 123, 131]`, `[186, 192, 193]`
- **Uncaught Errors**: **0**
- **BufferGeometry NaN Errors**: **0**

### 2. Firecrawl Scrape Verification
- **Scrape ID**: `01a0d323-2f95-72bf-b683-bec4dad110d4`
- **HTTP Status**: `200 OK`
- **Rendered Content**: Successfully parsed live card elements (`Interactive 3D HTML Texture`, `Shade 3D Studio`, `3D Interactive Card`).

---

## 6. Conclusion
The production issue is resolved. `HTMLTexture3D` now reliably loads, handles arbitrary CSS string props without NaN vertex corruption, safeguards against hydration mismatches, and renders interactive 3D HTML textures seamlessly on the live site.
