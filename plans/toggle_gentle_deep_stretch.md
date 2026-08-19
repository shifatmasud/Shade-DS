# Tech Spec - Toggle Gentle Kinetics & Extended Stretch Animation

1. **Objective**
   - **Problem Statement**: The current toggle animation is too rapid and the horizontal stretch, while present, needs to be more pronounced and animated in a gentle, leisurely, and fluid manner so users can distinctly appreciate the organic capsule stretching effect.
   - **Solution Overview**: Increase the horizontal kinetic stretch factor (`scaleX` peak from 1.45 to 1.75) and soften the spring dynamics across the system (`stiffness: 220, damping: 22, mass: 1`) to provide a gentle, graceful glide that showcases the stretch without vertical squash.
   - **Scope**: Target `/components/Core/Toggle.tsx`.
   - **Context**: Shade DSL Core primitives, gentle physical predictability, zero-rerender spring transforms and Framer Motion layout projection.

2. **Success Criteria**
   - The toggle thumb stretches substantially more along the horizontal travel axis (`scaleX` peaks at 1.75 at mid-point x=8px, creating a 28px wide capsule inside the 32px track cavity).
   - Motion is visibly gentle, smooth, and relaxing (lower stiffness, calibrated damping, gentle curve).
   - The active background fill clip-path syncs smoothly with the gentle spring trajectory.
   - Zero vertical squash deformation (`scaleY` remains static at 1).
   - Full type-safety and successful build compilation.

3. **Project Requirements**
   - Update `/components/Core/Toggle.tsx`:
     - Adjust `scaleX` transform: `useTransform(springX, [0, 8, 16], [1, 1.75, 1])`.
     - Update spring configuration: `{ stiffness: 220, damping: 22, mass: 1 }`.
     - Harmonize `<AnimatePresence>` background clip-path spring transition with the gentle spring parameters (`stiffness: 200, damping: 22`).
     - Align thumb layout transition: `transition={{ type: 'spring', stiffness: 220, damping: 22 }}`.

4. **Architecture Decisions**
   - **Extended Capsule Scale Envelope**:
     A `scaleX` multiplier of 1.75 expands the 16px circular thumb to 28px at the midpoint (x=8px). This creates an unmistakably prominent kinetic stretch that comfortably fits within the 32px inner track bounds.
   - **Gentle Fluid Spring Tuning**:
     Lowering stiffness from 450 to 220 extends the transition duration organically, allowing human vision to register the continuous deformation curve from circle -> capsule -> circle while maintaining physical momentum.

5. **Pseudo Code (Shade DSL)**
   ```shade
   COMPONENT Toggle
     DATA
       props: { label: String, isOn: Boolean, onToggle: Function }
       derived: {
         activeColor: theme.Color.Active.Content[1],
         motionX: MotionValue(isOn ? 16 : 0),
         springX: Spring(motionX, { stiffness: 220, damping: 22, mass: 1 }),
         scaleX: Transform(springX, [0, 8, 16], [1, 1.75, 1])
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
                 transition={ type: 'spring', stiffness: 200, damping: 22 }
               ]
           motion.div.thumb [
             layout="size",
             transition={ type: 'spring', stiffness: 220, damping: 22 },
             style={
               ...thumbStyle,
               x: springX,
               scaleX: scaleX,
               originX: 0.5,
               originY: 0.5
             }
           ]
   ```
