---
name: "github-cli"
description: |
  Interact with and orchestrate GitHub resources (Repositories, Pull Requests, Issues, Releases, Secrets, and Actions) using the GitHub CLI (gh). Explains non-interactive automation, headless token-based authentication, and resolving Git identity configurations in CI/CD or sandboxed containers.

  Use this skill in the following scenarios:
  * GitHub Integration: When needing to programmatically interact with GitHub repositories, issues, pull requests, or actions.
  * Headless Auth: When performing operations securely using 'GITHUB_TOKEN' or 'GH_TOKEN' instead of interactive web logins.
  * Automation Shells: Using non-interactive flags like '--yes' and piping commands to avoid interactive shell blocks.
---

# GitHub CLI (gh) Integration Skill

This skill outlines guidelines and executable patterns for managing GitHub resources, pull requests, issues, secrets, and workflows using the GitHub CLI (`gh`). It emphasizes secure headless execution, prompt avoidance, and robust error management.

---

## 1. Environment & Non-Interactive Headless Auth

By default, the GitHub CLI (`gh`) attempts to authenticate interactively via a browser-based OAuth flow. In sandboxed containers, automated runtimes, or CI/CD pipelines, you must bypass this using automated token setups.

### Token-Based Authentication
To authenticate headless integrations, supply a personal access token (PAT) or automatic workflow token as an environment variable (`GH_TOKEN` or `GITHUB_TOKEN`). All `gh` commands automatically read these:

```bash
# Unix token integration
export GH_TOKEN="ghp_YourSecureGitHubPersonalAccessTokenHere"
npx gh auth status

# Direct execution wrapping
GH_TOKEN="ghp_xxx" npx gh repo list
```

### Git Credentials Helper Integration
To permit standard `git` terminal mutations (e.g., `git push`, `git fetch`) without prompting for password inputs, configure `gh` to act as your git credential manager:

```bash
npx gh auth setup-git
```

---

## 2. Preventing Interactive Blocks (Strict Non-Interactive Rule)

Headless automation will hang indefinitely if a command opens an interactive choice menu. You must systematically apply flags to bypass user prompts.

### Bulletproof Patterns
* **PR Creation**:
  ```bash
  npx gh pr create --title "feat: advanced analytics" --body "Implements chart analytics" --head feature-branch --base main
  ```
  *(Never call `gh pr create` alone—it prompts for title, body, and action!)*

* **Repo Initialization**:
  ```bash
  npx gh repo create my-new-project --private --source=. --remote=origin --push
  ```

* **Issue Creation**:
  ```bash
  npx gh issue create --title "bug: websocket disconnection" --body "Observed visual flicker on reconnect" --assignee "@me"
  ```

---

## 3. Core GitHub Command Reference

### Repository Operations
* **Cloning private repositories**:
  ```bash
  npx gh repo clone owner/repo-name
  ```
* **Repository List**:
  ```bash
  npx gh repo list owner --limit 20
  ```

### Secrets and Variables Management
Excellent for setting up deployment flows securely without hardcoding variables in files:
* **Set Repository secret**:
  ```bash
  # Directly from environment
  npx gh secret set SECRET_DB_URL --body "$DB_URL"
  ```
* **Set Repository variable**:
  ```bash
  npx gh variable set API_URL --body "https://api.production.internal"
  ```

### Releases & Assets
Perfect for automating software delivery:
* **Create release and upload build outputs**:
  ```bash
  npx gh release create v1.0.0 ./dist/bundle.zip --title "v1.0.0 (Production Release)" --notes "Automated release generation"
  ```

---

## 4. Automation Quality Guidelines

1. **Explicit Identity Setup**: Before pushing commits or creating PRs of generated code via git, configure git user details directly:
   ```bash
   git config --global user.email "bot-compiler@aistudio.internal"
   git config --global user.name "AI Studio Compiler"
   ```
2. **Error Isolation**: Standardize stdout parsing. Add `--json` flags to fetch machine-readable fields (e.g., `gh pr list --json number,title,state`).
3. **Lazy Token Validation**: Wrap script logic to check auth state early using `gh auth status` before executing critical workflows.
