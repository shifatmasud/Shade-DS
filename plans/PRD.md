# PRD: Fill Slider Component

## Overview
A custom slider component where the entire track area is interactive and visually represents the value through a "fill" background.

## User Stories
- As a user, I want to drag across the slider area to change its value.
- As a user, I want to see the value animate smoothly as I drag.
- As a user, I want the label and value to be clearly visible inside the slider.

## Functional Requirements
- **Interactive Track**: Clicking and dragging anywhere on the track updates the value.
- **Fill Animation**: The background color should fill from left to right based on the current value.
- **Value Formatting**: Display the value with two decimal places (e.g., "0.70") as seen in the reference.
- **Responsive**: Adapts to the width of its container.

## Non-Functional Requirements
- **Performance**: Zero-rerender logic for drag updates.
- **Design**: Follows `Theme.tsx` grayscale accent palette.
