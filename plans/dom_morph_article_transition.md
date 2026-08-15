# Tech Spec - DOM Morphing with Framer Motion & animateView

1. **Objective**
   - **Problem Statement**: The current `framer/ArticleImageTransition.tsx` performs an image-only morph (`img morph`). It queries `<img />` or `backgroundImage` elements and animates a single `HTMLImageElement` overlay. When users click an article card containing text, badges, backgrounds, buttons, and media, only the image moves while the surrounding card container and typography abruptly disappear or pop in.
   - **Solution Overview**: Transition to full **DOM Morphing** (`dom morph`) powered by Framer Motion and the `animateView` API (Motion's View Transition API wrapper) with fallback to deep DOM clone & computed-style interpolation:
     1. **`animateView` DOM Matching**: Leverage `animateView(update, transition).add(fromElement, toElement)` to animate real DOM nodes and their child hierarchies (text, background, radius, padding, media) with zero layout disruption.
     2. **Gentle Fluid Smooth Motion**: Replace rigid linear timing with physical spring dynamics (`type: "spring", duration: 0.7, bounce: 0.12`) or gentle cubic-bezier curve (`cubic-bezier(0.16, 1, 0.3, 1)`), applying Framer Motion's Fluid Motion Suite to eliminate snapping.
     3. **Full Node Hierarchy Capture**: When capturing in Framer overrides across separate page loads / routes, capture the root interactive card node (and its visual children) or link them via shared `view-transition-name` / `layoutId`.
     4. **Aspect Ratio & Nested Radius Handling**: Apply `crop(false)` for text elements so typography reflows gracefully without clipping, and interpolate nested border-radii dynamically.
   - **Scope**: Define the technical architecture for DOM Morphing in `framer/ArticleImageTransition.tsx`, supporting both `animateView` View Transitions and standalone Framer canvas/runtime overrides.

2. **Success Criteria**
   - **Full Element Morphing**: The entire DOM container (background, border, shadow, text, and media) morphs seamlessly into the destination article layout, not just the image.
   - **Gentle Fluid Motion**: Motion feels tactile, organic, and physically predictable (no snap, no abrupt jumps, stable scroll anchor).
   - **Text & Content Parity**: Text headers and labels scale and slide with mask transitions rather than harsh resizing.
   - **Standalone Framer Compatibility**: 100% self-contained code component/override with zero external internal project dependencies, compatible with Framer Canvas and SSR/Hydration guards.

3. **Project Requirements**
   - [ ] Implement `animateView` integration for supported browsers with graceful DOM update execution.
   - [ ] Upgrade `CaptureArticleImageTransition` to `CaptureArticleDOMTransition` to snapshot container geometry, computed typography, background fills, and child hierarchy.
   - [ ] Upgrade `PlayArticleImageTransition` to `PlayArticleDOMTransition` to animate container frames, typography cross-slide, and media layout smoothly using Framer Motion.
   - [ ] Add spring/gentle fluid configuration options (`bounce`, `stiffness`, `damping`, `duration`).
   - [ ] Implement scroll-agnostic document coordinate tracking.

4. **Architecture Decisions**
   - **`animateView` First with Autonomous DOM Clone Fallback**:
     - *Primary Path*: If supported and within SPA view update cycle, use `animateView(update).add(sourceCard, destArticle).layout({ type: "spring", bounce: 0.15, duration: 0.7 })`.
     - *Cross-Page Fallback*: If executing across standard multi-page Framer URL navigation, use the standalone parasitic DOM overlay clone that mirrors the entire card DOM tree and applies Framer Motion physics.
   - **Framer Motion WAAPI / Motion Value Spring Dynamics**:
     - Use Framer Motion's spring solver (`damping: 28, stiffness: 220, mass: 0.8`) for a natural, tactile feel.
   - **Typography De-Clipping (`crop(false)`)**:
     - Decouple text layers from strict overflow clipping to allow readable font size transitions without letter stretching.

5. **Pseudo Code (Shade DSL)**
   ```
   DATA
     domSnapshot:
       html: string
       tagName: string
       docX: number
       docY: number
       width: number
       height: number
       styles:
         backgroundColor: string
         borderRadius: string
         boxShadow: string
         color: string
         fontSize: string
         padding: string
       ts: number

   LOGIC
     action captureDOM(event):
       targetCard = findNearestContainer(event.target)
       styles = getComputedStyle(targetCard)
       rect = targetCard.getBoundingClientRect()
       
       saveSnapshot({
         html: targetCard.innerHTML,
         tagName: targetCard.tagName,
         docX: rect.left + window.scrollX,
         docY: rect.top + window.scrollY,
         width: rect.width,
         height: rect.height,
         styles: extractKeyStyles(styles),
         ts: now()
       })

     action playDOMTransition(destinationTarget, snapshot):
       if (hasAnimateView && isViewTransitionSupported):
         // Framer Motion native View Transition morph
         animateView(() => updateDestinationDOM(), {
           type: "spring",
           bounce: 0.12,
           duration: 0.72
         })
         .add(snapshot.element, destinationTarget)
         .crop(false)
       else:
         // Autonomous DOM Clone Layer with Framer Motion Spring
         destRect = getDocumentRelativeRect(destinationTarget)
         overlay = createDOMCloneOverlay(snapshot)
         document.body.appendChild(overlay)
         
         destinationTarget.style.opacity = 0
         
         animate(overlay, {
           left: [snapshot.docX, destRect.left],
           top: [snapshot.docY, destRect.top],
           width: [snapshot.width, destRect.width],
           height: [snapshot.height, destRect.height],
           borderRadius: [snapshot.styles.borderRadius, destRect.borderRadius],
           backgroundColor: [snapshot.styles.backgroundColor, destRect.backgroundColor]
         }, {
           type: "spring",
           damping: 26,
           stiffness: 200,
           mass: 0.85
         }).then(() => {
           destinationTarget.style.opacity = 1
           overlay.remove()
         })
   ```
