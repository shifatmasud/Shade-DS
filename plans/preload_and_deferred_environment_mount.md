# Plan: Preload and Deferred Environment Mount for 3D Scene Performance

## PRD (Overview & Objectives)
The application utilizes a rich 3D Scene with physics, custom physically deformed soft-body jelly boxes, glass-like transmission refraction, and high-fidelity lighting. Currently, the `<Environment preset="city" />` component blocks the main thread during initialization because it has to fetch, decode, and compile the HDR cubemap texture into PMREM (Prefiltered Mipmapped Radiance Environment Map) format on the fly. This results in noticeable UI stutters or complete freezes when the application is first launched.

### Objectives
- **Zero UI Freeze on Initial Load**: Ensure that all flat UI layout structures, control panels, headers, and the primary Canvas wrapper render immediately and responsively without waiting for the environment map to compile.
- **Asynchronous Asset Preloading**: Start fetching the Environment HDR texture file immediately when the Javascript bundle is loaded in the browser, rather than waiting for the Canvas and R3F context to mount.
- **Progressive Scene Hydration**: Render the 3D canvas, floor, and physical boxes with standard ambient/directional lighting first, then seamlessly apply the high-fidelity reflection map once it is ready and mounted.

---

## OKR (Success Criteria)
- **Key Result 1**: Eliminate the initial rendering block of the flat HTML dashboard UI (the sidebar, toggle controls, active logs, etc. should achieve interactivity instantly on page load).
- **Key Result 2**: Preload the "city" environment map preset using `@react-three/drei`'s `useEnvironment.preload` so that loading starts in parallel with initial app hydration.
- **Key Result 3**: Mount `<Environment />` asynchronously with a configured delay of `800ms`, which ensures that the DOM frame loop is stable and reactive before PMREM generation is triggered.
- **Key Result 4**: Retain 100% of existing functionality, physical stability, and shader deformations on all JellyBox entities in the viewport.

---

## ADR (Architectural Design)
We will implement a hybrid performance-optimization strategy that tackles the issue from two distinct angles:

### 1. Asynchronous Module Preloading (Early Preloader)
We will leverage ThreeJS and Drei's preloading system. By importing `useEnvironment` from `@react-three/drei` and executing `useEnvironment.preload({ preset: "city" })` at the module level (outside of any React lifecycle loops), the browser starts fetching the HDR cubemap asset over CDN during the initial script parsing phase. This hides the network download latency behind the initial page load time.

### 2. Deferred Mounting (Time-Based Slicing)
Within `/components/3D/scene.tsx`, we will declare a state variable `mountEnvironment` initialized to `false`. A React `useEffect` hook will register a non-blocking `setTimeout` that flips `mountEnvironment` to `true` after `800ms`. 
This guarantees:
- The UI gets painted first.
- The React Canvas boots up, and initial frame buffers are created.
- The orbit controls, camera position, and rigid bodies are stabilized.
- Only once the animation loop has settled is the `<Environment />` mounted, triggering the PMREM generation pipeline on the GPU without freezing user interactions.

---

## TODO
- [ ] Update imports in `/components/3D/scene.tsx` to include `useEnvironment` from `@react-three/drei`.
- [ ] Add `useEnvironment.preload({ preset: 'city' })` at the module level of `/components/3D/scene.tsx`.
- [ ] Declare the `mountEnvironment` state variable and associated delayed mount `useEffect` in `Scene3D`.
- [ ] Wrap `<Environment preset="city" />` with a logical conditional check `mountEnvironment && <Environment preset="city" />`.
- [ ] Run linter (`npm run lint` / `lint_applet`) to verify syntax safety and type compliance.
- [ ] Run compiler (`compile_applet`) to ensure complete bundle stability.
