# Implementation Plan - Debug & Fix /tui White Screen & Hanging PTY Connection

## 1. Overview & Objective
Debug and resolve the intermittent white screen / hanging issue on `https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/tui`. 
Root cause analysis indicates that hanging PTY subprocesses, unmanaged SSE connection leaks, and missing execution timeouts in `server.ts` cause API endpoints (`/api/terminal/info`, `/api/terminal/run`, `/api/terminal/stream`) to block indefinitely. When blocked, the frontend React client waiting for responses or stream initialization renders a blank/white screen.

## 2. Success Criteria
- **Zero Hanging Endpoints**: All terminal API routes (`/info`, `/run`, `/stream`) include strict execution timeouts and error boundaries.
- **Reliable Page Loads**: `/tui` loads successfully on every navigation without requiring backend container restarts.
- **PTY Process Safety**: Hung or orphaned PTY processes are automatically detected, timed out, and cleaned up.

## 3. Proposed Changes (`server.ts`)
1. **Execution Timeouts**: Add a 30-second watchdog timeout to `executeTerminalCommand` in `server.ts` to prevent runaway or blocked child processes from freezing the event loop.
2. **Resilient SSE Broadcasting**: Wrap client SSE writes in try/catch blocks so dead or disconnected client connections never throw unhandled exceptions or crash stream handlers.
3. **Health & Cleanup Guards**: Add cleanup logic in `/api/terminal/info` and `/api/terminal/stream` to gracefully handle inactive or terminated processes.

## 4. Verification Plan
1. Compile and build the applet using `compile_applet`.
2. Test `/tui` route loading multiple times consecutively to verify absence of white screen or hanging requests.
