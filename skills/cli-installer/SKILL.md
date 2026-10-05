---
name: cli-installer
description: Guidelines for installing Linux-compatible CLI tools and binaries into the workspace.
---

# CLI Installer Skill

This skill provides the standard procedure for installing external binary CLI tools (Go, Rust, C++, etc.) into the AI Studio workspace.

## Core Principle

All external binaries MUST be installed into the root `./bin` directory to ensure they are persisted across container restarts and accessible to the agent.

## Installation Procedure

### 1. Download and Inspect
Always download the installation script to a temporary file first to inspect its contents and determine its flags.

```bash
# Example
curl -fsSL https://example.com/install.sh -o install_tool.sh
```

### 2. Targeted Installation
Run the script using `bash` and specify the destination directory using flags (usually `--dir`, `-d`, or `--prefix`).

```bash
# Pattern
npx -y tsx -e "import { execSync } from 'child_process'; execSync('bash install_tool.sh --dir ./bin')"
```

### 3. Cleanup
Delete the installation script after a successful install.

## Why this Pattern?
- **Portability**: binaries in `./bin` are part of the applet's file tree.
- **Security**: Inspecting scripts before execution prevents malicious or destructive operations.
- **Stability**: Using `npx tsx` ensures that command execution is tracked and logged correctly by the environment.

## Verified Tools
- **gh**: GitHub CLI
- **agy**: Antigravity CLI
- **fly**: Fly.io CLI
