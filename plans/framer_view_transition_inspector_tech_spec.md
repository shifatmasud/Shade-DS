# Tech Spec 

1. **Objective**
   - **Problem Statement**: Understanding and reverse-engineering how Framer's proprietary View Transitions, shared-element morphs, and Motion `animateView` mechanics work in practice requires deep runtime visibility into DOM mutations, CSS pseudo-element generation (`::view-transition-*`), coordinate transformations, navigation interceptions, and transition lifecycle hooks.
   - **Solution Overview**: Build a standalone, production-ready Framer Code Component (`/framer/ViewTransitionInspector.tsx`) that mounts directly inside any Framer Canvas or React application, instruments the runtime environment non-invasively, tracks active view transitions, visualizes element geometries, and provides a floating console HUD overlay with one-click copy options for full JSON traces and architectural reports.
   - **Scope**:
     - Standalone Framer Code Component with full property controls (`addPropertyControls`, `@framerDisableUnlink`, etc.).
     - Non-invasive diagnostic interceptor for `document.startViewTransition`, `window.navigation`, `history`, and `framer-motion` `animateView`.
     - Real-time DOM element inspector for `data-framer-*` and `view-transition-name` attributes.
     - Built-in View Transition simulator for testing reverse-engineered morphs, clip-path origins, and crossfades.
     - Floating console overlay HUD with expandable panel, live telemetry, event log filter, and instant copy buttons (JSON trace, Markdown report, Framer code snippet).
   - **Context**: Integrates with Framer's design token conventions, supports SSR hydration safety (`isClient`, `RenderTarget`), and adheres to Shade DSL architecture and JS style standards.

2. **Success Criteria**
   - **Key Results**:
     - Component mounts cleanly on both Framer Canvas / Published sites and standard React apps without SSR crashes or memory leaks.
     - Intercepts and logs all View Transition phases (Trigger -> Pre-Snapshot -> DOM Update -> Post-Snapshot -> Animation -> Cleanup).
     - Provides interactive HUD overlay with collapsible console, live event stream, and multi-format copy functionality with animated copy feedback.
     - Includes built-in interactive simulator to test and demonstrate reverse-engineered View Transition patterns in real-time.
   - **Non-Negotiables**:
     - Standalone `/framer` component with zero external non-standard dependencies.
     - No direct CSS transitions; use Framer Motion springs and clean JS style objects.
     - Full copy functionality with clipboard fallback.
     - Safe cleanup of all patched browser APIs on unmount.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/framer_view_transition_inspector_tech_spec.md`.
   - [ ] Implement standalone `/framer/ViewTransitionInspector.tsx` with complete property controls, diagnostic interceptors, HUD console, and copy utilities.
   - [ ] Add interactive testing & demonstration harness in the app if applicable to verify compilation and runtime behavior.
   - [ ] Verify clean compilation via `compile_applet` and linting via `lint_applet`.

4. **Architecture Decisions**
   - **Non-Invasive API Proxying**: Proxy `document.startViewTransition` and `history.pushState` with original function caching and automatic restore on component unmount, ensuring zero side-effects on the host page.
   - **Dual-Mode Telemetry Capture**: Capture both browser-native View Transition events and Framer-specific attributes (`data-framer-name`, `data-framer-appear-id`, `data-morphine-id`).
   - **Decoupled HUD Overlay**: Render floating console overlay via React Portal into `document.body` or viewport container to avoid parent stacking context and CSS overflow clipping.
   - **Framer Property Controls**: Provide rich controls for Auto-Inspect, Show HUD, Overlay Theme, Log Verbosity, Simulated Transition Type, and Overlay Position.

5. **Pseudo Code**
   ```shade-dsl
   COMPONENT ViewTransitionInspector
     DATA
       props: { autoInspect, showConsoleOverlay, themeMode, captureMutations, position }
       state: { isMounted, activeTransition, logs, selectedLog, inspectTree, isExpanded, simulatorState }
       ref: { originalStartViewTransition, originalPushState, observerRef, hudRef }
       derived: { filteredLogs, formattedJsonTrace, reverseEngineeredReport }
     
     LOGIC
       action initializeInterceptors():
         patch document.startViewTransition with telemetry wrapper
         patch window.navigation / history for route transitions
         observe DOM mutations for [data-framer-name] and [style*="view-transition"]
       
       action captureTransitionLifecycle(phase, details):
         record timestamp, duration, bounding rects, matched pairs
         append to logs with categorised metadata
         update activeTransition state
       
       action triggerSimulatedTransition(type, config):
         execute document.startViewTransition or animateView test morph
         record step-by-step diff and frame timings
       
       action copyToClipboard(format):
         generate JSON trace or Markdown report
         write to navigator.clipboard with visual confirmation toast
       
       effect mountLifecycle:
         if (isClient) initializeInterceptors()
         return () => restoreOriginalAPIs()
     
     RENDER
       div.rootContainer (invisible canvas anchor)
       Portal -> motion.div.consoleOverlayHud:
         header.hudHeader (Title, Status Badge, Minimize/Expand, Clear, Copy Menu)
         div.hudBody:
           div.tabBar (Live Stream, Transition Inspector, DOM Scanner, Reverse-Engineering Guide)
           div.panelContent:
             LiveStream: Event list with filters & micro-details
             TransitionInspector: Phase timeline, Geometry Diff (Old Rect vs New Rect), CSS generated rules
             DOMScanner: Live data-framer tree with matched tags & bounding box overlay
             Simulator: Interactive morph/crossfade test trigger
         footer.hudFooter (Copy Trace JSON, Copy Report, Copy Framer Snippet)
   ```
