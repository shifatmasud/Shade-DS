# Tech Spec - Terminal PTY Runner EACCES Resolution and Resilient Bash Fallback

1. **Objective**
   - **Problem Statement**: Executing commands in the interactive web shell (e.g. `npx tsx scripts/spawnAgents.ts`) resulted in `[Shell execution error: spawn python3 EACCES] [exit code -13]` because `server.ts` attempted to spawn `python3` for `pty_runner.py` when `python3` path resolution or permissions threw `EACCES`.
   - **Solution Overview**:
     1. Ensure `scripts/pty_runner.py` has executable permissions (`chmod 0o755`).
     2. Add automatic, resilient fallback in `server.ts`: if `python3` spawn fails with `EACCES`, `ENOENT`, or any spawn error, automatically fallback to `/bin/bash` with `-c`.
     3. Ensure `PATH` in `server.ts` includes `/usr/bin`, `/bin`, `/usr/local/bin`, and proper binary paths without path shadowing.
     4. Resolve `python3` path explicitly (checking `/usr/bin/python3`, `/usr/local/bin/python3`, `which python3`) before attempting PTY spawn.
   - **Scope**: `server.ts`, `scripts/pty_runner.py`.

2. **Success Criteria**
   - **Key Results**:
     - `npx tsx scripts/spawnAgents.ts` and all shell commands execute cleanly in the interactive terminal without `EACCES` error.
     - Resilient error handling gracefully recovers from any PTY spawn issues by executing with `/bin/bash`.
     - Applet compiles and lints with zero errors.
   - **Non-Negotiables**:
     - No regression on interactive terminal commands, SSE stream, or background processes.

3. **Project Requirements**
   - [x] Create plan in `/plans/`.
   - [x] Set chmod 755 on `scripts/pty_runner.py`.
   - [x] Implement robust spawn resolution and automatic `/bin/bash` fallback in `server.ts`.
   - [x] Verify applet build and lint.
   - [x] Restart dev server to apply `server.ts` changes.

4. **Architecture Decisions**
   - **Decision**: In `server.ts`, if `spawn(spawnFile, ...)` encounters an error when `spawnFile` is `python3`, immediately retry execution using `/bin/bash` instead of terminating with `[Shell execution error: spawn python3 EACCES]`.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   MODULE TerminalSpawnManager {
     DATA {
       hasPty: Boolean
       pythonPath: String
       script: String
     }
     
     LOGIC {
       FUNCTION spawnTerminalProcess(cmd) {
         TRY {
           SPAWN pythonPath WITH [pty_runner, script]
         } CATCH (EACCES | ENOENT | Error) {
           FALLBACK TO SPAWN "/bin/bash" WITH ["-c", script]
         }
       }
     }
   }
   ```
