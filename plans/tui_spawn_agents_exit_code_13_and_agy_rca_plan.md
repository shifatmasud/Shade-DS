# Tech Spec - TUI spawnAgents.ts Exit Code -13 and Antigravity CLI (`agy`) Resolution

1. **Objective**
   - **Problem Statement**: 
     1. Running `spawnAgents.ts` in the web TUI terminal intermittently displayed `[exit code -13]`.
     2. Invoking `agy` (Antigravity CLI) in the TUI never ran, either hanging indefinitely or failing immediately with flag parser errors (`Error: flags provided but not defined: -model`).
   - **Solution Overview**:
     1. Analyze and isolate the exact root cause of `exit code -13` (libuv `UV_EACCES = -13` and Python PTY runner `SIGPIPE = -13` returncode propagation).
     2. Fix the wrapper script in `/bin/agy` to resolve `/root/.local/bin/agy-real` without getting caught in a symlink loop, avoid hanging curl requests, and properly discern root prompt flags from subcommands (`models`, `changelog`, `version`, `help`).
     3. Ensure robust error handling, process group signaling, and standard exit code translation in `server.ts` and `scripts/pty_runner.py`.
     4. Write a comprehensive, scientific Root Cause Analysis (RCA) in `/RCA/rca_tui_spawn_agents_exit_code_13_and_agy_runner.md`.
   - **Scope**: `/RCA/rca_tui_spawn_agents_exit_code_13_and_agy_runner.md`, `/bin/agy`, `server.ts`, `/plans/tui_spawn_agents_exit_code_13_and_agy_rca_plan.md`.

2. **Success Criteria**
   - **Key Results**:
     - `npx tsx scripts/spawnAgents.ts` executes and exits cleanly with code 0 in both CLI and TUI without exit code -13.
     - `agy`, `agy -h`, `agy models`, `agy --help`, and interactive prompts run immediately and return live output without hanging.
     - Comprehensive RCA document published in `/RCA/rca_tui_spawn_agents_exit_code_13_and_agy_runner.md` adhering to scientific debugging standards.
     - Applet compiles cleanly with zero lint or build regressions.
   - **Non-Negotiables**:
     - Zero disruption to existing TUI terminal streaming, quick keys bar, or multi-agent execution pipeline.

3. **Project Requirements**
   - [x] Create plan in `/plans/`.
   - [x] Audit binary paths, permissions, and symlink topology for `agy`, `python3`, and `spawnAgents.ts`.
   - [x] Refactor `/bin/agy` wrapper to cleanly target `/root/.local/bin/agy-real` and handle subcommand argument filtering.
   - [x] Update `server.ts` terminal process runner to handle exit codes, PTY pipes, and fallback gracefully.
   - [x] Write complete RCA documentation in `/RCA/`.
   - [x] Verify build and compilation with `compile_applet` & `lint_applet`.

4. **Architecture Decisions**
   - **Subcommand Flag Filtering in `bin/agy`**: `agy` CLI uses Go's `flag` package where flags must strictly precede or follow subcommand specifications depending on the command definition. Global flags like `--model` and `--dangerously-skip-permissions` must only be injected for interactive root sessions or prompt evaluations, never appended to subcommands (`models`, `agents`, `changelog`, `help`, `version`).
   - **Positive Exit Code Normalization**: In `server.ts` and `pty_runner.py`, negative signal returncodes (e.g. `-13` for `SIGPIPE` or `-2` for `SIGINT`) must be normalized to standard POSIX exit statuses (`128 + N`, e.g., 141 for SIGPIPE) to prevent confusing negative exit codes in terminal output.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   MODULE AgyWrapperRouter {
     DATA {
       rawArgs: Array<String>
       subcommands: ["models", "agents", "changelog", "help", "install", "mcp", "update"]
       realBin: "/root/.local/bin/agy-real"
     }
     
     LOGIC {
       FUNCTION sanitizeArguments(args) {
         IF args[0] IN subcommands {
           RETURN args
         }
         LET hasModel = args.CONTAINS("--model")
         LET hasSkip = args.CONTAINS("--dangerously-skip-permissions")
         LET extra = []
         IF NOT hasModel THEN extra.PUSH("--model gemini-3.7-flash-medium")
         IF NOT hasSkip THEN extra.PUSH("--dangerously-skip-permissions")
         RETURN [extra, args]
       }
       
       FUNCTION execute() {
         ENSURE realBin EXISTS
         EXECUTE realBin WITH sanitizeArguments(rawArgs)
       }
     }
   }
   ```
