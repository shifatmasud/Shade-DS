# Tech Spec - Antigravity CLI (`agy`) Hang Debug & Model Quota Resolution

1. **Objective**
   - **Problem Statement**: Executing `agy` in the interactive web TUI terminal returns nothing, hanging indefinitely on startup.
   - **Solution Overview**: 
     - The default model `gemini-3.7-flash-medium` in `settings.json` is experiencing a 429 RESOURCE_EXHAUSTED free tier quota-exceeded state with a high retry backoff.
     - Go's standard library SDK in the `agy` binary enters an exponential retry wait state when hitting 429s with retry delays, resulting in zero stdout output on startup (no banner, no prompt).
     - Resolving this requires updating the system-wide default model to `gemini-3.8-flash-low`, which is fully operational, fast, and has ample free quota in this environment.
     - Additionally, clean up the multiple stale background `agy` orphan processes that accumulated during previous runs to free up VM resources.
   - **Scope**: Modifying `server.ts` to transition the default model from `gemini-3.7-flash-medium` to `gemini-3.8-flash-low`, updating any existing `settings.json` configs, and terminating stale orphan processes.

2. **Success Criteria**
   - No stale `/app/applet/.bin/agy` processes remain running under PPID 1.
   - Standard execution of `agy` (without any explicit model flags) starts up instantly.
   - The interactive web TUI displays the Antigravity prompt and output immediately.
   - Subcommands like `agy models` and `agy -h` function properly.

3. **Project Requirements**
   - [ ] Terminate all orphaned `agy` processes (`killall agy` or `pkill -f agy` on non-server processes).
   - [ ] Edit `server.ts` to replace `"gemini-3.7-flash-medium"` with `"gemini-3.8-flash-low"`.
   - [ ] Programmatically overwrite `/root/.gemini/antigravity-cli/settings.json` with the new default model configuration on startup and on command run.
   - [ ] Verify that `agy` successfully prints the prompt and responds to input.

4. **Architecture Decisions**
   - **Alternative**: Forcing `--model gemini-3.8-flash-low` on all terminal runs.
     - **Trade-off**: Rejected because passing global flags to subcommands like `agy models` or `agy -h` triggers a Go flag parsing error.
   - **Chosen Alternative**: Overwriting the central `settings.json` file.
     - **Benefit**: Ensures clean configuration-level defaults, preserving the ability to run all subcommands flawlessly without command-level flag injection.

5. **Pseudo Code**
   ```shade
   data SettingsModel {
     modelProvider: "gemini"
     defaultModel: "gemini-3.8-flash-low"
     toolPermission: "always-proceed"
     autoExecPolicy: "always-proceed"
   }

   logic SyncSettings {
     let path = "/root/.gemini/antigravity-cli/settings.json"
     writeJson(path, SettingsModel)
   }
   ```
