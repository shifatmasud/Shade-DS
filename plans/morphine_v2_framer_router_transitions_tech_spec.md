# Tech Spec 

1. **Objective**
   - **Problem Statement**: Previous versions of Morphine took over navigation by intercepting link clicks with `event.preventDefault()`, calling programmatic navigation, or coupling with Framer's internal View Transition implementations. This created conflicts when Framer modified its routing, broke deep links, and risked desynchronization between Framer's page lifecycle and transition execution.
   - **Solution Overview**: Upgrade `/framer/test/Morphine V2.tsx` to follow the fundamental architectural boundary: **Framer owns navigation. Morphine owns the transition.** Morphine operates purely as a compiler and transition engine: detecting navigation from Framer's lifecycle, capturing OLD semantic elements, awaiting Framer's destination DOM resolution, pairing OLD ↔ NEW elements by semantic name (`data-framer-name`), and rendering seamless shared-element morphs via Framer Motion's `animateView()`.
   - **Scope**:
     - Standalone Framer Code Component in `/framer/test/Morphine V2.tsx`.
     - Non-intrusive navigation observation (Navigation API `navigate` event with `event.intercept`, fallback `popstate` / click-context observation without `preventDefault()` or `navigate()`).
     - Robust multi-phase lifecycle: `IDLE` → `NAVIGATION_DETECTED` → `CAPTURE_OLD` → `WAIT_FOR_DESTINATION` → `RESOLVE_NEW` → `PAIR_ELEMENTS` → `START_MORPH` → `FINISHED` → `IDLE`.
     - Accurate direction detection (Push, Replace, Traverse: Back vs Forward using Navigation API entry index & route depth).
     - Deterministic semantic element resolution & pairing (Card, Image, Title, etc.) preserving origin memory across forward and reverse routes.
     - Graceful degradation: missing pairs do not block or break navigation; rapid navigation cancels in-flight transitions cleanly; full SSR/hydration safety.
     - Real-time diagnostic HUD with instrumentation events (`NAVIGATION`, `OLD_CAPTURE`, `DESTINATION_READY`, `NEW_RESOLVED`, `PAIR_CREATED`, `MORPH_START`, `MORPH_FINISH`, `MORPH_SKIP`, `MORPH_ERROR`).

