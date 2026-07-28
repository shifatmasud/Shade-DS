# Tech Spec: Multi-Agent Tasks Implementation

1. **Objective**
   - **Task 1: Touch & Click Button Motion Animation**
     - Adjust button touch and click animation handling across `Core/Button.tsx` and `staged/Button.tsx`. On touch press (touch down/hold), scale up (scale > 1, e.g. 1.02 or 1.05) to act as hover. On click execution/release, always scale down (scale < 1, e.g. 0.98 or 0.95).
   - **Task 2: Default Shader Parameters Configuration**
     - Update default shader parameters in `services/shaderStore.ts` to match the exact specified values:
       - radius: 0.06
       - strength: 6.1
       - dissipation: 0.97
       - curlStrength: 0.19
       - curlFreq: 1
       - refractStrength: 0.32
       - dispersionScale: 0.17
       - blurRadius: 0.009
       - jitterStrength: 0.008
   - **Task 3: Fluid Distortion Multi-Touch & Trail Jump Prevention**
     - Update `FluidDistortion.tsx` to support multi-touch (up to 5 simultaneous touch pointers).
     - Prevent sudden pointer jumps/clicks from dragging connecting line vectors across the screen. On new click/tap down or touch start, initialize pointer history (`pointer`, `prevPointer`, `prev2Pointer`) to the click location so a fresh fluid trail starts at the new position while existing trails remain in the FBO texture and dissipate naturally.

2. **Success Criteria**
   - Touch devices show scale-up behavior during touch press and scale-down during click.
   - `DEFAULT_SHADER_PARAMS` in `services/shaderStore.ts` matches the exact specified values.
   - Fluid distortion handles multi-touch inputs seamlessly.
   - Clicking/tapping at a new screen location starts a localized new splat/trail without moving or dragging the previous trail position, allowing the old trail to dissipate naturally.
   - App passes `npm run lint` and `compile_applet` with zero errors.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/multi_agent_task_spec.md`.
   - [x] Update `Core/Button.tsx` and `staged/Button.tsx` for touch press scale-up & click scale-down animation logic.
   - [x] Update `services/shaderStore.ts` with the new `DEFAULT_SHADER_PARAMS`.
   - [x] Update `components/staged/3D/FluidDistortion.tsx` to support multi-touch and new trail initialization on click/tap.
   - [x] Verify build and compilation with `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
   - **Button Animation**: Track `isTouchPress` via pointer down/up/cancel events. When `isTouchPress` is active, apply `scale: 1.02` / `1.05` (acting as hover). On `onClick` / click release, animate `scale: 0.98` / `0.95` briefly.
   - **Shader Store**: Update `DEFAULT_SHADER_PARAMS` in `services/shaderStore.ts`.
   - **Multi-Touch Fluid Simulation**: Extend `PAINT_FRAG` in `FluidDistortion.tsx` to loop over `MAX_TOUCHES` (up to 5) uniform arrays (`uPointer`, `uMidPointer`, `uPrevPointer`, `uVelocity`, `uActive`). In `useEffect` and `useFrame`, track touch IDs from `e.touches` or pointer events. On `pointerdown` / `touchstart` for a touch ID, reset `prevPointer` and `prev2Pointer` to the new touch coordinate to prevent jump vectors.

5. **Pseudo Code**
   ```tsx
   // Task 1: Button
   const [isTouchPress, setIsTouchPress] = useState(false);
   const [isClicking, setIsClicking] = useState(false);
   
   const handlePointerDown = (e: React.PointerEvent) => {
     if (e.pointerType === 'touch') {
       setIsTouchPress(true);
     }
   };
   
   const handleClick = (e: React.MouseEvent) => {
     setIsClicking(true);
     setIsTouchPress(false);
     setTimeout(() => setIsClicking(false), 150);
     onClick?.(e);
   };

   // Task 2: Shader Store Defaults
   export const DEFAULT_SHADER_PARAMS = {
     radius: 0.06,
     strength: 6.1,
     dissipation: 0.97,
     curlStrength: 0.19,
     curlFreq: 1,
     refractStrength: 0.32,
     dispersionScale: 0.17,
     blurRadius: 0.009,
     jitterStrength: 0.008,
   };

   // Task 3: Fluid Distortion Multi-Touch & Trail Reset
   const MAX_TOUCHES = 5;
   // In Shader:
   uniform vec2 uPointer[MAX_TOUCHES];
   uniform vec2 uMidPointer[MAX_TOUCHES];
   uniform vec2 uPrevPointer[MAX_TOUCHES];
   uniform vec2 uVelocity[MAX_TOUCHES];
   uniform float uActive[MAX_TOUCHES];
   ```
