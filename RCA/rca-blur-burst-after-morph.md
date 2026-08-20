# Root Cause Analysis: View Transition Fade & Blur vs Crossfade Only & Settling

## 1. Problem Description
- When relying solely on Motion's `animateView.exit()` and `animateView.enter()` for root transitions:
  Motion creates separate WAAPI `element.animate()` calls for `opacity` and `filter` on `document.documentElement` targeting pseudo-elements `::view-transition-old(root)` and `::view-transition-new(root)`.
  In Chromium/WebKit, pseudo-element WAAPI calls for `filter` either get discarded or don't composite alongside the `opacity` effect, causing the browser to fall back to a simple full-page crossfade without blur.
- Additionally, if `targets` in `animateView` does not contain `"root"`, Motion explicitly runs `css.set(":root", { "view-transition-name": "none" })`, which removes the root view transition unless overridden by `html, :root { view-transition-name: root !important; }`.

## 2. Solution: GPU-Composited Native View Transition Stylesheet
1. **Force Root View Transition Retention**:
   Inject `html, :root { view-transition-name: root !important; }` so Motion's auto-cleaner does not strip root pseudo-elements.
2. **Native GPU Keyframes for Alpha Fade & Gaussian Blur**:
   Apply `@keyframes morphine-root-fade-blur-exit` and `morphine-root-fade-blur-enter` directly via CSS pseudo-elements `::view-transition-old(root)` and `::view-transition-new(root)` with:
   - `mix-blend-mode: normal !important;` (prevents additive whiteout/glare)
   - Exit: `0% { opacity: 1; filter: blur(0px); } 100% { opacity: 0; filter: blur(var(--morphine-blur, 20px)); }`
   - Enter: `0% { opacity: 0; filter: blur(var(--morphine-blur, 20px)); } 100% { opacity: 1; filter: blur(0px); }`
   - NO `transform: scale` (prevents viewport zoom jumps)
3. **Continuous CSS Property Synchronization**:
   Keep CSS variables (`--morphine-blur`, `--morphine-duration`, `--morphine-ease`) live on `:root` so there is zero attribute-removal teardown flash at the end of the transition.
4. **Clean Integration with animateView**:
   Let `animateView` orchestrate navigation lifecycle and shared morph pairs (`add(fromTarget, toSelector)`), while the root pseudo-elements follow the GPU compositor keyframe rules.
