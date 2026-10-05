---
name: shell-online
description: Operational guide and reference for shell.online (`curl -fsSL https://shell.online/install | sh` and `shell`). Covers installing remote shell tools, hosting secure shell sessions online, terminal streaming, remote execution, and agent command integration.
---

# Shell Online Skill (`shell-online`)

`shell.online` provides instant, secure online shell hosting and remote terminal sharing directly from any Linux environment. With a single install command, you can host your workspace shell online, share live terminal sessions, execute remote debugging workflows, and enable automated agent command inspection.

---

# 60-Second Quickstart

Get your shell hosted online in under a minute.

### 1. Install the CLI Tool
Run the official installation script:
```bash
curl -fsSL https://shell.online/install | sh
```

### 2. Verify Installation
Check that the `shell` command is available in your PATH:
```bash
shell --version
```

### 3. Host Your Shell Online
Start a hosted online shell session:
```bash
shell
```
or run with specific options to share your session securely.

---

# Core Capabilities & Commands

### 1. Installation & Setup
- **One-Line Installer**:
  ```bash
  curl -fsSL https://shell.online/install | sh
  ```
- **Local Workspace Persistence**:
  Binaries are installed into `/root/.local/bin/shell` (or `./bin/shell` when using project wrappers), making them fully accessible across agent sessions.

### 2. Hosting & Session Sharing
- Start an interactive online shell session:
  ```bash
  shell
  ```
- Pass commands for remote execution or stream output to authorized clients.

### 3. Integration with Agent Workflows
- **TUI & Terminal Tunnels**: Combine with automated test runners and inspection TUI pipelines.
- **Remote Diagnostics**: Stream error logs and test results directly through `shell.online` endpoints for remote review.

---

# Security & Best Practices

1. **Credential Protection**: Never expose sensitive environment variables (such as API keys, database credentials, or private tokens) while running public shell sessions.
2. **Access Control**: Use authenticated or ephemeral session tokens when sharing online shell instances.
3. **Cleanup**: Terminate background tunnel and shell processes when remote debugging or streaming sessions conclude.
