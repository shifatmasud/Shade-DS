# Tech Spec - Toggle Framer Motion Layout Size & Kinetic Stretch

1. **Objective**
   - **Problem Statement**: The toggle stretch animation was too subtle to be visually perceptible during fast state transitions. The user requested using Framer Motion `layout="size"` and making the kinetic stretch clearly noticeable while in-between the ON and OFF states without vertical squash.
   - **Solution Overview**: Integrate Framer Motion's `layout="size"` prop on the toggle thumb motion component and enhance the horizontal kinetic stretch transform curve (`scaleX: [1, 1.45, 1]`) with tuned spring physics (`stiffness: 450, damping: 26, mass: 0.8`) so the thumb visibly elongates into an elastic capsule mid-flight and smoothly snaps back to a circle upon settling.
   - **Scope**: `/components/Core/Toggle.tsx`.
   - **Context**: Shade DSL Core primitives, Framer Motion fluid layout projection and zero-rerender spring pipelines.

2. **Success Criteria**
   - `<motion.div>` thumb uses `layout="size"` for hardware-accelerated layout projection.
   - The stretch animation is distinctly noticeable and tactile during the transit phase between 0 and 16px.
   - Thumb maintains constant vertical height (no Y-squash distortion).
   - Instant visual clarity in both Light and Dark theme modes with snappy spring physics.
   - Code compiles cleanly with zero TypeScript / build errors.

3. **Project Requirements**
   - Update `/components/Core/Toggle.tsx`:
     - Apply `layout="size"` prop to the thumb `<motion.div>`.
     - Enhance `scaleX` transform range to `[0, 8, 16] -> [1, 1.45, 1]` for prominent, visible horizontal elongation.
     - Tune spring configuration (`stiffness: 450, damping: 26, mass: 0.8`) for optimal transit velocity and fluid settling.
     - Retain `originX: 0.5, originY: 0.5` for balanced expansion.
     - Maintain existing sound triggers (`playSound('toggle')`) and background clipPath transitions.

4. **Architecture Decisions**
   - **Framer Motion `layout="size"` Integration**:
     Leveraging `layout="size"` instructs Framer Motion's projection engine to perform layout transform interpolation, ensuring smooth render compositing during rapid user toggling.
   - **Kinetic Scale Curve Amplification**:
     Increasing peak `scaleX` from 1.25 (which produced only ~4px delta) to 1.45 (~7.2px delta) creates a distinct, recognizable capsule-stretch silhouette without clipping against the track padding (track width: 40px, padding: 4px, thumb: 16px).

5. **Pseudo Code (Shade DSL)**
   ```shade
   COMPONENT Toggle
     DATA
       props: { label: String, isOn: Boolean, onToggle: Function }
       derived: {
         activeColor: theme.Color.Active.Content[1],
         motionX: MotionValue(isOn ? 16 : 0),
         springX: Spring(motionX, { stiffness: 450, damping: 26, mass: 0.8 }),
         scaleX: Transform(springX, [0, 8, 16], [1, 1.45, 1])
       }
     LOGIC
       effect: [
         on(isOn) -> motionX.set(isOn ? 16 : 0)
       ]
       event: [
         onTrackClick -> { playSound('toggle'); onToggle(); }
       ]
     RENDER
       div.wrapper [style={ display: flex, justifyContent: space-between, alignItems: center, width: 100% }]
         label.text [style={ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2] }]
           {label}
         motion.div.track [style={ trackStyle }, onClick: onTrackClick]
           AnimatePresence [mode="popLayout"]
             if isOn:
               motion.div.activeBg [
                 key="active-bg",
                 initial={ clipPath: 'inset(0 100% 0 0)' },
                 animate={ clipPath: 'inset(0 0% 0 0)' },
                 exit={ clipPath: 'inset(0 0 0 100%)' },
                 transition={ type: 'spring', stiffness: 300, damping: 30 }
               ]
           motion.div.thumb [
             layout="size",
             transition={ type: 'spring', stiffness: 450, damping: 26 },
             style={
               ...thumbStyle,
               x: springX,
               scaleX: scaleX,
               originX: 0.5,
               originY: 0.5
             }
           ]
   ```
