# Root Cause Analysis: Whitescreen Issue

## 1. Problem Description
- **Symptom**: Application displays a blank whitescreen on load.
- **Environment**: Deployed development URL.
- **Severity**: Critical (App non-functional).

## 2. Evidence Collection
- **Lint Logs**: `tsc` reported property access errors in `ControlPanel.tsx`.
- **Code Inspection**: `ControlPanel.tsx` was accessing `theme.Type.Label.M`, but `Theme.tsx` defines it as `theme.Type.Readable.Label.M`.
- **Runtime Behavior**: In React, accessing a property on `undefined` (like `theme.Type.Label.M` where `Label` is undefined) inside a component's render cycle without an `ErrorBoundary` kills the entire application render.

## 3. Root Cause
The `ControlPanel` component, which is rendered by default in `lean` UI mode on the `Home` page, contained typography token typos. These typos caused an immediate runtime crash upon initialization.

## 4. Fix Applied
- **File**: `/components/Package/ControlPanel.tsx`
- **Change**: Updated all typography accesses to use the correct `theme.Type.Readable` or `theme.Type.Expressive` nesting.
- **Safety Addition**: 
  - Created `GlobalErrorFallback.tsx`.
  - Wrapped the application root in `ErrorBoundary` in `index.tsx`.
- **Verification**: 
  - `npm run lint` passed.
  - `npm run build` executed successfully.
  - No other incorrect typography patterns found in source via `grep`.

## 5. Prevention & Lessons Learned
- **Architecture**: A top-level `ErrorBoundary` is now in place to handle runtime crashes gracefully.
- **Tooling**: CI/CD should block deployments on linting failures.
- **Design System**: Strict adherence to the `Theme.tsx` token structure is required.
