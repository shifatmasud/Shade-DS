# ADR - Saturation Standardization for Spatial Rings

## Context
The user requested that the saturation for both the mid and large rings in the color picker be set to 60. This follows a previous reduction and aims for a more muted, professional look.

## Decision
Set the saturation parameter in the `HSLToHex` call for both `ringInner` and `ringOuter` generation loops in `ColorPicker.tsx` to `60`.

## Rationale
- Improves visual balance.
- Reduces color fatigue.
- Aligns with user's specific aesthetic preference.

## Consequences
- The outer ring will appear slightly less vibrant but more integrated with the inner ring.
- Overall UI feel becomes more sophisticated.
