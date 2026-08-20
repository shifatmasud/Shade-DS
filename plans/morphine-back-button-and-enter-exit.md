# Tech Spec - Morphine Back Button Morph & Enter/Exit Animation Control

1. **Objective**
- **Problem Statement**:
  - Browser Back button clicks fail to morph back into the originating list card (`product-2`), only executing the page-level fade/blur animation.
  - When `enableEnterExit` is set to `false`, fade/blur and root view transition crossfades must be completely disabled, matching the clean behavior of `/framer/Morphine.tsx`.
- **Solution Overview**:
  - Track `lastKnownUrl` so `popstate` accurately detects reverse transitions from detail back to list, invokes `resolveBidirectionalPairs(..., "reverse")`, and calls `tagActiveOriginCardInNewDOM()` with the previous detail URL.
  - When `enableEnterExit: false`, suppress root crossfades using `::view-transition-old(root), ::view-transition-new(root) { animation: none !important; }` and omit all `animation.old()` / `animation.new()` calls.
- **Scope**: `/framer/test/Morphine.tsx`
- **Context**: Standalone Framer Component for shared-element view transitions and page morphing.

2. **Success Criteria**
- **Key Results**:
  - Clicking browser Back button from a detail page cleanly morphs the detail card/image/title back into the exact originating card in the list (e.g. `product-2`).
  - When `enableEnterExit: false`, there is zero blur, zero fade, and zero crossfade on the surrounding page—only the pure shared element morphs.
  - When `enableEnterExit: true`, the fade & blur animations execute smoothly alongside shared element morphing.
  - Zero build or TypeScript errors.

3. **Project Requirements**
- [ ] Implement `lastKnownUrl` state tracking to preserve the previous page URL during `popstate`.
- [ ] Update `detectNavigationDirection` and `handlePopState` to evaluate `lastKnownUrl` against `memory.slug` and route depth.
- [ ] Connect `tagActiveOriginCardInNewDOM` with `lastKnownUrl` on `popstate` reverse transitions.
- [ ] Suppress browser default root crossfade and omit `animation.old()` / `animation.new()` when `enableEnterExit === false`.
- [ ] Verify standalone compilation via `compile_applet`.

4. **Architecture Decisions**
- **Explicit History URL Cache**:
  - *Decision*: Maintain `lastKnownUrl` module-level and window-level reference, updated upon every page load, click navigation, and transition completion.
  - *Why*: In browser history pops, `window.location.href` is mutated before JS event listeners run. Comparing `lastKnownUrl` with incoming `window.location.href` provides unambiguous direction detection and reliable slug extraction for `tagActiveOriginCardInNewDOM`.
- **Root View Transition Reset Injection**:
  - *Decision*: Inject `::view-transition-old(root), ::view-transition-new(root), ::view-transition-group(root) { animation: none !important; }` whenever `enableEnterExit === false`.
  - *Why*: Browsers automatically apply a default 250ms opacity crossfade to the root snapshot unless explicitly disabled with `animation: none`.

5. **Pseudo Code**
```shade
Component Morphine:
  Data:
    lastKnownUrl = window.location.href
    memory = getStoredOriginMemory()
    enableEnterExit = props.enableEnterExit ?? true
    blurAmount = props.blurAmount ?? 20

  Logic:
    Function isReverseNavigation(fromUrl, toUrl):
      If memory And memory.slug:
        If fromUrl contains memory.slug And Not toUrl contains memory.slug:
          Return True
      If getPathDepth(toUrl) < getPathDepth(fromUrl):
        Return True
      Return False

    On PopState (event):
      If isBusy(): Return
      
      prevUrl = lastKnownUrl
      targetUrl = window.location.href
      lastKnownUrl = targetUrl
      
      isReverse = isReverseNavigation(prevUrl, targetUrl)
      direction = isReverse ? "reverse" : "forward"
      
      uid = generateUID()
      pairs = resolveBidirectionalPairs(fromNames, toNames, null, null, direction, uid)
      If Not hasDiscovered(pairs): Return
      
      performViewTransition(pairs, direction, prevUrl, async () => {
        await waitForDomChange(350)
      }, uid)

    Function performViewTransition(pairs, direction, currentUrlBeforeNav, performNavigation, uid):
      animation = animateView(async () => {
        await performNavigation()
        If direction == "reverse":
          tagActiveOriginCardInNewDOM(memory, fromNames, currentUrlBeforeNav, uid)
        Else If direction == "forward":
          tagForwardDestinationElements(toNames, uid)
      }, transition)
      
      If enableEnterExit:
        animation.old(exitKeyframes(blurAmount))
        animation.new(enterKeyframes(blurAmount))
      
      pairs.forEach(pair => animation.add(pair.fromTarget, pair.toSelector))
      await animation.finished
```
