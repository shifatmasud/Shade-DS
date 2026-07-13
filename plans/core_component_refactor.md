# PRD: Core Component Optimization & Sub-Component Extraction

## Overview
Refactor the `/components/Core` directory to align with strictly modular, single-responsibility guidelines. This involves identifying "Nested Core Components" (sub-components used by other core components), extracting them to a dedicated `/components/Core/sub-components/` directory, and moving composite components to `/components/Package/`.

## OKR (Success Criteria)
- **Zero Broken Imports**: All components should correctly resolve imports after relocation.
- **Hierarchy Clarity**: `/components/Core/` only contains top-level UI primitives. `/components/Core/sub-components/` contains internal building blocks and specialized primitives like `DockIcon`.
- **Guideline Adherence**: Core components are dependency-light and focus on a single UI problem.

## ADR (Architectural Design)
- **Sub-components Directory**: `/components/Core/sub-components/` will be established for atomic layers, icons, and specialized items used internally or in specific sections.
- **Composite Relocation**: `ApiInput` will move to `/components/Package/` as it's a functional unit combining multiple primitive controls and business logic (saved state).
- **Import Strategy**: Components inside `Core` will import from `./sub-components/` instead of `./`. The `Core/index.tsx` will still export them if they are considered useful outside, but the internal coupling will be isolated.

## TODO List
1. [ ] Create `/components/Core/sub-components/` directory.
2. [ ] Move the following files to `/components/Core/sub-components/`:
   - `AnimatedCheckIcon.tsx`
   - `AnimatedCounter.tsx`
   - `DoubleLayeredText.tsx`
   - `RippleLayer.tsx`
   - `StateLayer.tsx`
   - `SuccessLayer.tsx`
   - `DockIcon.tsx`
3. [ ] Update internal imports for the moved components:
   - `AnimatedCopyIcon.tsx`: Update `AnimatedCheckIcon` import.
   - `Button.tsx`: Update `StateLayer`, `RippleLayer`, `SuccessLayer`, `AnimatedCheckIcon` imports.
   - `LogEntry.tsx`: Update `DoubleLayeredText` import.
   - `RangeSlider.tsx`: Update `AnimatedCounter` import.
   - `ApiInput.tsx`: Update `AnimatedCheckIcon` import.
4. [ ] Move `ApiInput.tsx` to `/components/Package/`.
5. [ ] Update `/components/Core/index.tsx`:
   - Remove `ApiInput` export.
   - Update paths for moved sub-components (if still exported).
6. [ ] Update `/components/Package/index.tsx`:
   - Export `ApiInput`.
7. [ ] Update `ControlPanel.tsx` to import `ApiInput` from `../Package/ApiInput.tsx`.
8. [ ] Update `Dock.tsx` to import `DockIcon` from `../Core/sub-components/DockIcon.tsx`.
9. [ ] Verify with `npm run lint` or `compile_applet`.
