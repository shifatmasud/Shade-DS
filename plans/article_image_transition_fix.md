# Tech Spec - Article Image Transition Overrides

1. **Objective**
   - **Problem Statement**: The current article image transition overrides (`CaptureArticleImageTransition` and `PlayArticleImageTransition`) suffer from two critical issues:
     1. **First-Click Failure**: The play override waits for the destination image to be fully loaded (`complete === true`) and decoded before playing. On the first click of an article, the destination image is not yet cached, resulting in a load delay that exceeds the 1.4-second readiness timeout. This silences the transition entirely, leading to an abrupt snap.
     2. **Intermittent Jitter**: Bounding rectangles are computed in viewport-relative coordinates (`getBoundingClientRect()`). During route changes, layout reflows, and active scrolling, these coordinates shift dynamically relative to the viewport. This constantly resets the coordinate stability tracker (`stableFrames`), causing transition delays and visible alignment jitter. Additionally, `position: fixed` overlays do not track page scrolls during the active transition, causing the morphing element to float away from its actual layout target.
   - **Solution Overview**: 
     - **Document-Relative Coordinates**: Convert all coordinate tracking (both source capture and destination layout matching) to document-relative space (`rect.left + window.scrollX`, `rect.top + window.scrollY`). This keeps coordinate stability checks independent of scrolling and layout reflows.
     - **Absolute Positioning**: Render the overlay with `position: absolute` directly on the document body, locking it to page scroll mechanics so it never diverges or jitters.
     - **Fuzzy URL Matching**: Strip responsive query parameters (like `?width=...` or `?scale-down-to=...`) when comparing image URLs, ensuring the system matches the source and destination images correctly.
     - **Non-Blocking Execution**: Begin the transition immediately once target layout coordinates are stable, using the already cached source image in the overlay, without waiting for the destination image's `complete` or `decode` state.
     - **Active Route Synchronization**: Run the player effect whenever the URL path or key component props change, maintaining a `lastPlayedUrl` ref to ensure seamless multi-navigation support.
   - **Scope**: Implement these high-performance enhancements within a standalone file `/framer/ArticleImageTransition.tsx` to enable flawless CMS shared-image transitions.

2. **Success Criteria**
   - **Instant Transitions**: The transition starts immediately within 2 frames of layout stability on the destination page, regardless of cache state.
   - **Zero Scroll Jitter**: The morphing image tracks page scrolls perfectly during the transition animation without any offset drift.
   - **100% Matching Accuracy**: CMS images with different responsive sizes match perfectly via base URL comparison.
   - **Navigation Continuity**: Navigating forward, backward, and clicking different articles in sequence plays the transition correctly every time.

3. **Project Requirements**
   - Create `/framer/ArticleImageTransition.tsx` containing the optimized `CaptureArticleImageTransition` and `PlayArticleImageTransition` overrides.
   - Strip query parameters from responsive image URLs during matching.
   - Convert all coordinates to document-relative (`left + scrollX`, `top + scrollY`).
   - Cleanly release animation resources and restore element opacities on transition completion or component unmount.

4. **Architecture Decisions**
   - **Stand-alone Modular File**: Place both overrides in `/framer/ArticleImageTransition.tsx` to keep them clean, modular, and easily importable.
   - **Framer Motion WAAPI Interop**: Use standard Web Animations API (WAAPI) for smooth hardware-accelerated animations of the standalone overlay clone, bypassing any React fiber remount delays.

5. **Pseudo Code (Shade DSL)**
   ```
   DATA
     snapshot:
       src: string
       pageX: number
       pageY: number
       width: number
       height: number
       fit: string
       radius: string
       ts: number

   LOGIC
     action getBaseUrl(url: string):
       return url.split('?')[0]

     action getDocumentRelativeRect(el: HTMLElement):
       rect = el.getBoundingClientRect()
       return {
         left: rect.left + window.scrollX,
         top: rect.top + window.scrollY,
         width: rect.width,
         height: rect.height
       }

     action playTransition(target, snapshot):
       overlay = document.createElement('img')
       overlay.src = snapshot.src
       overlay.style.position = 'absolute'
       overlay.style.left = snapshot.pageX + 'px'
       overlay.style.top = snapshot.pageY + 'px'
       overlay.style.width = snapshot.width + 'px'
       overlay.style.height = snapshot.height + 'px'
       
       destRect = getDocumentRelativeRect(target.el)
       deltaX = destRect.left - snapshot.pageX
       deltaY = destRect.top - snapshot.pageY
       scaleX = destRect.width / snapshot.width
       scaleY = destRect.height / snapshot.height

       target.el.style.opacity = '0'

       animate(overlay, {
         transform: ['translate3d(0px, 0px, 0px) scale(1,1)', 'translate3d(deltaX, deltaY, 0) scale(scaleX, scaleY)'],
         borderRadius: [snapshot.radius, target.radius]
       }, 460)

       animate(target.el, { opacity: [0, 1] }, 220, delay 280)
   ```
