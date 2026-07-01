# PRD: FillSlider Enhancement & Counter Formatting

## Goal
Improve the visual feedback of the `FillSlider` component and refine the formatting of the `AnimatedCounter`.

## Requirements
1. **Vertical Thumb for FillSlider**:
   - Add a thin vertical line thumb to the `FillSlider`.
   - The thumb must appear on **hover**, **tap** (pointer down), and **drag**.
   - The thumb height must be **80%** of the slider track's height.
   - The thumb must follow the fill edge perfectly.
2. **Remove "0.n" Prefix in AnimatedCounter**:
   - The slider currently displays a hardcoded `0.` prefix in its default formatting.
   - Remove this prefix to show the value more cleanly as requested.

## Constraints
- Use **JS Style objects** (no Tailwind).
- Use **Framer Motion** for all animations and interactive states.
- Follow the **Shade DSL** architecture (DATA, LOGIC, RENDER).
- Adhere to the **Variant Style System** (base, variant, size).
