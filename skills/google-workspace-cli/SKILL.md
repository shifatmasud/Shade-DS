---
name: google-workspace-cli
description: Installation, authentication, configuration, and operational execution guide for the official Google Workspace CLI (`gws`). Covers static musl binary installation, headless container keyring setup, OAuth2 Desktop client authentication with remote callback forwarding, direct token workflows, dynamic Google Discovery API schema inspection, and operational recipes across Google Drive, Gmail, Calendar, Sheets, Docs, Slides, and Tasks.
---

# Google Workspace CLI (`gws`) Skill

The Google Workspace CLI (`gws` from `https://github.com/googleworkspace/cli`) is an official, high-performance command-line utility for managing Google Workspace services including Google Drive, Gmail, Calendar, Sheets, Docs, Presentations, and Tasks. It dynamically leverages the Google Discovery Service to query and execute operations across all Workspace APIs.

This skill provides step-by-step instructions for:
1. Installing the compatible static binary (avoiding glibc runtime errors in container environments).
2. Configuring headless authentication and credentials.
3. Authenticating interactively or via tokens.
4. Executing common Workspace operational commands.
5. Querying live API schemas dynamically.
6. Troubleshooting authentication and environment issues.

---

# Installation & Binary Setup

In cloud container environments (Debian/Ubuntu LTS sandboxes), standard `npm install -g @googleworkspace/cli` attempts to invoke a GNU libc binary requiring `GLIBC >= 2.39`, causing dynamic linker errors (`/lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_2.39' not found`).

Always install the statically linked `musl` build directly:

```bash
# 1. Download official static musl release binary
curl -sL https://github.com/googleworkspace/cli/releases/download/v0.22.5/google-workspace-cli-x86_64-unknown-linux-musl.tar.gz -o /tmp/gws-musl.tar.gz

# 2. Extract binary
tar -xzf /tmp/gws-musl.tar.gz -C /tmp

# 3. Install to system path and persistent workspace bin
cp /tmp/gws /usr/local/bin/gws && chmod +x /usr/local/bin/gws
mkdir -p ./bin && cp /tmp/gws ./bin/gws && chmod +x ./bin/gws

# 4. Verify installation
gws --version
# Expected: gws 0.22.5
```

---

# Headless Keyring Configuration

In headless Linux containers or SSH environments where no desktop secret service daemon (such as GNOME Keyring or KWallet) is running, `gws` may default to the system keyring and fail to persist tokens.

To store credentials securely in file-based storage:
```bash
export GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND="file"
echo 'export GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND="file"' >> ~/.bashrc
```

Verify with:
```bash
gws auth status
# Check that "keyring_backend": "file" is shown
```

---

# Authentication Methods

`gws` supports two primary authentication modes:

### Method 1: Instant Direct Token (Automation & CI)
If you already possess a valid Google OAuth2 access token (e.g., from `gcloud auth print-access-token` or a web authentication popup):

```bash
export GOOGLE_WORKSPACE_CLI_TOKEN="ya29.a0AfH..."
gws drive files list --params '{"pageSize": 5}'
```
*Note: `GOOGLE_WORKSPACE_CLI_TOKEN` takes highest precedence and bypasses all local credential files.*

### Method 2: OAuth 2.0 Desktop Client (Persistent Sign-in)
To authenticate interactively with long-lived refresh tokens:

1. **Create Desktop Credentials in Google Cloud Console**:
   - Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**.
   - Set **Application type** to **Desktop app** (e.g., named `gws-desktop`).
   - Copy the generated `client_id` and `client_secret` (or download the client JSON).

2. **Configure the Client in `~/.config/gws/client_secret.json`**:
   ```bash
   mkdir -p ~/.config/gws
   cat << 'EOF' > ~/.config/gws/client_secret.json
   {
     "installed": {
       "client_id": "<YOUR_CLIENT_ID>.apps.googleusercontent.com",
       "client_secret": "<YOUR_CLIENT_SECRET>",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
       "redirect_uris": ["http://localhost"]
     }
   }
   EOF
   chmod 600 ~/.config/gws/client_secret.json
   ```

3. **Verify Configuration**:
   ```bash
   gws auth status
   # Should report "client_config_exists": true
   ```

---

# Container & Remote Development Callback Workflow

When running `gws auth login` inside a remote container or cloud environment, the browser opens on the developer's local desktop, but `gws` listens on a container-local loopback port (`http://localhost:<PORT>`).

Follow this loopback forwarding workflow:

