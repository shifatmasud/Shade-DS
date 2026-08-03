# Tech Spec - TextCounter Lag Fix & Static Track Architecture

1. **Objective**
   - **Problem Statement**: The 5-digit reel animation in `TextCounter.tsx` stutters and lags significantly. This is caused by `countMV.on("change")` spawning new Framer Motion `animate()` instances on every animation frame for each digit motion value, resulting in hundreds of concurrent spring controllers. Additionally, static formatting symbols (commas, currency signs, etc.) are currently parsed as prefixes/suffixes instead of permanent static tracks, causing visual issues when counting from `0` or `00000`.
   - **Solution Overview**:
     1. Refactor digit motion values to be pure `useTransform` derivatives of the single master `countMV` (or calculate clean single-pass target transitions), completely eliminating nested `animate()` spawns during playback.
     2. Refactor track building logic so non-digit symbols (commas, decimals, symbols) are recognized as static tracks embedded within the track list, preserving their position even when the value is `0` or `00000`.
     3. Update property controls for `countTarget` to allow multi-digit inputs up to 5 digits (including leading zero formats like `00000` to `99999`).
   - **Scope & Context**: Applies strictly to `/framer/TextCounter.tsx`.

2. **Success Criteria**
   - **Key Results**:
     - 60fps smooth rolling animation for 5-digit counters with zero frame drops.
     - Static symbols (e.g., `,`, `.`, `$`) remain present as fixed tracks on `0` and `00000`.
     - Multi-digit inputs up to 5 digits (0 to 99999) supported in Property Controls.
   - **Non-Negotiables**:
     - Zero nested `animate()` calls inside `on("change")` callbacks.
     - Preserved font styles and character style extraction from Framer host elements.

3. **Project Requirements**
   - [ ] Refactor `Digit` transforms to compute scroll offset directly from `countMV` using `useTransform` or single-pass `animate` target calculations.
   - [ ] Implement static track preservation for non-digit symbols (`,`, `.`, `%`, `$`, etc.) directly inside the digit reel layout.
   - [ ] Support padding and leading zeros for 5-digit inputs (e.g., `00000`).
   - [ ] Update Framer property controls (`countTarget` max: 99999, step, and formatting options).
   - [ ] Create test component/demo if needed to verify 60fps performance on 5 tracks.

4. **Architecture Decisions**
   - **Trade-off 1 (Derived useTransform vs. Standalone MotionValues)**:
     - *Option A*: Create separate motion values for each digit and call `animate()` on every frame change. (Current broken approach - causes massive lag).
     - *Option B*: Derive each digit's offset directly from `countMV` using a pure mathematical `useTransform`.
     - *Decision*: Option B. A single master animation on `countMV` drives all 5 digit tracks through pure transform functions, reducing RAF overhead from O(N*frames) to O(1).
   - **Trade-off 2 (Static Track Representation)**:
     - *Decision*: Represent tracks as `{ type: 'digit' | 'static', char: string, posFromRight?: number }`. Static characters render in-place with fixed `1em` track height, ensuring alignment and zero dynamic layout shifts on `00000`.

5. **Pseudo Code**
   ```shade
   // Shade DSL Architecture Representation
   
   Data TextCounterState {
     countMV: MotionValue<number>
     tracks: Array<TrackItem>
     paddingLength: number // e.g. 5 for 00000
   }

   Logic ComputeDigitOffset(countMV: MotionValue, posFromRight: number, direction: string) {
     divisor = Math.pow(10, posFromRight)
     return useTransform(countMV, (v) => {
       digitValue = Math.floor(v / divisor) % 10
       return calculateEmOffset(digitValue, direction)
     })
   }

   Render ReelLayout {
     container(flexRow, tabularNums) {
       tracks.map(track => {
         if (track.isDigit) {
           DigitReel(offset=ComputeDigitOffset(countMV, track.posFromRight))
         } else {
           StaticSymbolTrack(char=track.char)
         }
       })
     }
   }
   ```
