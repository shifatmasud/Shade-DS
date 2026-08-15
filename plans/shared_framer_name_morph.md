# Tech Spec - Framer Name Route Morph Component

1. **Objective**
   - **Problem Statement**: Standard route navigation in Framer published sites destroys and remounts DOM elements abruptly. When navigating between pages (e.g. from an index page card to a detail page hero), elements with the same semantic identity (e.g., named layers like "Hero", "MediaCard", "NavbarLogo") unmount and remount without continuity, creating a disjointed user experience.
   - **Solution Overview**: Create a persistent Framer Code Component (`framer/FramerNameRouteMorph.tsx` or `framer/SharedFramerNameMorph.tsx`) designed to live inside Framer's shared layout template. The component monitors internal route navigations (intercepting `<a>` clicks and `popstate`), targets matching elements using their `data-framer-name` attribute across route transitions, and executes a smooth layout morph using Framer Motion's `animateView` API while crossfading non-shared content.
   - **Scope**: Supports targeting single or multiple elements by `data-framer-name`, configurable transition physics (springs, duration, stiffness, damping), non-shared page exit/entry choreography (Y slide, opacity, Gaussian blur), aspect-ratio cropping control, SSR hydration safety, and Framer Canvas editor badge.
   - **Context**: Integrates with Framer's DOM tree structure (`[data-framer-name="..."]`) and Framer Motion's `animateView` runtime API.

2. **Success Criteria**
   - **Key Results**:
     - Seamless layout morphing between elements sharing the same `data-framer-name` across page routes.
     - Single-page navigation experience without browser reloads on internal link clicks.
     - Controlled entrance/exit transitions for non-shared page elements (fade, slide, blur).
     - Graceful degradation in environments where `animateView` or View Transitions are unsupported.
     - Zero SSR hydration mismatches or canvas editor interference.
   - **Non-Negotiables & Criteria**:
     - Must include required Framer annotations (`@framerDisableUnlink`, `@framerIntrinsicWidth`, `@framerIntrinsicHeight`).
     - Must use `addPropertyControls` for Framer Property Inspector configuration.
     - Must guard browser API usage (`window`, `document`, `DOMParser`, `fetch`) behind `isClient` hydration check.
     - Must ignore external links (`http(s)://` outside origin), modifier clicks (`cmd`, `ctrl`, `shift`), `target="_blank"`, and non-HTTP protocols (`mailto:`, `tel:`).
     - Must adhere to AGENTS.md rules: JS style objects (no Tailwind), Framer Motion integration, and Theme token compatibility.

3. **Project Requirements**
   - [ ] Create detailed plan spec in `/plans/shared_framer_name_morph.md`.
   - [ ] Implement `framer/FramerNameRouteMorph.tsx` with annotations and property controls.
   - [ ] Build element matching system for single or comma-separated `data-framer-name` targets with `CSS.escape()`.
   - [ ] Implement client-side route interception (`click` and `popstate` event listeners).
   - [ ] Implement async HTML fetching and DOM swapping pipeline using `DOMParser`.
   - [ ] Integrate Motion `animateView(swapDOM, transition)` chain builder:
     - `.add(fromEl, toEl)` for morphing matched elements
     - `.crop(cropEnabled)` for aspect ratio handling
     - `.old(...)` and `.new(...)` for non-shared layout crossfading
   - [ ] Provide fallback execution paths for browsers lacking View Transitions.
   - [ ] Implement Framer Canvas editor preview UI (`RenderTarget.current() === RenderTarget.canvas`).
   - [ ] Verify compilation and linting via `compile_applet`.

4. **Architecture Decisions**
   - **Data-Framer-Name Querying**: Framer automatically outputs `data-framer-name="LayerName"` attributes on DOM containers created in the editor. Target matching using `[data-framer-name="${CSS.escape(name)}"]` allows designers to specify morph targets directly in the Framer layer panel without custom code overrides or manual element IDs.
   - **Layout Template Persistence**: Placing this component in Framer's global layout template ensures it remains mounted across route changes, maintaining active navigation listeners and transition registry state.
   - **Motion `animateView` API**: Leverages the browser View Transition API with Motion's spring solver, interruption queueing, aspect-ratio cropping, and element grouping capabilities.
   - **DOM Parsing SPA Bridge**: Intercepts internal anchor clicks, fetches destination page markup, parses the new root (`[data-framer-root]`), updates document title, and executes `window.history.pushState` within the `animateView` update callback.
   - **Two-Phase Hydration & Canvas Guarding**: Uses `isClient` state to prevent SSR window access, and disables route hijacking inside the Framer Canvas (`RenderTarget.current() === RenderTarget.canvas`), rendering an informative control badge instead.

