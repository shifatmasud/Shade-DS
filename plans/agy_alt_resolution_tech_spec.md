# Tech Spec - Antigravity CLI Dynamic Fallback and Touch Terminal Alt Modifier

1. **Objective**
   - **Problem Statement**: 
     - Quota limits fluctuate dynamically on the free tier, meaning even `gemini-3.8-flash-low` could hit resource exhaustion.
     - Users on mobile/touch interfaces have no native physical `Alt` key, which is heavily relied upon in terminal environments and CLI interactive TUIs.
   - **Solution Overview**:
     - **Dynamic Model Fallback**: Implement a pre-flight model scanner that dynamically checks candidate models (`gemini-3.8-flash-low`, `gemini-3.7-flash-low`, `gemini-3.6-flash-low`, `gemini-3.8-flash-medium`, `gemini-3.7-flash-medium`, `gemini-3.5-flash`) at startup and caches the first fully responsive model. Use this cached model by default.
     - **Stateful `Alt` Key Modifier**: Add a stateful `Alt` button to the persistent quick touch bar in the frontend terminal. Clicking it toggles an `isAltActive` state. When active, the next character/key sent will be automatically prefixed with `\x1b` (escape), providing flawless touch parity for Alt key shortcuts.

2. **Success Criteria**
   - The CLI automatically falls back to an alternative active model if `gemini-3.8-flash-low` runs out of quota.
   - The quick touch bar contains an "Alt" button.
   - Toggling the "Alt" button successfully prefixes the next entered command key or character with `\x1b`.

3. **Project Requirements**
   - [ ] Add `findWorkingModel()` scanner logic in `server.ts` to scan candidates on startup and cache the results.
   - [ ] Integrate the cached working model dynamically in all `settings.json` generation and `agy` command executions.
   - [ ] Add an `/api/terminal/working-model` endpoint returning the scanned model.
   - [ ] Add `Alt` to the `QUICK_KEYS_ITEMS` list in `Terminal.tsx`.
   - [ ] Maintain `isAltActive` state in `Terminal.tsx` and prefix sent input with `\x1b` when active.

4. **Architecture Decisions**
   - **Modifying settings dynamically**:
     - Preflight scans run on server startup to avoid overhead during user interactive keystrokes.
     - Overwrites the configuration file with the working candidate immediately.

5. **Pseudo Code**
   ```shade
   data AltState {
     isAltActive: false
   }

   logic ToggleAlt {
     isAltActive = !isAltActive
   }

   logic PrefixInput {
     if (isAltActive) {
       sendInput("\x1b" + input)
       isAltActive = false
     } else {
       sendInput(input)
     }
   }
   ```
