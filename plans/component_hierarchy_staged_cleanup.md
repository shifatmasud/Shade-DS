# PRD: Component Hierarchy & Staged Cleanup

## Overview
The goal is to formalize the component hierarchy within the `AGENTS.md` documentation to ensure future AI agents and developers follow a consistent architectural pattern. Additionally, we are enforcing a rule that all selectable components within the "Stage" environment must reside in the `/components/staged/` directory to separate "Blueprint/Inspectable" versions from general-purpose UI elements.

## Objectives
- Update `AGENTS.md` with a clear definition of Core, Package, Section, Page, and App hierarchies.
- Relocate selectable stage components (`NameTag`, `Slot`) from `Package` to `staged`.
- Update the `Stage` component to reflect these changes.

# OKR (Success Criteria)
- `AGENTS.md` contains the new `Component Hierarchy` section.
- `NameTag.tsx` and `Slot.tsx` exist in `/components/staged/`.
- `Stage.tsx` renders `NameTag` and `Slot` from the `staged` directory without errors.
- No dead exports remain in `components/Package/index.tsx`.

# ADR (Architectural Design)
- **Hierarchy Definition**:
    - **App**: Root orchestration and global providers.
    - **Page**: Major views and high-level routing contexts.
    - **Section**: Large structural blocks and persistent layout containers.
    - **Package**: Functional, reusable feature modules grouping multiple components.
    - **Core**: Primitive, atomic building blocks of the design system.
- **Staged Isolation**: Components meant for the stage environment often require additional props (like `layerSpacing`, `view3D`) for inspection. Placing them in `/components/staged/` avoids polluting the core design system with staging-specific logic.

# TODO
- [ ] Update `AGENTS.md`.
- [ ] Move `NameTag.tsx` and `Slot.tsx` to `staged/`.
- [ ] Update imports in `NameTag.tsx` and `Slot.tsx`.
- [ ] Update `components/Package/index.tsx`.
- [ ] Update `components/Section/Stage.tsx`.
