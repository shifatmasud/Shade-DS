# Plan - Fix Button Success Glow Intermittency

## PRD (Overview & Objectives)
- **Objective**: Fix the intermittent failure of the success glow (green box-shadow) appearing on buttons during the success state.
- **Root Cause Analysis**: 
  1. The `onComplete` callback (responsible for setting `showGlow` in the Button) is only called inside the `click` event listener of `SuccessLayer.tsx`.
  2. This native `click` listener performs a check: `if (activeTarget?.getAttribute('data-success') === 'true' || isSuccess)`.
  3. Due to the asynchronous nature of React state updates, when the native `click` event fires, the `data-success` attribute on the DOM and the `isSuccess` prop in the closure may still be `false` (the previous state).
  4. Consequently, the condition fails on the first click, and `onComplete` is never called.
  5. Subsequent clicks while `isSuccess` is already `true` work, but the initial trigger is missed.
- **Fix Strategy**:
  1. Move the `onComplete?.()` call to the `useEffect` hook in `SuccessLayer.tsx` that monitors the `isSuccess` prop. This ensures it is reliably triggered when the state transitions to `true`.
  2. Ensure `addInstance()` is called exactly once per success state entry via the `useEffect`.
  3. Maintain the `click` listener for multi-ripple support during an active success state, but ensure it doesn't conflict or redundantly call `onComplete`.

## OKR (Success Criteria)
- **O1**: The success glow (green shadow) appears 100% of the time when a button enters the success state.
- **O2**: Programmatic triggers of `isSuccess` (if any) correctly show the glow.
- **O3**: Multi-click during success state still triggers additional ripples without flickering the glow.
- **O4**: Zero regressions in button interaction or performance.

## ADR (Architectural Design)
- **Reactive Triggering**: Prefer React's `useEffect` for state-driven lifecycle events over native event listeners for initial triggers. Native listeners should only be used for direct DOM interactions that don't map perfectly to state (like multi-ripples at specific coordinates).

## TODO List
1. [ ] Create `/plans/fix_button_success_glow_intermittency.md` (Current).
2. [ ] Modify `components/Core/sub-components/SuccessLayer.tsx` to call `onComplete` in the `useEffect` and clean up the `click` handler.
3. [ ] Verify fix by checking both `Core/Button` and `staged/Button` interactions.
4. [ ] Run `lint_applet` and `compile_applet`.