5. **Pseudo Code (Shade DSL)**

```
COMPONENT FramerNameRouteMorph

DATA
  props:
    framerName: string ("0" or "Hero, MediaCard")
    selectorMode: string ("exact" | "contains" | "multiple")
    transition: TransitionConfig ({ type: "spring", stiffness: 300, damping: 30 })
    exitOffset: number (40)
    entryOffset: number (-40)
    blurAmount: number (8)
    crop: boolean (true)
    enablePageCrossfade: boolean (true)

  state:
    isClient: boolean (false)
    isNavigating: ref<boolean> (false)

  derived:
    isOnCanvas: RenderTarget.current() === RenderTarget.canvas
    targetNames: array of string derived from framerName split by comma

LOGIC
  action resolveTargetElement(doc: Document | HTMLElement, name: string):
    query = '[data-framer-name="' + CSS.escape(name) + '"]'
    return doc.querySelector(query) as HTMLElement

  action swapDOM(newDoc: Document, url: string):
    currentRoot = document.querySelector('[data-framer-root]') || document.body
    newRoot = newDoc.querySelector('[data-framer-root]') || newDoc.body
    currentRoot.innerHTML = newRoot.innerHTML
    document.title = newDoc.title
    window.history.pushState({ path: url }, '', url)
    window.scrollTo(0, 0)

  action performTransition(destinationUrl: string):
    if isNavigating.current return
    isNavigating.current = true

    // Capture outgoing elements
    outgoingMap = Map of (name -> element)
    for name in targetNames:
      el = resolveTargetElement(document, name)
      if el: outgoingMap.set(name, el)

    // Fetch incoming page HTML
    response = fetch(destinationUrl)
    htmlText = response.text()
    newDoc = DOMParser().parseFromString(htmlText, 'text/html')

    // Prepare animateView pipeline
    swapCallback = () => swapDOM(newDoc, destinationUrl)
    if window.animateView:
      anim = window.animateView(swapCallback, transition)
      
      // Match and add paired elements
      for (name, fromEl) in outgoingMap:
        toEl = resolveTargetElement(document, name) // re-queried after swap
        if toEl:
          anim.add(fromEl, toEl)

      anim.crop(props.crop)

      if props.enablePageCrossfade:
        anim.old({ opacity: 0, y: props.exitOffset, filter: 'blur(' + props.blurAmount + 'px)' })
        anim.new({ opacity: 1, y: 0, filter: 'blur(0px)' })

      await anim.finished
    else:
      await swapCallback()

    isNavigating.current = false

  event handleAnchorClick(e: MouseEvent):
    anchor = e.target.closest('a')
    if validInternalLink(anchor):
      e.preventDefault()
      performTransition(anchor.href)

  effect mountListeners():
    if !isClient || isOnCanvas return
    document.addEventListener('click', handleAnchorClick, capture)
    window.addEventListener('popstate', handlePopState)
    cleanup listeners on unmount

RENDER
  STYLE canvasBadge:
    display: isOnCanvas ? "flex" : "none"
    alignItems: "center"
    justifyContent: "space-between"
    padding: "8px 14px"
    borderRadius: "8px"
    background: "rgba(0, 153, 255, 0.08)"
    border: "1px dashed rgba(0, 153, 255, 0.4)"
    color: "#0099ff"
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"

  SEMANTIC HTML JSX TAGS:
    div.container [style=canvasBadge]
      span.icon "✦"
      span.title "Framer Name Morph Target: {props.framerName}"
      span.badge "{props.enablePageCrossfade ? 'Crossfade ON' : 'Crossfade OFF'}"
```
