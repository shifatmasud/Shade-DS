# Tech Spec 

1. **Objective**
   - **Problem Statement**: The user requested installation and setup for Google Workspace CLI (`https://github.com/googleworkspace/cli`). Installing via standard `npm install -g @googleworkspace/cli` attempts to invoke the default prebuilt binary compiled against GNU libc (glibc >= 2.39), which fails on the container environment with `/lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_2.39' not found`. Additionally, external binaries must be persistently located in `./bin` (per workspace `cli-installer` skill standards) and configured with clear authentication paths for automated or interactive execution.
   - **Solution Overview**: 
     1. Retrieve and extract the official statically-linked Linux release binary (`google-workspace-cli-x86_64-unknown-linux-musl.tar.gz`, v0.22.5) from the official GitHub releases.
     2. Install the binary into both the workspace persistent binary directory (`/app/applet/bin/gws`) and standard system PATH (`/usr/local/bin/gws`), setting executable permissions (`chmod +x`).
     3. Verify runtime execution against Google Discovery Service (`gws --version`, `gws --help`, `gws schema drive.files.list`).
     4. Document the exact authentication methods (Environment Variables `GOOGLE_WORKSPACE_CLI_TOKEN`, `GOOGLE_WORKSPACE_CLI_CLIENT_ID` / `GOOGLE_WORKSPACE_CLI_CLIENT_SECRET`, credentials JSON file `~/.config/gws/client_secret.json`, and `gws auth login` / `gws auth setup`).
   - **Scope**: Binary installation, system path mapping, execution verification, authentication architecture setup, RCA documentation in `/RCA/rca_google_workspace_cli_glibc_and_setup.md`, and integration test verification script in `/framer/test/gwsVerification.ts`.
   - **Context**: The user provided `https://github.com/googleworkspace/cli` and requested: "Lets install this cli & setup to use this cli".

2. **Success Criteria**
   - **Binary Execution**: `gws --version` successfully returns `gws 0.22.5` without glibc dynamic linker errors.
   - **Path Availability**: `gws` is accessible both directly via `gws` in system `$PATH` and persistently via `./bin/gws`.
   - **Discovery Engine**: `gws schema drive.files.list` dynamically fetches and outputs JSON schema from Google Discovery Service.
   - **Authentication Readiness**: Clear automated and headless auth channels (`GOOGLE_WORKSPACE_CLI_TOKEN`, `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE`, client ID/secret) tested and documented.

3. **Project Requirements**
   - [x] Inspect environment architecture (Linux x86_64, glibc compatibility).
   - [x] Identify root cause of standard `npm install -g @googleworkspace/cli` failure (`GLIBC_2.39` mismatch).
   - [x] Download official statically linked musl binary (`google-workspace-cli-x86_64-unknown-linux-musl.tar.gz`).
   - [x] Install binary to `./bin/gws` and `/usr/local/bin/gws` with executable permissions.
   - [x] Verify CLI command execution and schema querying against Google Discovery Service.
   - [x] Verify headless token injection behavior (`GOOGLE_WORKSPACE_CLI_TOKEN`).
   - [x] Document Root Cause Analysis in `/RCA/rca_google_workspace_cli_glibc_and_setup.md`.
   - [x] Implement programmatic integration test in `/framer/test/gwsVerification.ts`.
   - [x] Provision Google Cloud OAuth for project `gen-lang-client-0732713233` (Project # `823279114035`) with Drive, Docs, Sheets, and Calendar scopes.
   - [x] Configure Desktop OAuth Client credentials (`client_secret.json`) and complete interactive OAuth authorization code flow.
   - [x] Verify live Google Workspace API calls (Drive, Calendar, Gmail) returning authenticated user data for `shifatmasud@gmail.com`.

4. **Architecture Decisions**
   - **Statically Linked Musl Binary vs Compiling or Updating Host Glibc**: The host container's base libc cannot be upgraded without risky system-level package upgrades. The official release provides `unknown-linux-musl`, which bundles all required system symbols statically and runs with zero external shared library dependencies.
   - **Dual Location (System PATH + Workspace `./bin`)**: Placing `gws` in `/usr/local/bin/gws` enables instant system-wide execution for any subprocess without prefixing paths. Placing `gws` in `/app/applet/bin/gws` satisfies the `cli-installer` skill requirement for container persistence across restarts.
   - **Authentication Architecture**:
     - *Headless / CI / Agent Mode*: Supply `GOOGLE_WORKSPACE_CLI_TOKEN="<access_token>"` directly in environment variables.
     - *OAuth Client ID / Secret Mode*: Export `GOOGLE_WORKSPACE_CLI_CLIENT_ID` and `GOOGLE_WORKSPACE_CLI_CLIENT_SECRET` or place `client_secret.json` in `~/.config/gws/client_secret.json`.
     - *Interactive Browser Login*: Run `gws auth login` to launch the Google OAuth consent flow.

5. **Pseudo Code**
   ```dsl
   MODULE GoogleWorkspaceCliSetup:
     DATA:
       version: String = "0.22.5"
       arch: String = "x86_64-unknown-linux-musl"
       tarballUrl: String = "https://github.com/googleworkspace/cli/releases/download/v0.22.5/google-workspace-cli-x86_64-unknown-linux-musl.tar.gz"
       binDestinations: List<String> = ["/app/applet/bin/gws", "/usr/local/bin/gws"]
       authConfigDir: String = "~/.config/gws"
       authEnvTokens: Map<String, String> = {
         "GOOGLE_WORKSPACE_CLI_TOKEN": "OAuth2 Access Token",
         "GOOGLE_WORKSPACE_CLI_CLIENT_ID": "OAuth Client ID",
         "GOOGLE_WORKSPACE_CLI_CLIENT_SECRET": "OAuth Client Secret"
       }

     LOGIC:
       FUNCTION install():
         DOWNLOAD tarballUrl TO "/tmp/gws-musl.tar.gz"
         EXTRACT "/tmp/gws-musl.tar.gz" TO "/tmp/gws"
         FOR dest IN binDestinations:
           COPY "/tmp/gws" TO dest
           SET_PERMISSIONS(dest, 0755)
         END FOR
         VERIFY_OUTPUT(EXECUTE("gws --version")) == "gws 0.22.5"
       END FUNCTION

       FUNCTION authenticate(mode, credentials):
         MATCH mode:
           CASE "token":
             EXPORT GOOGLE_WORKSPACE_CLI_TOKEN = credentials.token
             EXECUTE("gws drive files list")
           CASE "credentials_file":
             WRITE_JSON(authConfigDir + "/client_secret.json", credentials.clientSecret)
             EXECUTE("gws auth login")
           CASE "client_env":
             EXPORT GOOGLE_WORKSPACE_CLI_CLIENT_ID = credentials.clientId
             EXPORT GOOGLE_WORKSPACE_CLI_CLIENT_SECRET = credentials.clientSecret
             EXECUTE("gws auth login")
         END MATCH
       END FUNCTION
   ```
