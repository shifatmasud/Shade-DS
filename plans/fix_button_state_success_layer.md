# PRD: Fix StateLayer Interaction during Success State

## Overview & Objectives
The `StateLayer` component (used by the `Button`) contains an explicit check that disables interaction when the `data-success` attribute of the parent is `"true"`. Users have reported that the state layer "isn't working" when the button is in the success state. The objective is to enable the state layer interactions even when the button is in the success state to ensure consistent UI feedback.

## OKR (Success Criteria)
- StateLayer hover and click feedback (ripples/active states) function as expected when `isSuccess` is `true`.
- No new regressions introduced in button interactivity.
- The `SuccessLayer` still functions independently of `StateLayer`.

## ADR (Architectural Design)
- The root cause is a hardcoded check within `StateLayer.tsx` that explicitly ignores pointer events if the host element has `data-success="true"`.
- The fix involves modifying the `useHostEvents` implementation in `StateLayer.tsx` to remove this specific check while maintaining the `disabled` state check.

## TODO
- [ ] Modify `components/Core/sub-components/StateLayer.tsx` to remove the `data-success` check from all event listeners.
- [ ] Verify functionality.
