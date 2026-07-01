# ADR: Fill Slider Architecture

## Status
Proposed

## Context
The user requested a "Fill Slider" component with rounded corners and an animated number display. The visual reference shows a integrated UI where the label and value sit inside the slider track, which itself fills up.

## Decision
1. **Structural Layout**: We will use a main container `div` that acts as the track. This container will have `overflow: hidden` and `borderRadius`.
2. **Fill Layer**: A `motion.div` will be placed inside the container, positioned absolutely at the left, with its `width` controlled by a `MotionValue`.
3. **Content Layer**: The label ("Scale") and the value ("0.70") will be placed in a separate flex container on top of the fill layer to ensure they remain legible and centered regardless of the fill width.
4. **Value Display**: We will use the existing `AnimatedCounter` component. Since the reference shows "0.70", we will map a 0-1 `MotionValue` to a 0-100 scale for the counter, and potentially modify or wrap it to show the decimal format if strictly required, or use it for the percentage.
    - *Correction*: `AnimatedCounter` rounds values. To get "0.70", we can pass `motionValue.get() * 100` and display it as "0.XX". However, `AnimatedCounter` is built for integers. I'll pass the value as 0-100 and maybe show it as a percentage or scale.

## Rationale
- Using `MotionValue` for width and value display ensures zero-rerender performance during drags.
- Absolute positioning the content over the fill layer is the most robust way to achieve the "integrated" look of the reference.

## Alternatives Considered
- Standard `input type="range"`: Hard to style to match the "fill" look where content is inside the track.
- SVG-based slider: Overkill for this simple rectangular design.
