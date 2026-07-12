# Plan - Fix Staged Button Success Click Freeze

## PRD (Overview & Objectives)
- **Objective**: Fix a severe bug in `/components/staged/Button.tsx` where clicking the button again during or after the success state triggers a UI freeze.
- **Root Cause Analysis**: 
  1. The success timeout in `/components/staged/Button.tsx` is initialized inside `handleClick` using a raw `setTimeout` with no state cleanup or unmount guard. This can lead to race conditions, state updates on unmounted/stale components, and thread lockups in React/Framer Motion.
  2. While in the success state, pointer events and hover animations are still active, which can conflict with Framer Motion's active transitions and gestures, causing `whileTap` or layout animations to hang or freeze.
- **Fix Strategy**:
  1. Move success state reset logic to a robust `useEffect` with a cleanup function (`clearTimeout`), mimicking the safe implementation in `/components/Core/Button.tsx`.
  2. Apply `pointerEvents: isSuccess ? 'none' : 'auto'` to the button element styles. This completely blocks duplicate clicks and pointer interactions during the success state, preventing conflict with ongoing animations and eliminating any freeze possibility.

---

## OKR (Success Criteria)
- **O1**: Clicking the staged Button when `enableSuccess` is enabled triggers the success state smoothly.
- **O2**: Clicking the button again during the success animation does not trigger any extra actions or freeze the UI.
- **O3**: The linter (`lint_applet`) and production compilation (`compile_applet`) both pass with zero errors.

---

## ADR (Architectural Design)
- **State Isolation**: Use standard React `useEffect` with cleanup to handle `setTimeout` transitions for `isSuccess`.
- **Interaction Block**: Use CSS `pointer-events: none` on the button container when `isSuccess` is true to cleanly delegate interaction blocking to the browser engine, preventing events from bubbling or triggering Framer Motion's gesture listeners.

---

## TODO List
1. [x] Inspect `/components/staged/Button.tsx` code (Done).
2. [x] Create `/plans/fix_staged_button_success_freeze.md` plan (Current).
3. [ ] Edit `/components/staged/Button.tsx` to replace raw click timeouts with a robust `useEffect` manager, and add pointer-event constraints during success states.
4. [ ] Run `lint_applet` to verify syntax and code quality.
5. [ ] Run `compile_applet` to ensure complete build stability.
