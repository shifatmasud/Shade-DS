---
name: vite-dependency-repair
description: Debugging and repairing Vite import-analysis errors, missing package entrypoints, and corrupted node_modules installations.
---

# Vite Dependency Repair Guidance

This skill helps agents diagnose, debug, and resolve dependency resolution errors in Vite projects (e.g., `[plugin:vite:import-analysis] Failed to resolve entry for package`).

## Problem Diagnosis

When Vite complains that it cannot resolve package entrypoints or modules:
1. **Locate the target package**: Look up the package name mentioned in the Vite log (e.g., `framer-motion`, `phosphor-react`).
2. **Inspect package.json inside node_modules**:
   - Navigate to `node_modules/<package-name>/package.json` to inspect the `exports`, `main`, or `module` properties.
   - Example: If `"module": "dist/es/index.mjs"` is defined, check if `dist/es/index.mjs` actually exists in the local file system.
3. **Identify corruption**:
   - If files specified in the package config are missing (e.g., empty directories, missing `.mjs` or sub-esm files), the local `node_modules` installation is corrupted.
   - This often happens when `npm install` is interrupted or packages are cached incorrectly.

## Repair Protocol

Do not rely on standard `npm install` or `npm install --force` when directory structures are partially populated, as npm might falsely report that packages are up-to-date based on the lockfile.

Instead, execute the following clean repair:

1. **Terminate running servers**: Kill any active dev preview tasks (e.g., `npm run dev`) before making filesystem changes.
2. **Remove node_modules cleanly**:
   - On Windows: Run `Remove-Item -Recurse -Force node_modules` in PowerShell.
   - On Unix/macOS: Run `rm -rf node_modules`.
3. **Reinstall dependencies**:
   - Run `npm install` to recreate the directory structure cleanly.
4. **Boot and verify**:
   - Run the development server (e.g., `npm run dev`) and monitor the Vite pre-bundling process to verify that dependencies resolve without issue.
