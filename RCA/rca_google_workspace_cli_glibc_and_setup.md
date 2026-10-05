# Root Cause Analysis (RCA) - Google Workspace CLI (`gws`) Installation & Setup

## 1. Executive Summary
- **Tool**: Google Workspace CLI (`gws` / `@googleworkspace/cli`) from `https://github.com/googleworkspace/cli`.
- **Primary Issue Encountered**: When installing via standard npm package (`npm install -g @googleworkspace/cli`), invoking `gws` resulted in a dynamic linker failure:
  ```
  /usr/local/lib/node_modules/@googleworkspace/cli/bin/gws: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.39' not found (required by /usr/local/lib/node_modules/@googleworkspace/cli/bin/gws)
  ```
- **Root Cause**: The default binary packaged into npm was compiled with GNU C Library (`glibc`) requiring version `>= 2.39`. The current container environment utilizes an earlier release of glibc (Debian/Ubuntu LTS base), causing dynamic symbol resolution to fail upon process launch.
- **Resolution**: Downloaded the official statically linked release artifact `google-workspace-cli-x86_64-unknown-linux-musl.tar.gz` (v0.22.5) directly from GitHub releases. The `musl` build has zero shared library dependencies on the host's GNU libc and executes natively. Placed the verified binary into `/usr/local/bin/gws` (system path) and `/app/applet/bin/gws` (persistent applet path per `cli-installer` skill).

---

## 2. Environment Audit
- **Operating System**: Linux x86_64
- **Node.js**: v20.18.0 / npm 10.9.8
- **Workspace Binary Directory**: `/app/applet/bin`
- **Global Path**: `/usr/local/bin`

---

## 3. Detailed Root Cause Breakdown
1. **npm Post-install Architecture**:
   The `@googleworkspace/cli` npm wrapper bundles an automated binary downloader. By default on Linux x86_64, it fetched the GNU ABI target (`x86_64-unknown-linux-gnu`).
2. **Glibc Version Incompatibility**:
   The GNU target binary references symbols tagged with `GLIBC_2.39`. Because the host container uses an earlier glibc version, `ld-linux-x86-64.so.2` refused execution with exit code 1.
3. **Absence of Glibc Upgrade in Sandboxes**:
   Upgrading glibc in container environments risks breaking system-level binaries or dependent tools.
4. **Musl Static Target**:
   The official Google Workspace CLI project publishes a dual Linux release: `unknown-linux-gnu` and `unknown-linux-musl`. The musl target is fully self-contained with all system calls linked statically.

---

## 4. Remediation Steps Taken
1. Fetched release v0.22.5 from GitHub releases:
   ```bash
   curl -sL https://github.com/googleworkspace/cli/releases/download/v0.22.5/google-workspace-cli-x86_64-unknown-linux-musl.tar.gz -o /tmp/gws-musl.tar.gz
   ```
2. Extracted the binary:
   ```bash
   tar -xzf /tmp/gws-musl.tar.gz -C /tmp
   ```
3. Installed to both persistent `./bin/gws` and system `/usr/local/bin/gws`:
   ```bash
   cp /tmp/gws /app/applet/bin/gws && chmod +x /app/applet/bin/gws
   cp /tmp/gws /usr/local/bin/gws && chmod +x /usr/local/bin/gws
   ```
4. Verified execution:
   ```bash
   gws --version
   # Output: gws 0.22.5
   ```
5. Verified live schema fetching:
   ```bash
   gws schema drive.files.list
   # Confirmed valid Google Discovery API JSON response
   ```

---

## 5. How to Authenticate & Use `gws`

`gws` supports several authentication workflows depending on whether you are running interactively or in headless/automated pipelines:

### Method A: Direct OAuth2 Token (Highest Priority & Best for Automation)
If you already have an OAuth2 access token (e.g. from Google Cloud SDK, Google OAuth Playground, or your backend service):
```bash
export GOOGLE_WORKSPACE_CLI_TOKEN="ya29.a0AfH..."
gws drive files list --params '{"pageSize": 10}'
gws gmail users messages list --params '{"userId": "me"}'
```

### Method B: Google Cloud OAuth Client Credentials (Interactive Login)
Your Google Cloud project has been configured:
- **Project ID**: `gen-lang-client-0732713233`
- **Project Number**: `823279114035`
- **Configured Scopes**:
  - Google Drive (`https://www.googleapis.com/auth/drive`)
  - Google Docs (`https://www.googleapis.com/auth/documents`)
  - Google Sheets (`https://www.googleapis.com/auth/spreadsheets`)
  - Google Calendar (`https://www.googleapis.com/auth/calendar`)

To authenticate via interactive OAuth in `gws`:
1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0732713233).
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
3. Select **Desktop app** as the Application type (e.g. name it `gws-desktop-client`).
4. Click **Create**, then click **Download JSON** on the created client.
5. Save the file to `~/.config/gws/client_secret.json`:
   ```bash
   mkdir -p ~/.config/gws
   mv ~/Downloads/client_secret_*.json ~/.config/gws/client_secret.json
   ```
   *(Or alternatively export `GOOGLE_WORKSPACE_CLI_CLIENT_ID` and `GOOGLE_WORKSPACE_CLI_CLIENT_SECRET`)*
6. Run:
   ```bash
   gws auth login
   ```
   Follow the displayed authorization URL to complete login.

### Method C: Automated Setup with `gcloud`
If the `gcloud` CLI is configured with an active GCP project:
```bash
gws auth setup --project <your-gcp-project-id> --login
```

### Method D: Checking Status
To inspect the current credential state:
```bash
gws auth status
```

---

## 6. Authentication Verification & Test Results
- **Authenticated Account**: `shifatmasud@gmail.com`
- **Active Scopes**: 12 scopes (Drive, Gmail modify, Calendar, Sheets, Docs, Slides, Tasks, Profile, Email, OpenID)
- **Token Validity**: Confirmed valid with active refresh token saved in `credentials.enc`
- **Verified Operations**:
  - `gws drive files list --params '{"pageSize": 5}'` -> Successfully returned active files
  - `gws calendar calendarList list --params '{"maxResults": 3}'` -> Successfully returned active calendars
  - `gws gmail users messages list --params '{"userId": "me", "maxResults": 3}'` -> Successfully returned message threads
