# PRD: Text Counter Custom Separators

## Overview & Objectives
The `TextCounter` Framer component currently hardcodes the decimal separator as `.` and depends on `toLocaleString` for thousands separators, which makes it inflexible for different locales or custom formatting needs. The goal is to allow users to explicitly define both decimal and thousands separators.

## OKR (Success Criteria)
- [ ] `TextCounter` accepts `decimalSeparator` and `thousandsSeparator` props.
- [ ] The component correctly parses initial text containing these custom separators.
- [ ] The component formats the animated counter using the specified separators.
- [ ] Transition between different number lengths (e.g., adding/removing thousands separators) remains smooth.

## ADR (Architectural Design)
- **Props**: Add `decimalSeparator` and `thousandsSeparator` to the component props and Framer property controls.
- **Parsing**: Update the `discover` effect to use the `decimalSeparator` for splitting integer and decimal parts. Update the `countTarget` inference to handle custom separators (e.g., stripping the thousands separator before parsing).
- **Formatting**: Replace the `toLocaleString` logic in `formatValue` with a manual formatting function that respects the custom separators.
- **Stability**: Ensure `getTracks` continues to use stable keys for digits based on their position from the right, excluding non-digit characters from the position calculation if necessary? 
    - Actually, the current `posFromRight` includes non-digit indices in the calculation for the key `char-idx`, but for `digit-posFromRight` it uses `chars.length - 1 - idx`.
    - If a thousand separator is added, `chars.length` increases, which shifts the `posFromRight` for all digits to the left of the new separator.
    - Wait, if `chars.length` is 3 (`999`), `9` at index 0 is `digit-2`.
    - If `chars.length` is 5 (`1,000`), `1` at index 0 is `digit-4`. `0` at index 2 is `digit-2`.
    - So `digit-2` stays `digit-2`. This is correct! The position from the right *of the string* works because we want the "ones" column to always be `digit-0`.
    - However, if the thousands separator is at a fixed position from the right (e.g. every 3 digits), its `char-idx` key might not be stable if we use `idx`.
    - `char-${idx}` uses the index from the LEFT. If `1,000` becomes `10,000`, the comma at index 1 (`char-1`) stays at index 2 (`char-2`) in `10,000`? No, `10,000` is index 2.
    - We should probably use `char-posFromRight` for separators too to keep them stable relative to the digits.

## TODO list
- [ ] Modify `TextCounter.tsx` props and `addPropertyControls`.
- [ ] Update `discover` logic for parsing.
- [ ] Update `formatValue` logic for formatting.
- [ ] Update `getTracks` to use stable keys for non-digit characters.
- [ ] Update `AnimatedCounter.tsx` to support custom separators for consistency.
- [ ] Verify with a few test cases (e.g., `1.234,56` and `1 000.00`).
