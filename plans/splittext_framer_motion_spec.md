# Tech Spec 

1. **Objective**
Integrate GSAP `SplitText` plugin dynamically loaded via esm.sh to handle high-fidelity text splitting (lines, words, chars) with automatic mask creation (`overflow: hidden`), and use Framer Motion's imperative `animate` engine to run the entrance and scroll-based slide animations in `framer/TextMaskSlide.tsx`.

- **GSAP SplitText** will handle the complex text-parsing, line-wrapping calculations, and nested DOM restructuring.
- **Framer Motion** will drive 100% of the visual animations, transitions, and timing delays (absolutely no GSAP tweens, and no CSS keyframes).
- **Two-phase rendering** and robust fallback systems will ensure server-side rendering (SSR) safety and graceful degradation on reduced motion preferences.

2. **Success Criteria**
- No manual text splitting logic (remove standard `splitElementText` function).
- Sibling text-splitting and wrapping are handled cleanly by importing GSAP and SplitText from CDN:
  ```typescript
  import { gsap } from "https://esm.sh/gsap"
  import { SplitText } from "https://esm.sh/gsap/SplitText"
  ```
- SplitText is registered successfully on the client side:
  ```typescript
  if (typeof window !== "undefined") {
      gsap.registerPlugin(SplitText)
  }
  ```
- Animations are driven entirely using Framer Motion's `animate(...)` function on the parsed elements.
- Reverting/cleaning up text split structures is handled cleanly via `SplitText.revert()` during component unmount or property updates.
- Double-split mask strategy (child text element inside a parent mask with `overflow: hidden`) is executed flawlessly across `lines`, `words`, and `chars`.
- Visual performance is perfect, with zero layout shift during transitions and full compatibility with window resizing.

3. **Project Requirements**
- [x] Create technical specification plan in `/plans/splittext_framer_motion_spec.md`.
- [ ] Read and inspect `/framer/TextMaskSlide.tsx` imports and lifecycle.
- [ ] Implement GSAP and SplitText registration.
- [ ] Replace manual split algorithm with twin-layered `SplitText` split (child elements inside parent mask elements).
- [ ] Set up proper style bounds (`overflow: hidden`, `display`, `verticalAlign`) for parent mask wrappers and child elements.
- [ ] Connect the resulting inner elements to the Framer Motion `animate` runner.
- [ ] Implement clean lifecycle management (`revert()` on unmount, updates, resize).
- [ ] Run `compile_applet` and `lint_applet` to ensure zero compilation or linter warnings.

4. **Architecture Decisions**
- **Double Split Technique**: Using `SplitText` twice on the same element allows wrapping each individual split unit (character, word, line) in its own inline-block mask container. By animating the child elements relative to their hidden-overflow parents, we can achieve flawless masking reveals across all axis directions.
- **Revert and Re-split Lifecycle**: Upon any prop changes affecting the layout/split (like `splitMode`), we revert existing splits in the correct order (parent first, then child) and re-split. This prevents memory leaks and nesting corruption.
- **Resizing Resilience**: Sibling line-splitting is recalculation-heavy on window resizing. We debounced line recalculations on resize and automatically run `revert()` and `split()` to maintain accurate line bounds under all screen sizes.

5. **Pseudo Code**

```typescript
// Imports & Registration
import { gsap } from "https://esm.sh/gsap"
import { SplitText } from "https://esm.sh/gsap/SplitText"

if (typeof window !== "undefined") {
    gsap.registerPlugin(SplitText)
}

// Inside React Component
const splitInstancesRef = useRef<{ child: any; parent: any } | null>(null)

function revertSplit() {
    stopActiveControls()
    if (splitInstancesRef.current) {
        splitInstancesRef.current.parent?.revert()
        splitInstancesRef.current.child?.revert()
        splitInstancesRef.current = null
    }
}

function splitAndAnimate(targetState, immediate) {
    const sibling = findSiblingTextElement(containerRef.current)
    if (!sibling) return

    revertSplit()

    // 1. Split text into target mode (inner animated spans)
    const childSplit = new SplitText(sibling, {
        type: splitMode,
        wordsClass: "split-word-inner",
        charsClass: "split-char-inner",
        linesClass: "split-line-inner",
    })

    // 2. Split again to wrap each unit in parent mask wrapper
    const parentSplit = new SplitText(sibling, {
        type: splitMode,
        wordsClass: "split-word-outer",
        charsClass: "split-char-outer",
        linesClass: "split-line-outer",
    })

    splitInstancesRef.current = { child: childSplit, parent: parentSplit }

    const childElements = childSplit[splitMode]
    const parentElements = parentSplit[splitMode]

    // 3. Style the wrappers
    childElements.forEach(el => {
        el.style.display = "inline-block"
    })

    parentElements.forEach(el => {
        el.style.display = splitMode === "lines" ? "block" : "inline-block"
        el.style.overflow = "hidden"
        el.style.verticalAlign = "bottom"
        el.style.lineHeight = "inherit"
    })

    // 4. Drive animations with Framer Motion on childElements
    const newControls = childElements.map((el, index) => {
        // compute initial and target coordinates
        // run animate(el, targetValues, transitionConfig)
    })
    activeControlsRef.current = newControls
}
```
