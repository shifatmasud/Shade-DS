# Tech Spec: Fix Antigravity CLI Persistence, GitHub Push Validation, and Touch Text Selection

1. **Objective**
   - **Problem Statement**:
     1. Running `agy` in the terminal outputs `/app/applet/bin/agy: line 59: /app/applet/bin/agy-bin: No such file or directory [exit code 127]`. The Antigravity CLI binary was not persisted or auto-healed after container reboots.
     2. GitHub push / export fails with `Failed to push commit to GitHub: Request contains an invalid argument`. This is caused by massive binary files (e.g. 50MB `bin/gh`, 3.7MB `bin/git`, and binary executables) existing inside the project directory without `.gitignore` coverage, causing the GitHub API / AI Studio Git Commit exporter to reject the tree payload.
     3. Terminal output text is not selectable on touch devices (mobile phones, tablets) because `@xterm/xterm` defaults `.xterm-screen` and `.xterm-rows` to `user-select: none` and disables mobile touch callouts.
   - **Solution Overview**:
     1. Make `agy` 100% persistent and self-healing: (a) Add automatic installer/downloader in `server.ts` and in `/app/applet/bin/agy` wrapper that automatically restores `agy-bin` via the official installer (`curl -fsSL https://antigravity.google/cli/install.sh | bash`) if ever missing; (b) Place the real binary at `/app/applet/bin/agy-bin` and symlink globally.
     2. Fix GitHub push validation: (a) Add binary ignore patterns (`bin/gh`, `bin/git`, `bin/agy-bin`, `*.bin`, `*.exe`, `*.tar.gz`, `*.so`) to `.gitignore`; (b) Store dynamic CLI downloads in persistent system path (`/root/.local/bin`) or ensure `.gitignore` excludes them from Git export trees.
     3. Enable touch device text selection: (a) Inject `-webkit-user-select: text !important`, `user-select: text !important`, and `-webkit-touch-callout: default !important` in `styles.css` for all `.xterm-screen`, `.xterm-rows`, and row `span` elements; (b) Configure xterm viewport touch scrolling and selection properties in `Terminal.tsx`.
   - **Scope**: `bin/agy`, `server.ts`, `.gitignore`, `styles.css`, `components/Page/Terminal.tsx`, and `README.md` changelog.
   - **Context**: Sandboxed container runtime, AI Studio Git exporter, React 19, `@xterm/xterm`, and `Theme.tsx`.

2. **Success Criteria**
   - **Key Results**:
     - `agy` executes cleanly without `file not found` errors, displaying the Antigravity CLI interface and options.
     - `agy` automatically re-installs/recovers if `bin/agy-bin` is deleted or during server startup.
     - `.gitignore` properly excludes large binaries and system archives, preventing GitHub API payload rejection.
     - Terminal output text can be highlighted, selected with touch long-press/drag handles, and copied on mobile and touch devices.
     - `compile_applet` and `lint_applet` pass with zero errors.
   - **Non-Negotiables**:
     - Strict adherence to `Theme.tsx` design tokens.
     - No modifications to protected `Dock.tsx`.
     - Zero unrequested features.

3. **Project Requirements**
   - [ ] Update `/app/applet/bin/agy` with auto-healing installation fallback.
   - [ ] Install and configure genuine `agy` binary at `/app/applet/bin/agy-bin`.
   - [ ] Update `server.ts` to ensure `agy` and `gh` binaries are auto-provisioned without corrupting git tracking.
   - [ ] Update `.gitignore` to ignore all binary executables and archives (`bin/gh`, `bin/git`, `bin/agy-bin`, `*.tar.gz`, `*.bin`, `*.exe`).
   - [ ] Update `styles.css` with touch-friendly text selection rules for xterm DOM elements.
   - [ ] Update `components/Page/Terminal.tsx` to enable seamless touch text selection, right-click/long-press word selection, and touch viewport panning.
   - [ ] Test execution of `agy`, `agy -h`, and verify compilation with `compile_applet`.
   - [ ] Update `README.md` changelog.

4. **Architecture Decisions**
   - **Self-Healing Binary Wrapper**: Wrapping the binary with an auto-installer ensures that even if the container filesystem is ephemeral or reloaded, `agy` installs on first run in seconds without manual intervention.
   - **Git Exclusion of Binary Blobs**: The GitHub API has strict limits on Git Tree and Blob creation (rejecting payloads with large binaries or non-UTF blobs as invalid arguments). Excluding `bin/*` binaries from git while auto-provisioning them in `server.ts` guarantees clean exports.
   - **Universal CSS Touch Selection**: Forcing `user-select: text` on the underlying xterm DOM row nodes restores standard iOS Safari and Android Chrome long-press text selection magnifier and copy menu.

5. **Pseudo Code**
   ```shade
   MODULE AgySelfHealing
   LOGIC: {
     if (!exists(REAL_BIN)) {
       if (exists("/root/.local/bin/agy") && isRealBinary("/root/.local/bin/agy")) {
         copy("/root/.local/bin/agy", REAL_BIN)
       } else {
         exec("curl -fsSL https://antigravity.google/cli/install.sh | bash")
         copy("/root/.local/bin/agy", REAL_BIN)
       }
       chmod(REAL_BIN, 0755)
     }
     exec(REAL_BIN, EXTRA_FLAGS, ARGS)
   }

   STYLE TouchTerminalSelection
   RENDER: {
     ".xterm, .xterm-screen, .xterm-rows, .xterm-rows span": {
       userSelect: "text !important",
       webkitUserSelect: "text !important",
       webkitTouchCallout: "default !important"
     }
     ".xterm-viewport": {
       touchAction: "pan-y !important",
       webkitOverflowScrolling: "touch !important"
     }
   }
   ```
