# Tech Spec 

1. **Objective**
   - **Problem Statement**: The user requested to "Install openmail cli". OpenMail (`openmail.sh` / `@openmail/cli`) provides programmatic email infrastructure, inbox management, thread handling, and automated dispatch for AI agents and developer workflows. The CLI must be cleanly installed, accessible via both standard system `$PATH` and the workspace `./bin/openmail` directory (per workspace `cli-installer` skill standards), and verified for execution and headless automation.
   - **Solution Overview**:
     1. Install the official `@openmail/cli` distribution from the npm registry globally into `/usr/local/bin/openmail` and establish a persistent symlink at `./bin/openmail`.
     2. Verify CLI invocation, version reporting, command tree (`init`, `inbox`, `pod`, `domain`, `policy`, `send`, `messages`, `threads`, `attachments`, `feedback`, `update`), and help definitions.
     3. Document the architecture, configuration parameters (such as `OPENMAIL_API_KEY`, `OPENMAIL_BASE_URL`, and `OPENMAIL_STATE_PATH`), and automated agent integration protocols.
     4. Build an automated verification script in `/framer/test/openmailVerification.ts` to validate CLI availability, JSON output modes, and flags.
     5. Document full verification and environment specifications in `/RCA/rca_openmail_cli_setup.md`.
   - **Scope**: CLI package installation, persistent binary linking, verification test script, and technical documentation.
   - **Context**: Autonomous agent tooling environment requiring programmatic email capabilities.

2. **Success Criteria**
   - **Command Availability**: `openmail --help` executes cleanly without runtime failures or missing dependencies.
   - **Dual Path Presence**: Executable is available at `/usr/local/bin/openmail` and `./bin/openmail`.
   - **Help & Version Output**: Returns the full command structure including `init`, `inbox`, `send`, `threads`, and `messages`.
   - **Verification Harness**: Automated verification script runs in `/framer/test/openmailVerification.ts` and exits cleanly with 0 errors.

3. **Project Requirements**
   - [x] Identify package source and binary footprint (`@openmail/cli` on npm).
   - [x] Install `@openmail/cli` globally via npm.
   - [x] Link binary into `./bin/openmail` for persistent workspace access.
   - [x] Verify CLI command execution and inspect help outputs.
   - [x] Create programmatic verification suite in `/framer/test/openmailVerification.ts`.
   - [x] Run verification harness using `npx tsx /framer/test/openmailVerification.ts`.
   - [x] Document root cause analysis, architecture, and usage patterns in `/RCA/rca_openmail_cli_setup.md`.

4. **Architecture Decisions**
   - **Global NPM Package vs Standalone Binary**: `@openmail/cli` is officially distributed via npm as a Node.js CLI executable (`dist/index.js`) powered by `@clack/prompts` and `undici`. Global npm installation ensures all runtime dependencies are bundled and executed by the system's Node.js runtime.
   - **Persistent Workspace Symlink**: In accordance with the workspace's `cli-installer` skill, external CLI tools are linked into `./bin/openmail` so that tools and child processes can invoke it either directly or through relative workspace pathing.
   - **Configuration Surface**:
     - `OPENMAIL_API_KEY`: Account or inbox API key for authenticating API operations.
     - `OPENMAIL_BASE_URL`: Base API endpoint (default: `https://api.openmail.sh`).
     - `OPENMAIL_STATE_PATH`: Local state storage path (default: `~/.openmail-cli/state.json`).
     - `--json`: Flag enabling machine-readable JSON logging for programmatic agent consumers.

5. **Pseudo Code**
   ```dsl
   MODULE OpenMailCliSetup:
     DATA:
       packageName: String = "@openmail/cli"
       version: String = "0.8.0"
       binSymlink: String = "./bin/openmail"
       systemBin: String = "/usr/local/bin/openmail"
       globalFlags: List<String> = [
         "--api-key",
         "--base-url",
         "--state-path",
         "--json",
         "--verbose"
       ]

     LOGIC:
       FUNCTION install():
         RUN "npm install -g @openmail/cli"
         LINK systemBin TO binSymlink
         VERIFY_EXECUTION "openmail --help"
         RUN_TEST_SUITE "/framer/test/openmailVerification.ts"
   ```
