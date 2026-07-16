# Props-Driven Animation

## Concept

Treat incoming props as reactive animation state.

Whenever a prop changes, React reruns effects (or the animation engine's
equivalent hook), which imperatively updates the visual state.

```
External Controller
(Parent / Framer / Store / Timeline)

          │
          ▼

      Component Props

(progress, opacity, scale...)

          │
          ▼

 React detects changes

          │
          ▼

 Animation Hook

(useEffect / useLayoutEffect / useGSAP)

          │
          ▼

 Animation Engine

(GSAP / Framer Motion / Anime.js)

          │
          ▼

      Animated DOM
```

---

# Why

Separate responsibilities.

| Responsibility | Owner |
|---------------|-------|
| Animation State | Parent / Framer / Store |
| Change Detection | React |
| Animation | Animation Engine |
| Rendering | React |

---

# Rules

## DO

- Treat props as animation state.
- Animate from prop changes.
- Keep rendering declarative.
- Keep animation imperative.
- Separate animation from rendering.
- Detect transitions using previous values.
- Prefer engine-native hooks when available.

---

## DON'T

Don't mirror props into local animation state.

```tsx
const [progress, setProgress] = useState(props.progress) ❌
```

Don't animate during render.

```tsx
return gsap.to(...) ❌
```

Don't let multiple sources own animation state.

---

# Generic Pattern

```tsx
function Component({ progress }) {

    const ref = useRef(null)

    useEffect(() => {
        animate(ref.current, progress)
    }, [progress])

    return <div ref={ref} />
}
```

---

# Transition Detection

Store previous values when animation depends on crossing thresholds.

```tsx
const previous = usePrevious(progress)
```

Example

```
100 → 20

No fade

20 → 2

Fade Out

2 → 80

Fade In
```

---

# Engine Implementations

## GSAP

Prefer `useGSAP()` from `@gsap/react` over `useEffect()` or
`useLayoutEffect()` whenever possible.

Benefits

- Automatic cleanup
- Context-safe animations
- Reverts animations on unmount
- Built for React

```tsx
useGSAP(() => {
    gsap.to(ref.current, {
        x,
        opacity,
    })
}, [x, opacity])
```

Use `useEffect()` only for non-GSAP side effects.

---

## Framer Motion

```tsx
useEffect(() => {
    animate(scope.current, {
        x,
        opacity,
    })
}, [x, opacity])
```

---

## Anime.js

```tsx
useEffect(() => {
    anime({
        targets: ref.current,
        x,
        opacity,
    })
}, [x, opacity])
```

---

# Best Use Cases

- SVG drawing
- Scroll progress
- Cursor interactions
- Gesture feedback
- State transitions
- Timelines
- Playback controls
- Interactive design systems
- Framer Property Controls
- Audio visualization

---

# Benefits

- Single source of truth
- Predictable behavior
- Reusable components
- Parent-controlled animations
- Engine-independent architecture
- Easy debugging
- Clean separation of responsibilities

---

# Mental Model

Think of props as animation commands.

```
Parent / Framer

        │

progress = 40

        │

React detects change

        │

Animation engine animates

        │

DOM updates smoothly
```

React never performs the animation.

The animation engine owns interpolation.

The component simply reacts to changing props.

---

# Agent Rule

Treat props as the single source of truth for animation. Components MUST react to prop changes and translate them into imperative animation engine calls instead of managing animation state internally. Use engine-native hooks like `useGSAP` whenever available.
