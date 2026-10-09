# Root Cause Analysis: Slider Performance vs Native `<input type="range">` Parity

## 1. Problem Statement
Users observed that custom slider instances (`RangeSlider.tsx` and `FillSlider.tsx`) across the application felt sluggish, lagged behind the pointer during fast drags, or showed noticeable frame drops compared to standard native browser sliders (`<input type="range">`). The objective is to identify why current sliders suffer from latency and prove that custom sliders can achieve true 120Hz/240Hz native-grade performance across all instances.

---

## 2. Root Cause Findings

### Finding 1: Artificial Elastic Drag Lag from `useSpring` on Direct Manipulation
- **Location**: `components/Core/RangeSlider.tsx` (lines 116–121, 135, 238) and `components/staged/FillSlider.tsx` (lines 69–77).
- **Observation**:
  ```ts
  const visualValue = useSpring(motionValue, {
    stiffness: 300,
    damping: 35,
    mass: 1,
    restDelta: 0.0001
  });
  const normalizedValue = useTransform(visualValue, [min, max], [0, 100]);
  const percentageStyle = useTransform(normalizedValue, (v) => `${v}%`);
  ```
- **Mechanism**: The slider thumb and fill bar position were derived from `visualValue`, which is damped by a spring simulation. A spring simulation calculates position iteratively over several frames (50–100ms settling time).
- **Impact**: While native sliders update at 0ms latency glued 1:1 to the user's cursor or touch point, `useSpring` introduced an elastic rubber-band delay where the thumb visibly lagged behind fast pointer movements.

### Finding 2: Per-Event Layout Thrashing via `getBoundingClientRect()`
- **Location**: `components/Core/RangeSlider.tsx` (line 168) and `components/staged/FillSlider.tsx` (line 85).
- **Observation**:
  ```ts
  const updateValueFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect(); // Called on every pointermove!
    ...
  }
  ```
- **Mechanism**: Modern high-polling mice and touch screens emit `pointermove` events at 120Hz to 240Hz. Calling `getBoundingClientRect()` on every single event forces the browser layout engine to flush pending style calculations and recalculate element geometry synchronously on the main thread.
- **Impact**: Under continuous drag, the main thread was repeatedly stalled by forced reflows, dropping frames and causing micro-stutters.

### Finding 3: Unthrottled WebAudio Allocation Flooding
- **Location**: `components/Core/RangeSlider.tsx` (line 178) and `services/soundService.ts`.
- **Observation**:
  ```ts
  if (newValue !== motionValue.get()) {
    playSound('tick', 0.15); // Unthrottled call on every integer/step tick!
    motionValue.set(newValue);
  }
  ```
- **Mechanism**: Fast scrubbing across a wide range (e.g. 0 to 500) triggers up to 150 `playSound` calls within 200ms. In `soundService.ts`, each call creates an async promise (`await getPreRenderedBuffer`), instantiates new WebAudio `AudioBufferSourceNode` and `GainNode` objects, connects them, and schedules playback.
- **Impact**: Flooding the audio thread and microtask queue with hundreds of node allocations created garbage collection pauses, audio clipping, and main-thread thread contention.

### Finding 4: Upstream Re-render Cascades via Continuous `onChange`
- **Location**: `components/Package/ControlPanel.tsx` (lines 292, 322, 331, 340, 349, 587, 594, 601) and `components/Page/Home.tsx` (lines 544–597).
- **Observation**:
  - Unlike `Corner Radius` (which bound strictly to `radiusMotionValue` with zero React re-renders during drag and committed on release via `onRadiusCommit`), several control sliders routed real-time ticks through `onChange={(v) => onPropChange(key, v)}`.
  - In `Home.tsx`, `onPropChange` for generic keys synchronously executed:
    1. `updateStagedProps({ ...stagedProps, [key]: value }, true)`
    2. Deep state cloning & history array updates
    3. JSON code string serialization
    4. Console event logging (`logEvent` -> `setLogs`)
- **Mechanism**: Re-rendering the root `Home` component and its entire sub-tree (Three.js canvas, stage, docked panels, code display) at 120Hz per second starved CPU resources.
- **Impact**: The UI couldn't sustain 60fps or 120fps during drag because the main thread was occupied re-rendering non-transient UI trees.

### Finding 5: `AnimatedCounter` Digit Spring Animation Storms
- **Location**: `components/Core/sub-components/AnimatedCounter.tsx` (lines 189–207).
- **Mechanism**: Every tick change invoked `animate(mv, target, { type: 'spring' })` for each digit column. When scrubbing through dozens of values per second, spring animations were repeatedly created and overwritten, consuming excess frame budgets.

---

## 3. Remediation & Native Parity Architecture

| Bottleneck | Prior State | Native-Grade Solution |
| :--- | :--- | :--- |
| **Thumb & Track Position** | Damped by `useSpring` (50–100ms lag) | **1:1 Direct `motionValue` Transform** (0ms latency, direct hardware-accelerated tracking) |
| **Track Coordinate Reads** | `getBoundingClientRect()` on every `pointermove` | **Session-Cached Geometry**: Compute `rect` once on `pointerdown`; reuse throughout drag session |
| **Haptic Audio Feedback** | Unthrottled WebAudio allocation (100+ nodes/sec) | **RAF / Time-Throttled Ticks**: Minimum 35–45ms interval accumulator matching human perceptual threshold |
| **Tooltip Physics** | Direct and tooltip coupled | **Decoupled Physics**: Thumb moves with 0ms direct tracking; tooltip keeps tactile momentum tilt via velocity spring |
| **Upstream Re-renders** | Continuous full React tree re-render on `onChange` | **Two-Tier State**: Transient MotionValue/Zustand during drag (0 React renders); push history and logs only on `onCommit` |
| **Digit Counter** | Spring thrashing on every digit per frame | **Direct Transform / Throttled Step**: Fast direct translate during high-velocity drag, smooth settle on release |
