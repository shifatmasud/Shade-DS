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

To initialize the Notion CLI in this environment, add your **CLI Access Token** (obtained from [Notion Developers](https://app.notion.com/developers/connections)) to the `.env` file. 

Once configured, you can run all commands directly:

```bash
npx ntn whoami
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

### Option A: Direct Token Authentication (Recommended)
This is the preferred method for headless and automated environments. It bypasses all interactive login steps and keyring constraints.

1. **Get your Token**:
   Visit [Notion Developer Connections](https://app.notion.com/developers/connections) and generate/copy a **CLI Access Token** (starts with `ntn_`).

2. **Configure Environment**:
   Add the token to your `.env` file:
   ```env
   NOTION_API_TOKEN=ntn_your_token_here
   ```

3. **Execute Commands**:
   Once the token is in your environment, you can run commands directly. **NO extra flags** (like `NOTION_KEYRING=0`) are required:
   ```bash
   npx ntn whoami
   ```
   *Note: `NOTION_API_TOKEN` overrides all local storage and keychain logic.*

### Option B: Standard Headless Login Workflow (Interactive Fallback)
If you do not have an integration token, use the interactive verification flow. **Note**: This method requires the `NOTION_KEYRING=0` flag in this environment.

1. **Initiate Verification**:
   ```bash
   npx -y cross-env NOTION_KEYRING=0 npx ntn login --no-browser
   ```
   * *Output*: Prints a unique verification URL and code.
   * *Action*: Visit the link, authorize, and follow the prompts.

2. **Wait / Poll Auth**:
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