2. **Success Criteria**
   - **Key Results**:
     - Framer retains 100% ownership of navigation; Morphine never calls `navigate()`, never calls `preventDefault()`, and never monkey-patches `history`.
     - Shared semantic elements morph smoothly across forward routes (List → Detail) and reverse routes (Detail → exact origin Card in List).
     - Single elements, multiple elements, and missing elements all resolve cleanly without console errors or UI hangs.
     - Rapid clicks/traversals safely abort previous transitions and complete the latest navigation without memory leaks.
     - TypeScript compilation and ESLint pass without warnings.
   - **Non-Negotiables**:
     - 100% standalone `/framer` component with zero external non-whitelisted dependencies.
     - No monkey-patching of `window.history` or Framer router internals.
     - No reliance on `document.startViewTransition()` or Framer's internal View Transition triggers.
     - Strict preservation of `data-framer-name` semantic identity and temporary `data-morphine-id` cleanup.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/morphine_v2_framer_router_transitions_tech_spec.md`.
   - [ ] Implement Navigation Observer & Transaction Manager (supporting push, replace, traverse).
   - [ ] Implement OLD semantic snapshot capture with proximity and click context tracking.
   - [ ] Implement asynchronous Destination Resolver with bounded polling and timeouts.
   - [ ] Implement Semantic Identity Resolver & OLD ↔ NEW Pairing engine.
   - [ ] Integrate Framer Motion `animateView()` with enter/exit blur/fade root keyframes and `.add(from, to)`.
   - [ ] Implement Diagnostic HUD with event stream instrumentation.
   - [ ] Validate compilation and linting via `compile_applet` and `lint_applet`.

4. **Architecture Decisions**
   - **Navigation API Integration (`event.intercept`)**: Where available, `window.navigation.addEventListener("navigate")` provides the cleanest, native, non-destructive observation mechanism. Using `event.intercept({ async handler() { ... } })` allows Framer to perform its standard SPA route navigation while Morphine coordinates the transition lifecycle around the DOM update.
   - **Non-blocking Context Observation**: When user clicks an anchor, Morphine captures the click event target and bounding coordinates in a transient ref *without preventing default*. When navigation begins immediately after, the capture phase uses this context to accurately isolate the originating card in a list.
   - **Direction via Navigation API Index & Route Geometry**: For `traverse` navigations, Morphine inspects `event.destination.index` vs `navigation.currentEntry.index` to unambiguously distinguish browser `Back` (index decreased) from `Forward` (index increased). For push/replace, it analyzes route hierarchy and origin memory.
   - **Separation of Transition and Routing**: If `animateView()` or DOM resolution encounters missing elements, Morphine skips pairing (`MORPH_SKIP`) and resolves the transition promise immediately, allowing Framer's destination page to remain fully intact and interactive.

5. **Pseudo Code**
   ```shade-dsl
   MODULE MorphineV2
     DATA
       props: {
         targetFromNames: string,
         targetToNames: string,
         transition: TransitionConfig,
         enableEnterExit: boolean,
         disableEnterExit: boolean,
         stopEnterExitAnim: boolean,
         blurAmount: number,
         exitAnimation: Keyframes,
         enterAnimation: Keyframes,
         showDebugOverlay: boolean
       }
       state: {
         lifecycle: "IDLE" | "NAVIGATION_DETECTED" | "CAPTURE_OLD" | "WAIT_FOR_DESTINATION" | "RESOLVE_NEW" | "PAIR_ELEMENTS" | "START_MORPH" | "FINISHED",
         diagnosticLogs: LogEvent[],
         debugHud: HudState
       }
       refs: {
         transientClickContext: ClickContext | null,
         activeTransitionAbort: (() => void) | null,
         lastOriginMemory: OriginMemory | null
       }

     LOGIC
       ACTION observeNavigation():
         // 1. Transient click context tracker (NON-PREVENTING)
         on document.click (capture):
           if valid link click:
             record clicked element, anchor href, bounding box in transientClickContext
         
         // 2. Navigation API observation
         if window.navigation:
           on navigation.navigate(event):
             if isNavigatable(event):
               direction = resolveDirection(event)
               transaction = createTransaction(event.destination.url, direction)
               event.intercept({
                 async handler():
                   await executeTransitionPipeline(transaction)
               })
         else:
           // Fallback popstate & DOM observer for environments without Navigation API
           on window.popstate:
             transaction = createTransaction(location.href, "reverse")
             executeTransitionPipeline(transaction)

       ACTION executeTransitionPipeline(tx):
         tx.lifecycle = "CAPTURE_OLD"
         oldElements = captureOldSemanticElements(tx.fromNames, transientClickContext, tx.direction)
         
         tx.lifecycle = "WAIT_FOR_DESTINATION"
         animateView(async () => {
           // Allow Framer's DOM update to mount
           await waitForDestinationDOM(tx.toNames, 400)
           
           tx.lifecycle = "RESOLVE_NEW"
           newElements = resolveNewSemanticElements(tx.toNames, tx.direction, tx.originMemory)
           
           tx.lifecycle = "PAIR_ELEMENTS"
           pairs = createSemanticPairs(oldElements, newElements, tx.uid)
         }, tx.transitionConfig)
         .old(exitKeyframes)
         .new(enterKeyframes)
         .add(pairs)
         
         await transition.finished
         tx.lifecycle = "FINISHED"
         cleanupTemporaryAttributes()

     RENDER
       div.hiddenControllerAnchor
       if (showDebugOverlay) -> HUD Diagnostic Console
   ```
