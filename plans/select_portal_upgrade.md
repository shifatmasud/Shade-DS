# PRD: Select Component Portal Upgrade

## 1. Overview
The `Select` component currently renders its dropdown menu as a direct child of its container. This can lead to visual clipping when the `Select` is placed inside a container with `overflow: hidden` or `overflow: auto` (like an Accordion or a Scrollable Panel).

## 2. Objectives
- Migrate the `Select` dropdown to use a React Portal.
- Ensure the dropdown correctly aligns with the trigger button.
- Maintain existing animations and styling.
- Ensure responsiveness and position updates on scroll/resize.

## 3. Success Criteria (OKR)
- **Objective**: Improve UI robustness of the `Select` component.
  - **KR1**: Dropdown is rendered at the end of the `<body>` (or designated portal root).
  - **KR2**: Dropdown position is calculated dynamically and stays anchored to the trigger.
  - **KR3**: Zero regression in visual appearance or interaction logic.

## 4. Architectural Design (ADR)
- **Pattern**: React Portals.
- **Positioning**: Fixed positioning based on `getBoundingClientRect()`.
- **Syncing**: Recalculate position on `isOpen` state change and on window `scroll`/`resize`.

## 5. TODO
- [ ] Import `createPortal`.
- [ ] Implement `useRect` hook or inline positioning logic.
- [ ] Update `styles.overlay` for fixed positioning.
- [ ] Wrap `AnimatePresence` or its content in `createPortal`.
- [ ] Verify functionality.
