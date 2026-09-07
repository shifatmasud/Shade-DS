# Tech Spec 

1. **Objective**
   - **Problem Statement**: The Antigravity CLI (`agy`) and workspace terminal environments require authentication with Google Gemini via a persistent `GEMINI_API_KEY`. Without persistent configuration, subshells, PTY sessions, background agent processes, and dev servers might lose access upon restart or session spawning.
   - **Solution Overview**: Persist `GEMINI_API_KEY` in root shell profile files (`~/.bashrc`, `~/.profile`), project `.env` and `.env.example`, the `server.ts` process environment pipeline (SSE terminal streams, PTY runners, CLI status endpoints), and the `bin/agy` wrapper executable.
   - **Scope**: Shell environment files (`/root/.bashrc`, `/root/.profile`), project `.env`, project `.env.example`, `server.ts`, and verification of `bin/agy`.
   - **Context**: Grounded in official Antigravity CLI documentation (`https://antigravity.google/docs/cli/install#using-a-gemini-api-key`).

2. **Success Criteria**
   - `GEMINI_API_KEY` is exported and available across all interactive and non-interactive bash subshells.
   - `.env` and `.env.example` contain the `GEMINI_API_KEY` variable.
   - `server.ts` passes `GEMINI_API_KEY` to all executed commands, PTY processes, and CLI verification endpoints.
   - `agy` CLI binary wrapper reliably picks up `GEMINI_API_KEY` across all invocations.
   - Running `echo $GEMINI_API_KEY` and `agy -h` in terminal returns verified success.

3. **Project Requirements**
   - [x] Configure `/root/.bashrc` and `/root/.profile` with persistent export of `GEMINI_API_KEY`.
   - [x] Update `.env` and `.env.example` with `GEMINI_API_KEY`.
   - [x] Update `server.ts` to include `GEMINI_API_KEY` in `customEnv` and CLI config endpoints.
   - [x] Verify `bin/agy` wrapper environment export.
   - [x] Restart dev server and verify terminal/CLI execution.

4. **Architecture Decisions**
   - **Multi-Layer Persistence**: Set at both the OS user shell level (`/root/.bashrc`, `/root/.profile`) and the application process level (`.env`, `process.env`, `server.ts` `customEnv`) to guarantee persistence across interactive PTY terminals, direct `execAsync` calls, sub-agents, and dev server restarts.
   - **Zero Secret Leakage in Client Code**: All environment passing remains strictly server-side and container-internal.

5. **Pseudo Code**
   ```dsl
   MODULE GeminiApiKeyPersistence {
     DATA {
       apiKey: String = "<GEMINI_API_KEY>"
       targets: List<Path> = ["/root/.bashrc", "/root/.profile", ".env", ".env.example", "server.ts"]
     }
     LOGIC {
       WHEN initialize() {
         EXPORT_ENV("GEMINI_API_KEY", apiKey)
         WRITE_FILE_APPEND("/root/.bashrc", "export GEMINI_API_KEY=\"${GEMINI_API_KEY}\"")
         WRITE_FILE_APPEND("/root/.profile", "export GEMINI_API_KEY=\"${GEMINI_API_KEY}\"")
         UPDATE_ENV_FILE(".env", "GEMINI_API_KEY", apiKey)
         INJECT_PROCESS_ENV(server.customEnv, "GEMINI_API_KEY", apiKey)
       }
     }
     RENDER {
       STATUS_BADGE {
         label: "GEMINI_API_KEY Configured"
         state: "Active"
       }
     }
   }
   ```
