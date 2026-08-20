# Root Cause Analysis: Transitioning to Pure Framer Motion `animateView`

## 1. Problem Statement
The user requested: *"use framer motion only. not css. read animateView.md"*.
Previously, CSS-based `@keyframes` and custom style injections were utilized for view transition handling.

## 2. Root Cause
1. **Misalignment with `animateView` API Design**: As documented in `animateView.md`, `animateView` natively provisions page transitions via `.old()` and `.new()`, targeting outgoing and incoming snapshots (`::view-transition-old(root)` and `::view-transition-new(root)`).
2. **Unnecessary CSS Injections**: Injecting custom `<style>` tags and `@keyframes` created redundancy and bypassed Framer Motion's built-in WAAPI orchestrator, queueing system, and transition interpolation pipelines.

## 3. Resolution
1. **Removed All Injected CSS**: Eliminated `ROOT_VIEW_TRANSITION_CSS`, `ROOT_VIEW_TRANSITION_RESET_ID`, `injectRootTransitionReset()`, and `<style>` JSX nodes from `Morphine.tsx`.
2. **Pure Framer Motion `animateView`**:
   - Outgoing page snapshot: `.old({ opacity: [1, 0], filter: ["blur(0px)", "blur(20px)"] })`
   - Incoming page snapshot: `.new({ opacity: [0, 1], filter: ["blur(20px)", "blur(0px)"] })`
   - Non-active fallback: `.old({ opacity: 0 }).new({ opacity: 1 })`
   - Shared elements: `.add(fromTarget, toSelector)`
3. **No External Stylesheet Overhead**: Component renders purely via Framer Motion without any CSS injection side-effects.
