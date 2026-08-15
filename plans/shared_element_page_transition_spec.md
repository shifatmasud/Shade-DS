# Tech Spec - Shared Element Page Transitions via ScrollSectionRef & animateView

1. **Objective**
   - **Problem Statement**: Standard Framer routing triggers sudden page transitions or full reloads, lacking fluid native-app shared element morphs and choreographed exit/entry animations between pages.
   - **Solution Overview**: Provide a reusable Framer Code Component and reference specification that intercepts navigation, identifies shared elements across pages using Framer's `ControlType.ScrollSectionRef`, morphs shared elements using `animateView(update).add(from, to)`, and animates non-shared content with synchronized fade, blur, and vertical translation without full document reloads.
   - **Scope**: Create the definitive reference documentation in `skills/framer-code-components-overrides/references/shared-element-page-transitions.md`, document `animateView` transition options, `ScrollSectionRef` binding, DOM/History API orchestration, and update the skill index.
   - **Context**: Integrates with Framer's undocumented `ControlType.ScrollSectionRef`, Framer Motion's `animateView`, and Framer Code Component architecture.

2. **Success Criteria**
   - **Key Results**:
     - Comprehensive markdown guide in `skills/framer-code-components-overrides/references/shared-element-page-transitions.md`.
     - Full 6-step transition lifecycle documented with production-ready code examples.
     - Accurate `animateView` syntax for shared element addition (`.add()`), `.old()`, `.new()`, and `ControlType.Transition` integration.
     - Documented `ScrollSectionRef` + `viewport` property controls pattern.
     - Clear SSR/Hydration guards and canvas vs published preview behavior.
   - **Non-Negotiables**:
     - Follow strict Framer Code Component guidelines (`@framerDisableUnlink`, hydration safety, font spread rule).
     - Adhere to AGENTS.md rules and existing skill reference format.

3. **Project Requirements**
   - [x] Create plan in `/plans/shared_element_page_transition_spec.md`.
   - [x] Author `/skills/framer-code-components-overrides/references/shared-element-page-transitions.md`.
   - [x] Update `/skills/framer-code-components-overrides/SKILL.md` to include reference link and Agent Rule.
   - [x] Verify lint / syntax correctness across markdown and TypeScript examples.

4. **Architecture Decisions**
   - **Scroll Section Matching**: Use Framer's `ScrollSectionRef` to bind local canvas sections and correlate them across different routes by target name or data attributes (`data-framer-name`, `data-scroll-section`).
   - **View Transition Engine**: Use Framer Motion's `animateView` API wrapping the DOM update callback, allowing declarative chaining of `.add(from, to)` for shared morphs and `.old()` / `.new()` for non-shared cross-fade, vertical slide, and blur filters.
   - **History & Routing**: Intercept internal link anchors (`<a href="...">`), trigger asynchronous fetch of the destination HTML document, swap page content inside the `animateView` callback, and update history via `window.history.pushState` with `popstate` support.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   DATA
     currentRoute: string = window.location.pathname
     targetRoute: string | null = null
     isTransitioning: boolean = false
     sharedSectionRef: ScrollSectionRef
     transitionConfig: TransitionOptions
     motionParams: {
       exitY: number = 40
       entryY: number = -40
       blurAmount: number = 10
       duration: number = 0.5
       ease: [0.16, 1, 0.3, 1]
     }

   LOGIC
     ON interceptLinkClick(e, destinationUrl) ->
       PREVENT default document reload
       SET isTransitioning = true
       CAPTURE fromElement = querySharedElement(sharedSectionRef)
       FETCH destination DOM tree
       EXECUTE animateView(async () => {
         SWAP current DOM with destination DOM
         UPDATE window.history.pushState
         CAPTURE toElement = querySharedElement(sharedSectionRef)
       })
       .add(fromElement, toElement)
       .old({ opacity: 0, y: motionParams.exitY, filter: `blur(${motionParams.blurAmount}px)` })
       .new({ opacity: 1, y: 0, filter: "blur(0px)" })
       .withOptions(transitionConfig)
       FINALLY -> SET isTransitioning = false

   RENDER
     <PageTransitionWrapper>
       <PropertyControls
         section={ControlType.ScrollSectionRef}
         viewport={ControlType.Enum}
         transition={ControlType.Transition}
         blurAmount={ControlType.Number}
         exitOffset={ControlType.Number}
       />
     </PageTransitionWrapper>
   ```
