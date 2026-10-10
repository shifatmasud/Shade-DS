---
name: "github-cli"
description: |
  Interact with and orchestrate GitHub resources (Repositories, Pull Requests, Issues, Releases, Secrets, and Actions) using the official GitHub CLI (gh). This skill explains how to use the pre-installed binary located in the workspace, bypassing the incorrect 'gh' npm package, and covers headless token-based authentication and non-interactive automation.

  Use this skill in the following scenarios:
  * GitHub Integration: When needing to programmatically interact with GitHub repositories, issues, pull requests, or actions.
  * Headless Auth: When performing operations securely using 'GITHUB_TOKEN' or 'GH_TOKEN' instead of interactive web logins.
  * Automation Shells: Using non-interactive flags like '--yes' and specifying all required metadata (titles, bodies) to avoid interactive shell blocks.
---

# GitHub CLI (gh) Integration Skill

This skill outlines guidelines and executable patterns for managing GitHub resources using the official GitHub CLI (`gh`). It emphasizes using the correct binary location, secure headless execution, and robust error management.

---

## 1. Using the Correct Binary

> [!CAUTION]
> **Do NOT use `npx gh`.** On this environment, `npx gh` fetches an unrelated and outdated npm package. You MUST use the official pre-installed binary located at `/bin/gh`.

### Executing Commands
Always call the binary using its path from the root or by ensuring it is in your execution context:

```bash
# Recommended execution
./bin/gh auth status
```

---

## 2. Environment & Non-Interactive Headless Auth

By default, the GitHub CLI attempts to authenticate interactively. In this sandboxed environment, you must bypass this using tokens.

### Token-Based Authentication
To authenticate, supply a Personal Access Token (PAT) as an environment variable (`GH_TOKEN` or `GITHUB_TOKEN`). All `gh` commands automatically read these:

```bash
# Direct execution wrapping
GH_TOKEN="ghp_YourSecureToken" ./bin/gh repo list
```

### Git Credentials Helper Integration
To permit standard `git` terminal operations (e.g., `git push`) without password prompts:

```bash
./bin/gh auth setup-git
```

---

## 3. Preventing Interactive Blocks (Strict Non-Interactive Rule)

Headless automation will hang if a command opens an interactive choice menu. You must systematically apply flags to bypass user prompts.

### Bulletproof Patterns
* **PR Creation**:
  ```bash
  ./bin/gh pr create --title "feat: new component" --body "Implements the requested UI" --head feature-branch --base main
  ```
  *(Never call `gh pr create` alone—it prompts for title, body, and action!)*

* **Repo Initialization**:
  ```bash
  ./bin/gh repo create my-project --private --source=. --remote=origin --push
  ```

* **Issue Creation**:
  ```bash
  ./bin/gh issue create --title "bug: logic error" --body "Steps to reproduce..." --assignee "@me"
  ```

---

## 4. Core GitHub Command Reference

### Repository Operations
* **Cloning private repositories**:
  ```bash
  ./bin/gh repo clone owner/repo-name
  ```
* **Repository List**:
  ```bash
  ./bin/gh repo list owner --limit 20
  ```

### Secrets and Variables Management
* **Set Repository secret**:
  ```bash
  ./bin/gh secret set SECRET_DB_URL --body "$DB_URL"
  ```
* **Set Repository variable**:
  ```bash
  ./bin/gh variable set API_URL --body "https://api.production.internal"
  ```

### Releases & Assets
* **Create release and upload build outputs**:
  ```bash
  ./bin/gh release create v1.0.0 ./dist/bundle.zip --title "v1.0.0" --notes "Automated release"
  ```

---

## 5. Automation Quality Guidelines

1. **Explicit Identity Setup**: Before pushing commits via git:
   ```bash
   git config --global user.email "bot@aistudio.internal"
   git config --global user.name "AI Studio Bot"
   ```
2. **JSON Output**: Use `--json` flags for machine-readable data (e.g., `./bin/gh pr list --json number,title`).
3. **Pre-flight Check**: Check auth state using `./bin/gh auth status` before executing workflows.
