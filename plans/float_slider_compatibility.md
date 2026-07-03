# PRD: Floating Point Slider Compatibility

## Overview & Objectives
The goal is to upgrade the application's slider components to support floating point numbers robustly. Currently, `RangeSlider` and `AnimatedCounter` are biased towards integers, which limits their use for fine-grained controls (e.g., opacity, scale, frequency).

## Success Criteria (OKR)
- `RangeSlider` supports a `step` prop (e.g., `0.1`, `0.01`).
- `RangeSlider` input field and tooltip display correct decimal values.
- `FillSlider` handles floating point precision errors (no more `0.30000000000000004`).
- `AnimatedCounter` can display decimal points and animating decimal digits.
- The system remains high-performance (zero-rerender motion where applicable).

## Architectural Design (ADR)

### 1. Robust Precision Utility
We need a way to handle `0.1 + 0.2` without binary floating point drift.
A helper function `clampedStep(value, step, min, max)` will be used:
```typescript
const precision = step.toString().split('.')[1]?.length || 0;
const stepped = Math.round(value / step) * step;
return parseFloat(stepped.toFixed(precision));
```

### 2. AnimatedCounter Decimals
`AnimatedCounter` will be updated to:
- Accept a `decimals` prop.
- Split the value string into integer and fractional parts.
- Render the `.` character as a static separator.
- Dynamically manage `Digit` components for the fractional part.

### 3. RangeSlider Enhancements
- Add `step` prop (default `1`).
- Update `updateValueFromPointer` to use the precision helper.
- Update `handleInputChange` and `handleCommit` to use `parseFloat` instead of `parseInt`.
- Pass `decimals` to `AnimatedCounter` based on the `step`.

### 4. FillSlider Refinement
- Improve the `steppedValue` calculation to avoid precision jitter.

## TODO List
- [ ] Update `AnimatedCounter.tsx` to support `decimals` and floating point numbers.
- [ ] Update `RangeSlider.tsx` to support `step` prop and decimal inputs.
- [ ] Refine `FillSlider.tsx` precision logic.
- [ ] Verify functionality across all components.
