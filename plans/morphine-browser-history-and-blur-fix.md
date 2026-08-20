# Tech Spec - Morphine Browser Back/Forward Support & Blur Burst Elimination

1. **Objective**
- **Problem Statement**:
  1. Browser front/back button navigation does not trigger Morphine's view transitions or reverse morphing.
  2. A secondary "burst of blur" occurs after the new page animation finishes due to re-entrant transition triggers.
- **Solution Overview**:
  1. Implement universal history traversal detection via `popstate` and `navigation` event handlers with history index / depth tracking and `OriginMemory` integration.
  2. Implement a global navigation transition lock and cooldown mechanism to eliminate secondary transition triggers, ensuring no animation runs after enter finishes.
  3. Drive all root crossfades and shared element morphing strictly through Framer Motion's `animateView`.
- **Scope**: Standalone component in `/framer/test/Morphine.tsx`.
- **Context**: Framer CMS collections, project cards, and fluid page transitions.

2. **Success Criteria**
- **Key Results**:
  - Browser Back and Forward buttons seamlessly trigger bidirectional view transitions and reverse shared element morphing.
  - Exactly one enter animation runs; zero post-morph blur burst, snap, or secondary transition occurs after enter finishes.
  - Full touch and mouse interaction parity.
  - Standalone build compiles cleanly with zero errors.

3. **Project Requirements**
- [x] Document Root Cause Analysis in `/RCA/rca-browser-back-and-blur-burst.md`.
- [x] Create Tech Spec in `/plans/morphine-browser-history-and-blur-fix.md`.
- [ ] Implement history traversal listeners (`popstate` and `navigate`) in `/framer/test/Morphine.tsx`.
- [ ] Implement global transition lock and cooldown to eliminate post-enter blur bursts.
- [ ] Verify standalone compilation via `compile_applet`.

4. **Architecture Decisions**
- **Universal History Traversal via Popstate & Navigation API**:
  - *Decision*: Listen to `popstate` on `window` and coordinate with `window.navigation` without blocking empty handlers.
  - *Why*: Ensures browser Back/Forward buttons work across all browsers (Chrome, Safari, Firefox, iOS, Edge) while preserving Framer's router lifecycle.
- **Global Navigation Lock & Cooldown**:
  - *Decision*: Maintain a global navigation timestamp and lock state to ignore synthetic or trailing router events within 400ms of transition completion.
  - *Why*: Completely eliminates secondary transition triggering and the resulting post-enter blur burst.

5. **Pseudo Code**
```shade
Component Morphine:
  Data:
    globalLock = window.__MORPHINE_LOCK__
    historyIndex = window.history.state?.morphineIndex ?? 0
    blurPx = props.blurAmount ?? 20

  Logic:
    On Popstate (event):
      If globalLock.isBusy: Return
      newIndex = event.state?.morphineIndex ?? (historyIndex - 1)
      direction = newIndex < historyIndex ? "reverse" : "forward"
      historyIndex = newIndex

      pairs = resolveBidirectionalPairs(fromNames, toNames, null, null, direction, uid)
      If hasDiscovered(pairs):
        performViewTransition(pairs, direction, async () => {
          await waitForDOMUpdate()
          If direction == "reverse":
            tagActiveOriginCardInNewDOM(memory, targetFromNames, window.location.href, uid)
          Else:
            tagForwardDestinationElements(targetToNames, uid)
        })

    On Link Click (event):
      If globalLock.isBusy: Return
      globalLock.lock()
      historyIndex++
      pushStateWithIndex(historyIndex)
      
      performViewTransition(pairs, direction, async () => {
        await navigate(targetUrl)
      })
      .finally(() => {
        globalLock.unlockWithCooldown(350)
      })

  Render:
    <div style={{ display: "none" }} data-framer-name="MorphineController" />
```
