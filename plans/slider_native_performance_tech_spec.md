# Tech Spec

## 1. Objective
- **Problem Statement**: Custom React/Framer-Motion slider components (`RangeSlider.tsx`, `FillSlider.tsx`) across the app exhibit noticeable latency compared to native HTML `<input type="range">`. The thumb rubber-bands behind pointer coordinates due to intermediate spring physics, `getBoundingClientRect()` triggers layout thrashing on every pointer event, audio allocation floods the event loop, and unoptimized upstream handlers re-render heavy React components during continuous scrubbing.
- **Solution Overview**: Transform custom sliders into 120Hz/240Hz native-grade input components. Decouple direct position tracking (1:1 instant transform with 0ms latency) from organic tooltip tilt physics (retaining playful inertia), cache track geometry per pointer session, throttle tactile audio ticks, and enforce a two-tier update model (zero-render transient MotionValue scrubbing + deferred commit for heavy state/history).
- **Scope**:
  - `components/Core/RangeSlider.tsx`
  - `components/staged/FillSlider.tsx`
  - `components/Package/ControlPanel.tsx`
  - `components/Core/sub-components/AnimatedCounter.tsx`
  - `components/Page/Home.tsx` (ensure non-blocking property updates)
- **Context**: The application requires high visual fidelity (fluid motion, tactile sound, design tokens from `Theme.tsx`) while matching the mechanical responsiveness of native OS inputs.

---

## 2. Success Criteria
- **Key Results**:
  - Direct 1:1 hardware-accelerated tracking: thumb coordinates match cursor/touch coordinates with 0ms visual drag lag.
  - 0 forced reflows during active dragging: `getBoundingClientRect()` called only once on `pointerdown` and cached for the active gesture.
  - Sustained 60fps/120fps throughout fast slider scrubs across wide numerical ranges (e.g. 0 to 1000).
  - Audio clicks are limited to an optimal perceptual cadence (~35–45ms interval), eliminating audio clipping and WebAudio node flood.
  - Full backward compatibility: all existing props (`motionValue`, `onChange`, `onCommit`, `min`, `max`, `step`, `label`, `trackBackground`) and theme styles remain intact.
- **Non-Negotiables**:
  - Preserve tactile tooltip physics (velocity tilt/skew) without slowing down the primary thumb translation.
  - Strict adherence to Theme tokens and border helpers (`Theme.tsx`).
  - No CSS transitions; maintain Framer Motion layout & gesture rules.

---

## 3. Project Requirements
- [x] Document Root Cause Analysis in `/RCA/rca_slider_performance_native_parity.md`.
- [ ] Upgrade `RangeSlider.tsx`:
  - [ ] Switch thumb and fill width derivation from `visualValue = useSpring(...)` to direct `motionValue` transform for 0ms drag latency.
  - [ ] Cache track bounding rectangle on `pointerdown` in a ref (`trackRectRef.current`).
  - [ ] Add `pointercancel` and fallback window release listener to guarantee release parity.
  - [ ] Implement audio click throttling (minimum 40ms threshold) during continuous scrubbing.
  - [ ] Maintain velocity-based tooltip inertia physics without polluting direct thumb translation.
- [ ] Upgrade `FillSlider.tsx`:
  - [ ] Bind fill width and thumb position directly to `activeMV` for instantaneous response.
  - [ ] Cache track bounding rect during pointer drag sessions.
  - [ ] Add pointer cancel / cleanup safeguards.
- [ ] Optimize `ControlPanel.tsx`:
  - [ ] Ensure sliders update their corresponding `MotionValue` directly during scrubbing, using `onCommit` for heavy history and state logging, avoiding root component re-renders per mousemove.
- [ ] Optimize `AnimatedCounter.tsx`:
  - [ ] Avoid redundant spring scheduling during high-velocity number scrubs.
- [ ] Verify build and functionality with `compile_applet`.

---

## 4. Architecture Decisions
- **Decision 1: Direct MotionValue Transform vs Spring-damped Position**
  - *Trade-off*: A spring on position creates a sluggish "rubbery" drag feeling. Removing the spring from the thumb position makes it track 1:1 with hardware precision like `<input type="range">`.
  - *Mitigation for organic feel*: Keep spring inertia strictly on the *tooltip tilt angle and skew*, preserving personality without compromising tactile precision.
- **Decision 2: Pointer Session Bounding Rect Caching**
  - *Trade-off*: If the track moves dynamically on screen during a drag (e.g., page scrolling), cached rect coordinates might shift.
  - *Resolution*: Sliders use `touchAction: 'none'`, preventing scroll during active drag. Caching the bounding box on `pointerdown` eliminates 120–240 synchronous DOM layout reflows per second while remaining 100% accurate throughout the drag gesture.
- **Decision 3: Two-Tier Update Lifecycle (Scrub vs Commit)**
  - *Trade-off*: Calling heavy state setters on every drag pixel starves the main thread.
  - *Resolution*: `motionValue.set(newValue)` updates the local visual layer and subscribers (e.g. WebGL shader uniforms) instantly at 0 React cost. `onCommit` persists to undo/redo history, logs, and JSON code generation on pointer release.

---

## 5. Pseudo Code (Shade DSL)

```dsl
COMPONENT RangeSlider:
  DATA:
    trackRectRef: Ref<DOMRect | null>
    lastSoundTimestampRef: Ref<number>
    isDragging: State<boolean>
    
    // Direct 1:1 normalized percentage (Zero Latency)
    normalizedValue = Transform(motionValue, [min, max] -> [0, 100])
    percentageStyle = Transform(normalizedValue, v -> `${v}%`)
    
    // Decoupled Tooltip Physics (Inertia preserved on rotation only)
    velocity = Velocity(normalizedValue)
    tiltAngle = Spring(Transform(velocity, [-250, 250] -> [45, -45]), { stiffness: 60, damping: 15 })

  LOGIC:
    onPointerDown(e):
      trackRectRef.current = trackRef.getBoundingClientRect()
      capturePointer(e.pointerId)
      isDragging.set(true)
      updateValueFromPointer(e.clientX)

    onPointerMove(e):
      if isDragging.get():
        updateValueFromPointer(e.clientX)

    updateValueFromPointer(clientX):
      rect = trackRectRef.current
      percent = clamp((clientX - rect.left) / rect.width, 0, 1)
      stepped = round((min + percent * (max - min)) / step) * step
      if stepped != motionValue.get():
        motionValue.set(stepped)
        throttleAudioTick(40ms)
        onChange?(stepped)

    onPointerUp(e):
      releasePointer(e.pointerId)
      isDragging.set(false)
      onCommit?(motionValue.get())

  RENDER:
    Track:
      FillBar: style={ width: percentageStyle }
      Thumb: style={ left: percentageStyle }
        Tooltip: animate={ rotate: tiltAngle }
```
