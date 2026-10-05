# Tech Spec 

1. **Objective**
   - **Problem Statement**: Framer's native page transitions rely on the browser's View Transition API (`document.startViewTransition`), root snapshot captures (`::view-transition-old(root)` / `::view-transition-new(root)`), and automated exclusion rules (`framer-*-exclude` with `animation: 0s none !important`). The current `Morphine.tsx` controller previously intercepted navigation solely through `animateView` and forcefully stripped root view transitions when enter/exit was disabled, creating potential conflicts with Framer's native page transition engine, persistent header/nav exclusions, and native routing transitions.
   - **Solution Overview**: Rewrite `/framer/Morphine.tsx` into a unified, high-performance View Transition Controller that natively harmonizes with Framer's built-in page transitions and exclusion patterns. It supports dual transition modes (Native Framer View Transitions via direct `view-transition-name` pairing, Framer Motion `animateView`, and Hybrid/Auto mode), seamlessly honors Framer's persistent layout exclusions (`framer-*-exclude`), and maintains all locked bidirectional forward/reverse card-to-detail shared element morphing pipelines.
   - **Scope**:
     - Standalone Framer Code Component (`/framer/Morphine.tsx`) with zero breaking changes to existing props while extending support for Framer's native page transition engine.
     - Native CSS View Transition Name synchronization alongside Framer Motion `animateView`.
     - Automatic detection and preservation of Framer's persistent exclusion rules (`.framer-*-container`, `[data-framer-name*="exclude"]`, `::view-transition-*-exclude`).
     - Rich property controls in Framer for Page Transition Mode (`Auto / Hybrid`, `Native Framer`, `Motion animateView`, `Shared Element Only`), Excluded Elements, Blur Amount, Custom Keyframes, and Diagnostic HUD.
     - Full SSR hydration safety (`isStaticRenderer`, `RenderTarget`), and responsive mouse/touch/history navigation parity.

2. **Success Criteria**
   - **Key Results**:
     - `Morphine.tsx` runs standalone inside Framer Canvas, published Framer sites, and React projects without hydration errors.
     - Supports Framer's native page transitions with smooth cross-fading and zero-animation persistent container exclusions (`framer-*-exclude`).
     - Shared element pairs (Card -> Detail, Image -> Hero, Title -> Headline) morph bidirectionally across forward and reverse routes.
     - HUD overlay accurately reflects active transition modes, pairs matched, Framer exclusions detected, and route memory.
   - **Non-Negotiables**:
     - 100% standalone `/framer` component.
     - Preserves all locked forward/reverse navigation pipelines (URL slug matching, index memory, click proximity disambiguation).
     - No external CSS files; use programmatic style injection with automatic cleanup.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/morphine_framer_page_transitions_tech_spec.md`.
   - [ ] Implement rewritten `/framer/Morphine.tsx` with complete property controls, native view transition bridge, Framer exclusion support, and Motion `animateView` engine.
   - [ ] Verify clean compilation via `compile_applet` and linting via `lint_applet`.

4. **Architecture Decisions**
   - **Dual-Engine Transition Bridge**: Support both browser-native `view-transition-name` styling for Framer's native `document.startViewTransition()` and Motion's `animateView()` pipeline. When Framer or browser executes a transition, matching CSS `view-transition-name` ensures instantaneous GPU-accelerated morphing even without manual Motion interception.
   - **Framer Native Exclude Harmony**: Inject and manage CSS rules for `.framer-*-exclude` and custom excluded selectors so that navigation bars, sticky headers, and toolbars are cleanly isolated and preserved with `animation: auto ease 0s 1 normal none running none !important`.
   - **Bidirectional Memory Engine**: Retain the battle-tested locked pipelines for forward card index/slug caching and reverse DOM tagging to ensure multi-card lists always return to the exact clicked item.

5. **Pseudo Code**
   ```shade-dsl
   COMPONENT Morphine
     DATA
       props: {
         targetFromNames,
         targetToNames,
         pageTransitionMode, // "auto" | "native" | "motion" | "shared-only"
         excludeNames,
         enableEnterExit,
         blurAmount,
         exitAnimation,
         enterAnimation,
         transition,
         showDebugOverlay
       }
       state: { isMounted, debugState, exclusionsCount }
       ref: { propsRef, transitionRef, activeMemoryRef }
     
     LOGIC
       action syncFramerExclusions():
         find elements matching excludeNames or Framer's default exclude classes
         assign scoped view-transition-name: framer-morphine-[hash]-exclude
         inject exclusion CSS: ::view-transition-*(...) { animation: 0s none !important; }
       
       action tagSharedViewTransitionNames(pairs, uid):
         assign matching view-transition-name to outgoing and incoming elements
         e.g., el.style.viewTransitionName = `morphine-shared-${index}`
       
       action executeViewTransition(pairs, direction, navFn, uid):
         if (mode == "native" && document.startViewTransition):
           tagSharedViewTransitionNames(pairs, uid)
           syncFramerExclusions()
           document.startViewTransition(async () => {
             await navFn()
             await tagDestinationDOM(pairs, direction, uid)
           })
         else:
           animateView(async () => {
             await navFn()
             await tagDestinationDOM(pairs, direction, uid)
           }, effectiveTransition).old(exitKeyframes).new(enterKeyframes).add(pairs)
       
       action handleNavigationEvents():
         intercept window.navigation "navigate", window "popstate", and "click" on <a>
         resolve bidirectional pairs (forward vs reverse)
         executeViewTransition
     
     RENDER
       div.hiddenControllerAnchor (aria-hidden)
       if (showDebugOverlay) -> Portal -> HUD Console (Direction, Mode, Pairs, Excludes, Origin Memory)
   ```
