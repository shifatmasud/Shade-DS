# Tech Spec - Toggle Kinetic Stretch Animation (Remove Squash)

1. **Objective**
   - **Problem Statement**: The current `Toggle` component (`/components/Core/Toggle.tsx`) applies both a horizontal stretch (`scaleX: [1, 1.25, 1]`) and a vertical squash (`scaleY: [1, 0.75, 1]`) to the thumb during on/off state transitions. The vertical squashing distorts the thumb geometry and conflicts with design intent.
   - **Solution Overview**: Remove the vertical squash deformation (`scaleY`) while preserving the kinetic horizontal stretch (`scaleX`) that interpolates during motion across the track.
   - **Scope**: Target `/components/Core/Toggle.tsx` directly, eliminating `scaleY` transform while maintaining spring physics and track clip-path transitions.
   - **Context**: Shade DSL atomic core components suite adhering to Theme token standards and Framer Motion zero-rerender transforms.

2. **Success Criteria**
   - The toggle thumb stretches horizontally along its travel trajectory (X-axis) between on and off states (`[0, 8, 16] -> [1, 1.25, 1]`).
   - The toggle thumb does not squash vertically (Y-axis remains constant at scale 1 without height distortion).
   - Zero layout shifts, maintaining fluid spring motion and audio trigger intact.
   - All TypeScript compilation and lint validations pass cleanly.

3. **Project Requirements**
   - Update `/components/Core/Toggle.tsx`:
     - Remove `scaleY` motion value transform (`useTransform(springX, [0, 8, 16], [1, 0.75, 1])`).
     - Remove `scaleY` binding from thumb `<motion.div>` style declaration.
     - Retain `scaleX` for horizontal kinetic stretch during transition.
     - Ensure clean type-safety and code formatting.

4. **Architecture Decisions**
   - **Kinetic Directional Stretch**:
     Directional elongation along the axis of movement (X) communicates velocity and momentum in fluid UI systems. Removing orthogonal compression (Y squash) prevents visual deformation of the circular thumb geometry while keeping the elastic feel.
   - **Zero-Rerender Spring Pipeline**:
     Continue driving `scaleX` directly through `useTransform(springX, ...)` to ensure compositor-level execution without React component re-renders during motion.

5. **Pseudo Code (Shade DSL)**
   ```shade
   COMPONENT Toggle
     DATA
       props: { label: String, isOn: Boolean, onToggle: Function }
       derived: {
         activeColor: theme.Color.Active.Content[1],
         motionX: MotionValue(isOn ? 16 : 0),
         springX: Spring(motionX, { stiffness: 400, damping: 30, mass: 1 }),
         scaleX: Transform(springX, [0, 8, 16], [1, 1.25, 1])
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
                 initial={ clipPath: 'inset(0 100% 0 0)' },
                 animate={ clipPath: 'inset(0 0% 0 0)' },
                 exit={ clipPath: 'inset(0 0 0 100%)' },
                 transition={ type: 'spring', stiffness: 300, damping: 30 }
               ]
           motion.div.thumb [
             style={
               ...thumbStyle,
               x: springX,
               scaleX: scaleX,
               originX: 0.5,
               originY: 0.5
             }
           ]
   ```