1. Start `gws auth login` in the container:
   ```bash
   gws auth login
   ```
   `gws` will output:
   `Open this URL in your browser to authenticate: https://accounts.google.com/o/oauth2/auth?...&redirect_uri=http://localhost:<PORT>&...`

2. Open the URL in the desktop browser, select the Google account, and grant permissions.

3. After approving, Google redirects the browser to `http://localhost:<PORT>/?code=...`.
   - On the local machine, the browser will display "Site can't be reached" or "Connection refused" because the port is listening inside the remote container.
   - **This is expected and completely fine**.

4. Copy the entire redirect URL from the browser's address bar:
   `http://localhost:<PORT>/?iss=https://accounts.google.com&code=<CODE>&scope=...`

5. Back in the container shell, send an HTTP GET request to the listening port:
   ```bash
   curl -s "http://127.0.0.1:<PORT>/?iss=https://accounts.google.com&code=<CODE>&scope=..."
   ```

6. The response will return:
   ```html
   <html><head><title>Success</title></head><body>You may now close this window.</body></html>
   ```
   `gws auth login` completes automatically, encrypts the credentials, and exits with code 0!

7. Confirm with:
   ```bash
   gws auth status
   ```

---

# Common CLI Commands & Recipes

Once authenticated, use the following operational patterns:

### Google Drive
```bash
# List files with paging
gws drive files list --params '{"pageSize": 10}'

# Search files by query
gws drive files list --params '{"q": "mimeType = '\''application/vnd.google-apps.spreadsheet'\''"}'

# Get metadata for a specific file
gws drive files get --params '{"fileId": "<FILE_ID>"}'
```

### Google Calendar
```bash
# List user's calendars
gws calendar calendarList list

# List upcoming events
gws calendar events list --params '{"calendarId": "primary", "maxResults": 10, "singleEvents": true, "orderBy": "startTime"}'

# Create a calendar event
gws calendar events insert --params '{"calendarId": "primary"}' --body '{"summary": "Team Sync", "start": {"dateTime": "2026-10-01T10:00:00Z"}, "end": {"dateTime": "2026-10-01T10:30:00Z"}}'
```

### Gmail
```bash
# List recent message threads
gws gmail users messages list --params '{"userId": "me", "maxResults": 5}'

# Read a specific message
gws gmail users messages get --params '{"userId": "me", "id": "<MESSAGE_ID>"}'
```

### Google Sheets
```bash
# Get spreadsheet metadata and sheets
gws sheets spreadsheets get --params '{"spreadsheetId": "<SPREADSHEET_ID>"}'

# Read values from a range
gws sheets spreadsheets values get --params '{"spreadsheetId": "<SPREADSHEET_ID>", "range": "Sheet1!A1:D10"}'
```

### Google Docs
```bash
# Get full document content structure
gws docs documents get --params '{"documentId": "<DOCUMENT_ID>"}'
```

### Google Tasks
```bash
# List task lists
gws tasks tasklists list

# List tasks in default list
gws tasks tasks list --params '{"tasklist": "@default"}'
```

---

# Discovery Engine & Dynamic Schema Querying

`gws` does not hardcode static APIs; it queries the Google Discovery Service dynamically. You can inspect schemas, parameters, and documentation for any service directly from the command line:

```bash
# Inspect API method schemas
gws schema drive.files.list
gws schema calendar.events.insert
gws schema sheets.spreadsheets.values.get
gws schema gmail.users.messages.send
```

To view all supported services and top-level commands:
```bash
gws --help
```

---

# Troubleshooting & Error Recovery

### 1. `GLIBC_2.39 not found`
- **Cause**: Using the npm wrapper which defaults to GNU libc build incompatible with older host libc.
- **Fix**: Replace with the static `musl` binary from GitHub releases (`google-workspace-cli-x86_64-unknown-linux-musl.tar.gz`).

### 2. `error: redirect_uri_mismatch`
- **Cause**: Using a "Web application" OAuth Client ID instead of a "Desktop app" Client ID. Web clients forbid dynamic localhost ports.
- **Fix**: In Google Cloud Console, create an OAuth Client with Application Type set to **Desktop app**.

### 3. `No encrypted credentials found`
- **Cause**: Keyring daemon missing or `gws auth login` not yet executed.
- **Fix**: Set `export GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND="file"` and complete `gws auth login`, or supply `GOOGLE_WORKSPACE_CLI_TOKEN`.

### 4. `403 Insufficient Permission / Scope`
- **Cause**: The OAuth token does not include the requested API scope.
- **Fix**: Re-run `gws auth login --full` or specify custom scopes:
  ```bash
  gws auth login --scopes "https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/spreadsheets"
  ```
