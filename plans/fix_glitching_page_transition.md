# Tech Spec - Fix Glitching Page Transition

1. **Objective**
   The objective is to fix the glitching page transitions in the `ArticleTransition` component (`/framer/ArticleImageTransition.tsx`). 
   Currently, during both exit and entry transitions, the whole page container is animated with blur and opacity filters. Since the morphing card is nested inside the page container, it is also blurred and faded, interrupting the smooth morphing animation and causing a noticeable visual glitch.
   The solution must ensure that the blur & opacity page transition is applied to the whole page *except* the morphing elements, keeping the morphing elements sharp and clear during the transition.

2. **Success Criteria**
   - The exit transition blurs and fades out the outgoing page, but the clicked card (morph source) remains perfectly sharp and clean.
   - The entry transition blurs and fades in the incoming page, but the morphing card (morph target) remains perfectly sharp and clean.
   - There are no overlapping double-rendered cards, and everything is correctly cleaned up after transition completion or route changes.
   - Seamless and smooth transition without any visual jumping, clipping, or glitching on mobile and desktop.

3. **Project Requirements**
   - **Exit Transition Isolation**:
     - When capturing the exit snapshot, clone the clicked element (`candidate.imageEl`) and append it to `document.body` with a specific attribute `data-view-transition-exit-clone="true"`.
     - Hide the original element in the DOM using `visibility: "hidden"` so it doesn't double-render or get blurred.
     - Animate the rest of the page (`pageTarget`) with opacity and blur. The clone on `document.body` remains unaffected.
   - **Entry Transition Isolation**:
     - Remove any pre-existing exit clones on mount.
     - Use `animateView`'s native `.old()` and `.new()` page snapshot animation methods to fade and blur the incoming/outgoing views. Because the morphing element is registered with `.add(fromElement, toElement)`, the browser automatically extracts it into an isolated pseudo-element group, exempting it from the page-level blur & opacity transitions.
     - Remove manual DOM level `animate(pageTarget, ...)` which causes nesting filter glitches.

4. **Architecture Decisions**
   - **Exemption via View Transition API Extraction**:
     By utilizing `animateView().old().new()` instead of manual DOM-level container animation, we leverage the browser's native View Transition API behavior where elements with a `view-transition-name` (assigned via `.add()`) are completely extracted from the root page snapshots. This achieves perfect isolation of the morph element without complex CSS masking.
   - **Direct Body-Cloning on Exit**:
     For the exit transition, because the browser has not yet navigated, we cannot use `animateView` yet. Cloning the clicked element directly to `document.body` and hiding the original inside the page container ensures the card stays completely sharp and visible while the rest of the page fades and blurs out.

5. **Pseudo Code**

   *Exit Capture (in `captureCandidateSnapshot`)*:
   ```ts
   // Clone element and place on body to exempt from page blur/opacity
   const originalEl = candidate.imageEl;
   if (originalEl && pageTarget) {
       const cloned = originalEl.cloneNode(true) as HTMLElement;
       const rect = originalEl.getBoundingClientRect();
       cloned.setAttribute("data-view-transition-exit-clone", "true");
       cloned.style.position = "absolute";
       cloned.style.left = `${rect.left + window.scrollX}px`;
       cloned.style.top = `${rect.top + window.scrollY}px`;
       cloned.style.width = `${rect.width}px`;
       cloned.style.height = `${rect.height}px`;
       cloned.style.margin = "0";
       cloned.style.boxSizing = "border-box";
       cloned.style.zIndex = "2147483647";
       cloned.style.pointerEvents = "none";
       document.body.appendChild(cloned);
       
       originalEl.style.visibility = "hidden";
   }
   ```

   *Clean up exit clones*:
   ```ts
   const removeExitClones = () => {
       document.querySelectorAll("[data-view-transition-exit-clone]").forEach(el => {
           el.parentNode?.removeChild(el);
       });
   };
   ```

   *Morph Execution (in `executeMorphWithAnimateView`)*:
   ```ts
   removeExitClones();
   
   const viewTransition = animateView(update, transitionOptions)
       .add(fromElement, toElement)
       .old({
           opacity: 0,
           filter: "blur(20px)"
       }, transitionOptions)
       .new({
           opacity: [0, 1],
           filter: ["blur(20px)", "blur(0px)"]
       }, transitionOptions);
   ```
