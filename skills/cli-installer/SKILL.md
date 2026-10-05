---
name: cli-installer
description: Guidelines for installing Linux-compatible CLI tools and binaries into the workspace.
---

# CLI Installer Skill

This skill provides the standard procedure for installing external CLI tools and binaries into the AI Studio workspace.

## Core Principle

**Node.js First**: If a tool is available via `npm` or `npx`, always prefer installing it through the Node.js ecosystem (e.g., `npm install -g <package>` or `npx <package>`). This ensures better cross-platform compatibility and easier management within the workspace.

**Binary Fallback**: Only install raw external binaries (Go, Rust, C++, etc.) into the root `./bin` directory if a Node.js-based version is not available or suitable. Binaries in `./bin` are persisted across container restarts and accessible to the agent.

## Installation Procedure (Node.js)

### 1. Identify Package
Search for the official npm package for the tool.
```bash
npm search <tool-name>
```

### 2. Global Installation
Install the package globally within the workspace container.
```bash
npm install -g <package-name>
```

### 3. Verification
Verify the tool is accessible in the PATH.
```bash
<tool-command> --version
```

## Installation Procedure (Binary Fallback)

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
- **Node.js First**: Provides standardized, versioned access to tools via npm.
- **Portability**: binaries in `./bin` or `node_modules` are part of the applet's ecosystem.
- **Security**: Inspecting scripts before execution prevents malicious or destructive operations.
- **Stability**: Using standard package managers ensures that command execution is tracked and logged correctly by the environment.

## Verified Tools
- **gh**: GitHub CLI (Prefer `npm install -g @github/gh-cli` if available, or fallback to bin)
- **agy**: Antigravity CLI
- **fly**: Fly.io CLI
- **shell**: shell.online (Prefer node-based installation if available)
