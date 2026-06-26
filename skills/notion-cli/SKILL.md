---
name: "notion-cli"
description: |
  Interact with and orchestrate Notion resources (Pages, Files, Data Sources, Workers, and API configurations) using the Notion CLI (ntn). Explains authentication workflows in headless environments, environment controls, and troubleshooting OS keyring constraints.

  Use this skill in the following scenarios:
  * Notion CLI Integration: When needing to interact with the Notion platform, pages, data sources, or workers programmatically from the CLI.
  * Headless CLI Auth: When logging in, credentialing, or polling authorizations inside headless agent or CI/CD runtimes.
  * Trouble Resolution: Resolving OS keyring fallback exceptions using the offline file-based authentication flags (NOTION_KEYRING=0).
---

# Notion CLI (ntn) Integration Skill

This skill outlines guidelines and executable operations for managing Notion resources, pages, files, data sources, and workers using the Notion CLI (`ntn`). It covers specific configurations for headless and remote terminal environments where platform keyrings might not be active.

## Quick Start: Authentication

To initialize the Notion CLI in this environment, you must first authenticate. Run this command to generate your login URL:

```bash
npx -y cross-env NOTION_KEYRING=0 npx ntn login --no-browser
```

---

## 1. Environment & Auth Keyring Workaround

By default, the Notion CLI (`ntn`) attempts to store authentication credentials in the operating system's native secure keyring (e.g., macOS Keychain, Linux Secret Service). In headless environments, Docker containers, or containerized runners (such as Cloud Run or Cloud Shell), this often fails with:
```text
error: Failed to store token in keychain
hint: Set NOTION_KEYRING=0 to use file-based auth instead of the OS keychain.
```

### Headless Resolution Paradigm
To bypass OS keychain constraints, always prefix commands with `NOTION_KEYRING=0` (or use a helper like `cross-env` where environment overrides are needed):

```bash
# Direct Unix execution
NOTION_KEYRING=0 npx ntn whoami

# Cross-platform execution (using cross-env package)
npx -y cross-env NOTION_KEYRING=0 npx ntn whoami
```

When `NOTION_KEYRING=0` is active, the CLI falls back to the file-based credentials stash at:
`~/.config/notion/auth.json`

---

## 2. Authentication Lifecycle

### Standard Headless Login Workflow
Since standard interactive browser redirection is unavailable in virtual environments, you must adopt the two-step verification code flow:

1. **Initiate Verification**:
   ```bash
   npx -y cross-env NOTION_KEYRING=0 npx ntn login --no-browser
   ```
   * *Output*: This prints a unique verification URL and verification code (e.g., `QZD-KPQ`).
   * *Action*: Display this link to the real user clearly to click and authorize.
   * **Note**: The `--no-browser` flag is only valid for the `login` command, not the `poll` command.

2. **Wait / Poll Auth**:
   After the user authorizes in the browser, complete the sequence by running the polling mechanism:
   ```bash
   npx -y cross-env NOTION_KEYRING=0 npx ntn login poll
   ```
   * *Success Output*: `✔ Logged in to workspace <workspace_name>`

### Verifying Auth Status
To confirm that credentials are valid and to output target profile information, run:
```bash
npx -y cross-env NOTION_KEYRING=0 npx ntn whoami
```

---

## 3. Supported Notion CLI Commands

Below are standard operations supported by the CLI (prefix all with `NOTION_KEYRING=0` context):

### Pages and Databases
* **List / View Pages**:
  ```bash
  npx -y cross-env NOTION_KEYRING=0 npx ntn pages
  ```

### Data Sources
* **List Data Sources**:
  ```bash
  npx -y cross-env NOTION_KEYRING=0 npx ntn datasources
  ```

### Uploading Files
* **Manage File Uploads**:
  ```bash
  npx -y cross-env NOTION_KEYRING=0 npx ntn files
  ```

### Integration & Core Workers
* **Workers Configuration**:
  ```bash
  npx -y cross-env NOTION_KEYRING=0 npx ntn workers
  ```

### Direct API Calls (Public REST)
The `ntn api` command provides a powerful way to interact with the Notion API directly.
* **List Endpoints**:
  ```bash
  npx -y cross-env NOTION_KEYRING=0 npx ntn api ls
  ```
* **Query API**:
  ```bash
  npx -y cross-env NOTION_KEYRING=0 npx ntn api <ENDPOINT_PATH> [INPUTS]
  ```
* **Input Syntax Examples**:
  - `page_size==100` (Query parameter)
  - `archived:=true` (Typed JSON body assignment)
  - `parent[page_id]=abc123` (String body assignment)
  - `Accept:application/json` (Header)

---

## 4. Automation Quality Guidelines

1. **Lazy Keyring Overrides**: Always store the keyring exclusion in active terminal execution frameworks or invoke it programmatically.
2. **Handle Session Expulsion Gracefully**: Check for credential failures before attempting automated mutations and prompt the user to trigger `login` if token validation fails.
3. **Avoid Hardcoding API Tokens**: Use the `NOTION_API_TOKEN` environment variable to run headless tasks directly in production without running the interactive auth flow.
