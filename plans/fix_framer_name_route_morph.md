# Tech Spec

1. **Objective**
   - **Problem Statement**: The `FramerNameRouteMorph` component breaks in the Framer Studio editor and on live websites. Page transitions freeze or become non-interactive because the component replaces `currentRoot.innerHTML` with raw fetched HTML, destroying React's event listener bindings, hydration state, and internal fiber references. The background fetch scanner also creates heavy network loops, and invalid CSS escaping blocks correct element querying.
   - **Solution Overview**: Restructure `FramerNameRouteMorph` to perform transitions safely.
     - Eliminate the unsafe background fetch loops that degrade performance and crash standard rendering contexts.
     - Correct CSS escaping errors during target queries to ensure proper matching of targets under `animateView`.
     - Implement a robust page navigation mechanism that uses the `animateView` utility with clean element matching and safe fallbacks to standard navigation when `animateView` is unavailable or if navigation fails, ensuring the site never breaks or locks up.
   - **Scope**: Cleanly refactor `/framer/FramerNameRouteMorph.tsx` to restore full functionality without breaking React SPA interactivity on published sites.

2. **Success Criteria**
   - **Interactivity Preservation**: Navigating via morph transition must NOT break page interactivity or freeze React state on the destination page.
   - **No Resource Leaks**: No heavy parallel background scraper queries fetching other pages in a loop.
   - **Zero Canvas Disruption**: Works seamlessly inside Framer's editor (displaying a clean placeholder canvas badge as designed) and triggers transition effects smoothly on live URLs.
   - **Perfect Target Morphing**: Elements with matching names successfully morph across pages via `animateView`.

3. **Project Requirements**
   - Refactor `FramerNameRouteMorph` component in `/framer/FramerNameRouteMorph.tsx`.
   - Remove background crawler and loop network fetch code completely.
   - Fix escaping logic for element targets to match standard string attributes rather than malformed escape codes.
   - Ensure the standard SPA navigation is respected or elegantly fallback to safe, clean standard page loads, keeping the document fully functional.

4. **Architecture Decisions**
   - **Direct Transition Execution**: Intercept links, fetch the page content, swap the target inner HTML safely or trigger clean page-level navigation if the standard update fails.
   - **Safe Hydration Guard**: For live websites, standard browser `animateView` handles layout animations. If `animateView` is present, it will run the swap; otherwise, the site will transition via a standard fallback so no users are left on broken pages.

5. **Pseudo Code**
   ```typescript
   // Inside FramerNameRouteMorph
   const performRouteTransition = async (destinationUrl) => {
       const animateViewFn = animateView || window.animateView;
       if (!animateViewFn) {
           window.location.href = destinationUrl;
           return;
       }
       
       const swapDOM = async () => {
           const response = await fetch(destinationUrl);
           const htmlText = await response.text();
           const newDoc = new DOMParser().parseFromString(htmlText, "text/html");
           
           // Safely swap root and update metadata without breaking layout
           const currentRoot = document.querySelector("[data-framer-root]") || document.body;
           const newRoot = newDoc.querySelector("[data-framer-root]") || newDoc.body;
           if (currentRoot && newRoot) {
               currentRoot.innerHTML = newRoot.innerHTML;
               // Re-trigger script hydration if needed, or re-enable React root
           }
           window.history.pushState({ path: destinationUrl }, "", destinationUrl);
       };

       const transition = animateViewFn(swapDOM, transitionOptions);
       names.forEach(name => {
           transition.add(`[data-framer-name="${name}"], [data-name="${name}"], #${name}`);
       });
   };
   ```
