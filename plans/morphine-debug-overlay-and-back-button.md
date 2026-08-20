# Tech Spec - Morphine Debug Overlay & Back Button Morphing

1. **Objective**
- **Problem Statement**:
  - Browser Back button clicks do not reliably trigger shared element morphing back to the originating card in list views.
  - Developers need a visual debug overlay to inspect active direction, pair discovery, origin memory, navigation trigger (`click`, `navigate:traverse`, `popstate`), and animation parameters in real-time.
- **Solution Overview**:
  - Enforce explicit `reverse` direction detection for all history traversals (`event.navigationType === "traverse"`, `popstate`, `event.destination.index < nav.currentEntry?.index`).
  - Pass the preserved detail URL and memory context into `tagActiveOriginCardInNewDOM()`.
  - Implement a sleek, interactive, non-intrusive HUD `DebugOverlay` with collapsible drawer, live logs, and transition telemetry.
- **Scope**: `/framer/test/Morphine.tsx`
- **Context**: Standalone Framer Code Component.

2. **Success Criteria**
- **Key Results**:
  - Browser Back button triggers smooth reverse morphing from detail element (`DetailCard`/`DetailImage`) back to the origin card (`Card`/`Image` at index e.g. `product-2`).
  - `showDebugOverlay` toggle in property controls renders a floating HUD with live telemetry (last transition, direction, memory slug, discovered pairs, enter/exit status).
  - Component is 100% standalone, with zero broken imports or Canvas preview regressions.
  - Zero TypeScript or lint errors.

3. **Project Requirements**
- [ ] Add `showDebugOverlay?: boolean` (default `false`) and `debugPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left"` to `MorphineProps` and `addPropertyControls`.
- [ ] Build standalone `DebugOverlay` UI inside `/framer/test/Morphine.tsx` displaying real-time transition state, direction, pairs count, and memory info.
- [ ] Fix browser Back button handling in `handleNavigate` by explicitly checking `event.navigationType === "traverse"` and entry index.
- [ ] Fix `handlePopState` to accurately resolve reverse pairs and tag the incoming origin card in the list DOM.
- [ ] Verify standalone compilation via `compile_applet`.

4. **Architecture Decisions**
- **Navigation API Traversal Interception**:
  - *Decision*: In `handleNavigate`, if `event.navigationType === "traverse"`, compare `event.destination.index` with `nav.currentEntry?.index`. If smaller or returning to list root, force `forcedDir = "reverse"`.
  - *Why*: Browsers fire `navigate` event with `traverse` when the back button is clicked. Accurately determining reverse direction before `animateView` guarantees `tagActiveOriginCardInNewDOM` is executed upon DOM mounting.
- **Floating HUD Debug Overlay**:
  - *Decision*: Render an expandable, sleek HUD pill anchored to viewport corner when `showDebugOverlay` is active.
  - *Why*: Enables instant visual inspection without console switching or external tooling.

5. **Pseudo Code**
```shade
Component Morphine:
  Data:
    showDebugOverlay = props.showDebugOverlay ?? false
    debugTelemetry = state { status, direction, trigger, pairs, memory, lastNavTime }

  Logic:
    On Navigate (event):
      If event.navigationType == "traverse":
        isBack = event.destination.index < nav.currentEntry.index
        forcedDir = isBack ? "reverse" : detectDirection(currentUrl, event.destination.url)
      Else:
        forcedDir = detectDirection(currentUrl, event.destination.url)

      pairs = resolveBidirectionalPairs(fromNames, toNames, null, null, forcedDir, uid)
      updateDebugTelemetry({ trigger: "navigate:" + event.navigationType, direction: forcedDir, pairs })
      
      event.intercept({
        handler: async () => {
          await performViewTransition(pairs, forcedDir, currentUrl, waitForDomChange, uid)
        }
      })

    On PopState (event):
      prevUrl = lastKnownUrl
      targetUrl = window.location.href
      forcedDir = detectDirection(fromNames, toNames, null, null, prevUrl, targetUrl)
      If prevUrl != targetUrl And Not isReverse:
        If depth(targetUrl) < depth(prevUrl) Or containsMemory(prevUrl): forcedDir = "reverse"
      
      pairs = resolveBidirectionalPairs(fromNames, toNames, null, null, forcedDir, uid)
      performViewTransition(pairs, forcedDir, prevUrl, waitForDomChange, uid)

  Render:
    If showDebugOverlay:
      Render DebugOverlay(debugTelemetry)
```
