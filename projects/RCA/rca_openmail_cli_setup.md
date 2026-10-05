# Root Cause Analysis (RCA) & Implementation Report - OpenMail CLI (`openmail`) Installation & Setup

## 1. Executive Summary
- **Tool**: OpenMail CLI (`openmail` / `@openmail/cli`) from `https://github.com/openmailsh/cli` and `https://openmail.sh`.
- **Purpose**: Provides programmatic email infrastructure for AI agents and automated systems, enabling mailbox creation, thread polling, sending emails (plain text & HTML), attachment retrieval, and webhook/policy configuration.
- **Action Performed**:
  1. Installed the official `@openmail/cli` package globally via npm (`npm install -g @openmail/cli`).
  2. Linked the executable binary to the persistent workspace `./bin/openmail` directory in compliance with the workspace `cli-installer` skill standards.
  3. Created an automated verification test suite in `/framer/test/openmailVerification.ts` validating PATH discovery, binary execution, command hierarchy, and options.
  4. Executed verification test suite with 100% pass rate (`6/6`).

---

## 2. Environment Audit
- **Operating System**: Linux x86_64
- **Node.js**: v22.23.2 / npm
- **Package Installed**: `@openmail/cli@0.8.0`
- **System Binary Location**: `/usr/local/bin/openmail` -> `/usr/local/lib/node_modules/@openmail/cli/dist/index.js`
- **Workspace Binary Location**: `/app/applet/bin/openmail`
- **Dependencies**: `@clack/prompts`, `undici`

---

## 3. Installation & Setup Procedure
1. **Global Package Installation**:
   ```bash
   npm install -g @openmail/cli
   ```
2. **Persistent Workspace Symlink**:
   ```bash
   ln -sf /usr/local/bin/openmail ./bin/openmail
   ```
3. **Execution Verification**:
   ```bash
   openmail --help
   ./bin/openmail --help
   ```

---

## 4. Verification Test Results
Executed via `npx tsx ./framer/test/openmailVerification.ts`:
```
--- Starting OpenMail CLI Verification ---
[PASS] System PATH resolution
[PASS] Workspace ./bin/openmail presence
[PASS] CLI help command execution
[PASS] Subcommand help for "send"
[PASS] Subcommand help for "inbox"
[PASS] Global flags inspection
--- OpenMail CLI Verification Summary ---
Passed: 6/6
All OpenMail CLI verification tests passed successfully.
```

---

## 5. Command Reference & Usage Guide

### Global Flags
| Flag | Description | Default |
| :--- | :--- | :--- |
| `--api-key <key>` | Account or Inbox API key (overrides `OPENMAIL_API_KEY`) | None |
| `--base-url <url>` | Target OpenMail API server (overrides `OPENMAIL_BASE_URL`) | `https://api.openmail.sh` |
| `--state-path <path>` | State storage location (overrides `OPENMAIL_STATE_PATH`) | `~/.openmail-cli/state.json` |
| `--json` | Enable structured JSON output for AI agent consumption | Disabled |
| `--verbose` | Enable verbose logging | Disabled |

### Primary Subcommands
- **`openmail init`**: Interactively or via flags creates a new inbox and sets it as default (`--mailbox-name`, `--display-name`).
- **`openmail inbox`**:
  - `openmail inbox list`: List available inboxes.
  - `openmail inbox create --mailbox-name <name> --display-name <name>`: Create an inbox.
  - `openmail inbox get --inbox-id <id>`: Retrieve specific inbox metadata.
  - `openmail inbox keys create --inbox-id <id>`: Mint an inbox-scoped API key.
  - `openmail inbox webhook set --inbox-id <id> --url <url>`: Configure webhook dispatch.
- **`openmail send`**:
  - `openmail send --to <email> --subject <text> --body <text>`: Send email.
  - Supports `--cc`, `--bcc`, `--thread-id`, `--reply-to`, and `--attach <file>`.
- **`openmail messages`**: Query and manage individual inbox messages.
- **`openmail threads`**: List, inspect, and delete conversation threads (`openmail threads list --is-read false`).
- **`openmail attachments`**: Download and extract text from email attachments.
- **`openmail policy`**: Manage correspondent security policies (whitelist/blacklist addresses allowed to email the inbox).
- **`openmail pod`**: Manage organizational multi-agent pods and pod API keys.
- **`openmail domain`**: Manage verified custom sending domains.

---

## 6. Agent Integration Best Practices
For AI agents executing within this environment:
1. Always pass `--json` when parsing outputs programmatically to receive clean JSON rather than terminal ANSI formatting.
2. Store the API key in the environment as `OPENMAIL_API_KEY` or pass `--api-key "$OPENMAIL_API_KEY"`.
3. To monitor incoming messages, poll unread threads:
   ```bash
   openmail threads list --is-read false --json
   ```
4. Send notifications or responses programmatically:
   ```bash
   openmail send --to "recipient@example.com" --subject "Agent Notification" --body "Process complete." --json
   ```
