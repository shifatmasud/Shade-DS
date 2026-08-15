# Tech Spec: Framer Motion animateView Shared Element Page Transitions & Parasitic Binding

1. **Objective**
   - **Problem Statement**: Standard page navigations in Framer (e.g. from `demo.framer.website` to `demo.framer.website/blog/new-item`) either produce abrupt re-renders or require heavy external state frameworks. When moving between a card on a home page and a detailed item on a blog sub-route, designers need a fluid shared element morph animation on key elements, while all non-shared canvas elements smoothly crossfade, blur, and slide up.
   - **Solution Overview**: Provide an authoritative reference and drop-in Framer Code Component / Code Override architecture leveraging Framer Motion's `animateView()` API combined with the Parasitic DOM Binding pattern (`useHost` hierarchy traversal: `parent`, `grandparent`, `shared-parent`, `sibling`).
   - **Scope**: Document the complete `animateView` API semantics, browser URL/DOM/History orchestration, parasitic discovery, `ControlType.Transition` integration, and full copy-pasteable production implementations.
   - **Context**: Integrates into the `/skills/framer-code-components-overrides/references/` skill set.

2. **Success Criteria**
   - **Key Results**: Comprehensive reference markdown file detailing exact `animateView` mechanics, `.add(fromEl, toEl)`, `.old()`, `.new()`, transition configurations, parasitic binding modes, and browser routing integration.
   - **Non-Negotiables**:
     - Strict adherence to Framer property controls (`ControlType.Transition`, `ControlType.Enum`, `ControlType.String`, `ControlType.Boolean`).
     - Hydration-safe patterns (`isClient` guard, SSR-safe DOM access).
     - Accurate coordinate & layer hierarchy handling for view transition snapshots.
     - Pure single-file portability for Framer Canvas compatibility.

3. **Project Requirements**
   - [x] Analyze `animateView`, `parasitic-dom-binding`, and `framer-code-components-overrides` guidelines.
   - [ ] Author `/skills/framer-code-components-overrides/references/animateview-shared-element-transitions.md` with complete API syntax, architecture diagram, parasitic binding integration, DOM/URL/History routing recipes, and full TypeScript Code Component.
   - [ ] Update `/skills/framer-code-components-overrides/SKILL.md` to index the new reference guide.

4. **Architecture Decisions**
   - **animateView over manual FLIP**: `animateView` leverages modern browser View Transitions while providing fine-grained spring/tween easing and snapshot customization (`.old()`, `.new()`, `.add()`).
   - **Parasitic Traversal**: Using `useHost` with configurable binding modes (`grandparent`, `sharedParent`, `sibling`, `custom-selector`) decouples the animation trigger from rigid canvas hierarchy.
   - **History & SPA Interception**: Intercepts link clicks or programmatic navigation, updates URL/DOM within the `animateView(update)` callback, and synchronizes browser history.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   MODULE SharedElementTransitionController
     DATA:
       bindMode: Enum("parent", "grandparent", "shared-parent", "sibling", "selector")
       sharedSelector: String("[data-shared-element]")
       targetUrl: String("/blog/new-item")
       transition: TransitionConfig(type: "spring", stiffness: 350, damping: 32)
       blurAmount: Number(8)
       slideDistance: Number(24)

     LOGIC:
       HOOK useParasiticHost(bindMode) -> targetNode
       ON targetNode.click OR routeTrigger:
         CAPTURE fromElement <- targetNode.querySelector(sharedSelector)
         INVOKE animateView(async () => {
           AWAIT navigateTo(targetUrl)
           CAPTURE toElement <- document.querySelector(sharedSelector)
         }, transition)
           .add(fromElement, toElement)
           .old({ opacity: 0, filter: `blur(${blurAmount}px)`, y: -slideDistance })
           .new({ opacity: 1, filter: "blur(0px)", y: 0 })

     RENDER:
       INJECTOR_CONTAINER(width: 0, height: 0, visibility: "hidden")
   ```
