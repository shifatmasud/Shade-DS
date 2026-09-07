# Tech Spec 

1. **Objective**
   - **Problem Statement**: The application logged an error `Failed to load terminal info: Failed to fetch` on mount in `Terminal.tsx`. When the terminal page mounts during server startup, warm-up, or network reconnection, a single raw `fetch('/api/terminal/info')` with an unhandled/loud `console.error` causes test harness failures and leaves `cwd` unpopulated.
   - **Solution Overview**: 
     1. Add an immediate `init` message in `/api/terminal/stream` SSE stream providing the current working directory (`terminalCwd`) directly upon connection establishment.
     2. Update `Terminal.tsx` to handle the SSE `init` event, synchronizing working directory state reactively without requiring an immediate REST fetch.
     3. Enhance the REST `/api/terminal/info` fetch with an `AbortController`, graceful retry mechanism with exponential backoff, and safe handling without noisy `console.error` alerts.
   - **Scope**: `components/Page/Terminal.tsx` and `server.ts`. Protect `Dock.tsx` and `README.md`.
   - **Context**: Shade DSL architecture, reactive state synchronization, resilient networking.

2. **Success Criteria**
   - **Key Results**:
     - No unhandled `Failed to load terminal info: Failed to fetch` errors are thrown or logged to `console.error`.
     - Terminal active working directory initializes cleanly via SSE and resilient REST fetch.
     - Dev server and terminal endpoints remain healthy and responsive.
     - Application compiles and lints with 0 errors.
   - **Non-Negotiables**:
     - `Dock.tsx` remains untouched (Dock immunity).
     - Theme tokens and Core components preserved.

3. **Project Requirements**
   - [x] Trace root cause of `Failed to load terminal info: Failed to fetch` in `Terminal.tsx`.
   - [ ] Update `server.ts` `/api/terminal/stream` endpoint to send an initial `init` event containing `terminalCwd`.
   - [ ] Update `components/Page/Terminal.tsx` to handle `init` event and add resilient retry logic for `/api/terminal/info`.
   - [ ] Verify compilation with `compile_applet` and `lint_applet`.
   - [ ] Verify live endpoints with `curl`.

4. **Architecture Decisions**
   - **Dual-Channel Working Directory Sync**: Rather than relying exclusively on a one-shot REST fetch at component mount time, sending `terminalCwd` in the SSE stream's initial handshake (`init`) guarantees the terminal client gets the active directory even if REST endpoints are momentarily congested.
   - **Resilient Retry Loop**: The REST query incorporates an `AbortController` and backoff retries to tolerate container cold-starts cleanly.

5. **Pseudo Code**
   ```dsl
   COMPONENT TerminalPage
   DATA
     state cwd: string
   LOGIC
     effect SSE:
       onMessage(event) ->
         payload = JSON.parse(event.data)
         if payload.type == 'init' or payload.cwd:
           setCwd(payload.cwd)
     effect fetchInfo:
       try:
         res = await fetch('/api/terminal/info')
         data = await res.json()
         if data.cwd: setCwd(data.cwd)
       catch (e):
         retry with backoff up to 3 times
   ```
